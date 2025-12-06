import { md5 } from './md5'

// 获取 Gravatar 头像
export function getGravatar(email: string, size = 80): string {
  const hash = md5(email.trim().toLowerCase())
  return `https://cravatar.cn/avatar/${hash}?s=${size}&d=mp`
}

// 获取 QQ 头像（如果是 QQ 邮箱）
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
