import { marked } from 'marked'
import hljs from 'highlight.js'

// 创建自定义渲染器
const renderer = new marked.Renderer()

// 自定义代码块
renderer.code = function (code: string, language?: string): string {
  const lang = language || ''
  let highlighted: string

  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(code, { language: lang }).value
    } catch {
      highlighted = hljs.highlightAuto(code).value
    }
  } else {
    highlighted = hljs.highlightAuto(code).value
  }

  return `<pre class="voxel-code hljs" data-lang="${lang}"><code class="language-${lang}">${highlighted}</code></pre>`
}

// 自定义行内代码
renderer.codespan = function (code: string): string {
  return `<code class="voxel-inline-code">${code}</code>`
}

// 自定义链接（新窗口打开）
renderer.link = function (href: string | null, title: string | null, text: string): string {
  const url = href || ''
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${url}"${titleAttr} target="_blank" rel="noopener noreferrer" class="voxel-link">${text}</a>`
}

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
  renderer
})

// 渲染内容（支持 Markdown、图片）
export function renderContent(content: string): string {
  if (!content) return ''

  // 先处理图片标记，转换为占位符
  let processed = content.replace(/\[img\](.*?)\[\/img\]/g, '{{VOXEL_IMG:$1}}')

  // 处理行内代码块格式 ```lang code``` 转为标准格式
  processed = processed.replace(/```(\w*)\s*([^`]+)```/g, (_, lang, code) => {
    return '```' + lang + '\n' + code.trim() + '\n```'
  })

  // 使用 marked 解析 Markdown
  let html = marked.parse(processed) as string

  // 还原图片标记为自定义格式
  html = html.replace(
    /\{\{VOXEL_IMG:(.*?)\}\}/g,
    '<img class="voxel-img" src="$1" alt="图片" data-preview="$1" />'
  )

  return html
}

// 判断是否是纯图片消息
export function isImageOnly(content: string): boolean {
  if (!content) return false
  const withoutImages = content.replace(/\[img\].*?\[\/img\]/g, '').trim()
  return content.includes('[img]') && withoutImages === ''
}
