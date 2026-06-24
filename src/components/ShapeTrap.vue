<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { IText, Polygon } from 'fabric'
import BaseShapeCanvas from './BaseShapeCanvas.vue'
import ThreeDPreview from './ThreeDPreview.vue'
import { useShapeCanvas } from '@/composables/useShapeCanvas'

const props = defineProps<{
  modelValue?: { top: number, bottom: number, h: number, offset: number }
  readOnly?: boolean
  cabinetType?: 'default' | 'l_shape' | 'convex'
}>()

const trap = ref(props.modelValue || { top: 30, bottom: 50, h: 30, offset: 10 })

const {
  canvasEl,
  canvas,
  initCanvas,
  presetCabinetAndDoor,
  repositionPresetObjects,
  updateCabinetShape,
  wallColor,
  wallStrokeWidth,
  roomFillColor,
  toDataURLWithLegend,
} = useShapeCanvas()

let roomGroup: (Polygon | IText)[] = [] // 记录房间轮廓相关的对象
let lastCw = 0
let lastCh = 0

const primaryColor = '#3B66F5'

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
  const container = canvasEl.value?.closest('.canvas-wrapper')
  if (container && container.clientWidth > 0 && container.clientHeight > 0) {
    if (canvas.value.getWidth() !== container.clientWidth || canvas.value.getHeight() !== container.clientHeight) {
      canvas.value.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
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
    fill: roomFillColor,
    stroke: wallColor,
    strokeWidth: wallStrokeWidth,
    selectable: false,
    evented: false,
    name: 'room_outline',
  } as any)

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
    // 面积标注 (右下角)
    new IText(`S = ${((tt + tb) * th / 2).toFixed(2)}㎡`, {
      left: cw - 20,
      top: ch - 20,
      originX: 'right',
      originY: 'bottom',
      fontSize: 12,
      fill: '#64748b',
      fontWeight: 'bold',
      selectable: false,
      evented: false,
    }),
  ]
  canvas.value.add(...roomGroup)
  roomGroup.forEach(obj => canvas.value?.sendObjectToBack(obj))

  // 预设大门和烟柜（仅在画布尺寸变化或首次渲染时定位/更新）
  if (cw > 100 && ch > 100 && (cw !== lastCw || ch !== lastCh)) {
    lastCw = cw
    lastCh = ch
    const cabX = L + (soff - sminX)
    const cabY = ch / 2 - sh / 2
    const doorX = L - sminX
    const doorY = ch / 2 + sh / 2
    presetCabinetAndDoor(cabX, cabY, doorX, doorY, props.cabinetType)
    repositionPresetObjects(cabX, cabY, doorX, doorY)
  }

  canvas.value.renderAll()
}

function initTrapCanvas() {
  initCanvas()
  drawRoom()
}

onMounted(() => {
  setTimeout(() => {
    initTrapCanvas()
  }, 50)
})

watch(trap, drawRoom, { deep: true })

watch(() => props.cabinetType, (newType) => {
  if (newType) {
    updateCabinetShape(newType)
  }
})

const show3D = ref(false)

function getPreviewData() {
  if (!canvas.value)
    return null

  const cw = canvas.value.getWidth()
  const ch = canvas.value.getHeight()
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

  const points = [
    { x: soff - sw_max / 2, y: -sh / 2 },
    { x: soff + sw_top - sw_max / 2, y: -sh / 2 },
    { x: sw_bottom - sw_max / 2, y: sh / 2 },
    { x: -sw_max / 2, y: sh / 2 },
  ]

  const objects = canvas.value.getObjects().filter(o => (o as any).name === 'cabinet' || (o as any).name === 'door')
  const subObjects = objects.map(o => ({
    type: (o as any).name === 'cabinet' ? '烟柜' : '大门',
    cabinetType: (o as any).name === 'cabinet' ? props.cabinetType : undefined,
    left: o.left,
    top: o.top,
    width: (o as any).width * (o as any).scaleX,
    height: (o as any).height * (o as any).scaleY,
    angle: o.angle,
  }))

  return {
    type: 'trap',
    canvasWidth: cw,
    canvasHeight: ch,
    data: {
      ...trap.value,
      roomPoints: points,
    },
    subObjects,
  }
}

defineExpose({
  trap,
  drawRoom,
  toDataURL: () => {
    return toDataURLWithLegend()
  },
})
</script>

<template>
  <BaseShapeCanvas
    :read-only="readOnly"
    @toggle3d="show3D = true"
  >
    <template #canvas>
      <canvas ref="canvasEl" />
    </template>

    <template #toolbar>
      <div class="flex gap-3 items-center">
        <span class="text-xs text-gray-400 whitespace-nowrap">位置调节</span>
        <van-slider v-model="trap.offset" :max="100" :min="-100" active-color="#3B66F5" bar-height="3px" class="flex-1" />
      </div>
    </template>

    <template #inputs>
      <div class="border-gray-50 rounded-xl bg-white flex flex-col shadow-sm overflow-hidden">
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
    </template>

    <!-- 3D Preview Modal -->
    <ThreeDPreview v-model:show="show3D" :data="getPreviewData()" />
  </BaseShapeCanvas>
</template>
