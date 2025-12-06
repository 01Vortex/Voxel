// 时间格式化
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const time = `${hours}:${minutes}`

  if (targetDay.getTime() === today.getTime()) {
    return time
  } else if (targetDay.getTime() === yesterday.getTime()) {
    return `昨天 ${time}`
  } else if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
  } else {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${time}`
  }
}

// 相对时间
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return '刚刚'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}天前`

  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
