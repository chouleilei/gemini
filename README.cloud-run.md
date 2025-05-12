# 在Google Cloud Run上部署Gemini代理

本文档介绍如何将Gemini代理部署到Google Cloud Run，这样您可以获得一个稳定运行的在线服务。

## 前置条件

1. 拥有一个Google Cloud账号
2. 安装Google Cloud SDK (https://cloud.google.com/sdk/docs/install)
3. 创建一个Gemini API Key (https://aistudio.google.com/app/apikey)

## 部署步骤

### 1. 登录Google Cloud

```bash
gcloud auth login
```

### 2. 设置项目

```bash
# 创建新项目（可选）
gcloud projects create [PROJECT_ID] --name="Gemini Proxy"

# 设置当前项目
gcloud config set project [PROJECT_ID]
```

### 3. 启用需要的API

```bash
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com
```

### 4. 构建并部署容器

#### 方法一：使用Cloud Build（推荐）

```bash
# 在项目根目录执行
gcloud builds submit --tag gcr.io/[PROJECT_ID]/gemini-proxy
gcloud run deploy gemini-proxy --image gcr.io/[PROJECT_ID]/gemini-proxy --platform managed --allow-unauthenticated --region [REGION]
```

#### 方法二：本地构建并部署

```bash
# 在项目根目录执行
docker build -t gcr.io/[PROJECT_ID]/gemini-proxy .
docker push gcr.io/[PROJECT_ID]/gemini-proxy
gcloud run deploy gemini-proxy --image gcr.io/[PROJECT_ID]/gemini-proxy --platform managed --allow-unauthenticated --region [REGION]
```

### 5. 访问服务

部署完成后，您将获得一个服务URL，格式如 `https://gemini-proxy-xxxxx-xx.a.run.app`。

这个URL就是您的Gemini API代理地址，可以作为API端点使用。可以与以下客户端配合使用：
- Cherry Studio
- ChatBox
- Cursor
- Cline
- 其他支持OpenAI API格式的客户端

## 配置客户端

在客户端中，使用以下设置：
- API端点：`https://[您的服务URL]/v1beta`
- API密钥：任意字符串（此代理不验证API密钥）

## 维护说明

- 查看日志：`gcloud run services logs read gemini-proxy`
- 更新服务：重新执行构建和部署命令
- 删除服务：`gcloud run services delete gemini-proxy`

## 注意事项

- Cloud Run服务器会在闲置一段时间后自动缩容为零，这意味着第一个请求可能需要冷启动时间
- 默认情况下，Cloud Run有15分钟的请求超时限制，足够大多数AI对话使用
- 您可以通过设置最小实例数来避免冷启动，但这会增加成本 