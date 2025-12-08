import { onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

/**
 * 弹窗关闭工具 - ESC 键关闭
 */
export function useClosePopup(
  isOpen: Ref<boolean | string | null>,
  onClose: () => void
) {
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen.value) {
      onClose()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
