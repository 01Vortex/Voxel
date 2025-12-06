import crypto from 'crypto'

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// MD5 哈希
export function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

// 获取 Gravatar 头像
export function getGravatar(email: string, size = 80): string {
  const hash = md5(email.trim().toLowerCase())
  return `https://cravatar.cn/avatar/${hash}?s=${size}&d=mp`
}

// 获取 QQ 头像
export function getQQAvatar(email: string): string | null {
  const qqMatch = email.match(/^(\d{5,11})@qq\.com$/i)
  if (qqMatch) {
    return `https://q1.qlogo.cn/g?b=qq&nk=${qqMatch[1]}&s=100`
  }
  return null
}

// 智能获取头像
export function getAvatar(email: string): string {
  return getQQAvatar(email) || getGravatar(email)
}

// XSS 过滤
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
