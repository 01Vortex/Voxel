import { createApp } from 'vue'
import App from './App.vue'
import { setApiBase } from './client'

// 设置后端 API 地址
setApiBase('http://localhost:3000')

createApp(App).mount('#app')
