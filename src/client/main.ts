import { createApp } from 'vue'
import App from './App.vue'
import { setApiBase } from './utils/api'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// highlight.js 样式 (Xcode - macOS 风格)
import 'highlight.js/styles/xcode.css'

// 设置后端 API 地址
setApiBase('http://localhost:3000')

const app = createApp(App)
app.use(ElementPlus)
app.mount('#app')
