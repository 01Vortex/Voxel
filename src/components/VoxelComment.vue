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
          >
            <img
              class="voxel-avatar"
              :src="comment.avatar"
              :alt="comment.nickname"
            />
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
        <input
          v-model="form.email"
          type="email"
          class="voxel-input"
          placeholder="邮箱"
        />
        <input
          v-model="form.nickname"
          type="text"
          class="voxel-input"
          placeholder="昵称"
        />
        <input
          v-model="form.note"
          type="text"
          class="voxel-input voxel-input-note"
          placeholder="备注"
        />
      </div>
      <div class="voxel-editor-row">
        <textarea
          ref="textareaRef"
          v-model="form.content"
          class="voxel-textarea"
          placeholder="说点什么... (Ctrl+Enter 发送)"
          @keydown.ctrl.enter="submit"
          @input="onContentInput"
        ></textarea>
        <div class="voxel-actions">
          <div class="voxel-actions-right">
            <div class="voxel-toolbar">
              <div class="voxel-emoji-wrapper" ref="emojiWrapperRef">
                <button class="voxel-tool-btn" @click.stop="showEmoji = !showEmoji" title="表情">
                  😊
                </button>
                <!-- 表情弹窗 -->
                <div v-if="showEmoji" class="voxel-emoji-popup">
                  <div class="voxel-emoji-tabs">
                    <button
                      v-for="(cat, index) in emojiCategories"
                      :key="cat.name"
                      class="voxel-emoji-tab"
                      :class="{ active: emojiTab === index }"
                      @click.stop="emojiTab = index"
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
              <button class="voxel-tool-btn" @click="triggerImageUpload" title="图片">
                🖼️
              </button>
              <input
                ref="imageInputRef"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleImageUpload"
              />
            </div>
            <button class="voxel-submit" @click="submit" :disabled="submitting">
              {{ submitting ? '...' : '发送' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

interface Comment {
  id: string
  content: string
  email: string
  emailHash?: string
  nickname: string
  avatar: string
  createdAt: number
  url: string
  isOwner?: boolean
}

const props = defineProps<{
  url?: string
  apiBase?: string
}>()

const messagesRef = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()
const imageInputRef = ref<HTMLInputElement>()
const emojiWrapperRef = ref<HTMLElement>()
const loading = ref(true)
const submitting = ref(false)
const showEmoji = ref(false)
const emojiTab = ref(0)
const comments = ref<Comment[]>([])

// 表情包分类 - 简化版避免编码问题
const EMOJI_FACE = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥']
const EMOJI_HAND = ['👍','👎','👏','🙌','🤝','👋','🤞','🤟','🤘','👌','👈','👉','👆','👇','✋','🖐','🖖','👊','✊','🤛','🤜','🤙','💪','🙏','🤳','💅','👂','👃','👀','👁']
const EMOJI_HEART = ['❤','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💞','💓','💗','💖','💘','💝','💟','😍','🥰','😘','😻','💑','💏','💌','🌹','🎀','💐','🌸','🌺']
const EMOJI_ANIMAL = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋']
const EMOJI_FOOD = ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍈','🍒','🍑','🍍','🥝','🍅','🍆','🥑','🥦','🍔','🍟','🍕','🌭','🥪','🌮','🍜','🍣','🍦','🎂','🍰','🧁','🍩']
const emojiCategories = [
  { name: '常用', icon: '😊', emojis: EMOJI_FACE },
  { name: '手势', icon: '👍', emojis: EMOJI_HAND },
  { name: '爱心', icon: '❤', emojis: EMOJI_HEART },
  { name: '动物', icon: '🐱', emojis: EMOJI_ANIMAL },
  { name: '食物', icon: '🍔', emojis: EMOJI_FOOD }
]

// 删除旧的重复定义
// 当前选中的表情列表
const currentEmojis = computed(() => emojiCategories[emojiTab.value]?.emojis || [])


const form = reactive({
  email: '',
  nickname: '',
  note: '',
  content: ''
})

const STORAGE_KEY = 'voxel_comment_user'
const pageUrl = props.url || window.location.pathname
const apiBase = props.apiBase || 'http://localhost:3000'

// 真正的 MD5 实现
function md5(str: string): string {
  function rotateLeft(val: number, shift: number): number {
    return (val << shift) | (val >>> (32 - shift))
  }
  function addUnsigned(x: number, y: number): number {
    const x8 = x & 0x80000000, y8 = y & 0x80000000
    const x4 = x & 0x40000000, y4 = y & 0x40000000
    const result = (x & 0x3fffffff) + (y & 0x3fffffff)
    if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8
    if (x4 | y4) {
      if (result & 0x40000000) return result ^ 0xc0000000 ^ x8 ^ y8
      return result ^ 0x40000000 ^ x8 ^ y8
    }
    return result ^ x8 ^ y8
  }
  function F(x: number, y: number, z: number) { return (x & y) | (~x & z) }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z) }
  function H(x: number, y: number, z: number) { return x ^ y ^ z }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z) }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function convertToWordArray(s: string): number[] {
    const len = s.length, numWords = (((len + 8) >>> 6) + 1) * 16
    const arr: number[] = new Array(numWords).fill(0)
    for (let i = 0; i < len; i++) {
      arr[i >>> 2] |= s.charCodeAt(i) << ((i % 4) * 8)
    }
    arr[len >>> 2] |= 0x80 << ((len % 4) * 8)
    arr[numWords - 2] = len * 8
    return arr
  }
  function wordToHex(val: number): string {
    let result = ''
    for (let i = 0; i <= 3; i++) {
      const byte = (val >>> (i * 8)) & 255
      result += ('0' + byte.toString(16)).slice(-2)
    }
    return result
  }
  const x = convertToWordArray(str)
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476
  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d
    a = FF(a,b,c,d,x[k],7,0xd76aa478); d = FF(d,a,b,c,x[k+1],12,0xe8c7b756)
    c = FF(c,d,a,b,x[k+2],17,0x242070db); b = FF(b,c,d,a,x[k+3],22,0xc1bdceee)
    a = FF(a,b,c,d,x[k+4],7,0xf57c0faf); d = FF(d,a,b,c,x[k+5],12,0x4787c62a)
    c = FF(c,d,a,b,x[k+6],17,0xa8304613); b = FF(b,c,d,a,x[k+7],22,0xfd469501)
    a = FF(a,b,c,d,x[k+8],7,0x698098d8); d = FF(d,a,b,c,x[k+9],12,0x8b44f7af)
    c = FF(c,d,a,b,x[k+10],17,0xffff5bb1); b = FF(b,c,d,a,x[k+11],22,0x895cd7be)
    a = FF(a,b,c,d,x[k+12],7,0x6b901122); d = FF(d,a,b,c,x[k+13],12,0xfd987193)
    c = FF(c,d,a,b,x[k+14],17,0xa679438e); b = FF(b,c,d,a,x[k+15],22,0x49b40821)
    a = GG(a,b,c,d,x[k+1],5,0xf61e2562); d = GG(d,a,b,c,x[k+6],9,0xc040b340)
    c = GG(c,d,a,b,x[k+11],14,0x265e5a51); b = GG(b,c,d,a,x[k],20,0xe9b6c7aa)
    a = GG(a,b,c,d,x[k+5],5,0xd62f105d); d = GG(d,a,b,c,x[k+10],9,0x2441453)
    c = GG(c,d,a,b,x[k+15],14,0xd8a1e681); b = GG(b,c,d,a,x[k+4],20,0xe7d3fbc8)
    a = GG(a,b,c,d,x[k+9],5,0x21e1cde6); d = GG(d,a,b,c,x[k+14],9,0xc33707d6)
    c = GG(c,d,a,b,x[k+3],14,0xf4d50d87); b = GG(b,c,d,a,x[k+8],20,0x455a14ed)
    a = GG(a,b,c,d,x[k+13],5,0xa9e3e905); d = GG(d,a,b,c,x[k+2],9,0xfcefa3f8)
    c = GG(c,d,a,b,x[k+7],14,0x676f02d9); b = GG(b,c,d,a,x[k+12],20,0x8d2a4c8a)
    a = HH(a,b,c,d,x[k+5],4,0xfffa3942); d = HH(d,a,b,c,x[k+8],11,0x8771f681)
    c = HH(c,d,a,b,x[k+11],16,0x6d9d6122); b = HH(b,c,d,a,x[k+14],23,0xfde5380c)
    a = HH(a,b,c,d,x[k+1],4,0xa4beea44); d = HH(d,a,b,c,x[k+4],11,0x4bdecfa9)
    c = HH(c,d,a,b,x[k+7],16,0xf6bb4b60); b = HH(b,c,d,a,x[k+10],23,0xbebfbc70)
    a = HH(a,b,c,d,x[k+13],4,0x289b7ec6); d = HH(d,a,b,c,x[k],11,0xeaa127fa)
    c = HH(c,d,a,b,x[k+3],16,0xd4ef3085); b = HH(b,c,d,a,x[k+6],23,0x4881d05)
    a = HH(a,b,c,d,x[k+9],4,0xd9d4d039); d = HH(d,a,b,c,x[k+12],11,0xe6db99e5)
    c = HH(c,d,a,b,x[k+15],16,0x1fa27cf8); b = HH(b,c,d,a,x[k+2],23,0xc4ac5665)
    a = II(a,b,c,d,x[k],6,0xf4292244); d = II(d,a,b,c,x[k+7],10,0x432aff97)
    c = II(c,d,a,b,x[k+14],15,0xab9423a7); b = II(b,c,d,a,x[k+5],21,0xfc93a039)
    a = II(a,b,c,d,x[k+12],6,0x655b59c3); d = II(d,a,b,c,x[k+3],10,0x8f0ccc92)
    c = II(c,d,a,b,x[k+10],15,0xffeff47d); b = II(b,c,d,a,x[k+1],21,0x85845dd1)
    a = II(a,b,c,d,x[k+8],6,0x6fa87e4f); d = II(d,a,b,c,x[k+15],10,0xfe2ce6e0)
    c = II(c,d,a,b,x[k+6],15,0xa3014314); b = II(b,c,d,a,x[k+13],21,0x4e0811a1)
    a = II(a,b,c,d,x[k+4],6,0xf7537e82); d = II(d,a,b,c,x[k+11],10,0xbd3af235)
    c = II(c,d,a,b,x[k+2],15,0x2ad7d2bb); b = II(b,c,d,a,x[k+9],21,0xeb86d391)
    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD)
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase()
}

function getAvatar(email: string): string {
  const qqMatch = email.match(/^(\d{5,11})@qq\.com$/i)
  if (qqMatch) {
    return `https://q1.qlogo.cn/g?b=qq&nk=${qqMatch[1]}&s=100`
  }
  const hash = md5(email.trim().toLowerCase())
  return `https://cravatar.cn/avatar/${hash}?s=80&d=mp`
}

function saveUser(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: form.email, nickname: form.nickname }))
}

function loadUser(): void {
  const data = localStorage.getItem(STORAGE_KEY)
  if (data) {
    try {
      const user = JSON.parse(data)
      form.email = user.email || ''
      form.nickname = user.nickname || ''
    } catch {}
  }
}

function saveDraft(): void {
  localStorage.setItem(`voxel_draft_${pageUrl}`, form.content)
}

function loadDraft(): void {
  form.content = localStorage.getItem(`voxel_draft_${pageUrl}`) || ''
}

function clearDraft(): void {
  localStorage.removeItem(`voxel_draft_${pageUrl}`)
}

// 获取当前用户邮箱的哈希
function getUserEmailHash(): string {
  if (!form.email) return ''
  return md5(form.email.trim().toLowerCase())
}

// 时间格式化
function formatTime(timestamp: number): string {
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

// 判断是否显示时间分隔（超过5分钟显示）
function shouldShowTime(index: number): boolean {
  if (index === 0) return true
  const current = comments.value[index]
  const prev = comments.value[index - 1]
  return current.createdAt - prev.createdAt > 5 * 60 * 1000 // 5分钟
}

// 渲染内容（支持图片）
function renderContent(content: string): string {
  // 转义 HTML
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 解析图片标记 [img]...[/img]
  html = html.replace(/\[img\](.*?)\[\/img\]/g, '<img class="voxel-img" src="$1" alt="图片" />')
  
  // 换行
  html = html.replace(/\n/g, '<br>')
  
  return html
}

async function loadComments() {
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/api/comment?url=${encodeURIComponent(pageUrl)}`)
    const data = await res.json()
    if (data.success) {
      const userHash = getUserEmailHash()
      comments.value = (data.data || []).map((c: Comment) => ({
        ...c,
        isOwner: c.emailHash === userHash
      }))
      scrollToBottom()
    }
  } catch (e) {
    console.error('加载评论失败:', e)
  } finally {
    loading.value = false
  }
}

function onContentInput() {
  saveDraft()
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
  // 不关闭弹窗，支持连续发送多个表情
}

// 触发图片上传
function triggerImageUpload() {
  imageInputRef.value?.click()
}

// 处理图片上传
async function handleImageUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 检查文件大小 (最大 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('图片大小不能超过 2MB')
    return
  }

  // 转为 base64
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    // 插入图片标记
    form.content += `[img]${base64}[/img]`
    saveDraft()
  }
  reader.readAsDataURL(file)
  
  // 清空 input
  input.value = ''
}

async function submit() {
  if (!form.content.trim()) return
  if (!form.email.trim() || !form.nickname.trim()) {
    alert('请填写邮箱和昵称')
    return
  }

  submitting.value = true
  try {
    const res = await fetch(`${apiBase}/api/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: form.content.trim(),
        email: form.email.trim(),
        nickname: form.nickname.trim(),
        url: pageUrl,
        note: form.note.trim()
      })
    })
    const data = await res.json()
    if (data.success && data.data) {
      data.data.isOwner = true
      data.data.avatar = getAvatar(form.email)
      comments.value.push(data.data)
      saveUser()
      form.content = ''
      clearDraft()
      scrollToBottom()
    } else {
      alert(data.message || '发送失败')
    }
  } catch (e: any) {
    alert(e.message || '发送失败')
  } finally {
    submitting.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 监听邮箱变化，更新评论归属
watch(() => form.email, () => {
  const userHash = getUserEmailHash()
  comments.value = comments.value.map(c => ({
    ...c,
    isOwner: c.emailHash === userHash
  }))
})

// 点击外部关闭表情弹窗
function handleClickOutside(e: MouseEvent) {
  if (showEmoji.value && emojiWrapperRef.value && !emojiWrapperRef.value.contains(e.target as Node)) {
    showEmoji.value = false
  }
}

onMounted(() => {
  loadUser()
  loadDraft()
  loadComments()
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

/* 表情弹窗 */
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
