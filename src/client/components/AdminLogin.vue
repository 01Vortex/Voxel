<template>
  <div class="admin-login-page">
    <!-- 背景装饰 -->
    <div class="bg-shape bg-shape-1"></div>
    <div class="bg-shape bg-shape-2"></div>
    
    <!-- 登录/设置密码卡片 -->
    <div class="login-card">
      <h1 class="login-title">Voxel 后台管理系统</h1>
      
      <!-- 首次设置密码 -->
      <form v-if="isFirstSetup" @submit.prevent="handleSetPassword">
        <p class="setup-hint">首次使用，请设置管理员密码</p>
        
        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input
            v-model="setupForm.password"
            type="password"
            placeholder="设置密码"
            class="login-input"
          />
        </div>
        
        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input
            v-model="setupForm.confirmPassword"
            type="password"
            placeholder="确认密码"
            class="login-input"
          />
        </div>
        
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '设置中...' : '确认设置' }}
        </button>
      </form>
      
      <!-- 登录表单 -->
      <form v-else @submit.prevent="handleLogin">
        <div class="input-group">
          <span class="input-icon">👤</span>
          <input
            v-model="form.username"
            type="text"
            placeholder="admin"
            class="login-input"
          />
        </div>
        
        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            class="login-input"
          />
        </div>
        
        <div class="login-options">
          <label class="remember-me">
            <input type="checkbox" v-model="form.remember" />
            <span>记住我</span>
          </label>
        </div>
        
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '确认' }}
        </button>
      </form>
      
      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

const emit = defineEmits<{
  (e: 'login-success', token: string): void
  (e: 'close'): void
}>()

const props = defineProps<{
  apiBase?: string
}>()

const loading = ref(false)
const error = ref('')
const isFirstSetup = ref(false)

const form = reactive({
  username: 'admin',
  password: '',
  remember: true
})

const setupForm = reactive({
  password: '',
  confirmPassword: ''
})

const apiBase = props.apiBase || 'http://localhost:3000'

// 检查是否首次设置
async function checkFirstSetup() {
  try {
    const res = await fetch(`${apiBase}/api/admin/check`)
    const data = await res.json()
    isFirstSetup.value = !data.initialized
  } catch {
    // 默认显示登录
    isFirstSetup.value = false
  }
}

// 首次设置密码
async function handleSetPassword() {
  if (!setupForm.password) {
    error.value = '请输入密码'
    return
  }
  if (setupForm.password.length < 6) {
    error.value = '密码至少6位'
    return
  }
  if (setupForm.password !== setupForm.confirmPassword) {
    error.value = '两次密码不一致'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    const res = await fetch(`${apiBase}/api/admin/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: setupForm.password })
    })
    
    const data = await res.json()
    
    if (data.success) {
      isFirstSetup.value = false
      form.password = setupForm.password
      // 自动登录
      await handleLogin()
    } else {
      error.value = data.message || '设置失败'
    }
  } catch {
    error.value = '网络错误，请重试'
  } finally {
    loading.value = false
  }
}

// 登录
async function handleLogin() {
  if (!form.password) {
    error.value = '请输入密码'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    const res = await fetch(`${apiBase}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username,
        password: form.password
      })
    })
    
    const data = await res.json()
    
    if (data.success && data.token) {
      if (form.remember) {
        localStorage.setItem('voxel_admin_token', data.token)
      } else {
        sessionStorage.setItem('voxel_admin_token', data.token)
      }
      emit('login-success', data.token)
    } else {
      error.value = data.message || '登录失败'
    }
  } catch {
    error.value = '网络错误，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  checkFirstSetup()
})
</script>

<style scoped>
.admin-login-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  overflow: hidden;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  background-image: linear-gradient(120deg, #66a6ff 0%, #89f7fe 100%);
  opacity: 0.5;
}

.bg-shape-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  left: -100px;
}

.bg-shape-2 {
  width: 350px;
  height: 350px;
  bottom: -80px;
  right: -80px;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  width: 380px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.login-title {
  text-align: center;
  color: #66a6ff;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 32px;
}

.setup-hint {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-bottom: 24px;
}

.input-group {
  position: relative;
  margin-bottom: 16px;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  opacity: 0.5;
}

.login-input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.login-input:focus {
  border-color: #66a6ff;
}

.login-input::placeholder {
  color: #9ca3af;
}

.login-options {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 24px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #66a6ff;
  cursor: pointer;
}

.remember-me input[type="checkbox"] {
  accent-color: #66a6ff;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background-image: linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.login-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-msg {
  text-align: center;
  color: #ef4444;
  font-size: 13px;
  margin-top: 16px;
}
</style>
