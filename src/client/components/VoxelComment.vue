<template>
  <div class="voxel-comment">
    <!-- 评论列表区域 -->
    <div class="voxel-messages" ref="messagesRef">
      <div v-if="loading" class="voxel-loading">加载中...</div>
      <div v-else-if="comments.length === 0" class="voxel-empty">暂无评论，快来抢沙发~</div>
      <template v-else>
        <template v-for="(comment, index) in comments" :key="comment.id">
          <!-- 时间分隔线 -->
          <div v-if="shouldShowTime(index)" class="voxel-time-divider">
            <span>{{ formatTime(comment.createdAt) }}</span>
          </div>
          <!-- 消息 -->
          <div class="voxel-message" :class="{ 'is-self': comment.isOwner }">
            <img class="voxel-avatar" :src="comment.avatar" :alt="comment.nickname" />
            <div class="voxel-body">
              <div class="voxel-nickname">
                <span class="voxel-name">{{ comment.nickname }}</span>
                <span v-if="comment.note" class="voxel-note">{{ comment.note }}</span>
              </div>
              <div class="voxel-bubble">
                <span class="voxel-content" v-html="renderContent(comment.content)"></span>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- 输入区域 -->
    <div class="voxel-input-area">
      <div class="voxel-input-row">
        <input v-model="form.email" type="email" class="voxel-input" placeholder="邮箱" />
        <input v-model="form.nickname" type="text" class="voxel-input" placeholder="昵称" />
        <input v-model="form.note" type="text" class="voxel-input voxel-input-note" placeholder="备注" />
      </div>
      <div class="voxel-editor-row">
        <textarea
          ref="textareaRef"
          v-model="form.content"
          class="voxel-textarea"
          placeholder="说点什么... (Ctrl+Enter 发送)"
          @keydown.ctrl.enter="handleSubmit"
          @input="saveContentDraft"
        ></textarea>
        <div class="voxel-actions">
          <div class="voxel-actions-right">
            <div class="voxel-toolbar">
              <div class="voxel-emoji-wrapper" ref="emojiWrapperRef">
                <button class="voxel-tool-btn" @click.stop="showEmoji = !showEmoji" title="表情">😊</button>
                <div v-if="showEmoji" class="voxel-emoji-popup">
                  <div class="voxel-emoji-tabs">
                    <button
                      v-for="(cat, idx) in emojiCategories"
                      :key="cat.name"
                      class="voxel-emoji-tab"
                      :class="{ active: emojiTab === idx }"
                      @click.stop="emojiTab = idx"
                      :title="cat.name"
                    >{{ cat.icon }}</button>
                  </div>
                  <div class="voxel-emoji-list">
                    <span
                      v-for="emoji in currentEmojis"
                      :key="emoji"
                      class="voxel-emoji-item"
                      @click.stop="insertEmoji(emoji)"
                    >{{ emoji }}</span>
                  </div>
                </div>
              </div>
              <button class="voxel-tool-btn" @click="triggerImageUpload" title="图片">🖼️</button>
              <input
                ref="imageInputRef"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleImageUpload"
              />
            </div>
            <button class="voxel-submit" @click="handleSubmit" :disabled="submitting">
              {{ submitting ? '...' : '发送' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { Comment } from '../types'
import { useComment } from '../composables/useComment'
import { setApiBase } from '../utils/api'
import { formatTime as formatTimeUtil } from '../utils/time'
import { renderContent } from '../utils/content'
import { emojiCategories } from '../constants/emoji'

const props = defineProps<{
  url?: string
  apiBase?: string
}>()

// 设置 API 地址
if (props.apiBase) {
  setApiBase(props.apiBase)
}

const pageUrl = props.url || window.location.pathname

const {
  loading,
  submitting,
  comments,
  form,
  loadComments,
  submitComment,
  initForm,
  saveContentDraft
} = useComment(pageUrl)

// DOM refs
const messagesRef = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()
const imageInputRef = ref<HTMLInputElement>()
const emojiWrapperRef = ref<HTMLElement>()

// 表情相关
const showEmoji = ref(false)
const emojiTab = ref(0)
const currentEmojis = computed(() => emojiCategories[emojiTab.value]?.emojis || [])

// 时间格式化
function formatTime(timestamp: number): string {
  return formatTimeUtil(timestamp)
}

// 判断是否显示时间分隔（超过5分钟显示）
function shouldShowTime(index: number): boolean {
  if (index === 0) return true
  const current = comments.value[index]
  const prev = comments.value[index - 1]
  return current.createdAt - prev.createdAt > 5 * 60 * 1000
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 提交评论
async function handleSubmit() {
  const success = await submitComment()
  if (success) {
    scrollToBottom()
  }
}

// 插入表情
function insertEmoji(emoji: string) {
  const textarea = textareaRef.value
  if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    form.content = form.content.slice(0, start) + emoji + form.content.slice(end)
    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  } else {
    form.content += emoji
  }
}

// 触发图片上传
function triggerImageUpload() {
  imageInputRef.value?.click()
}

// 处理图片上传
function handleImageUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    alert('图片大小不能超过 2MB')
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    form.content += `[img]${base64}[/img]`
    saveContentDraft()
  }
  reader.readAsDataURL(file)
  input.value = ''
}

// 点击外部关闭表情弹窗
function handleClickOutside(e: MouseEvent) {
  if (showEmoji.value && emojiWrapperRef.value && !emojiWrapperRef.value.contains(e.target as Node)) {
    showEmoji.value = false
  }
}

onMounted(async () => {
  initForm()
  await loadComments()
  scrollToBottom()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.voxel-comment {
  display: flex;
  flex-direction: column;
  height: 500px;
  max-height: 500px;
  background: linear-gradient(180deg, #d4f1f9 0%, #e8f7fc 100%);
  border-radius: 8px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.voxel-messages {
  flex: 1;
  min-height: 0;
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

.voxel-time-divider {
  text-align: center;
  padding: 8px 0;
}

.voxel-time-divider span {
  font-size: 12px;
  color: #999;
  background: rgba(255, 255, 255, 0.6);
  padding: 4px 12px;
  border-radius: 10px;
}

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

.voxel-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
}

.voxel-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.voxel-nickname {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voxel-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.voxel-note {
  font-size: 11px;
  color: #999;
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 3px;
}

.voxel-message.is-self .voxel-nickname {
  flex-direction: row-reverse;
}

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

.voxel-content :deep(.voxel-img) {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  cursor: pointer;
  display: block;
  margin: 4px 0;
}

.voxel-emoji-wrapper {
  position: relative;
}

.voxel-emoji-popup {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  width: 340px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.voxel-emoji-tabs {
  display: flex;
  padding: 8px 12px;
  gap: 4px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.voxel-emoji-tab {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s;
}

.voxel-emoji-tab:hover {
  background: #e8e8e8;
}

.voxel-emoji-tab.active {
  background: #12b7f5;
}

.voxel-emoji-list {
  display: flex;
  flex-wrap: wrap;
  padding: 12px;
  max-height: 180px;
  overflow-y: auto;
  gap: 4px;
}

.voxel-emoji-item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  font-size: 22px;
  transition: all 0.2s;
}

.voxel-emoji-item:hover {
  background: #f0f0f0;
  transform: scale(1.2);
}

.voxel-input-area {
  flex-shrink: 0;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

.voxel-input-row {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.voxel-input {
  flex: 1;
  padding: 10px 12px;
  border: none;
  outline: none;
  font-size: 13px;
  border-right: 1px solid #e0e0e0;
  min-width: 0;
}

.voxel-input:last-child {
  border-right: none;
}

.voxel-input-note {
  flex: 0.4;
}

.voxel-input::placeholder {
  color: #aaa;
}

.voxel-editor-row {
  display: flex;
  flex-direction: column;
}

.voxel-textarea {
  flex: 1;
  padding: 10px 12px;
  border: none;
  outline: none;
  font-size: 14px;
  resize: none;
  min-height: 50px;
  max-height: 100px;
  font-family: inherit;
  line-height: 1.5;
}

.voxel-textarea::placeholder {
  color: #aaa;
}

.voxel-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 12px;
  border-top: 1px solid #f0f0f0;
}

.voxel-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voxel-toolbar {
  display: flex;
  gap: 4px;
}

.voxel-tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  transition: background 0.2s;
}

.voxel-tool-btn:hover {
  background: #f0f0f0;
}

.voxel-submit {
  background: #12b7f5;
  color: #fff;
  border: none;
  padding: 8px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.voxel-submit:hover {
  background: #0ea5e0;
}

.voxel-submit:disabled {
  background: #ccc;
  cursor: not-allowed;
}

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
