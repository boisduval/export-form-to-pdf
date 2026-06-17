<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Circle, IText, Line, Point, Polygon, Polyline } from 'fabric'
import BaseShapeCanvas from './BaseShapeCanvas.vue'
import ThreeDPreview from './ThreeDPreview.vue'
import { useShapeCanvas } from '@/composables/useShapeCanvas'

const props = defineProps<{
  modelValue?: { points: { x: number, y: number }[], isClosed: boolean }
  readOnly?: boolean
}>()

const shape = ref(props.modelValue || { points: [] as { x: number, y: number }[], isClosed: false })

const {
  canvasEl,
  canvas,
  initCanvas,
  presetCabinetAndDoor,
  removeCabinetAndDoor,
} = useShapeCanvas()

// 模态框控制
const showEditModal = ref(false)
const editingSideIdx = ref(-1)
const newLength = ref('')

// 绘图与拖拽状态并存
const isSnapEnabled = ref(true)
const calculatedArea = ref(0)
const isDrawingNew = ref(false)
const tempEndPoint = ref<{ x: number, y: number } | null>(null)
const draggingSideIdx = ref(-1)
const lastPointer = ref<{ x: number, y: number } | null>(null)
const startPointer = ref<{ x: number, y: number } | null>(null)

const primaryColor = '#3B66F5'
const redColor = '#ef4444'
const snapColor = '#f59e0b'
const successColor = '#10b981'

// 常规配置
const SNAP_THRESHOLD_SCREEN = 10
const HIT_RADIUS_SCREEN = 20
const M_SCALE = 40 // 40像素代表1米，与梯形组件保持一致
const PADDING = 40

/**
 * 视口自动缩放与居中 (Logic Coordinate System)
 */
function updateViewport() {
  if (!canvas.value)
    return

  const { points } = shape.value
  const objects = canvas.value.getObjects().filter((o: any) => o.associatedLabel)

  if (points.length === 0 && objects.length === 0) {
    canvas.value.setViewportTransform([1, 0, 0, 1, 0, 0])
    return
  }

  // 1. 计算所有点和家具的逻辑边界
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  points.forEach((p) => {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  })

  objects.forEach((o: any) => {
    const center = o.getCenterPoint()
    const w = o.width * o.scaleX
    const h = o.height * o.scaleY
    minX = Math.min(minX, center.x - w / 2)
    minY = Math.min(minY, center.y - h / 2)
    maxX = Math.max(maxX, center.x + w / 2)
    maxY = Math.max(maxY, center.y + h / 2)
  })

  // 如果点数较少，设定一个最小范围避免无限放大
  if (maxX - minX < 10) {
    minX -= 50
    maxX += 50
  }
  if (maxY - minY < 10) {
    minY -= 50
    maxY += 50
  }

  // 2. 计算缩放比例
  const cw = canvas.value.getWidth()
  const ch = canvas.value.getHeight()
  const contentW = maxX - minX + PADDING * 2
  const contentH = maxY - minY + PADDING * 2

  let zoom = Math.min(cw / contentW, ch / contentH)
  zoom = Math.max(0.1, Math.min(zoom, 2)) // 限制缩放范围在 0.1 ~ 2 之间

  // 3. 计算偏移量使图形居中
  const offsetX = (cw - (minX + maxX) * zoom) / 2
  const offsetY = (ch - (minY + maxY) * zoom) / 2

  canvas.value.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY])
}

/**
 * 绘图核心：刷新画布
 */
function rebuildShape(snappedPoint: any = null, skipViewportUpdate = false) {
  if (!canvas.value)
    return

  // 0. 检查并校正画布尺寸 (解决 v-show 初始化问题)
  const container = canvasEl.value?.closest('.canvas-wrapper')
  if (container && container.clientWidth > 0 && container.clientHeight > 0) {
    if (canvas.value.getWidth() !== container.clientWidth || canvas.value.getHeight() !== container.clientHeight) {
      canvas.value.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }
  }

  // 1. 视口管理：交互中（skipViewportUpdate=true）不调整视口，防止位移感
  if (!skipViewportUpdate) {
    updateViewport()
  }

  const zoom = canvas.value.getZoom()

  // 2. 清理临时提示对象 (吸附线、标注、临时拉线)
  // 关键：必须先获取对象副本再进行清理，直接遍历 getObjects() 并 remove 会导致由于数组长度变化漏掉对象
  const allObjects = canvas.value.getObjects().slice()
  allObjects.forEach((obj: any) => {
    const n = obj.name
    if (['room_snap_line', 'room_snap_circle', 'room_temp_line', 'room_label', 'room_outline'].includes(n)) {
      canvas.value?.remove(obj)
    }
  })

  // 3. 绘制吸附提示
  if (snappedPoint?.snaps?.length > 0) {
    snappedPoint.snaps.forEach((s: any) => {
      const ref = s.ref
      const coords: [number, number, number, number] = s.type === 'v'
        ? [ref.x, -2000, ref.x, 2000]
        : [-2000, ref.y, 2000, ref.y]

      const line = new Line(coords, {
        stroke: snapColor,
        strokeWidth: 1 / zoom,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        name: 'room_snap_line',
      } as any)
      canvas.value.add(line)

      const circle = new Circle({
        left: ref.x,
        top: ref.y,
        radius: 4 / zoom,
        stroke: snapColor,
        strokeWidth: 1 / zoom,
        fill: 'transparent',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        name: 'room_snap_circle',
      } as any)
      canvas.value.add(circle)
    })
  }

  const { points, isClosed } = shape.value
  if (points.length === 0)
    return

  // 4. 绘制轮廓线
  const fabricPoints = points.map(p => new Point(p.x, p.y))
  if (isDrawingNew.value && tempEndPoint.value) {
    fabricPoints.push(new Point(tempEndPoint.value.x, tempEndPoint.value.y))
  }

  let outline: any
  if (isClosed) {
    outline = new Polygon(fabricPoints, {
      fill: 'rgba(16, 185, 129, 0.05)',
      stroke: successColor,
      strokeWidth: 3 / zoom,
      selectable: false,
      evented: false,
      name: 'room_outline',
    } as any)
  }
  else if (fabricPoints.length >= 2) {
    outline = new Polyline(fabricPoints, {
      fill: 'transparent',
      stroke: isDrawingNew.value ? snapColor : primaryColor,
      strokeWidth: 2 / zoom,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    } as any)
    outline.set({ name: 'room_outline' })
  }
  if (outline) {
    canvas.value.add(outline)
    canvas.value.sendObjectToBack(outline)
  }

  // 5. 绘制顶点
  // 关键：首先移除不再需要的旧顶点 (例如撤销操作后多出来的点)
  canvas.value.getObjects().forEach((obj: any) => {
    if (obj.name?.startsWith('room_point_')) {
      const idx = Number.parseInt(obj.name.replace('room_point_', ''))
      if (idx >= points.length)
        canvas.value.remove(obj)
    }
  })

  points.forEach((p, i) => {
    const isStart = i === 0
    const isLast = i === points.length - 1
    const showRed = isStart && !isClosed && points.length >= 3

    const activeFill = isLast ? 'rgba(59, 130, 246, 0.2)' : primaryColor
    const circleConfig: any = {
      left: p.x,
      top: p.y,
      radius: (isLast && !isClosed) ? 8 / zoom : 4 / zoom,
      fill: showRed ? redColor : (isClosed ? primaryColor : activeFill),
      stroke: showRed ? redColor : 'white',
      strokeWidth: 2 / zoom,
      originX: 'center',
      originY: 'center',
      selectable: isClosed,
      evented: isClosed,
      hasControls: false,
      name: `room_point_${i}`,
    }

    let circle = canvas.value.getObjects().find((o: any) => o.name === `room_point_${i}`)
    if (!circle) {
      circle = new Circle(circleConfig)
      circle.on('moving', () => {
        const center = (circle as any).getCenterPoint()
        const snapped = getSnappedPoint(center, [i])
        circle!.set({ left: snapped.x, top: snapped.y })
        shape.value.points[i] = { x: snapped.x, y: snapped.y }
        rebuildShape(snapped, true)
      })
      circle.on('modified', () => rebuildShape())
      canvas.value?.add(circle)
    }
    else {
      circle.set(circleConfig)
      circle.setCoords() // 必须调用，否则其可点击区域不会随坐标同步更新
    }
  })

  // 6. 标注与面积
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    if (isClosed || i < points.length - 1) {
      drawLengthLabel(points[i], points[j])
    }
  }
  if (isDrawingNew.value && tempEndPoint.value) {
    drawLengthLabel(points.at(-1)!, tempEndPoint.value)
  }

  if (isClosed && points.length >= 3) {
    let a = 0
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length]
      a += points[i].x * next.y - next.x * points[i].y
    }
    calculatedArea.value = (Math.abs(a) / 2) / (M_SCALE * M_SCALE)
  }
  else {
    calculatedArea.value = 0
  }

  canvas.value.renderAll()
}

function drawLengthLabel(p1: { x: number, y: number }, p2: { x: number, y: number }) {
  const midX = (p1.x + p2.x) / 2
  const midY = (p1.y + p2.y) / 2
  const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
  const distM = (dist / M_SCALE).toFixed(1)

  const label = new IText(`${distM}m`, {
    left: midX,
    top: midY,
    fontSize: 10 / (canvas.value?.getZoom() || 1),
    fill: '#64748b',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  })
  ;(label as any).name = 'room_label'
  canvas.value?.add(label)
}

function initPolyCanvas() {
  initCanvas({ height: 400 })
  if (canvas.value) {
    canvas.value.on('mouse:down', handleMouseDown)
    canvas.value.on('mouse:move', handleMouseMove)
    canvas.value.on('mouse:up', handleMouseUp)
  }
  rebuildShape()
  if (shape.value.isClosed && canvas.value) {
    const pts = shape.value.points
    let minX = Infinity
    let minY = Infinity
    let maxY = -Infinity
    pts.forEach((p) => {
      if (p.x < minX)
        minX = p.x
      if (p.y < minY)
        minY = p.y
      if (p.y > maxY)
        maxY = p.y
    })
    presetCabinetAndDoor(minX, minY, minX, maxY)
  }
}

function getSnappedPoint(rawPos: { x: number, y: number }, ignoreIndices: number[] = []) {
  const { points } = shape.value
  let x = rawPos.x
  let y = rawPos.y
  const snaps: { type: 'h' | 'v', ref: { x: number, y: number } }[] = []

  if (!isSnapEnabled.value)
    return { x, y, snaps }

  const snapThreshold = SNAP_THRESHOLD_SCREEN / canvas.value!.getZoom()

  points.forEach((p, i) => {
    if (ignoreIndices.includes(i))
      return
    if (Math.abs(rawPos.x - p.x) < snapThreshold) {
      x = p.x
      snaps.push({ type: 'v', ref: p })
    }
    if (Math.abs(rawPos.y - p.y) < snapThreshold) {
      y = p.y
      snaps.push({ type: 'h', ref: p })
    }
  })

  return { x, y, snaps }
}

function pointToSegmentDist(p: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }) {
  const l2 = Math.hypot(a.x - b.x, a.y - b.y) ** 2
  if (l2 === 0)
    return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2))
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)))
}

function getClickedSide(pointer: { x: number, y: number }) {
  const { points } = shape.value
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    if (pointToSegmentDist(pointer, points[i], points[j]) < 20)
      return i
  }
  return -1
}

function handleMouseDown(opt: any) {
  if (!canvas.value)
    return
  const pointer = canvas.value.getScenePoint(opt.e)
  const { points, isClosed } = shape.value
  const hitRadius = HIT_RADIUS_SCREEN / canvas.value!.getZoom()

  startPointer.value = { ...pointer }

  if (isClosed) {
    // 闭合后的顶点拖拽由 Fabric 事件监听处理，此处检查边平移
    setTimeout(() => {
      if (!canvas.value?.getActiveObject()) {
        const side = getClickedSide(pointer)
        if (side !== -1) {
          draggingSideIdx.value = side
          lastPointer.value = { ...pointer }
        }
      }
    }, 50)
  }
  else {
    // 绘图逻辑
    if (points.length === 0) {
      points.push({ x: pointer.x, y: pointer.y })
      rebuildShape()
    }
    else {
      // 检查是否从最后一点出来的“拉线”起点
      const lastPoint = points.at(-1)!
      if (Math.hypot(pointer.x - lastPoint.x, pointer.y - lastPoint.y) < hitRadius) {
        isDrawingNew.value = true
        tempEndPoint.value = { x: pointer.x, y: pointer.y }
      }
    }
  }
}

function handleMouseMove(opt: any) {
  if (!canvas.value)
    return
  const pointer = canvas.value.getScenePoint(opt.e)

  if (draggingSideIdx.value !== -1 && lastPointer.value) {
    // 拖动边
    const { points } = shape.value
    const i = draggingSideIdx.value
    const j = (i + 1) % points.length

    // 使用鼠标作为主驱动位移 dx/dy
    const rawDx = pointer.x - lastPointer.value.x
    const rawDy = pointer.y - lastPointer.value.y

    // 获取端点预估的新位置进行吸附探测 (判断边上的端点是否命中吸附)
    const futureI = { x: points[i].x + rawDx, y: points[i].y + rawDy }
    const finalSnap = getSnappedPoint(futureI, [i, j])

    // 如果没有吸附，也可以尝试端点 J
    let finalSnappedPos = finalSnap
    if (finalSnap.snaps.length === 0) {
      const futureJ = { x: points[j].x + rawDx, y: points[j].y + rawDy }
      const snapJFull = getSnappedPoint(futureJ, [i, j])
      if (snapJFull.snaps.length > 0)
        finalSnappedPos = snapJFull
    }

    // 计算最终生效的位移：如果命中吸附就按吸附对齐，否则按鼠标原样移动
    const actualDx = finalSnappedPos.snaps.some(s => s.type === 'v')
      ? (finalSnappedPos.x - points[finalSnappedPos === finalSnap ? i : j].x)
      : rawDx
    const actualDy = finalSnappedPos.snaps.some(s => s.type === 'h')
      ? (finalSnappedPos.y - points[finalSnappedPos === finalSnap ? i : j].y)
      : rawDy

    points[i].x += actualDx
    points[i].y += actualDy
    points[j].x += actualDx
    points[j].y += actualDy

    lastPointer.value = { ...pointer } // 鼠标轨迹平滑记录
    rebuildShape(finalSnappedPos, true)
  }
  else if (isDrawingNew.value) {
    // 正在拉线 (绘图中)
    const snapped = getSnappedPoint(pointer)
    tempEndPoint.value = { x: snapped.x, y: snapped.y }
    rebuildShape(snapped, true)
  }
}

function handleMouseUp(opt: any) {
  if (!canvas.value)
    return
  const pointer = canvas.value.getScenePoint(opt.e)
  const { points } = shape.value
  const hitRadius = HIT_RADIUS_SCREEN / canvas.value!.getZoom()

  if (isDrawingNew.value && tempEndPoint.value) {
    const firstPt = points[0]
    // 闭合检查 (拉到起点松手)
    if (points.length >= 3 && Math.hypot(tempEndPoint.value.x - firstPt.x, tempEndPoint.value.y - firstPt.y) < hitRadius) {
      shape.value.isClosed = true
    }
    else {
      // 逻辑同步 Demo：追加新点
      points.push({ ...tempEndPoint.value })
    }
    isDrawingNew.value = false
    tempEndPoint.value = null
    rebuildShape() // 必须重绘以清除吸附线并显示新线
  }
  else if (draggingSideIdx.value !== -1 && startPointer.value) {
    const travel = Math.hypot(pointer.x - startPointer.value.x, pointer.y - startPointer.value.y)
    if (travel < 5) {
      editingSideIdx.value = draggingSideIdx.value
      const p1 = points[editingSideIdx.value]
      const p2 = points[(editingSideIdx.value + 1) % points.length]
      newLength.value = (Math.hypot(p1.x - p2.x, p1.y - p2.y) / M_SCALE).toFixed(1)
      showEditModal.value = true
    }
    draggingSideIdx.value = -1
    lastPointer.value = null
    rebuildShape()
  }
  else {
    // 兜底清理
    rebuildShape()
  }
}

function applyNewLength() {
  const valM = Number.parseFloat(newLength.value)
  if (Number.isNaN(valM) || valM <= 0 || editingSideIdx.value === -1)
    return

  const valPX = valM * M_SCALE
  const { points } = shape.value
  const i = editingSideIdx.value
  const j = (i + 1) % points.length
  const p1 = points[i]
  const p2 = points[j]

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const oldLen = Math.hypot(dx, dy)

  if (oldLen > 0.1) {
    const ratio = valPX / oldLen
    if (j !== 0) {
      // 整体平移后续所有点
      const shiftX = (p1.x + dx * ratio) - p2.x
      const shiftY = (p1.y + dy * ratio) - p2.y
      for (let k = j; k < points.length; k++) {
        points[k].x += shiftX
        points[k].y += shiftY
      }
    }
    else {
      // 如果是闭合边，只移动前一个点
      points[i].x = p2.x + (p1.x - p2.x) * ratio
      points[i].y = p2.y + (p1.y - p2.y) * ratio
    }
  }

  showEditModal.value = false
  rebuildShape()
}

function undo() {
  if (shape.value.isClosed) {
    shape.value.isClosed = false
    removeCabinetAndDoor()
  }
  else {
    shape.value.points.pop()
  }
  rebuildShape()
}

function clear() {
  shape.value.points = []
  shape.value.isClosed = false
  isDrawingNew.value = false
  removeCabinetAndDoor()
  canvas.value?.getObjects().forEach((obj: any) => {
    if (obj.name?.startsWith('room_')) {
      canvas.value?.remove(obj)
    }
  })
  canvas.value?.renderAll()
}

function closeShape() {
  if (shape.value.points.length >= 3) {
    shape.value.isClosed = true
    rebuildShape()
    if (canvas.value) {
      const pts = shape.value.points
      let minX = Infinity
      let minY = Infinity
      let maxY = -Infinity
      pts.forEach((p) => {
        if (p.x < minX)
          minX = p.x
        if (p.y < minY)
          minY = p.y
        if (p.y > maxY)
          maxY = p.y
      })
      presetCabinetAndDoor(minX, minY, minX, maxY)
    }
  }
}

onMounted(() => {
  setTimeout(initPolyCanvas, 50)
})

const show3D = ref(false)

function getPreviewData() {
  if (!canvas.value)
    return null

  const cw = canvas.value.getWidth()
  const ch = canvas.value.getHeight()

  const objects = canvas.value.getObjects().filter((o: any) => o.associatedLabel)
  const subObjects = objects.map((o: any) => ({
    type: o.associatedLabel.text,
    left: o.left,
    top: o.top,
    width: o.width * o.scaleX,
    height: o.height * o.scaleY,
    angle: o.angle,
  }))

  return {
    type: 'poly',
    canvasWidth: cw,
    canvasHeight: ch,
    data: {
      points: shape.value.points,
    },
    subObjects,
  }
}

defineExpose({
  shape,
  rebuildShape,
  toDataURL: () => {
    if (!canvas.value)
      return ''
    return canvas.value.toDataURL({ format: 'png', multiplier: 2, enableRetinaScaling: true })
  },
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Status / Info -->
    <div class="px-1 flex items-end justify-between">
      <div class="text-xs text-gray-400">
        <template v-if="!shape.isClosed">
          <span v-if="shape.points.length === 0">点击画布放置起点</span>
          <span v-else>按住红点拖动拉出线条，连接起点闭合</span>
        </template>
        <template v-else>
          已闭合。拖动顶点或<b>点击边</b>调整形状
        </template>
      </div>
    </div>

    <BaseShapeCanvas
      :read-only="readOnly"
      height-class="h-80"
      @toggle3d="show3D = true"
    >
      <template #canvas>
        <canvas ref="canvasEl" />
      </template>

      <template #toolbar>
        <!-- Polygon Actions -->
        <div class="flex gap-2">
          <button
            class="text-xs font-bold px-3 py-2.5 rounded-2xl flex flex-1 gap-1.5 cursor-pointer whitespace-nowrap shadow-sm transition-all duration-200 items-center justify-center active:scale-95"
            :class="isSnapEnabled
              ? 'bg-amber-50 text-amber-600 border border-amber-200/50 shadow-amber-500/5'
              : 'bg-slate-50 text-slate-500 border border-slate-200/40'"
            @click="isSnapEnabled = !isSnapEnabled"
          >
            <span class="rounded-full h-1.5 w-1.5" :class="isSnapEnabled ? 'bg-amber-500 shadow-sm shadow-amber-500/50 animate-pulse' : 'bg-slate-300'" />
            吸附: {{ isSnapEnabled ? '开' : '关' }}
          </button>
          <button
            v-if="!shape.isClosed"
            class="text-xs text-emerald-600 font-bold px-3 py-2.5 border border-emerald-200/50 rounded-2xl bg-emerald-50/70 flex flex-1 gap-1 cursor-pointer whitespace-nowrap shadow-sm transition-all duration-200 items-center justify-center disabled:text-slate-400 disabled:border-slate-200/30 disabled:bg-slate-50/50 hover:bg-emerald-100/60 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 disabled:scale-100"
            :disabled="shape.points.length < 3"
            @click="closeShape"
          >
            <div class="i-carbon-checkmark text-sm" />
            闭合
          </button>
          <button
            class="text-xs text-blue-600 font-bold px-3 py-2.5 border border-blue-200/50 rounded-2xl bg-blue-50/70 flex flex-1 gap-1 cursor-pointer whitespace-nowrap shadow-sm transition-all duration-200 items-center justify-center disabled:text-slate-400 disabled:border-slate-200/30 disabled:bg-slate-50/50 hover:bg-blue-100/60 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 disabled:scale-100"
            :disabled="shape.points.length === 0"
            @click="undo"
          >
            <div class="i-carbon-undo text-sm" />
            撤销
          </button>
          <button
            class="text-xs text-rose-600 font-bold px-3 py-2.5 border border-rose-200/50 rounded-2xl bg-rose-50/70 flex flex-1 gap-1 cursor-pointer whitespace-nowrap shadow-sm transition-all duration-200 items-center justify-center disabled:text-slate-400 disabled:border-slate-200/30 disabled:bg-slate-50/50 hover:bg-rose-100/60 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 disabled:scale-100"
            :disabled="shape.points.length === 0"
            @click="clear"
          >
            <div class="i-carbon-reset text-sm" />
            清空
          </button>
        </div>
      </template>

      <!-- 边长修改弹窗 -->
      <van-dialog v-model:show="showEditModal" title="修改边长" show-cancel-button @confirm="applyNewLength">
        <div class="p-6">
          <van-field v-model="newLength" type="number" label="长度(m)" placeholder="请输入新长度" input-align="right" step="0.1" autofocus />
        </div>
      </van-dialog>

      <!-- 3D Preview Modal -->
      <ThreeDPreview v-model:show="show3D" :data="getPreviewData()" />
    </BaseShapeCanvas>
  </div>
</template>
