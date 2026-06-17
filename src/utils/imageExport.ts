import { templatesPreset } from './templatesPreset'

const PLACEHOLDER_REGEX = /\{(\w+)\}/g

/**
 * 替换文本中的占位符 {key}
 */
function replacePlaceholders(text: string, data: Record<string, any>): string {
  return text.replace(PLACEHOLDER_REGEX, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match
  })
}

/**
 * 文本自动换行计算辅助函数
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = text.split('')
  const lines: string[] = []
  let currentLine = ''

  for (const char of chars) {
    const testLine = currentLine + char
    const width = ctx.measureText(testLine).width
    if (width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = char
    }
    else {
      currentLine = testLine
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

/**
 * 加载图片辅助函数
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = err => reject(err)
    img.src = src
  })
}

/**
 * 动态渲染文本与图纸到一张大图上并导出为 Blob
 */
export async function generateImage(
  formData: any,
  imageData: string,
  templateKey: string = 'change',
): Promise<Blob> {
  const template = templatesPreset[templateKey]
  if (!template) {
    throw new Error(`未找到预置模板: ${templateKey}`)
  }

  // 1. 创建虚拟 canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建 Canvas 绘图上下文')
  }

  const canvasWidth = 800
  const padding = 50
  const contentWidth = canvasWidth - padding * 2
  const fontSize = 16 // 小四号字 (12pt ≈ 16px)
  const fontFamily = '"SimSun", "Songti SC", "STSong", serif'
  const lineHeight = 28 // 稍微调小行高以适应小四字体
  const paragraphSpacing = 20

  // 配置字体以便测量宽度
  ctx.font = `${fontSize}px ${fontFamily}`

  // 2. 预加载图纸图片并计算其缩放大小
  let mapImg: HTMLImageElement | null = null
  let mapDrawWidth = 0
  let mapDrawHeight = 0

  if (imageData) {
    try {
      mapImg = await loadImage(imageData)
      mapDrawWidth = contentWidth
      // 保持原始比例缩放
      const scale = contentWidth / mapImg.width
      mapDrawHeight = mapImg.height * scale
    }
    catch (err) {
      console.error('加载平面图失败:', err)
    }
  }

  // 3. 计算高度和组织排版数据
  interface RenderItem {
    type: 'text' | 'image'
    lines?: string[]
    img?: HTMLImageElement
    width?: number
    height?: number
  }

  const renderItems: RenderItem[] = []
  let totalHeight = padding * 2

  for (let i = 0; i < template.content.length; i++) {
    const line = template.content[i]
    if (line === '{%location_map}') {
      if (mapImg) {
        renderItems.push({
          type: 'image',
          img: mapImg,
          width: mapDrawWidth,
          height: mapDrawHeight,
        })
        totalHeight += mapDrawHeight
        if (i < template.content.length - 1) {
          totalHeight += paragraphSpacing
        }
      }
    }
    else {
      const filledText = replacePlaceholders(line, formData)
      const wrappedLines = wrapText(ctx, filledText, contentWidth)
      renderItems.push({
        type: 'text',
        lines: wrappedLines,
      })
      totalHeight += wrappedLines.length * lineHeight
      if (i < template.content.length - 1) {
        totalHeight += paragraphSpacing
      }
    }
  }

  // 4. 设置 canvas 实际像素大小（乘以 2 倍缩放，使导出的图片更加清晰）
  const scale = 2
  canvas.width = canvasWidth * scale
  canvas.height = totalHeight * scale

  // 缩放绘图上下文，使得后续的绘制坐标仍可保持逻辑大小
  ctx.scale(scale, scale)

  // 重新设置属性（由于修改了 canvas 尺寸，这些属性会被重置）
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasWidth, totalHeight)

  ctx.fillStyle = '#1e293b' // 深灰蓝色文字
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'top'

  let currentY = padding

  for (const item of renderItems) {
    if (item.type === 'text' && item.lines) {
      for (const lineText of item.lines) {
        ctx.fillText(lineText, padding, currentY)
        currentY += lineHeight
      }
      currentY += paragraphSpacing
    }
    else if (item.type === 'image' && item.img && item.width && item.height) {
      // 绘制平面图
      ctx.drawImage(item.img, padding, currentY, item.width, item.height)
      currentY += item.height + paragraphSpacing
    }
  }

  // 5. 导出为 Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        }
        else {
          reject(new Error('Canvas 转换图片失败'))
        }
      },
      'image/png',
      1.0,
    )
  })
}
