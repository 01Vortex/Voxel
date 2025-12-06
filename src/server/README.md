# Voxel Comment Server

轻量级评论系统后端服务。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
npm start
```

服务默认运行在 `http://localhost:3000`

## API

- `GET /api/comment?url=xxx` - 获取评论列表
- `POST /api/comment` - 提交评论
- `GET /api/comment/count?url=xxx` - 获取评论数量
- `GET /api/health` - 健康检查

## 环境变量

- `PORT` - 服务端口，默认 3000
- `DB_PATH` - SQLite 数据库路径
