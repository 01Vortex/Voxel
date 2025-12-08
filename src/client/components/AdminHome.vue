<template>
  <div class="admin-page">
    <!-- 顶部头像 -->
    <div class="admin-top">
      <el-avatar :size="60" :src="avatarUrl" />
    </div>

    <!-- 主内容区 -->
    <div class="admin-main">
      <!-- 左侧菜单 -->
      <div class="admin-menu">
        <el-menu :default-active="activeTab" @select="handleMenuSelect">
          <div class="menu-group-title">管理</div>
          <el-menu-item index="dashboard">
            <el-icon><DataLine /></el-icon>
            <span>仪表板</span>
          </el-menu-item>
          <el-menu-item index="comments">
            <el-icon><ChatDotRound /></el-icon>
            <span>评论管理</span>
          </el-menu-item>
          <el-menu-item index="settings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
          <div class="menu-group-title">操作</div>
          <el-menu-item index="logout">
            <el-icon><SwitchButton /></el-icon>
            <span>退出登录</span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 右侧内容 -->
      <div class="admin-content">
        <!-- 仪表板 -->
        <template v-if="activeTab === 'dashboard'">
          <h2 class="content-title">数据统计</h2>
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-label">总评论数</div>
              <div class="stat-desc">所有文章的评论总数</div>
              <div class="stat-value">{{ stats.totalComments }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">文章数</div>
              <div class="stat-desc">有评论的文章数量</div>
              <div class="stat-value">{{ stats.totalPages }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">今日评论</div>
              <div class="stat-desc">今天收到的新评论</div>
              <div class="stat-value">{{ stats.todayComments }}</div>
            </div>
          </div>
        </template>

        <!-- 评论管理 -->
        <template v-if="activeTab === 'comments'">
          <h2 class="content-title">评论管理</h2>
          
          <!-- 搜索和筛选 -->
          <div class="filter-row">
            <el-input v-model="searchKeyword" placeholder="搜索评论..." clearable style="width: 300px" @keyup.enter="searchComments">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="selectedUrl" placeholder="筛选文章" clearable style="width: 250px" @change="loadComments">
              <el-option v-for="url in urls" :key="url" :label="url" :value="url" />
            </el-select>
            <el-button type="primary" @click="searchComments">搜索</el-button>
            <el-button v-if="selectedComments.size > 0" type="danger" @click="batchDeleteComments" :loading="deleting">
              删除选中 ({{ selectedComments.size }})
            </el-button>
          </div>

          <!-- 评论列表 -->
          <el-table :data="comments" v-loading="loadingComments" @selection-change="handleSelectionChange" style="width: 100%">
            <el-table-column type="selection" width="50" />
            <el-table-column label="用户" width="200">
              <template #default="{ row }">
                <div class="user-cell">
                  <el-avatar :size="36" :src="row.avatar" />
                  <div class="user-info">
                    <div class="user-name">{{ row.nickname }}</div>
                    <div class="user-email">{{ row.email }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="内容" min-width="300">
              <template #default="{ row }">
                <div class="comment-text" v-html="renderCommentContent(row.content)"></div>
              </template>
            </el-table-column>
            <el-table-column label="文章" width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="url-text">{{ row.url }}</span>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="120">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" text size="small" @click="deleteComment(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-row">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="totalComments"
              layout="prev, pager, next"
              @current-change="loadComments"
            />
          </div>
        </template>

        <!-- 系统设置 -->
        <template v-if="activeTab === 'settings'">
          <h2 class="content-title">系统设置</h2>
          <div class="settings-card">
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">网站名称</div>
                <div class="setting-desc">显示在评论区的网站名称</div>
              </div>
              <el-input v-model="config.siteName" placeholder="输入网站名称" style="width: 250px" />
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">管理员邮箱</div>
                <div class="setting-desc">用于接收通知的邮箱地址</div>
              </div>
              <el-input v-model="config.adminEmail" placeholder="输入邮箱" style="width: 250px" />
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">每页显示数量</div>
                <div class="setting-desc">评论列表每页显示的条数</div>
              </div>
              <el-input-number v-model="config.pageSize" :min="5" :max="100" />
            </div>
            <div class="setting-actions">
              <el-button type="primary" @click="saveConfig" :loading="savingConfig">保存设置</el-button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DataLine, ChatDotRound, Setting, SwitchButton, Search } from '@element-plus/icons-vue'


interface Comment {
  id: string
  url: string
  nickname: string
  email: string
  content: string
  avatar: string
  createdAt: number
}

interface Stats {
  totalComments: number
  totalPages: number
  todayComments: number
}

const props = defineProps<{
  token: string
  apiBase?: string
}>()

const emit = defineEmits<{
  (e: 'logout'): void
}>()

const apiBase = props.apiBase || 'http://localhost:3000'
const activeTab = ref('dashboard')
const loadingComments = ref(false)
const savingConfig = ref(false)
const deleting = ref(false)

const avatarUrl = 'https://cravatar.cn/avatar/?d=mp'

const stats = reactive<Stats>({
  totalComments: 0,
  totalPages: 0,
  todayComments: 0
})

const comments = ref<Comment[]>([])
const urls = ref<string[]>([])
const selectedUrl = ref('')
const searchKeyword = ref('')
const currentPage = ref(1)
const totalComments = ref(0)
const pageSize = ref(20)
const selectedComments = ref<Set<string>>(new Set())

const config = reactive({
  siteName: '',
  adminEmail: '',
  pageSize: 20
})

function handleMenuSelect(index: string) {
  if (index === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      emit('logout')
    }).catch(() => {})
  } else {
    activeTab.value = index
  }
}

function handleSelectionChange(selection: Comment[]) {
  selectedComments.value = new Set(selection.map(c => c.id))
}

// 渲染评论内容
function renderCommentContent(content: string): string {
  if (!content) return ''
  return content.replace(
    /\[img\](.*?)\[\/img\]/g,
    '<img class="comment-img" src="$1" alt="图片" />'
  )
}

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString()
}

// 加载统计数据
async function loadStats() {
  try {
    const res = await fetch(`${apiBase}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${props.token}` }
    })
    const data = await res.json()
    if (data.success) Object.assign(stats, data.data)
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

// 加载评论列表
async function loadComments() {
  loadingComments.value = true
  try {
    const params = new URLSearchParams({
      page: String(currentPage.value),
      limit: String(pageSize.value)
    })
    if (selectedUrl.value) params.append('url', selectedUrl.value)
    if (searchKeyword.value) params.append('keyword', searchKeyword.value)

    const res = await fetch(`${apiBase}/api/admin/comments?${params}`, {
      headers: { Authorization: `Bearer ${props.token}` }
    })
    const data = await res.json()
    if (data.success) {
      comments.value = data.data.comments
      totalComments.value = data.data.total
    }
  } catch (e) {
    console.error('加载评论失败:', e)
  } finally {
    loadingComments.value = false
  }
}

// 搜索评论
function searchComments() {
  currentPage.value = 1
  loadComments()
}

// 删除评论
async function deleteComment(id: string) {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', { type: 'warning' })
    const res = await fetch(`${apiBase}/api/admin/comments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${props.token}` }
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('删除成功')
      loadComments()
      loadStats()
    } else {
      ElMessage.error(data.message || '删除失败')
    }
  } catch {}
}

// 批量删除
async function batchDeleteComments() {
  if (selectedComments.value.size === 0) return
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedComments.value.size} 条评论吗？`, '提示', { type: 'warning' })
    deleting.value = true
    const ids = Array.from(selectedComments.value)
    await Promise.all(ids.map(id => 
      fetch(`${apiBase}/api/admin/comments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${props.token}` }
      })
    ))
    ElMessage.success('删除成功')
    selectedComments.value.clear()
    loadComments()
    loadStats()
  } catch {} finally {
    deleting.value = false
  }
}

// 加载URL列表
async function loadUrls() {
  try {
    const res = await fetch(`${apiBase}/api/admin/urls`, {
      headers: { Authorization: `Bearer ${props.token}` }
    })
    const data = await res.json()
    if (data.success) urls.value = data.data
  } catch (e) {
    console.error('加载URL失败:', e)
  }
}

// 加载配置
async function loadConfig() {
  try {
    const res = await fetch(`${apiBase}/api/admin/config`, {
      headers: { Authorization: `Bearer ${props.token}` }
    })
    const data = await res.json()
    if (data.success) {
      config.siteName = data.data.site_name || ''
      config.adminEmail = data.data.admin_email || ''
      config.pageSize = parseInt(data.data.page_size) || 20
      pageSize.value = config.pageSize
    }
  } catch (e) {
    console.error('加载配置失败:', e)
  }
}

// 保存配置
async function saveConfig() {
  savingConfig.value = true
  try {
    const res = await fetch(`${apiBase}/api/admin/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${props.token}`
      },
      body: JSON.stringify(config)
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('保存成功')
      pageSize.value = config.pageSize
    } else {
      ElMessage.error(data.message || '保存失败')
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingConfig.value = false
  }
}

onMounted(async () => {
  await loadStats()
  await loadConfig()
  await loadUrls()
  await loadComments()
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.admin-top {
  display: flex;
  justify-content: center;
  padding: 24px 0;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.admin-main {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
  gap: 40px;
}

.admin-menu {
  width: 240px;
  flex-shrink: 0;
}

.admin-menu :deep(.el-menu) {
  border: none;
  background: transparent;
}

.admin-menu :deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
  border-radius: 8px;
  margin-bottom: 4px;
}

.admin-menu :deep(.el-menu-item.is-active) {
  background: #e6f7e6;
  color: #52c41a;
}

.menu-group-title {
  padding: 16px 20px 8px;
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
}

.admin-content {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 12px;
  padding: 32px;
}

.content-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 24px 0;
}

/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 24px;
}

.stat-item {
  flex: 1;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.stat-label {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.stat-desc {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #52c41a;
  margin-top: 12px;
}

/* 筛选行 */
.filter-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* 用户单元格 */
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  min-width: 0;
}

.user-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.user-email {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comment-text {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  word-break: break-word;
}

.comment-text :deep(.comment-img) {
  max-width: 80px;
  max-height: 80px;
  border-radius: 4px;
  margin: 4px 4px 4px 0;
  vertical-align: middle;
}

.url-text {
  font-size: 13px;
  color: #999;
}

/* 分页 */
.pagination-row {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 设置卡片 */
.settings-card {
  max-width: 700px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-of-type {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.setting-desc {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.setting-actions {
  padding-top: 24px;
}
</style>
