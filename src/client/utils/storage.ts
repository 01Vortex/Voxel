const STORAGE_KEY = 'voxel_comment_user'

export interface StoredUser {
  email: string
  nickname: string
}

// 保存用户信息到本地
export function saveUser(user: StoredUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

// 获取保存的用户信息
export function getUser(): StoredUser | null {
  const data = localStorage.getItem(STORAGE_KEY)
  if (data) {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  return null
}

// 保存草稿
export function saveDraft(url: string, content: string): void {
  localStorage.setItem(`voxel_draft_${url}`, content)
}

// 获取草稿
export function getDraft(url: string): string {
  return localStorage.getItem(`voxel_draft_${url}`) || ''
}

// 清除草稿
export function clearDraft(url: string): void {
  localStorage.removeItem(`voxel_draft_${url}`)
}
