import { Router, Request, Response } from 'express'
import { getDb, CommentRow } from '../db'
import { generateId, getAvatar, escapeHtml, md5 } from '../utils'

export const commentRouter = Router()

// 获取评论列表
commentRouter.get('/', (req: Request, res: Response) => {
  try {
    const url = req.query.url as string
    if (!url) {
      return res.json({ success: false, message: '缺少 url 参数' })
    }
    
    const db = getDb()
    const rows = db.prepare(`
      SELECT * FROM comments 
      WHERE url = ? 
      ORDER BY created_at ASC
    `).all(url) as CommentRow[]
    
    const comments = rows.map(row => ({
      id: row.id,
      content: row.content,
      email: maskEmail(row.email),
      emailHash: md5(row.email.toLowerCase()), // 用于前端判断是否是自己
      nickname: row.nickname,
      avatar: row.avatar,
      url: row.url,
      createdAt: row.created_at
    }))
    
    res.json({ success: true, data: comments })
  } catch (e: any) {
    res.json({ success: false, message: e.message })
  }
})

// 获取评论数量
commentRouter.get('/count', (req: Request, res: Response) => {
  try {
    const url = req.query.url as string
    if (!url) {
      return res.json({ success: false, message: '缺少 url 参数' })
    }
    
    const db = getDb()
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM comments WHERE url = ?
    `).get(url) as { count: number }
    
    res.json({ success: true, data: result.count })
  } catch (e: any) {
    res.json({ success: false, message: e.message })
  }
})

// 提交评论
commentRouter.post('/', (req: Request, res: Response) => {
  try {
    const { content, email, nickname, url, note } = req.body
    
    // 验证
    if (!content?.trim()) {
      return res.json({ success: false, message: '评论内容不能为空' })
    }
    if (!email?.trim() || !nickname?.trim()) {
      return res.json({ success: false, message: '邮箱和昵称不能为空' })
    }
    if (!url) {
      return res.json({ success: false, message: '缺少页面地址' })
    }
    
    // 简单的内容过滤
    const safeContent = escapeHtml(content.trim())
    const safeNickname = escapeHtml(nickname.trim())
    
    const db = getDb()
    const id = generateId()
    const avatar = getAvatar(email.trim())
    const ip = req.ip || req.headers['x-forwarded-for'] as string || ''
    const ua = req.headers['user-agent'] || ''
    const createdAt = Date.now()
    
    db.prepare(`
      INSERT INTO comments (id, content, email, nickname, avatar, url, ip, ua, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, safeContent, email.trim().toLowerCase(), safeNickname, avatar, url, ip, ua, createdAt)
    
    res.json({
      success: true,
      data: {
        id,
        content: safeContent,
        email: maskEmail(email),
        emailHash: md5(email.trim().toLowerCase()),
        nickname: safeNickname,
        avatar,
        url,
        createdAt
      }
    })
  } catch (e: any) {
    res.json({ success: false, message: e.message })
  }
})

// 隐藏邮箱中间部分
function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return '***'
  if (name.length <= 2) return `${name[0]}***@${domain}`
  return `${name[0]}***${name[name.length - 1]}@${domain}`
}
