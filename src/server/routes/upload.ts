import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getDb } from '../db'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const uploadRouter = Router()

// 临时图片存储目录（会被定时清理）
const DATA_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../data/uploads_tmp')
const ORIGINAL_DIR = path.join(DATA_DIR, 'original')
const MIDDLE_DIR = path.join(DATA_DIR, 'middle')
const THUMBNAIL_DIR = path.join(DATA_DIR, 'thumbnail')

// 确保上传目录存在
;[ORIGINAL_DIR, MIDDLE_DIR, THUMBNAIL_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// 生成 Vx_ + 6位随机数
function generateImageId(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let result = 'Vx_'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 动态导入 sharp（可选依赖）
let sharp: any = null
async function getSharp() {
  if (sharp === null) {
    try {
      sharp = (await import('sharp')).default
    } catch {
      sharp = false
      console.warn('sharp not installed, image processing disabled')
    }
  }
  return sharp
}

// 压缩图片到指定大小以下
async function compressImage(
  buffer: Buffer,
  maxSize: number,
  maxWidth: number = 1920
): Promise<Buffer> {
  const sharpLib = await getSharp()
  if (!sharpLib) return buffer

  let quality = 90
  let result = buffer
  let width = maxWidth

  const metadata = await sharpLib(buffer).metadata()
  const originalWidth = metadata.width || 1920
  width = Math.min(originalWidth, maxWidth)

  while (result.length > maxSize && quality > 10) {
    result = await sharpLib(buffer)
      .resize(width, null, { withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer()

    if (result.length > maxSize) {
      quality -= 10
      if (quality <= 10 && width > 800) {
        width = Math.floor(width * 0.8)
        quality = 80
      }
    }
  }

  return result
}

// 创建缩略图
async function createThumbnail(buffer: Buffer, size: number = 200): Promise<Buffer> {
  const sharpLib = await getSharp()
  if (!sharpLib) return buffer

  return sharpLib(buffer)
    .resize(size, size, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer()
}

// 上传图片（临时存储，返回临时URL）
uploadRouter.post('/image', async (req: Request, res: Response) => {
  try {
    const { image } = req.body

    if (!image) {
      return res.json({ success: false, message: '缺少图片数据' })
    }

    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return res.json({ success: false, message: '无效的图片格式' })
    }

    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    const imageId = generateImageId()
    const filename = `${imageId}.jpg`

    // 保存原图到临时目录
    fs.writeFileSync(path.join(ORIGINAL_DIR, filename), buffer)

    // 生成并保存中等尺寸图片
    const middleBuffer = await compressImage(buffer, 2 * 1024 * 1024)
    fs.writeFileSync(path.join(MIDDLE_DIR, filename), middleBuffer)

    // 生成并保存缩略图
    const thumbnailBuffer = await createThumbnail(buffer, 200)
    fs.writeFileSync(path.join(THUMBNAIL_DIR, filename), thumbnailBuffer)

    // 返回临时URL（以 /temp/ 开头表示临时图片）
    res.json({
      success: true,
      data: {
        url: `/api/upload/temp/middle/${filename}`,
        thumbnail: `/api/upload/temp/thumbnail/${filename}`,
        id: imageId
      }
    })
  } catch (e: any) {
    console.error('Upload error:', e)
    res.json({ success: false, message: e.message })
  }
})

// 保存图片到数据库（评论发送成功后调用）
uploadRouter.post('/save', async (req: Request, res: Response) => {
  try {
    const { imageIds } = req.body as { imageIds: string[] }

    if (!imageIds || !Array.isArray(imageIds)) {
      return res.json({ success: false, message: '缺少图片ID' })
    }

    const db = getDb()
    const savedImages: Record<string, { url: string; thumbnail: string }> = {}

    for (const imageId of imageIds) {
      const filename = `${imageId}.jpg`
      const middlePath = path.join(MIDDLE_DIR, filename)
      const thumbnailPath = path.join(THUMBNAIL_DIR, filename)

      if (!fs.existsSync(middlePath) || !fs.existsSync(thumbnailPath)) {
        continue
      }

      const middleBuffer = fs.readFileSync(middlePath)
      const thumbnailBuffer = fs.readFileSync(thumbnailPath)

      // 保存到数据库
      db.prepare(`
        INSERT OR REPLACE INTO images (id, data, thumbnail, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(imageId, middleBuffer, thumbnailBuffer, 'image/jpeg', Date.now())

      savedImages[imageId] = {
        url: `/api/upload/db/${imageId}`,
        thumbnail: `/api/upload/db/${imageId}/thumbnail`
      }

      // 删除临时文件
      try {
        fs.unlinkSync(path.join(ORIGINAL_DIR, filename))
        fs.unlinkSync(middlePath)
        fs.unlinkSync(thumbnailPath)
      } catch {}
    }

    res.json({ success: true, data: savedImages })
  } catch (e: any) {
    console.error('Save error:', e)
    res.json({ success: false, message: e.message })
  }
})

// 获取临时图片
uploadRouter.get('/temp/:type/:filename', (req: Request, res: Response) => {
  const { type, filename } = req.params

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).send('Invalid filename')
  }

  let dir: string
  if (type === 'middle') dir = MIDDLE_DIR
  else if (type === 'thumbnail') dir = THUMBNAIL_DIR
  else if (type === 'original') dir = ORIGINAL_DIR
  else return res.status(400).send('Invalid type')

  const filepath = path.join(dir, filename)
  if (!fs.existsSync(filepath)) {
    return res.status(404).send('Image not found')
  }

  res.setHeader('Content-Type', 'image/jpeg')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.sendFile(filepath)
})

// 从数据库获取图片
uploadRouter.get('/db/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = getDb()

    const row = db.prepare('SELECT data, mime_type FROM images WHERE id = ?').get(id) as
      | { data: Buffer; mime_type: string }
      | undefined

    if (!row) {
      return res.status(404).send('Image not found')
    }

    res.setHeader('Content-Type', row.mime_type)
    res.setHeader('Cache-Control', 'public, max-age=31536000')
    res.send(row.data)
  } catch (e) {
    res.status(500).send('Server error')
  }
})

// 从数据库获取缩略图
uploadRouter.get('/db/:id/thumbnail', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = getDb()

    const row = db.prepare('SELECT thumbnail, mime_type FROM images WHERE id = ?').get(id) as
      | { thumbnail: Buffer; mime_type: string }
      | undefined

    if (!row) {
      return res.status(404).send('Thumbnail not found')
    }

    res.setHeader('Content-Type', row.mime_type)
    res.setHeader('Cache-Control', 'public, max-age=31536000')
    res.send(row.thumbnail)
  } catch (e) {
    res.status(500).send('Server error')
  }
})

// 清理临时图片（每天00:00执行）
export function cleanupAllImages(): void {
  console.log('Starting daily temp image cleanup...')

  ;[ORIGINAL_DIR, MIDDLE_DIR, THUMBNAIL_DIR].forEach((dir) => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
      files.forEach((file) => {
        const filepath = path.join(dir, file)
        try {
          fs.unlinkSync(filepath)
          console.log(`Deleted temp: ${filepath}`)
        } catch (e) {
          console.error(`Failed to delete ${filepath}:`, e)
        }
      })
    }
  })

  console.log('Temp image cleanup completed')
}

function getMillisecondsUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}

export function startCleanupScheduler(): void {
  const scheduleNextCleanup = () => {
    const msUntilMidnight = getMillisecondsUntilMidnight()
    console.log(`Next temp cleanup scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`)

    setTimeout(() => {
      cleanupAllImages()
      scheduleNextCleanup()
    }, msUntilMidnight)
  }

  scheduleNextCleanup()
}
