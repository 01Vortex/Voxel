import express from 'express'
import cors from 'cors'
import { commentRouter } from './routes/comment'
import { uploadRouter, startCleanupScheduler } from './routes/upload'
import { adminRouter } from './routes/admin'
import { initDatabase } from './db'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json({ limit: '12mb' })) // 增加请求体大小限制，支持8MB图片上传

// 路由
app.use('/api/comment', commentRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/admin', adminRouter)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// 启动服务
async function start() {
  await initDatabase()
  
  // 启动图片清理定时任务
  startCleanupScheduler()
  
  app.listen(PORT, () => {
    console.log(`Voxel Comment Server running on http://localhost:${PORT}`)
  })
}

start().catch(console.error)

export { app }
