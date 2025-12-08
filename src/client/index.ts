import VoxelComment from './components/VoxelComment.vue'
import { setApiBase } from './utils/api'

// 引入样式
import './style/voxel-comment.css'
import 'highlight.js/styles/xcode.css'

export { VoxelComment, setApiBase }
export * from './types'
export * from './utils'

// 默认导出组件
export default VoxelComment
