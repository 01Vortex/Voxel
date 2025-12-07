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

// 上传图片返回类型
export interface UploadResult {
  url: string
  thumbnail: string
  id: string
}

// 上传图片（临时存储）
export async function uploadImage(base64: string): Promise<UploadResult> {
  const res = await fetch(`${apiBase}/api/upload/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 })
  })
  const data: ApiResponse<UploadResult> = await res.json()
  if (data.success && data.data) {
    return {
      url: apiBase + data.data.url,
      thumbnail: apiBase + data.data.thumbnail,
      id: data.data.id
    }
  }
  throw new Error(data.message || '上传图片失败')
}

// 保存图片到数据库（评论发送成功后调用）
export async function saveImages(imageIds: string[]): Promise<Record<string, { url: string; thumbnail: string }>> {
  if (imageIds.length === 0) return {}
  
  const res = await fetch(`${apiBase}/api/upload/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageIds })
  })
  const data: ApiResponse<Record<string, { url: string; thumbnail: string }>> = await res.json()
  if (data.success && data.data) {
    // 转换URL为完整路径
    const result: Record<string, { url: string; thumbnail: string }> = {}
    for (const [id, urls] of Object.entries(data.data)) {
      result[id] = {
        url: apiBase + urls.url,
        thumbnail: apiBase + urls.thumbnail
      }
    }
    return result
  }
  return {}
}
