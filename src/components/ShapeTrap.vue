<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import { Canvas, IText, Polygon, Rect } from 'fabric'

const props = defineProps<{
  modelValue?: { top: number, bottom: number, h: number, offset: number }
  readOnly?: boolean
}>()

// Use deep ref
const trap = ref(props.modelValue || { top: 30, bottom: 50, h: 30, offset: 10 })

// Fabric refs
const canvasEl = shallowRef<HTMLCanvasElement | null>(null)
const canvas = shallowRef<Canvas | null>(null)
let roomObj: Polygon | null = null
let cabinetRect: Rect | null = null
let labelText: IText | null = null

const primaryColor = '#3B66F5'
const redColor = '#ef4444'

function drawRoom() {
  if (!canvas.value)
    return
  if (roomObj)
    canvas.value.remove(roomObj)

  const canvasW = canvas.value.getWidth()
  const canvasH = canvas.value.getHeight()
  const padding = 20

  // Convert inputs to numbers
  const tt = Number(trap.value.top) || 1
  const tb = Number(trap.value.bottom) || 1
  const th = Number(trap.value.h) || 1
  const to = Number(trap.value.offset) || 0

  const maxW = Math.max(tb, tt + to)

  // Calculate dynamic scale to fit canvas
  const dynamicScale = Math.min(
    (canvasW - padding * 2) / maxW,
    (canvasH - padding * 2) / th,
  )

  const cw = tb * dynamicScale
  const tw = tt * dynamicScale
  const sh = th * dynamicScale
  const off = to * dynamicScale

  const totalW = maxW * dynamicScale
  const ox = (canvasW - totalW) / 2
  const oy = (canvasH - sh) / 2

  const points = [
    { x: off, y: 0 },
    { x: off + tw, y: 0 },
    { x: cw, y: sh },
    { x: 0, y: sh },
  ]

  roomObj = new Polygon(points, {
    left: ox,
    top: oy,
    fill: 'transparent',
    stroke: primaryColor,
    strokeWidth: 2,
    selectable: false,
    evented: false,
  })

  canvas.value.add(roomObj)
  ;(canvas.value as any).sendObjectToBack(roomObj)
  canvas.value.renderAll()
}

function initCanvas() {
  if (!canvasEl.value)
    return

  const container = canvasEl.value.parentElement
  const width = container?.clientWidth || 300
  const height = container?.clientHeight || 200

  canvas.value = new Canvas(canvasEl.value, {
    backgroundColor: '#ffffff',
    width,
    height,
    selection: false,
  })

  drawRoom()
}

function addCabinet() {
  if (!canvas.value)
    return
  if (cabinetRect) {
    canvas.value.remove(cabinetRect)
    if (labelText)
      canvas.value.remove(labelText)
  }

  cabinetRect = new Rect({
    left: 50,
    top: 50,
    width: 60,
    height: 40,
    fill: 'rgba(239, 68, 68, 0.1)',
    stroke: redColor,
    strokeWidth: 2,
    cornerColor: redColor,
    cornerSize: 6,
    transparentCorners: false,
  })

  labelText = new IText('烟柜', {
    fontSize: 14,
    fill: redColor,
    fontWeight: 'bold',
    selectable: false,
    evented: false,
  })

  function syncText() {
    if (!cabinetRect || !labelText)
      return
    const centerX = cabinetRect.left + (cabinetRect.width * cabinetRect.scaleX) / 2
    const centerY = cabinetRect.top + (cabinetRect.height * cabinetRect.scaleY) / 2
    labelText.set({
      left: centerX - labelText.width / 2,
      top: centerY - labelText.height / 2,
    })
  }

  cabinetRect.on('moving', syncText)
  cabinetRect.on('scaling', syncText)
  syncText()

  canvas.value.add(cabinetRect)
  canvas.value.add(labelText)
  canvas.value.setActiveObject(cabinetRect)
  canvas.value.renderAll()
}

onMounted(initCanvas)
watch(trap, () => {
  drawRoom()
}, { deep: true })

defineExpose({
  trap,
  toDataURL: () => canvas.value?.toDataURL({ format: 'png', multiplier: 2 }),
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Preview Area -->
    <div :class="[readOnly ? 'h-40 border-none rounded-lg' : 'h-64 shadow-sm border rounded-2xl']" class="bg-white flex flex-col items-center justify-center relative overflow-hidden">
      <canvas ref="canvasEl" />

      <div v-if="!readOnly" class="flex gap-2 items-center bottom-12 left-4 right-4 absolute">
        <span class="text-[10px] text-gray-400 whitespace-nowrap">上边位移</span>
        <van-slider v-model="trap.offset" :max="trap.bottom" active-color="#3B66F5" bar-height="3px" class="flex-1" />
      </div>

      <div v-if="!readOnly" class="bottom-2 right-2 absolute">
        <van-button icon="plus" plain round size="mini" type="danger" @click="addCabinet">
          添加烟柜
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
          placeholder="请输入上边长度"
          type="number"
        />
        <van-field
          v-model="trap.bottom"
          input-align="right"
          label="下边长 (m)"
          placeholder="请输入下边长度"
          type="number"
        />
        <van-field
          v-model="trap.h"
          input-align="right"
          label="高度 (m)"
          placeholder="请输入高度"
          type="number"
        />
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped>
:deep(.canvas-container) {
  width: 100% !important;
  height: 100% !important;
}
canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
