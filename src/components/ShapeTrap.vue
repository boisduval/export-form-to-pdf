<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { IText, Polygon } from 'fabric'
import BaseShapeCanvas from './BaseShapeCanvas.vue'
import { useShapeCanvas } from '@/composables/useShapeCanvas'

const props = defineProps<{
  modelValue?: { top: number, bottom: number, h: number, offset: number }
  readOnly?: boolean
}>()

const trap = ref(props.modelValue || { top: 30, bottom: 50, h: 30, offset: 10 })

const {
  canvasEl,
  canvas,
  activeObject,
  initCanvas,
  deleteSelected,
  addCabinet,
  addDoor,
} = useShapeCanvas()

let roomGroup: (Polygon | IText)[] = [] // 记录房间轮廓相关的对象

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
  const container = canvasEl.value?.parentElement
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

function initTrapCanvas() {
  initCanvas()
  drawRoom()
  addCabinet()
}

onMounted(() => {
  setTimeout(() => {
    initTrapCanvas()
  }, 50)
})

watch(trap, drawRoom, { deep: true })

defineExpose({
  trap,
  drawRoom,
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
  <BaseShapeCanvas
    :read-only="readOnly"
    :active-object="activeObject"
    @add-door="addDoor"
    @delete-selected="deleteSelected"
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
  </BaseShapeCanvas>
</template>
