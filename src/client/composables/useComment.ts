import { ref, reactive, watch } from 'vue'
import type { Comment } from '../types'
import { getAvatar, md5 } from '../utils'
import { getComments, postComment } from '../utils/api'
import { saveUser, getUser, saveDraft, getDraft, clearDraft } from '../utils/storage'

export interface CommentForm {
  email: string
  nickname: string
  note: string
  content: string
}

export function useComment(pageUrl: string) {
  const loading = ref(true)
  const submitting = ref(false)
  const comments = ref<Comment[]>([])

  const form = reactive<CommentForm>({
    email: '',
    nickname: '',
    note: '',
    content: ''
  })

  function getUserEmailHash(): string {
    if (!form.email) return ''
    return md5(form.email.trim().toLowerCase())
  }

  async function loadComments() {
    loading.value = true
    try {
      const list = await getComments(pageUrl)
      const userHash = getUserEmailHash()
      comments.value = list.map(c => ({
        ...c,
        isOwner: userHash ? c.emailHash === userHash : false
      }))
    } catch (e) {
      console.error('加载评论失败:', e)
    } finally {
      loading.value = false
    }
  }

  async function submitComment(): Promise<boolean> {
    if (!form.content.trim()) return false
    if (!form.email.trim() || !form.nickname.trim()) {
      alert('请填写邮箱和昵称')
      return false
    }

    submitting.value = true
    try {
      const newComment = await postComment({
        content: form.content.trim(),
        email: form.email.trim(),
        nickname: form.nickname.trim(),
        url: pageUrl,
        note: form.note.trim()
      })
      newComment.isOwner = true
      newComment.avatar = getAvatar(form.email)
      comments.value.push(newComment)

      saveUser({ email: form.email, nickname: form.nickname })
      form.content = ''
      clearDraft(pageUrl)
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '发送失败'
      alert(msg)
      return false
    } finally {
      submitting.value = false
    }
  }

  function initForm() {
    const savedUser = getUser()
    if (savedUser) {
      form.email = savedUser.email
      form.nickname = savedUser.nickname
    }
    form.content = getDraft(pageUrl)
  }

  function saveContentDraft() {
    saveDraft(pageUrl, form.content)
  }

  // 监听邮箱变化，更新评论归属
  watch(() => form.email, () => {
    const userHash = getUserEmailHash()
    comments.value = comments.value.map(c => ({
      ...c,
      isOwner: c.emailHash === userHash
    }))
  })

  return {
    loading,
    submitting,
    comments,
    form,
    loadComments,
    submitComment,
    initForm,
    saveContentDraft
  }
}
