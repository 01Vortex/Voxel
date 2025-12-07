// 渲染内容（支持图片和换行）
export function renderContent(content: string): string {
  // 转义 HTML
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 解析图片标记 [img]...[/img]，添加 data-preview 属性用于双击预览
  html = html.replace(
    /\[img\](.*?)\[\/img\]/g,
    '<img class="voxel-img" src="$1" alt="图片" data-preview="$1" />'
  )

  // 换行
  html = html.replace(/\n/g, '<br>')

  return html
}

// 判断是否是纯图片消息
export function isImageOnly(content: string): boolean {
  // 移除所有图片标记后，检查是否还有其他内容
  const withoutImages = content.replace(/\[img\].*?\[\/img\]/g, '').trim()
  // 必须有图片，且没有其他内容
  return content.includes('[img]') && withoutImages === ''
}
