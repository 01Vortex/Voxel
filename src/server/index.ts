import express from 'express'
import cors from 'cors'
import { commentRouter } from './routes/comment'
import { initDatabase } from './db'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api/comment', commentRouter)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// 启动服务
async function start() {
  await initDatabase()
  app.listen(PORT, () => {
    console.log(`Voxel Comment Server running on http://localhost:${PORT}`)
  })
}

start().catch(console.error)

export { app }
