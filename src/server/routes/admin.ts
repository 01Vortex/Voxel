import { Router, Request, Response } from 'express'
import { getDb } from '../db'
import crypto from 'crypto'

export const adminRouter = Router()

// 生成 JWT Token（简化版）
function generateToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url')
  const secret = process.env.JWT_SECRET || 'voxel-secret-key'
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

// 验证 Token
export function verifyToken(token: string): { valid: boolean; payload?: any } {
  try {
    const [header, body, signature] = token.split('.')
    const secret = process.env.JWT_SECRET || 'voxel-secret-key'
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
    
    if (signature !== expectedSig) return { valid: false }
    
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (payload.exp < Date.now()) return { valid: false }
    
    return { valid: true, payload }
  } catch {
    return { valid: false }
  }
}

// 密码哈希
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'voxel-salt').digest('hex')
}

// 检查是否已初始化
adminRouter.get('/check', (req: Request, res: Response) => {
  try {
    const db = getDb()
    const config = db.prepare('SELECT value FROM config WHERE key = ?').get('admin_password') as { value: string } | undefined
    res.json({ success: true, initialized: !!config?.value })
  } catch {
    res.json({ success: true, initialized: false })
  }
})

// 首次设置密码
adminRouter.post('/setup', (req: Request, res: Response) => {
  try {
    const { password } = req.body
    
    if (!password || password.length < 6) {
      return res.json({ success: false, message: '密码至少6位' })
    }
    
    const db = getDb()
    
    // 检查是否已设置
    const existing = db.prepare('SELECT value FROM config WHERE key = ?').get('admin_password') as { value: string } | undefined
    if (existing?.value) {
      return res.json({ success: false, message: '密码已设置，无法重复设置' })
    }
    
    // 保存密码
    const hashedPassword = hashPassword(password)
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run('admin_password', hashedPassword)
    
    res.json({ success: true })
  } catch (e: any) {
    res.json({ success: false, message: e.message })
  }
})

// 登录
adminRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    
    if (username !== 'admin') {
      return res.json({ success: false, message: '用户名或密码错误' })
    }
    
    const db = getDb()
    const config = db.prepare('SELECT value FROM config WHERE key = ?').get('admin_password') as { value: string } | undefined
    
    if (!config?.value) {
      return res.json({ success: false, message: '请先设置密码' })
    }
    
    const hashedPassword = hashPassword(password)
    if (hashedPassword !== config.value) {
      return res.json({ success: false, message: '用户名或密码错误' })
    }
    
    const token = generateToken({ username: 'admin', role: 'admin' })
    res.json({ success: true, token })
  } catch (e: any) {
    res.json({ success: false, message: e.message })
  }
})

// 验证 Token 中间件
export function authMiddleware(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' })
  }
  
  const result = verifyToken(token)
  if (!result.valid) {
    return res.status(401).json({ success: false, message: 'Token 无效或已过期' })
  }
  
  (req as any).admin = result.payload
  next()
}

// 获取评论列表（管理用）
adminRouter.get('/comments', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb()
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit
    
    const total = (db.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number }).count
    const comments = db.prepare(`
      SELECT * FROM comments ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset)
    
    res.json({ success: true, data: { comments, total, page, limit } })
  } catch (e: any) {
    res.json({ success: false, message: e.message })
  }
})

// 删除评论
adminRouter.delete('/comments/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = getDb()
    db.prepare('DELETE FROM comments WHERE id = ?').run(id)
    res.json({ success: true })
  } catch (e: any) {
    res.json({ success: false, message: e.message })
  }
})
