<template>
  <div class="voxel-comment">
    <!-- 评论列表区域 -->
    <div class="voxel-messages" ref="messagesRef">
      <div v-if="loading" class="voxel-loading">加载中...</div>
      <div v-else-if="comments.length === 0" class="voxel-empty">暂无评论，快来抢沙发~</div>
      <template v-else>
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="voxel-message"
          :class="{ 'is-self': comment.isOwner }"
        >
          <img
            v-if="!comment.isOwner"
            class="voxel-avatar"
            :src="comment.avatar"
            :alt="comment.nickname"
          />
          <div class="voxel-bubble">
            <span class="voxel-content">{{ comment.content }}</span>
          </div>
          <img
            v-if="comment.isOwner"
            class="voxel-avatar"
            :src="comment.avatar"
            :alt="comment.nickname"
          />
        </div>
      </template>
    </div>

    <!-- 输入区域 -->
    <div class="voxel-input-area">
      <div class="voxel-input-row">
        <input
          v-model="form.email"
          type="email"
          class="voxel-input"
          placeholder="输入邮箱号"
          @blur="onEmailBlur"
        />
        <input
          v-model="form.nickname"
          type="text"
          class="voxel-input"
          placeholder="输入昵称"
        />
        <input
          v-model="form.note"
          type="text"
          class="voxel-input voxel-input-note"
          placeholder="备注"
        />
      </div>
      <div class="voxel-textarea-row">
        <textarea
          v-model="form.content"
          class="voxel-textarea"
          placeholder="说点什么..."
          @keydown.ctrl.enter="submit"
          @input="onContentInput"
        ></textarea>
        <button class="voxel-submit" @click="submit" :disabled="submitting">
          {{ submitting ? '...' : '发送' }}
          <span class="voxel-submit-arrow">∨</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import type { Comment } from '../types'
import {
  getComments,
  postComment,
  getAvatar,
  saveUser,
  getUser,
  saveDraft,
  getDraft,
  clearDraft,
  md5
} from '../utils'

const props = defineProps<{
  url?: string
  apiBase?: string
}>()

const messagesRef = ref<HTMLElement>()
const loading = ref(true)
const submitting = ref(false)
const comments = ref<Comment[]>([])

const form = reactive({
  email: '',
  nickname: '',
  note: '',
  content: ''
})

// 当前页面URL
const pageUrl = props.url || window.location.pathname

// 初始化
onMounted(async () => {
  // 恢复用户信息
  const savedUser = getUser()
  if (savedUser) {
    form.email = savedUser.email
    form.nickname = savedUser.nickname
  }
  
  // 恢复草稿
  form.content = getDraft(pageUrl)
  
  // 加载评论
  await loadComments()
})

// 加载评论
async function loadComments() {
  loading.value = true
  try {
    const list = await getComments(pageUrl)
    // 标记当前用户的评论（通过 emailHash 比较）
    const userEmailHash = form.email ? md5(form.email.trim().toLowerCase()) : ''
    comments.value = list.map(c => ({
      ...c,
      isOwner: userEmailHash && c.emailHash === userEmailHash
    }))
    scrollToBottom()
  } catch (e) {
    console.error('加载评论失败:', e)
  } finally {
    loading.value = false
  }
}

// 邮箱失焦时获取头像
function onEmailBlur() {
  // 可以在这里预览头像
}

// 内容输入时保存草稿
function onContentInput() {
  saveDraft(pageUrl, form.content)
}

// 提交评论
async function submit() {
  if (!form.content.trim()) return
  if (!form.email.trim() || !form.nickname.trim()) {
    alert('请填写邮箱和昵称')
    return
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
    
    // 添加到列表
    newComment.isOwner = true
    newComment.avatar = getAvatar(form.email)
    comments.value.push(newComment)
    
    // 保存用户信息
    saveUser({ email: form.email, nickname: form.nickname })
    
    // 清空内容和草稿
    form.content = ''
    clearDraft(pageUrl)
    
    scrollToBottom()
  } catch (e: any) {
    alert(e.message || '发送失败')
  } finally {
    submitting.value = false
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}
</script>

<style scoped>
.voxel-comment {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
  background: linear-gradient(180deg, #d4f1f9 0%, #e8f7fc 100%);
  border-radius: 8px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 消息列表 */
.voxel-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.voxel-loading,
.voxel-empty {
  text-align: center;
  color: #999;
  padding: 40px;
}

/* 单条消息 */
.voxel-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 80%;
}

.voxel-message.is-self {
  align-self: flex-end;
  flex-direction: row-reverse;
}

/* 头像 */
.voxel-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
}

/* 气泡 */
.voxel-bubble {
  background: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  word-break: break-word;
}

.voxel-message.is-self .voxel-bubble {
  background: #12b7f5;
  color: #fff;
}

.voxel-content {
  font-size: 14px;
  line-height: 1.5;
}

/* 输入区域 */
.voxel-input-area {
  background: #fff;
  border-top: 1px solid #e0e0e0;
  padding: 0;
}

.voxel-input-row {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.voxel-input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  outline: none;
  font-size: 14px;
  border-right: 1px solid #e0e0e0;
}

.voxel-input:last-child {
  border-right: none;
}

.voxel-input-note {
  flex: 0.5;
}

.voxel-input::placeholder {
  color: #999;
}

.voxel-textarea-row {
  display: flex;
  align-items: flex-end;
}

.voxel-textarea {
  flex: 1;
  padding: 12px 16px;
  border: none;
  outline: none;
  font-size: 14px;
  resize: none;
  min-height: 60px;
  max-height: 120px;
  font-family: inherit;
}

.voxel-textarea::placeholder {
  color: #999;
}

.voxel-submit {
  background: #12b7f5;
  color: #fff;
  border: none;
  padding: 10px 20px;
  margin: 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;
}

.voxel-submit:hover {
  background: #0ea5e0;
}

.voxel-submit:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.voxel-submit-arrow {
  font-size: 12px;
}

/* 滚动条美化 */
.voxel-messages::-webkit-scrollbar {
  width: 6px;
}

.voxel-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.voxel-messages::-webkit-scrollbar-track {
  background: transparent;
}
</style>
