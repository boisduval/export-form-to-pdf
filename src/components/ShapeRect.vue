<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { Canvas, IText, Rect } from 'fabric'
import type { FabricObject } from 'fabric'

interface CanvasObject extends FabricObject {
  associatedLabel?: IText
}

const props = defineProps<{
  modelValue?: { w: number, h: number }
  readOnly?: boolean
}>()

const rect = ref(props.modelValue || { w: 40, h: 30 })

const canvasEl = shallowRef<HTMLCanvasElement | null>(null)
const canvas = shallowRef<Canvas | null>(null)
let roomGroup: (Rect | IText)[] = [] // 记录房间轮廓相关的对象
const activeObject = shallowRef<any>(null)

const primaryColor = '#3B66F5'
const redColor = '#ef4444'
const doorColor = '#9CA3AF'

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
  const padding = 40
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

  roomGroup = [
    roomRect,
    // 长度标注 (上边上侧)
    new IText(`${rw}m`, {
      left: cw / 2,
      top: ch / 2 - sh / 2 - 12,
      originX: 'center',
      originY: 'center',
      fontSize: 12,
      fill: primaryColor,
      selectable: false,
      evented: false,
    }),
    // 宽度标注 (左边左侧)
    new IText(`${rh}m`, {
      left: cw / 2 - sw / 2 - 12,
      top: ch / 2,
      originX: 'center',
      originY: 'center',
      angle: -90,
      fontSize: 12,
      fill: primaryColor,
      selectable: false,
      evented: false,
    }),
  ]
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

  canvas.value.on('selection:created', e => activeObject.value = e.selected?.[0] as CanvasObject)
  canvas.value.on('selection:updated', e => activeObject.value = e.selected?.[0] as CanvasObject)
  canvas.value.on('selection:cleared', () => activeObject.value = null)

  drawRoom()
  addCabinet()
}

function deleteSelected() {
  if (!canvas.value || !activeObject.value)
    return

  const obj = activeObject.value as CanvasObject
  const label = obj.associatedLabel

  // 烟柜不可删除
  if (label && label.text === '烟柜')
    return

  if (label) {
    canvas.value.remove(label)
  }
  canvas.value.remove(obj)
  canvas.value.discardActiveObject()
  canvas.value.renderAll()
  activeObject.value = null
}

function addCabinet() {
  if (!canvas.value)
    return

  // 如果已经存在烟柜，则不重复添加
  const existingCabinet = canvas.value.getObjects().find(obj => (obj as CanvasObject).associatedLabel?.text === '烟柜')
  if (existingCabinet)
    return

  // 1. 创建红色边框
  const cabinet = new Rect({
    left: canvas.value!.getWidth() / 2,
    top: canvas.value!.getHeight() / 2,
    originX: 'center',
    originY: 'center',
    width: 60,
    height: 40,
    fill: 'rgba(239, 68, 68, 0.1)',
    stroke: redColor,
    strokeWidth: 2,
    cornerColor: redColor,
    cornerSize: 8,
    transparentCorners: false,
    strokeUniform: true,
  })

  // 2. 创建文字组件
  const label = new IText('烟柜', {
    fontSize: 12,
    fill: redColor,
    fontWeight: 'bold',
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center',
  })

  // 将 label 关联到 cabinet，方便同步和判断类型
  ;(cabinet as CanvasObject).associatedLabel = label

  // 3. 同步位置和角度
  const syncLabel = () => {
    const center = cabinet.getCenterPoint()
    label.set({
      left: center.x,
      top: center.y,
      angle: cabinet.angle,
    })
  }

  cabinet.on('moving', syncLabel)
  cabinet.on('scaling', syncLabel)
  cabinet.on('rotating', syncLabel)

  canvas.value.add(cabinet, label)
  syncLabel()
  canvas.value.setActiveObject(cabinet)
  canvas.value.renderAll()
}

function addDoor() {
  if (!canvas.value)
    return

  const door = new Rect({
    left: canvas.value!.getWidth() / 2,
    top: canvas.value!.getHeight() / 2,
    originX: 'center',
    originY: 'center',
    width: 30,
    height: 10,
    fill: '#ffffff',
    stroke: doorColor,
    strokeWidth: 1,
    cornerColor: doorColor,
    cornerSize: 8,
    transparentCorners: false,
    strokeUniform: true,
  })

  const label = new IText('大门', {
    fontSize: 10,
    fill: doorColor,
    fontWeight: 'bold',
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center',
  })

  ;(door as CanvasObject).associatedLabel = label

  const syncLabel = () => {
    const center = door.getCenterPoint()
    label.set({
      left: center.x,
      top: center.y,
      angle: door.angle,
    })
  }

  door.on('moving', syncLabel)
  door.on('scaling', syncLabel)
  door.on('rotating', syncLabel)

  canvas.value.add(door, label)
  syncLabel()
  canvas.value.setActiveObject(door)
  canvas.value.renderAll()
}

onMounted(() => {
  setTimeout(() => {
    initCanvas()
  }, 50)
})

onUnmounted(() => {
  if (canvas.value) {
    canvas.value.dispose()
    canvas.value = null
  }
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

    <!-- Actions Toolbar -->
    <div v-if="!readOnly" class="px-1 gap-3 grid grid-cols-2">
      <van-button icon="plus" plain size="small" type="primary" block class="shadow-sm !rounded-xl" @click="addDoor">
        添加大门
      </van-button>
      <van-button
        v-if="activeObject && activeObject.associatedLabel?.text !== '烟柜'"
        icon="delete"
        plain
        size="small"
        type="danger"
        block
        class="shadow-sm !rounded-xl"
        @click="deleteSelected"
      >
        删除选中
      </van-button>
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
