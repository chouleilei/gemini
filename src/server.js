import http from 'http';
import { WebSocketServer } from 'ws';
import apiProxy from './api_proxy/worker.mjs';

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // 处理API请求
    if (url.pathname.endsWith("/chat/completions") ||
        url.pathname.endsWith("/embeddings") ||
        url.pathname.endsWith("/models")) {
      
      // 将Node.js请求转换为Fetch API请求格式
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });
      
      // 读取请求体
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const request = new Request(url.toString(), {
            method: req.method,
            headers,
            body: body.length > 0 ? body : undefined
          });
          
          // 使用API代理处理请求
          const response = await apiProxy.fetch(request);
          
          // 设置响应头
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          
          // 发送响应体
          const responseBody = await response.text();
          res.end(responseBody);
        } catch (error) {
          console.error('API请求处理错误:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: '服务器内部错误' }));
        }
      });
      return;
    }
    
    // 处理根路径请求
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end('<html><body><h1>Gemini API 代理服务</h1><p>API 端点可用于 /v1beta/models, /v1beta/chat/completions, /v1beta/embeddings</p></body></html>');
      return;
    }
    
    // 处理404
    res.statusCode = 404;
    res.end('Not Found');
  } catch (error) {
    console.error('请求处理错误:', error);
    res.statusCode = 500;
    res.end('服务器内部错误');
  }
});

// 创建WebSocket服务器
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  try {
    console.log('WebSocket连接已建立');
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathAndQuery = url.pathname + url.search;
    const targetUrl = `wss://generativelanguage.googleapis.com${pathAndQuery}`;
    
    console.log('目标URL:', targetUrl);
    
    // 连接到Google Gemini WebSocket
    const targetWs = new WebSocket(targetUrl);
    let pendingMessages = [];
    
    targetWs.on('open', () => {
      console.log('已连接到Gemini服务器');
      
      // 发送所有待处理消息
      pendingMessages.forEach(message => {
        targetWs.send(message);
      });
      pendingMessages = [];
    });
    
    ws.on('message', (message) => {
      console.log('收到客户端消息');
      
      if (targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(message);
      } else {
        pendingMessages.push(message);
      }
    });
    
    targetWs.on('message', (message) => {
      console.log('收到Gemini消息');
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log('客户端连接关闭:', code, reason);
      
      if (targetWs.readyState === WebSocket.OPEN) {
        targetWs.close(code, reason);
      }
    });
    
    targetWs.on('close', (code, reason) => {
      console.log('Gemini连接关闭:', code, reason);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(code, reason);
      }
    });
    
    targetWs.on('error', (error) => {
      console.error('Gemini WebSocket错误:', error);
    });
  } catch (error) {
    console.error('WebSocket处理错误:', error);
    ws.close(1011, '服务器内部错误');
  }
});

// 监听端口
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 