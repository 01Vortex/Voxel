export * from './avatar'
export * from './storage'
export * from './api'
export * from './md5'
export * from './time'
export * from './content'

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11)
}

// 简单的 XSS 过滤
export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
