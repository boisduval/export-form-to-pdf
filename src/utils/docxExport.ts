import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import ImageModule from 'docxtemplater-image-module-free'

const pattern = /\/$/
/**
 * 辅助函数：Base64 转 Uint8Array (二进制)
 */
function base64ToBuffer(dataUrl: string) {
  if (!dataUrl?.includes(',')) {
    console.error('Empty or invalid dataUrl provided to base64ToBuffer')
    return new Uint8Array(0)
  }
  const base64 = dataUrl.split(',')[1]
  const binaryString = globalThis.atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.codePointAt(i)
  }
  return bytes
}

/**
 * 核心导出逻辑：将表单数据和图片文件注入 Word 模板
 * @param formData 表单文本内容
 * @param imageData 画布生成的 Base64 图片
 * @param templatePath 模板在 public/ 下的路径 (默认为 /change.docx)
 */
export async function generateDocx(
  formData: any,
  imageData: string,
  templatePath: string = '/change.docx',
) {
  // 1. 获取模板 (考虑到 GitHub Pages 等子目录部署)
  const baseUrl = import.meta.env.BASE_URL || '/'

  const fullPath = templatePath.startsWith('/')
    ? `${baseUrl.replace(pattern, '')}${templatePath}`
    : `${baseUrl}${templatePath}`

  const response = await fetch(fullPath)
  if (!response.ok)
    throw new Error(`无法加载模板文件: ${fullPath} (原始路径: ${templatePath})`)

  const content = await response.arrayBuffer()
  const zip = new PizZip(content)

  // 2. 配置图片模块 (Word px 转单位)
  const imageOptions = {
    getImage: (tagValue: string) => base64ToBuffer(tagValue),
    getSize: () => [450, 300], // Word 中显示的图片宽度/高度 (点数)
  }

  // 3. 初始化渲染器
  const doc = new Docxtemplater(zip, {
    modules: [new ImageModule(imageOptions)],
    paragraphLoop: true,
    linebreaks: true,
  })

  // 4. 准备渲染数据
  // layout_image 对应模板中的 {%layout_image}
  const docData = {
    ...formData,
    location_map: imageData,
  }

  // 5. 渲染文档
  try {
    doc.render(docData)
  }
  catch (error: any) {
    console.error('Docxtemplater 渲染错误:', error)
    if (error.properties?.errors) {
      error.properties.errors.forEach((e: any) => console.error(e))
    }
    throw error
  }

  // 6. 生成导出文件 Blob
  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}
