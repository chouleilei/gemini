FROM node:18-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# 设置环境变量
ENV PORT=8080

# 暴露应用的端口
EXPOSE 8080

# 启动应用
CMD [ "npm", "start" ] 