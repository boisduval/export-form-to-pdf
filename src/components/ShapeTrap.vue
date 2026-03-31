<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { Canvas, IText, Polygon, Rect } from 'fabric'
import type { FabricObject } from 'fabric'

interface CanvasObject extends FabricObject {
  associatedLabel?: IText
}

const props = defineProps<{
  modelValue?: { top: number, bottom: number, h: number, offset: number }
  readOnly?: boolean
}>()

// Use deep ref
const trap = ref(props.modelValue || { top: 30, bottom: 50, h: 30, offset: 10 })

// Fabric refs
const canvasEl = shallowRef<HTMLCanvasElement | null>(null)
const canvas = shallowRef<Canvas | null>(null)
let roomGroup: (Polygon | IText)[] = [] // 记录房间轮廓相关的对象
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

  // 2. 检查并校正画布尺寸
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

  // 3. 计算缩放比
  const padding = 40
  const tt = Number(trap.value.top) || 1
  const tb = Number(trap.value.bottom) || 1
  const th = Number(trap.value.h) || 1
  const to = Number(trap.value.offset) || 0

  const minX = Math.min(0, to)
  const maxX = Math.max(tb, to + tt)
  const actualW = maxX - minX
  const scale = Math.min((cw - padding * 2) / actualW, (ch - padding * 2) / th)

  const sw_top = tt * scale
  const sw_bottom = tb * scale
  const sh = th * scale
  const soff = to * scale
  const sw_max = actualW * scale
  const sminX = minX * scale

  // 4. 应用绘制
  const points = [
    { x: soff, y: 0 },
    { x: soff + sw_top, y: 0 },
    { x: sw_bottom, y: sh },
    { x: 0, y: sh },
  ]

  const roomPoly = new Polygon(points, {
    left: cw / 2,
    top: ch / 2,
    originX: 'center',
    originY: 'center',
    fill: 'transparent',
    stroke: primaryColor,
    strokeWidth: 2,
    selectable: false,
    evented: false,
  })

  const L = cw / 2 - sw_max / 2 // Bounding box left

  roomGroup = [
    roomPoly,
    // 上边长标注
    new IText(`${tt}m`, {
      left: L + (soff + sw_top / 2 - sminX),
      top: ch / 2 - sh / 2 - 25,
      originX: 'center',
      originY: 'center',
      fontSize: 12,
      fill: primaryColor,
      selectable: false,
      evented: false,
    }),
    // 下边长标注
    new IText(`${tb}m`, {
      left: L + (sw_bottom / 2 - sminX),
      top: ch / 2 + sh / 2 + 25,
      originX: 'center',
      originY: 'center',
      fontSize: 12,
      fill: primaryColor,
      selectable: false,
      evented: false,
    }),
    // 高度标注 (左侧)
    new IText(`${th}m`, {
      left: L - 25,
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

  const label = new IText('烟柜', {
    fontSize: 12,
    fill: redColor,
    fontWeight: 'bold',
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center',
  })

  ;(cabinet as CanvasObject).associatedLabel = label

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

watch(trap, drawRoom, { deep: true })

defineExpose({
  trap,
  toDataURL: () => {
    if (!canvas.value)
      return ''
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

    <!-- Controls Toolbar -->
    <div v-if="!readOnly" class="px-1 flex flex-col gap-4">
      <div class="flex gap-3 items-center">
        <span class="text-xs text-gray-400 whitespace-nowrap">位置调节</span>
        <van-slider v-model="trap.offset" :max="100" :min="-100" active-color="#3B66F5" bar-height="3px" class="flex-1" />
      </div>

      <div class="gap-3 grid grid-cols-2">
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
    </div>

    <!-- Inputs -->
    <div v-if="!readOnly" class="border-gray-50 rounded-xl bg-white flex flex-col shadow-sm overflow-hidden">
      <van-cell-group :border="false">
        <van-field
          v-model="trap.top"
          input-align="right"
          label="上边长 (m)"
          placeholder="请输入"
          type="number"
        />
        <van-field
          v-model="trap.bottom"
          input-align="right"
          label="下边长 (m)"
          placeholder="请输入"
          type="number"
        />
        <van-field
          v-model="trap.h"
          input-align="right"
          label="高度 (m)"
          placeholder="请输入"
          type="number"
        />
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped>
:deep(.canvas-container) {
  margin: 0 auto;
}
</style>
