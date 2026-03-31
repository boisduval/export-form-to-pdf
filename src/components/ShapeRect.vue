<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import { Canvas, IText, Rect } from 'fabric'

const props = defineProps<{
  modelValue?: { w: number, h: number }
  readOnly?: boolean
}>()

const rect = ref(props.modelValue || { w: 40, h: 30 })

const canvasEl = shallowRef<HTMLCanvasElement | null>(null)
const canvas = shallowRef<Canvas | null>(null)
let roomGroup: (Rect | IText)[] = [] // 记录房间轮廓相关的对象
let cabinetRect: Rect | null = null // 烟柜方框
let cabinetLabel: IText | null = null // 烟柜文字

const primaryColor = '#3B66F5'
const redColor = '#ef4444'

/**
 * 核心逻辑：绘制房间轮廓及标注
 */
function drawRoom() {
  if (!canvas.value)
    return

  // 1. 清除旧的对象
  roomGroup.forEach(obj => canvas.value?.remove(obj))
  roomGroup = []

  // 2. 检查并校正画布尺寸 (解决 v-show 初始化问题)
  const container = canvasEl.value?.parentElement
  if (container && container.clientWidth > 0) {
    if (canvas.value.getWidth() !== container.clientWidth) {
      canvas.value.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight || 200,
      })
    }
  }

  const cw = canvas.value.getWidth()
  const ch = canvas.value.getHeight()
  if (cw === 0 || ch === 0)
    return

  // 3. 计算缩放比，确保始终完整显示在画布内
  const padding = 20
  const rw = Number(rect.value.w) || 1
  const rh = Number(rect.value.h) || 1

  const scale = Math.min((cw - padding * 2) / rw, (ch - padding * 2) / rh)
  const sw = rw * scale
  const sh = rh * scale

  // 4. 应用绘制: 使用中心点定位确保始终居中
  const roomRect = new Rect({
    left: cw / 2,
    top: ch / 2,
    originX: 'center',
    originY: 'center',
    width: sw,
    height: sh,
    fill: 'transparent',
    stroke: primaryColor,
    strokeWidth: 2,
    selectable: false,
    evented: false,
  })

  roomGroup = [roomRect]
  canvas.value.add(...roomGroup)
  roomGroup.forEach(obj => canvas.value?.sendObjectToBack(obj))
  canvas.value.renderAll()
}

function initCanvas() {
  if (!canvasEl.value)
    return
  const container = canvasEl.value.parentElement

  canvas.value = new Canvas(canvasEl.value, {
    backgroundColor: '#ffffff',
    width: container?.clientWidth || 300,
    height: container?.clientHeight || 200,
    selection: false,
  })

  drawRoom()
  addCabinet()
}

function addCabinet() {
  if (!canvas.value)
    return

  // 如果已经存在烟柜，先移除（保持唯一）
  if (cabinetRect) {
    canvas.value.remove(cabinetRect, cabinetLabel!)
  }

  // 1. 创建红色边框
  cabinetRect = new Rect({
    left: 150,
    top: 150,
    width: 40,
    height: 20,
    fill: 'rgba(239, 68, 68, 0.1)',
    stroke: redColor,
    strokeWidth: 2,
    cornerColor: redColor,
    cornerSize: 8,
    transparentCorners: false,
  })

  // 2. 创建文字组件 (不会因为拉伸而变形)
  cabinetLabel = new IText('烟柜', {
    fontSize: 12,
    fill: redColor,
    fontWeight: 'bold',
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center',
  })

  // 3. 同步位置和角度的函数
  const syncLabel = () => {
    if (!cabinetRect || !cabinetLabel)
      return
    const center = cabinetRect.getCenterPoint()
    cabinetLabel.set({
      left: center.x,
      top: center.y,
      angle: cabinetRect.angle,
    })
  }

  // 4. 监听变换
  cabinetRect.on('moving', syncLabel)
  cabinetRect.on('scaling', syncLabel)
  cabinetRect.on('rotating', syncLabel)

  canvas.value.add(cabinetRect, cabinetLabel)
  syncLabel() // 初始同步
  canvas.value.setActiveObject(cabinetRect)
  canvas.value.renderAll()
}

onMounted(() => {
  setTimeout(initCanvas, 50) // 给 DOM 渲染留一点时间
})

watch(rect, drawRoom, { deep: true })

defineExpose({
  rect,
  toDataURL: () => {
    if (!canvas.value)
      return ''
    // 强制渲染一次，确保包含背景色和所有对象
    return canvas.value.toDataURL({
      format: 'png',
      multiplier: 2,
      enableRetinaScaling: true,
    })
  },
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Preview Area -->
    <div :class="[readOnly ? 'h-40 border-none rounded-lg' : 'h-64 shadow-sm border rounded-2xl']" class="bg-white flex flex-col items-center justify-center relative overflow-hidden">
      <canvas ref="canvasEl" />
    </div>

    <!-- Inputs -->
    <div v-if="!readOnly" class="border-gray-50 rounded-xl bg-white flex flex-col shadow-sm overflow-hidden">
      <van-cell-group :border="false">
        <van-field v-model="rect.w" input-align="right" label="长度 (m)" placeholder="请输入" type="number" />
        <van-field v-model="rect.h" input-align="right" label="宽度 (m)" placeholder="请输入" type="number" />
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped>
:deep(.canvas-container) {
  margin: 0 auto;
}
</style>
