import { onUnmounted, shallowRef } from 'vue'
import { Canvas, Control, controlsUtils, IText, Rect } from 'fabric'
import type { FabricObject } from 'fabric'

export interface CanvasObject extends FabricObject {
  associatedLabel?: IText
}

export function useShapeCanvas() {
  const canvasEl = shallowRef<HTMLCanvasElement | null>(null)
  const canvas = shallowRef<Canvas | null>(null)
  const activeObject = shallowRef<CanvasObject | null>(null)

  const redColor = '#ef4444'
  const doorColor = '#9CA3AF'

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
    const label = obj.associatedLabel

    // 烟柜不可删除
    if (label && label.text === '烟柜')
      return
    // 房间轮廓不可删除
    if ((obj as any).name?.startsWith('room_'))
      return

    if (label) {
      canvas.value.remove(label)
    }
    canvas.value.remove(obj)
    canvas.value.discardActiveObject()
    canvas.value.renderAll()
    activeObject.value = null
  }

  function addCabinet(left?: number, top?: number) {
    if (!canvas.value)
      return

    // 如果已经存在烟柜，则不重复添加
    const existingCabinet = canvas.value.getObjects().find(
      obj => (obj as CanvasObject).associatedLabel?.text === '烟柜',
    )
    if (existingCabinet)
      return

    const cLeft = left ?? canvas.value.getWidth() / 2
    const cTop = top ?? canvas.value.getHeight() / 2

    const cabinet = new Rect({
      left: cLeft,
      top: cTop,
      originX: 'center',
      originY: 'center',
      width: 45,
      height: 30,
      fill: 'rgba(239, 68, 68, 0.1)',
      stroke: redColor,
      strokeWidth: 2,
      cornerColor: redColor,
      cornerSize: 8,
      transparentCorners: false,
      strokeUniform: true,
    })

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
      const zoom = canvas.value?.getZoom() || 1
      label.set({
        left: center.x,
        top: center.y,
        angle: cabinet.angle,
        fontSize: 12 / zoom,
      })
      if (canvas.value) {
        canvas.value.bringObjectToFront(label)
      }
    }

    cabinet.on('moving', syncLabel)
    cabinet.on('scaling', () => {
      cabinet.set({
        scaleY: cabinet.scaleX,
      })
      syncLabel()
    })
    cabinet.on('rotating', syncLabel)

    canvas.value.add(cabinet, label)
    syncLabel()
    canvas.value.setActiveObject(cabinet)
    canvas.value.renderAll()
  }

  function addDoor(left?: number, top?: number) {
    if (!canvas.value)
      return

    // 如果已经存在大门，则不重复添加
    const existingDoor = canvas.value.getObjects().find(
      obj => (obj as CanvasObject).associatedLabel?.text === '大门',
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
      width: 50,
      height: 15,
      fill: '#ffffff',
      stroke: doorColor,
      strokeWidth: 1,
      cornerColor: doorColor,
      cornerSize: 8,
      transparentCorners: false,
      strokeUniform: true,
      lockScalingY: true,
    })

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
      const zoom = canvas.value?.getZoom() || 1
      label.set({
        left: center.x,
        top: center.y,
        angle: door.angle,
        fontSize: 10 / zoom,
      })
      if (canvas.value) {
        canvas.value.bringObjectToFront(label)
      }
    }

    door.on('moving', syncLabel)
    door.on('scaling', syncLabel)
    door.on('rotating', syncLabel)

    canvas.value.add(door, label)
    syncLabel()
    canvas.value.setActiveObject(door)
    canvas.value.renderAll()
  }

  function presetCabinetAndDoor(cabX: number, cabY: number, doorX: number, doorY: number) {
    addCabinet(cabX + 22.5, cabY + 15)
    addDoor(doorX + 25, doorY - 7.5)
  }

  function repositionPresetObjects(cabX: number, cabY: number, doorX: number, doorY: number) {
    if (!canvas.value)
      return

    const cabinet = canvas.value.getObjects().find(o => (o as any).associatedLabel?.text === '烟柜')
    if (cabinet) {
      cabinet.set({ left: cabX + 22.5, top: cabY + 15 })
      cabinet.setCoords()
      ;(cabinet as any).associatedLabel?.set({ left: cabX + 22.5, top: cabY + 15 })
    }

    const door = canvas.value.getObjects().find(o => (o as any).associatedLabel?.text === '大门')
    if (door) {
      door.set({ left: doorX + 25, top: doorY - 7.5 })
      door.setCoords()
      ;(door as any).associatedLabel?.set({ left: doorX + 25, top: doorY - 7.5 })
    }
  }

  function removeCabinetAndDoor() {
    if (!canvas.value)
      return

    const cabinet = canvas.value.getObjects().find(o => (o as any).associatedLabel?.text === '烟柜')
    if (cabinet) {
      if ((cabinet as any).associatedLabel) {
        canvas.value.remove((cabinet as any).associatedLabel)
      }
      canvas.value.remove(cabinet)
    }

    const door = canvas.value.getObjects().find(o => (o as any).associatedLabel?.text === '大门')
    if (door) {
      if ((door as any).associatedLabel) {
        canvas.value.remove((door as any).associatedLabel)
      }
      canvas.value.remove(door)
    }

    canvas.value.renderAll()
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
    addDoor,
    presetCabinetAndDoor,
    repositionPresetObjects,
    removeCabinetAndDoor,
  }
}
