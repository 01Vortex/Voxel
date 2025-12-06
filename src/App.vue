<template>
  <div class="app">
    <div class="container">
      <h1 class="title">Voxel 评论系统</h1>
      <p class="subtitle">一个简洁的聊天式评论系统</p>
      <VoxelComment api-base="http://localhost:3000" />
    </div>
  </div>
</template>

<script setup lang="ts">
import VoxelComment from './components/VoxelComment.vue'
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

.title {
  text-align: center;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.subtitle {
  text-align: center;
  margin-bottom: 20px;
  color: #666;
  font-size: 14px;
}
</style>
