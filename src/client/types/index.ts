// 评论数据类型
export interface Comment {
  id: string
  content: string
  email: string
  emailHash?: string // 邮箱MD5，用于判断是否是当前用户
  nickname: string
  avatar: string
  createdAt: number
  url: string // 页面URL，用于区分不同文章
  ip?: string
  ua?: string
  isOwner?: boolean // 是否是当前用户
}

// 用户信息
export interface UserInfo {
  email: string
  nickname: string
  avatar: string
}

// API 响应
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}

// 评论提交参数
export interface CommentParams {
  content: string
  email: string
  nickname: string
  url: string
  note?: string
}
