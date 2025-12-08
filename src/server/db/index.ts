import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let db: Database.Database

export interface CommentRow {
  id: string
  content: string
  email: string
  nickname: string
  avatar: string
  url: string
  ip: string | null
  ua: string | null
  created_at: number
}

export interface ImageRow {
  id: string
  data: Buffer
  thumbnail: Buffer
  mime_type: string
  created_at: number
}

export async function initDatabase(): Promise<void> {
  // 数据库放在 src/server/data 目录下
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/voxel.db')
  
  // 确保目录存在
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  
  db = new Database(dbPath)
  
  // 创建评论表
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      email TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT NOT NULL,
      url TEXT NOT NULL,
      ip TEXT,
      ua TEXT,
      created_at INTEGER NOT NULL
    )
  `)
  
  // 创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_url ON comments(url)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at)`)
  
  // 创建图片表（存储发送成功的图片）
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      data BLOB NOT NULL,
      thumbnail BLOB NOT NULL,
      mime_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)
  
  // 创建配置表（存储管理员密码等）
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  
  console.log('Database initialized')
}

export function getDb(): Database.Database {
  return db
}
