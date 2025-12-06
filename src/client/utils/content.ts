// 渲染内容（支持图片和换行）
export function renderContent(content: string): string {
  // 转义 HTML
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 解析图片标记 [img]...[/img]
  html = html.replace(
    /\[img\](.*?)\[\/img\]/g,
    '<img class="voxel-img" src="$1" alt="图片" />'
  )

  // 换行
  html = html.replace(/\n/g, '<br>')

  return html
}
