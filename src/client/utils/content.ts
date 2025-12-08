import { marked } from 'marked'
import hljs from 'highlight.js'

// 创建自定义渲染器
const renderer = new marked.Renderer()

// 自定义代码块
renderer.code = function ({ text, lang }: { text: string; lang?: string }): string {
  const language = lang || ''
  let highlighted: string

  if (language && hljs.getLanguage(language)) {
    try {
      highlighted = hljs.highlight(text, { language }).value
    } catch {
      highlighted = hljs.highlightAuto(text).value
    }
  } else {
    highlighted = hljs.highlightAuto(text).value
  }

  return `<pre class="voxel-code hljs" data-lang="${language}"><code class="language-${language}">${highlighted}</code></pre>`
}

// 自定义行内代码
renderer.codespan = function ({ text }: { text: string }): string {
  return `<code class="voxel-inline-code">${text}</code>`
}

// 自定义链接（新窗口打开）
renderer.link = function ({ href, title, text }: { href: string; title: string | null; text: string }): string {
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

  // 先提取所有图片并直接转换为HTML，不经过marked处理
  const images: string[] = []
  let processed = content.replace(/\[img\](.*?)\[\/img\]/g, (_, url) => {
    const index = images.length
    images.push(url)
    // 使用HTML注释作为占位符，marked不会处理它
    return `<!--VXIMG${index}-->`
  })

  // 处理行内代码块格式 ```lang code``` 转为标准格式
  processed = processed.replace(/```(\w*)\s*([^`]+)```/g, (_, lang, code) => {
    return '```' + lang + '\n' + code.trim() + '\n```'
  })

  // 使用 marked 解析 Markdown
  let html = marked.parse(processed) as string

  // 还原图片
  images.forEach((url, index) => {
    html = html.replace(
      `<!--VXIMG${index}-->`,
      `<img class="voxel-img" src="${url}" alt="图片" data-preview="${url}" />`
    )
  })

  return html
}

// 判断是否是纯图片消息
export function isImageOnly(content: string): boolean {
  if (!content) return false
  const withoutImages = content.replace(/\[img\].*?\[\/img\]/g, '').trim()
  return content.includes('[img]') && withoutImages === ''
}
