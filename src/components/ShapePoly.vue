<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { Canvas, Circle, IText, Line, Point, Polygon, Polyline, Rect } from 'fabric'
import type { FabricObject } from 'fabric'

interface CanvasObject extends FabricObject {
  associatedLabel?: IText
}

const props = defineProps<{
  modelValue?: { points: { x: number, y: number }[], isClosed: boolean }
  readOnly?: boolean
}>()

const shape = ref(props.modelValue || { points: [] as { x: number, y: number }[], isClosed: false })

const canvasEl = shallowRef<HTMLCanvasElement | null>(null)
const canvas = shallowRef<any | null>(null)
const activeObject = shallowRef<any>(null)

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
const doorColor = '#9CA3AF'

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

function initCanvas() {
  if (!canvasEl.value)
    return
  const container = canvasEl.value.parentElement

  canvas.value = new Canvas(canvasEl.value, {
    backgroundColor: '#ffffff',
    width: container?.clientWidth || 300,
    height: container?.clientHeight || 400,
    selection: false,
    preserveObjectStacking: true,
  })

  canvas.value.on('mouse:down', handleMouseDown)
  canvas.value.on('mouse:move', handleMouseMove)
  canvas.value.on('mouse:up', handleMouseUp)

  canvas.value.on('selection:created', (evt: any) => {
    activeObject.value = evt.selected?.[0] as CanvasObject
  })
  canvas.value.on('selection:updated', (evt: any) => {
    activeObject.value = evt.selected?.[0] as CanvasObject
  })
  canvas.value.on('selection:cleared', () => {
    activeObject.value = null
  })

  rebuildShape()
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
      if (snapJFull.snaps.length > 0) finalSnappedPos = snapJFull
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
  }
}

function deleteSelected() {
  if (!canvas.value || !activeObject.value)
    return
  const obj = activeObject.value as CanvasObject
  if (obj.associatedLabel?.text === '烟柜')
    return
  if (obj.associatedLabel)
    canvas.value.remove(obj.associatedLabel)
  canvas.value.remove(obj)
  canvas.value.discardActiveObject()
  canvas.value.renderAll()
}

function addCabinet() {
  if (!canvas.value)
    return
  const existing = canvas.value.getObjects().find((o: any) => o.associatedLabel?.text === '烟柜')
  if (existing)
    return

  const cabinet = new Rect({
    left: 100,
    top: 100,
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
  ;(cabinet as any).associatedLabel = label
  const sync = () => {
    label.set({
      left: cabinet.getCenterPoint().x,
      top: cabinet.getCenterPoint().y,
      angle: cabinet.angle,
    })
  }
  cabinet.on('moving', sync)
  cabinet.on('scaling', sync)
  cabinet.on('rotating', sync)
  canvas.value.add(cabinet, label)
  sync()
  canvas.value.setActiveObject(cabinet)
  canvas.value.renderAll()
}

function addDoor() {
  if (!canvas.value)
    return
  const door = new Rect({
    left: 150,
    top: 150,
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
  ;(door as any).associatedLabel = label
  const sync = () => {
    label.set({
      left: door.getCenterPoint().x,
      top: door.getCenterPoint().y,
      angle: door.angle,
    })
  }
  door.on('moving', sync)
  door.on('scaling', sync)
  door.on('rotating', sync)
  canvas.value.add(door, label)
  sync()
  canvas.value.setActiveObject(door)
  canvas.value.renderAll()
}

onMounted(() => {
  setTimeout(initCanvas, 50)
})

onUnmounted(() => {
  if (canvas.value) {
    canvas.value.dispose()
    canvas.value = null
  }
})

defineExpose({
  shape,
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

    <!-- Preview Area -->
    <div :class="[readOnly ? 'h-64 border-none rounded-lg' : 'h-80 shadow-sm border rounded-2xl']" class="p-4 bg-white flex flex-col items-center justify-center relative overflow-hidden">
      <div class="canvas-wrapper">
        <canvas ref="canvasEl" />
      </div>
    </div>

    <!-- Controls Toolbar -->
    <div v-if="!readOnly" class="px-1 flex flex-col gap-4">
      <!-- Polygon Actions -->
      <div class="flex gap-2">
        <button
          class="text-xs font-bold px-3 py-1.5 rounded-xl flex flex-1 gap-1 shadow-sm transition-all items-center justify-center active:scale-95"
          :class="isSnapEnabled ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-400 border border-slate-200'"
          @click="isSnapEnabled = !isSnapEnabled"
        >
          <span class="rounded-full h-1.5 w-1.5" :class="isSnapEnabled ? 'bg-amber-500' : 'bg-slate-300'" />
          吸附: {{ isSnapEnabled ? '开' : '关' }}
        </button>
        <van-button v-if="!shape.isClosed" size="small" type="primary" plain class="flex-1 !rounded-xl" :disabled="shape.points.length < 3" @click="closeShape">
          闭合
        </van-button>
        <van-button size="small" plain class="flex-1 !rounded-xl" :disabled="shape.points.length === 0" @click="undo">
          撤销
        </van-button>
        <van-button size="small" plain class="flex-1 !rounded-xl" :disabled="shape.points.length === 0" @click="clear">
          清空
        </van-button>
      </div>

      <!-- General Actions -->
      <div class="gap-3 grid grid-cols-2">
        <van-button icon="plus" plain size="small" type="primary" block class="shadow-sm !rounded-xl" @click="addDoor">
          添加大门
        </van-button>
        <van-button
          v-if="activeObject && (activeObject.associatedLabel?.text !== '烟柜' && !activeObject.name?.startsWith('room_'))"
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

      <van-button v-if="shape.isClosed" icon="shop-o" size="small" type="primary" block class="shadow-sm !rounded-xl" @click="addCabinet">
        添加烟柜
      </van-button>
    </div>

    <!-- 边长修改弹窗 -->
    <van-dialog v-model:show="showEditModal" title="修改边长" show-cancel-button @confirm="applyNewLength">
      <div class="p-6">
        <van-field v-model="newLength" type="number" label="长度(m)" placeholder="请输入新长度" input-align="right" step="0.1" autofocus />
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.canvas-container) {
  margin: 0 auto;
}
</style>
