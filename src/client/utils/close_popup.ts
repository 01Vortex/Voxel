import { onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

/**
 * 弹窗关闭工具
 * 支持 ESC 键关闭和点击外部区域关闭
 */
export function useClosePopup(
  isOpen: Ref<boolean | string | null>,
  onClose: () => void
) {
  // ESC 键关闭
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen.value) {
      onClose()
    }
  }

  // 注册和清理事件
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return { handleKeydown }
}

/**
 * 创建点击外部关闭的处理函数
 * 用于遮罩层：@click="handleOverlayClick"
 * 用于内容区：@click.stop 阻止冒泡
 */
export function createOverlayClickHandler(onClose: () => void) {
  return (e: MouseEvent) => {
    // 点击的是遮罩层本身（不是子元素）
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
}
