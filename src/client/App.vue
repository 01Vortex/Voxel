<template>
  <div class="app">
    <!-- 管理后台页面 -->
    <template v-if="isAdminPage">
      <AdminLogin
        v-if="!adminToken"
        api-base="http://localhost:3000"
        @login-success="handleLoginSuccess"
        @close="goHome"
      />
      <AdminHome
        v-else
        :token="adminToken"
        api-base="http://localhost:3000"
        @logout="handleLogout"
      />
    </template>
    <!-- 评论页面 -->
    <div v-else class="container">
      <VoxelComment api-base="http://localhost:3000" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import VoxelComment from './components/VoxelComment.vue'
import AdminLogin from './components/AdminLogin.vue'
import AdminHome from './components/AdminHome.vue'

const currentPath = ref(window.location.pathname)

const isAdminPage = computed(() => currentPath.value === '/voxel-admin')

const adminToken = ref<string | null>(null)

function handleLoginSuccess(token: string) {
  adminToken.value = token
}

function handleLogout() {
  adminToken.value = null
  localStorage.removeItem('voxel_admin_token')
  sessionStorage.removeItem('voxel_admin_token')
}

function goHome() {
  window.location.href = '/'
}

onMounted(() => {
  // 检查已保存的 token
  if (isAdminPage.value) {
    const token = localStorage.getItem('voxel_admin_token') || sessionStorage.getItem('voxel_admin_token')
    if (token) {
      adminToken.value = token
    }
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.container {
  width: 100%;
  max-width: 800px;
  margin-top: 20px;
}
</style>
