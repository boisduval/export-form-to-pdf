import { onUnmounted, shallowRef } from 'vue'
import { Canvas, Control, controlsUtils, IText, Polygon, Rect } from 'fabric'
import type { FabricObject } from 'fabric'

export interface CanvasObject extends FabricObject {
  associatedLabel?: IText
}

export function useShapeCanvas() {
  const canvasEl = shallowRef<HTMLCanvasElement | null>(null)
  const canvas = shallowRef<Canvas | null>(null)
  const activeObject = shallowRef<CanvasObject | null>(null)

  const redColor = '#B57474'
  const doorColor = '#527EBF'
  const wallColor = '#8A8A8A'
  const wallStrokeWidth = 6
  const roomFillColor = '#EAEAEA'

  function renderControlIcon(ctx: CanvasRenderingContext2D, left: number, top: number, type: 'drag' | 'rotate', color: string) {
    ctx.save()
    ctx.translate(left, top)

    // Draw circle background
    ctx.beginPath()
    ctx.arc(0, 0, 8, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (type === 'drag') {
      // Horizontal line & arrows
      ctx.beginPath()
      ctx.moveTo(-5, 0)
      ctx.lineTo(5, 0)
      ctx.moveTo(-3, -2)
      ctx.lineTo(-5, 0)
      ctx.lineTo(-3, 2)
      ctx.moveTo(3, -2)
      ctx.lineTo(5, 0)
      ctx.lineTo(3, 2)

      // Vertical line & arrows
      ctx.moveTo(0, -5)
      ctx.lineTo(0, 5)
      ctx.moveTo(-2, -3)
      ctx.lineTo(0, -5)
      ctx.lineTo(2, -3)
      ctx.moveTo(-2, 3)
      ctx.lineTo(0, 5)
      ctx.lineTo(2, 3)
      ctx.stroke()
    }
    else if (type === 'rotate') {
      // Draw circular arrow icon
      ctx.beginPath()
      ctx.arc(0, 0.5, 4, -Math.PI / 4, Math.PI * 5 / 4)
      ctx.stroke()

      // Arrow head at the end
      ctx.beginPath()
      ctx.moveTo(0.5, -3.5)
      ctx.lineTo(4.5, -3.5)
      ctx.lineTo(4.5, 0.5)
      ctx.stroke()
    }

    ctx.restore()
  }

  function initCanvas(options: { width?: number, height?: number } = {}) {
    if (!canvasEl.value)
      return
    const container = canvasEl.value.closest('.canvas-wrapper')

    canvas.value = new Canvas(canvasEl.value, {
      backgroundColor: 'transparent',
      width: options.width || container?.clientWidth || 300,
      height: options.height || container?.clientHeight || 200,
      selection: false,
      preserveObjectStacking: true,
    })

    canvas.value.on('selection:created', (e) => {
      activeObject.value = e.selected?.[0] as CanvasObject
    })
    canvas.value.on('selection:updated', (e) => {
      activeObject.value = e.selected?.[0] as CanvasObject
    })
    canvas.value.on('selection:cleared', () => {
      activeObject.value = null
    })

    resizeCanvas()
  }

  function resizeCanvas() {
    if (!canvas.value || !canvasEl.value)
      return false
    const container = canvasEl.value.closest('.canvas-wrapper')
    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
      if (canvas.value.getWidth() !== container.clientWidth || canvas.value.getHeight() !== container.clientHeight) {
        canvas.value.setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        })
        return true
      }
    }
    return false
  }

  function deleteSelected() {
    if (!canvas.value || !activeObject.value)
      return

    const obj = activeObject.value

    // 烟柜不可删除
    if ((obj as any).name === 'cabinet')
      return
    // 房间轮廓不可删除
    if ((obj as any).name?.startsWith('room_'))
      return

    canvas.value.remove(obj)
    canvas.value.discardActiveObject()
    canvas.value.renderAll()
    activeObject.value = null
  }

  function addCabinet(left?: number, top?: number, type: 'default' | 'l_shape' | 'convex' = 'default') {
    if (!canvas.value)
      return

    // 如果已经存在烟柜，则不重复添加
    const existingCabinet = canvas.value.getObjects().find(
      obj => (obj as any).name === 'cabinet',
    )
    if (existingCabinet)
      return

    const cLeft = left ?? canvas.value.getWidth() / 2
    const cTop = top ?? canvas.value.getHeight() / 2

    let cabinet: FabricObject
    const fill = redColor

    if (type === 'l_shape') {
      const points = [
        { x: -22.5, y: -15 },
        { x: 22.5, y: -15 },
        { x: 22.5, y: 0 },
        { x: -7.5, y: 0 },
        { x: -7.5, y: 15 },
        { x: -22.5, y: 15 },
      ]
      cabinet = new Polygon(points, {
        left: cLeft,
        top: cTop,
        originX: 'center',
        originY: 'center',
        fill,
        stroke: 'transparent',
        strokeWidth: 0,
        cornerColor: redColor,
        cornerSize: 8,
        transparentCorners: false,
        strokeUniform: true,
        name: 'cabinet',
      } as any)
    }
    else if (type === 'convex') {
      const points = [
        { x: 7.5, y: 15 },
        { x: -7.5, y: 15 },
        { x: -7.5, y: 0 },
        { x: -22.5, y: 0 },
        { x: -22.5, y: -15 },
        { x: 22.5, y: -15 },
        { x: 22.5, y: 0 },
        { x: 7.5, y: 0 },
      ]
      cabinet = new Polygon(points, {
        left: cLeft,
        top: cTop,
        originX: 'center',
        originY: 'center',
        fill,
        opacity: 1,
        stroke: 'transparent',
        strokeWidth: 0,
        cornerColor: redColor,
        cornerSize: 8,
        transparentCorners: false,
        strokeUniform: true,
        name: 'cabinet',
      } as any)
    }
    else {
      cabinet = new Rect({
        left: cLeft,
        top: cTop,
        originX: 'center',
        originY: 'center',
        width: 45,
        height: 30,
        fill,
        opacity: 1,
        stroke: 'transparent',
        strokeWidth: 0,
        cornerColor: redColor,
        cornerSize: 8,
        transparentCorners: false,
        strokeUniform: true,
        name: 'cabinet',
      } as any)
    }

    cabinet.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
    })

    cabinet.controls.dragHandle = new Control({
      x: 0,
      y: 0.5,
      offsetX: 0,
      offsetY: 20,
      actionHandler: controlsUtils.dragHandler,
      cursorStyle: 'move',
      actionName: 'drag',
      withConnection: true,
      sizeX: 16,
      sizeY: 16,
      touchSizeX: 28,
      touchSizeY: 28,
      render: (ctx, left, top) => renderControlIcon(ctx, left, top, 'drag', redColor),
    })

    if (cabinet.controls.mtr) {
      cabinet.controls.mtr.offsetY = -20 // shorter connection line
      cabinet.controls.mtr.withConnection = true
      cabinet.controls.mtr.sizeX = 16
      cabinet.controls.mtr.sizeY = 16
      cabinet.controls.mtr.touchSizeX = 28
      cabinet.controls.mtr.touchSizeY = 28
      cabinet.controls.mtr.render = (ctx, left, top) => renderControlIcon(ctx, left, top, 'rotate', redColor)
    }

    cabinet.on('scaling', () => {
      cabinet.set({
        scaleY: cabinet.scaleX,
      })
    })

    canvas.value.add(cabinet)
    canvas.value.setActiveObject(cabinet)
    canvas.value.renderAll()
  }

  function updateCabinetShape(type: 'default' | 'l_shape' | 'convex') {
    if (!canvas.value)
      return

    const existingCabinet = canvas.value.getObjects().find(
      obj => (obj as any).name === 'cabinet',
    )
    if (!existingCabinet)
      return

    const left = existingCabinet.left
    const top = existingCabinet.top
    const angle = existingCabinet.angle

    // Remove old cabinet
    canvas.value.remove(existingCabinet)

    let cabinet: FabricObject
    const fill = redColor

    if (type === 'l_shape') {
      const points = [
        { x: -22.5, y: -15 },
        { x: 22.5, y: -15 },
        { x: 22.5, y: 0 },
        { x: -7.5, y: 0 },
        { x: -7.5, y: 15 },
        { x: -22.5, y: 15 },
      ]
      cabinet = new Polygon(points, {
        left,
        top,
        angle,
        originX: 'center',
        originY: 'center',
        fill,
        opacity: 1,
        stroke: 'transparent',
        strokeWidth: 0,
        cornerColor: redColor,
        cornerSize: 8,
        transparentCorners: false,
        strokeUniform: true,
        name: 'cabinet',
      } as any)
    }
    else if (type === 'convex') {
      const points = [
        { x: 7.5, y: 15 },
        { x: -7.5, y: 15 },
        { x: -7.5, y: 0 },
        { x: -22.5, y: 0 },
        { x: -22.5, y: -15 },
        { x: 22.5, y: -15 },
        { x: 22.5, y: 0 },
        { x: 7.5, y: 0 },
      ]
      cabinet = new Polygon(points, {
        left,
        top,
        angle,
        originX: 'center',
        originY: 'center',
        fill,
        opacity: 1,
        stroke: 'transparent',
        strokeWidth: 0,
        cornerColor: redColor,
        cornerSize: 8,
        transparentCorners: false,
        strokeUniform: true,
        name: 'cabinet',
      } as any)
    }
    else {
      cabinet = new Rect({
        left,
        top,
        angle,
        originX: 'center',
        originY: 'center',
        width: 45,
        height: 30,
        fill,
        opacity: 1,
        stroke: 'transparent',
        strokeWidth: 0,
        cornerColor: redColor,
        cornerSize: 8,
        transparentCorners: false,
        strokeUniform: true,
        name: 'cabinet',
      } as any)
    }

    cabinet.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
    })

    cabinet.controls.dragHandle = new Control({
      x: 0,
      y: 0.5,
      offsetX: 0,
      offsetY: 20,
      actionHandler: controlsUtils.dragHandler,
      cursorStyle: 'move',
      actionName: 'drag',
      withConnection: true,
      sizeX: 16,
      sizeY: 16,
      touchSizeX: 28,
      touchSizeY: 28,
      render: (ctx, left, top) => renderControlIcon(ctx, left, top, 'drag', redColor),
    })

    if (cabinet.controls.mtr) {
      cabinet.controls.mtr.offsetY = -20
      cabinet.controls.mtr.withConnection = true
      cabinet.controls.mtr.sizeX = 16
      cabinet.controls.mtr.sizeY = 16
      cabinet.controls.mtr.touchSizeX = 28
      cabinet.controls.mtr.touchSizeY = 28
      cabinet.controls.mtr.render = (ctx, left, top) => renderControlIcon(ctx, left, top, 'rotate', redColor)
    }

    cabinet.on('scaling', () => {
      cabinet.set({
        scaleY: cabinet.scaleX,
      })
    })

    canvas.value.add(cabinet)
    canvas.value.setActiveObject(cabinet)
    canvas.value.renderAll()
  }

  function getWallSegments() {
    if (!canvas.value)
      return []
    const roomOutline = canvas.value.getObjects().find(o => (o as any).name === 'room_outline')
    if (!roomOutline)
      return []

    const segments: { p1: { x: number, y: number }, p2: { x: number, y: number } }[] = []

    if (roomOutline.type === 'rect') {
      const rect = roomOutline as Rect
      const center = rect.getCenterPoint()
      const w = rect.width * rect.scaleX
      const h = rect.height * rect.scaleY
      const x1 = center.x - w / 2
      const x2 = center.x + w / 2
      const y1 = center.y - h / 2
      const y2 = center.y + h / 2

      const pts = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      ]
      for (let i = 0; i < 4; i++) {
        segments.push({ p1: pts[i], p2: pts[(i + 1) % 4] })
      }
    }
    else if (roomOutline.type === 'polygon') {
      const poly = roomOutline as Polygon
      const points = poly.points || []
      const matrix = poly.calcTransformMatrix()
      const absPoints = points.map((p) => {
        const x = p.x - (poly.pathOffset?.x || 0)
        const y = p.y - (poly.pathOffset?.y || 0)
        return {
          x: matrix[0] * x + matrix[2] * y + matrix[4],
          y: matrix[1] * x + matrix[3] * y + matrix[5],
        }
      })
      for (let i = 0; i < absPoints.length; i++) {
        segments.push({ p1: absPoints[i], p2: absPoints[(i + 1) % absPoints.length] })
      }
    }
    return segments
  }

  function addDoor(left?: number, top?: number) {
    if (!canvas.value)
      return

    // 如果已经存在大门，则不重复添加
    const existingDoor = canvas.value.getObjects().find(
      obj => (obj as any).name === 'door',
    )
    if (existingDoor)
      return

    const dLeft = left ?? canvas.value.getWidth() / 2
    const dTop = top ?? canvas.value.getHeight() / 2

    const door = new Rect({
      left: dLeft,
      top: dTop,
      originX: 'center',
      originY: 'center',
      width: 100,
      height: wallStrokeWidth,
      fill: doorColor,
      opacity: 1,
      stroke: 'transparent',
      strokeWidth: 0,
      cornerColor: doorColor,
      cornerSize: 8,
      transparentCorners: false,
      strokeUniform: true,
      lockScalingY: true,
      name: 'door',
    } as any)

    door.setControlsVisibility({
      mt: false,
      mb: false,
      tl: false,
      tr: false,
      bl: false,
      br: false,
    })

    door.controls.dragHandle = new Control({
      x: 0,
      y: 0.5,
      offsetX: 0,
      offsetY: 20,
      actionHandler: controlsUtils.dragHandler,
      cursorStyle: 'move',
      actionName: 'drag',
      withConnection: true,
      sizeX: 16,
      sizeY: 16,
      touchSizeX: 28,
      touchSizeY: 28,
      render: (ctx, left, top) => renderControlIcon(ctx, left, top, 'drag', doorColor),
    })

    if (door.controls.mtr) {
      door.controls.mtr.offsetY = -20 // shorter connection line
      door.controls.mtr.withConnection = true
      door.controls.mtr.sizeX = 16
      door.controls.mtr.sizeY = 16
      door.controls.mtr.touchSizeX = 28
      door.controls.mtr.touchSizeY = 28
      door.controls.mtr.render = (ctx, left, top) => renderControlIcon(ctx, left, top, 'rotate', doorColor)
    }

    const handleDoorMoving = () => {
      snapDoorToWall(door, 30)
    }

    door.on('moving', handleDoorMoving)

    canvas.value.add(door)
    snapDoorToWall(door, 100)
    canvas.value.setActiveObject(door)
    canvas.value.renderAll()
  }

  function snapDoorToWall(doorObj: any, threshold = 100) {
    const segments = getWallSegments()
    if (segments.length === 0)
      return

    let bestDist = Infinity
    let bestPt = { x: doorObj.left, y: doorObj.top }
    let bestAngle = doorObj.angle

    const doorCenter = { x: doorObj.left, y: doorObj.top }

    segments.forEach((seg) => {
      const A = seg.p1
      const B = seg.p2
      const abX = B.x - A.x
      const abY = B.y - A.y
      const abLenSq = abX * abX + abY * abY
      if (abLenSq === 0)
        return

      const apX = doorCenter.x - A.x
      const apY = doorCenter.y - A.y
      let t = (apX * abX + apY * abY) / abLenSq
      t = Math.max(0, Math.min(1, t))

      const projX = A.x + t * abX
      const projY = A.y + t * abY
      const dist = Math.hypot(doorCenter.x - projX, doorCenter.y - projY)

      if (dist < bestDist) {
        bestDist = dist
        bestPt = { x: projX, y: projY }
        bestAngle = Math.atan2(abY, abX) * 180 / Math.PI
      }
    })

    if (bestDist < threshold) {
      doorObj.set({
        left: bestPt.x,
        top: bestPt.y,
        angle: bestAngle,
      })
      doorObj.setCoords()
    }
  }

  function presetCabinetAndDoor(cabX: number, cabY: number, doorX: number, doorY: number, type: 'default' | 'l_shape' | 'convex' = 'default') {
    addCabinet(cabX + 22.5 + wallStrokeWidth / 2, cabY + 15 + wallStrokeWidth / 2, type)
    addDoor(doorX + 50, doorY)
  }

  function repositionPresetObjects(cabX: number, cabY: number, doorX: number, doorY: number) {
    if (!canvas.value)
      return

    const cabinet = canvas.value.getObjects().find(o => (o as any).name === 'cabinet')
    if (cabinet) {
      cabinet.set({ left: cabX + 22.5 + wallStrokeWidth / 2, top: cabY + 15 + wallStrokeWidth / 2 })
      cabinet.setCoords()
    }

    const door = canvas.value.getObjects().find(o => (o as any).name === 'door')
    if (door) {
      door.set({ left: doorX + 50, top: doorY })
      snapDoorToWall(door, 100)
      door.setCoords()
    }
  }

  function removeCabinetAndDoor() {
    if (!canvas.value)
      return

    const cabinet = canvas.value.getObjects().find(o => (o as any).name === 'cabinet')
    if (cabinet) {
      canvas.value.remove(cabinet)
    }

    const door = canvas.value.getObjects().find(o => (o as any).name === 'door')
    if (door) {
      canvas.value.remove(door)
    }

    canvas.value.renderAll()
  }

  function toDataURLWithLegend() {
    if (!canvas.value)
      return ''

    const vpt = canvas.value.viewportTransform || [1, 0, 0, 1, 0, 0]
    const zoom = vpt[0]
    // Position legend in the bottom-left corner of the current viewport
    const leftX = (15 - vpt[4]) / zoom
    const bottomY = (canvas.value.height - 20 - vpt[5]) / zoom

    const fontSize = 10 / zoom

    // 烟柜色块
    const redRect = new Rect({
      left: leftX,
      top: bottomY,
      width: 14 / zoom,
      height: 8 / zoom,
      fill: redColor,
      stroke: 'transparent',
      strokeWidth: 0,
      originX: 'left',
      originY: 'center',
    })

    const redText = new IText('烟柜', {
      left: leftX + 18 / zoom,
      top: bottomY,
      fontSize,
      fill: '#64748b',
      originX: 'left',
      originY: 'center',
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
    })

    // 大门色块
    const blueRect = new Rect({
      left: leftX + 50 / zoom,
      top: bottomY,
      width: 14 / zoom,
      height: 8 / zoom,
      fill: doorColor,
      stroke: 'transparent',
      strokeWidth: 0,
      originX: 'left',
      originY: 'center',
    })

    const blueText = new IText('大门', {
      left: leftX + 68 / zoom,
      top: bottomY,
      fontSize,
      fill: '#64748b',
      originX: 'left',
      originY: 'center',
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
    })

    const legendObjects = [redRect, redText, blueRect, blueText]

    canvas.value.add(...legendObjects)
    canvas.value.renderAll()

    const dataURL = canvas.value.toDataURL({
      format: 'png',
      multiplier: 2,
      enableRetinaScaling: true,
    })

    legendObjects.forEach(obj => canvas.value?.remove(obj))
    canvas.value.renderAll()

    return dataURL
  }

  onUnmounted(() => {
    if (canvas.value) {
      canvas.value.dispose()
      canvas.value = null
    }
  })

  return {
    canvasEl,
    canvas,
    activeObject,
    initCanvas,
    resizeCanvas,
    deleteSelected,
    addCabinet,
    updateCabinetShape,
    addDoor,
    presetCabinetAndDoor,
    repositionPresetObjects,
    removeCabinetAndDoor,
    wallColor,
    wallStrokeWidth,
    roomFillColor,
    toDataURLWithLegend,
  }
}
