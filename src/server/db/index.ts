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

export async function initDatabase(): Promise<void> {
  // 数据库放在 src/db 目录下
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../db/voxel.db')
  
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
  
  console.log('Database initialized')
}

export function getDb(): Database.Database {
  return db
}
