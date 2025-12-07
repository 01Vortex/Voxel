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
          <div
            class="voxel-message"
            :class="{ 'is-self': comment.isOwner }"
            @contextmenu.prevent="showContextMenu($event, comment)"
          >
            <img class="voxel-avatar" :src="comment.avatar" :alt="comment.nickname" />
            <div class="voxel-body">
              <div class="voxel-nickname">
                <span class="voxel-name">{{ comment.nickname }}</span>
                <span v-if="comment.note" class="voxel-note">{{ comment.note }}</span>
              </div>
              <div class="voxel-bubble" :class="{ 'is-image-only': isImageOnly(comment.content) }">
                <span class="voxel-content" v-html="renderContent(comment.content)"></span>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- 图片预览弹窗 -->
    <Teleport to="body">
      <div v-if="previewImage" class="voxel-preview-overlay" @click="closePreview">
        <img :src="previewImage" class="voxel-preview-img" @click.stop />
      </div>
    </Teleport>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="voxel-context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <div class="voxel-context-item" @click="copyContent">复制</div>
      </div>
    </Teleport>

    <!-- 输入区域 -->
    <div class="voxel-input-area">
      <div class="voxel-input-row">
        <img class="voxel-input-avatar" :src="userAvatar" alt="头像" />
        <div class="voxel-input-field">
          <span class="voxel-input-label">昵称</span>
          <input v-model="form.nickname" type="text" class="voxel-input" placeholder="必填" />
        </div>
        <div class="voxel-input-field">
          <span class="voxel-input-label">邮箱</span>
          <input v-model="form.email" type="email" class="voxel-input" placeholder="必填" @blur="updateAvatar" />
        </div>
      </div>
      <div class="voxel-editor-row">
        <div
          ref="editorRef"
          class="voxel-editor"
          contenteditable="true"
          :data-placeholder="'说点什么... (Ctrl+Enter 发送)'"
          @input="handleEditorInput"
          @keydown.ctrl.enter.prevent="handleSubmit"
          @paste="handlePaste"
        ></div>
        <div class="voxel-actions">
          <div class="voxel-actions-right">
            <div class="voxel-toolbar">
              <div class="voxel-emoji-wrapper" ref="emojiWrapperRef">
                <button type="button" class="voxel-tool-btn" @click.stop="showEmoji = !showEmoji" title="表情">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
                <div v-if="showEmoji" class="voxel-emoji-popup">
                  <div class="voxel-emoji-tabs">
                    <button
                      type="button"
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
              <button type="button" class="voxel-tool-btn" @click="triggerImageUpload" :disabled="uploading" :title="uploading ? '上传中...' : '图片'">
                <svg v-if="!uploading" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span v-else class="voxel-loading-icon">...</span>
              </button>
              <input
                ref="imageInputRef"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleImageUpload"
              />
            </div>
            <button type="button" class="voxel-submit" @click.prevent="handleSubmit" :disabled="submitting">
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
import { setApiBase, uploadImage, saveImages } from '../utils/api'
import { formatTime as formatTimeUtil } from '../utils/time'
import { renderContent, isImageOnly } from '../utils/content'
import { emojiCategories } from '../constants/emoji'
import { getAvatar } from '../utils'
import { useClosePopup } from '../utils/close_popup'

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
const editorRef = ref<HTMLElement>()
const imageInputRef = ref<HTMLInputElement>()
const emojiWrapperRef = ref<HTMLElement>()

// 图片预览
const previewImage = ref<string | null>(null)

function openPreview(src: string) {
  previewImage.value = src
}

function closePreview() {
  previewImage.value = null
}

// 右键菜单
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  content: ''
})

function showContextMenu(e: MouseEvent, comment: Comment) {
  // 提取纯文本内容（去掉图片标记）
  const textContent = comment.content.replace(/\[img\].*?\[\/img\]/g, '[图片]')
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    content: textContent
  }
}

function hideContextMenu() {
  contextMenu.value.visible = false
}

async function copyContent() {
  try {
    await navigator.clipboard.writeText(contextMenu.value.content)
  } catch {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = contextMenu.value.content
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  hideContextMenu()
}

// 使用工具函数处理 ESC 键关闭
useClosePopup(previewImage, closePreview)

// 处理图片双击预览
function handleImageDblClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG' && target.dataset.preview) {
    openPreview(target.dataset.preview)
  }
}

// 表情相关
const showEmoji = ref(false)
const emojiTab = ref(0)
const currentEmojis = computed(() => emojiCategories[emojiTab.value]?.emojis || [])

// 用户头像
const userAvatar = ref('https://cravatar.cn/avatar/?d=mp')

function updateAvatar() {
  if (form.email) {
    userAvatar.value = getAvatar(form.email)
  }
}

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
    requestAnimationFrame(() => {
      if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight
      }
    })
  })
}

// 从编辑器获取内容和图片ID
function getEditorContent(): { content: string; imageIds: string[] } {
  if (!editorRef.value) return { content: '', imageIds: [] }
  
  let content = ''
  const imageIds: string[] = []
  const walker = document.createTreeWalker(
    editorRef.value,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    null
  )
  
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      content += node.textContent
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.tagName === 'IMG' && el.dataset.url) {
        // 提取图片ID（从URL中）
        const match = el.dataset.url.match(/Vx_[A-Za-z0-9]{6}/)
        if (match) {
          imageIds.push(match[0])
        }
        content += `[img]${el.dataset.url}[/img]`
      } else if (el.tagName === 'BR') {
        content += '\n'
      }
    }
  }
  
  return { content: content.trim(), imageIds }
}

// 处理编辑器输入
function handleEditorInput() {
  const { content } = getEditorContent()
  form.content = content
  saveContentDraft()
}

// 处理粘贴
function handlePaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

// 提交评论
async function handleSubmit() {
  // 记录当前页面滚动位置
  const pageScrollY = window.scrollY
  
  // 从编辑器获取内容和图片ID
  const { content, imageIds } = getEditorContent()
  
  // 如果有图片，先保存到数据库
  if (imageIds.length > 0) {
    const savedUrls = await saveImages(imageIds)
    // 替换临时URL为永久URL
    let finalContent = content
    for (const [id, urls] of Object.entries(savedUrls)) {
      // 替换临时URL为数据库URL
      const tempPattern = new RegExp(`\\[img\\][^\\[]*${id}[^\\[]*\\[/img\\]`, 'g')
      finalContent = finalContent.replace(tempPattern, `[img]${urls.url}[/img]`)
    }
    form.content = finalContent
  } else {
    form.content = content
  }
  
  const success = await submitComment()
  if (success) {
    // 清空编辑器
    if (editorRef.value) {
      editorRef.value.innerHTML = ''
    }
    // 恢复页面滚动位置，防止抖动
    window.scrollTo(0, pageScrollY)
    scrollToBottom()
  }
}

// 插入表情
function insertEmoji(emoji: string) {
  if (editorRef.value) {
    editorRef.value.focus()
    document.execCommand('insertText', false, emoji)
    handleEditorInput()
  }
}

// 触发图片上传
function triggerImageUpload() {
  imageInputRef.value?.click()
}

// 图片上传中状态
const uploading = ref(false)

// 在编辑器中插入图片
function insertImage(url: string, thumbnail: string) {
  if (!editorRef.value) return
  
  editorRef.value.focus()
  
  // 创建图片元素
  const img = document.createElement('img')
  img.src = thumbnail
  img.dataset.url = url // 存储原图URL用于发送
  img.className = 'voxel-editor-img'
  img.contentEditable = 'false'
  // 直接设置内联样式确保生效
  img.style.cssText = 'width: 60px; height: 60px; object-fit: cover; border-radius: 6px; vertical-align: middle; margin: 2px; cursor: default;'
  
  // 插入图片
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(img)
    range.setStartAfter(img)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    editorRef.value.appendChild(img)
  }
  
  handleEditorInput()
}

// 处理图片上传
async function handleImageUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 限制原始文件大小为 8MB，后端会压缩
  if (file.size > 8 * 1024 * 1024) {
    alert('图片大小不能超过 8MB')
    return
  }

  const reader = new FileReader()
  reader.onload = async () => {
    const base64 = reader.result as string
    uploading.value = true
    try {
      const result = await uploadImage(base64)
      // 在编辑器中插入图片
      insertImage(result.url, result.thumbnail)
    } catch (err: any) {
      alert(err.message || '上传图片失败')
    } finally {
      uploading.value = false
    }
  }
  reader.readAsDataURL(file)
  input.value = ''
}

// 点击外部关闭表情弹窗和右键菜单
function handleClickOutside(e: MouseEvent) {
  if (showEmoji.value && emojiWrapperRef.value && !emojiWrapperRef.value.contains(e.target as Node)) {
    showEmoji.value = false
  }
  // 关闭右键菜单
  if (contextMenu.value.visible) {
    hideContextMenu()
  }
}

onMounted(async () => {
  initForm()
  updateAvatar()
  await loadComments()
  scrollToBottom()
  document.addEventListener('click', handleClickOutside)
  // 监听图片双击事件
  messagesRef.value?.addEventListener('dblclick', handleImageDblClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  messagesRef.value?.removeEventListener('dblclick', handleImageDblClick)
})
</script>

<style scoped>
@import '../style/voxel-comment.css';
</style>
