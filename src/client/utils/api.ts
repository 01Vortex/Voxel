import type { Comment, ApiResponse, CommentParams } from '../types'

// API 基础地址，可配置
let apiBase = ''

export function setApiBase(url: string): void {
  apiBase = url.replace(/\/$/, '')
}

// 获取评论列表
export async function getComments(url: string): Promise<Comment[]> {
  const res = await fetch(`${apiBase}/api/comment?url=${encodeURIComponent(url)}`)
  const data: ApiResponse<Comment[]> = await res.json()
  if (data.success) {
    return data.data || []
  }
  throw new Error(data.message || '获取评论失败')
}

// 提交评论
export async function postComment(params: CommentParams): Promise<Comment> {
  const res = await fetch(`${apiBase}/api/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  const data: ApiResponse<Comment> = await res.json()
  if (data.success && data.data) {
    return data.data
  }
  throw new Error(data.message || '提交评论失败')
}

// 获取评论数量
export async function getCommentCount(url: string): Promise<number> {
  const res = await fetch(`${apiBase}/api/comment/count?url=${encodeURIComponent(url)}`)
  const data: ApiResponse<number> = await res.json()
  if (data.success) {
    return data.data || 0
  }
  return 0
}
