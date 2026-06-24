<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { IText, Rect } from 'fabric'
import ThreeDPreview from './ThreeDPreview.vue'
import BaseShapeCanvas from './BaseShapeCanvas.vue'
import { useShapeCanvas } from '@/composables/useShapeCanvas'

const props = defineProps<{
  modelValue?: { w: number, h: number }
  readOnly?: boolean
  cabinetType?: 'default' | 'l_shape' | 'convex'
}>()

const rect = ref(props.modelValue || { w: 40, h: 30 })

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

let roomGroup: (Rect | IText)[] = [] // 记录房间轮廓相关的对象
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

  // 2. 检查并校正画布尺寸 (解决 v-show 初始化问题)
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
    fill: roomFillColor,
    stroke: wallColor,
    strokeWidth: wallStrokeWidth,
    selectable: false,
    evented: false,
    name: 'room_outline',
  } as any)

  roomGroup = [
    roomRect,
    // 长度标注 (上边上侧)
    new IText(`${rw}m`, {
      left: cw / 2,
      top: ch / 2 - sh / 2 - 25,
      originX: 'center',
      originY: 'center',
      fontSize: 12,
      fill: primaryColor,
      selectable: false,
      evented: false,
    }),
    // 宽度标注 (左边左侧)
    new IText(`${rh}m`, {
      left: cw / 2 - sw / 2 - 25,
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
    new IText(`S = ${(rw * rh).toFixed(2)}㎡`, {
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
    const cabX = cw / 2 - sw / 2
    const cabY = ch / 2 - sh / 2
    const doorX = cw / 2 - sw / 2
    const doorY = ch / 2 + sh / 2
    presetCabinetAndDoor(cabX, cabY, doorX, doorY, props.cabinetType)
    repositionPresetObjects(cabX, cabY, doorX, doorY)
  }

  canvas.value.renderAll()
}

function initRectCanvas() {
  initCanvas()
  drawRoom()
}

const show3D = ref(false)

function getPreviewData() {
  if (!canvas.value)
    return null

  const cw = canvas.value.getWidth()
  const ch = canvas.value.getHeight()
  const padding = 40
  const rw = Number(rect.value.w) || 1
  const rh = Number(rect.value.h) || 1
  const scale = Math.min((cw - padding * 2) / rw, (ch - padding * 2) / rh)
  const sw = rw * scale
  const sh = rh * scale

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
    type: 'rect',
    canvasWidth: cw,
    canvasHeight: ch,
    data: {
      ...rect.value,
      roomPixelWidth: sw,
      roomPixelHeight: sh,
    },
    subObjects,
  }
}

onMounted(() => {
  setTimeout(() => {
    initRectCanvas()
  }, 50)
})

watch(rect, drawRoom, { deep: true })

watch(() => props.cabinetType, (newType) => {
  if (newType) {
    updateCabinetShape(newType)
  }
})

defineExpose({
  rect,
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

    <template #inputs>
      <div class="border-gray-50 rounded-xl bg-white flex flex-col shadow-sm overflow-hidden">
        <van-cell-group :border="false">
          <van-field v-model="rect.w" input-align="right" label="长度 (m)" placeholder="请输入" type="number" />
          <van-field v-model="rect.h" input-align="right" label="宽度 (m)" placeholder="请输入" type="number" />
        </van-cell-group>
      </div>
    </template>

    <!-- 3D Preview Modal -->
    <ThreeDPreview v-model:show="show3D" :data="getPreviewData()" />
  </BaseShapeCanvas>
</template>

<style scoped>
.is-3d {
  transform: perspective(1200px) rotateX(50deg) rotateZ(-20deg);
  filter: drop-shadow(0 20px 30px rgba(59, 102, 245, 0.2));
}
</style>
