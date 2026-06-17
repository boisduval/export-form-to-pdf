import { onUnmounted, shallowRef } from 'vue'
import { Canvas, IText, Rect } from 'fabric'
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

  function initCanvas(options: { width?: number, height?: number } = {}) {
    if (!canvasEl.value)
      return
    const container = canvasEl.value.parentElement

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
    const container = canvasEl.value.parentElement
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

  function addDoor(left?: number, top?: number) {
    if (!canvas.value)
      return

    const dLeft = left ?? canvas.value.getWidth() / 2
    const dTop = top ?? canvas.value.getHeight() / 2

    const door = new Rect({
      left: dLeft,
      top: dTop,
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
  }
}
