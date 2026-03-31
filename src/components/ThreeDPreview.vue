<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps<{
  show: boolean
  data: any // { type: 'rect'|'trap'|'poly', canvasWidth, canvasHeight, ... }
}>()

const emit = defineEmits(['update:show'])

const canvasContainer = ref<HTMLDivElement | null>(null)
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let animationFrameId: number | null = null

function initThree() {
  if (!canvasContainer.value)
    return

  // Cleanup existing renderer if any
  if (renderer) {
    if (animationFrameId)
      cancelAnimationFrame(animationFrameId)
    renderer.dispose()
    renderer.forceContextLoss()
    if (renderer.domElement.parentElement) {
      renderer.domElement.remove()
    }
    renderer = null
  }

  // 1. Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#f8fafc')

  // 2. Camera setup
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(250, 250, 250)

  // 3. Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  canvasContainer.value.appendChild(renderer.domElement)

  // 4. Controls setup
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // 5. Lights
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4) // Lower ambient for better contrast
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8)
  directionalLight.position.set(150, 300, 150)
  directionalLight.castShadow = true
  // Improve shadow resolution
  directionalLight.shadow.mapSize.width = 1024
  directionalLight.shadow.mapSize.height = 1024
  scene.add(directionalLight)

  // 6. Grid helper for ground
  const grid = new THREE.GridHelper(1000, 50, '#e2e8f0', '#cbd5e1')
  scene.add(grid)

  // 7. Render current data
  renderScene()

  // 8. Animation loop
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate)
    if (controls)
      controls.update()
    if (renderer && scene && camera)
      renderer.render(scene, camera)
  }
  animate()
}

function renderScene() {
  if (!scene || !props.data)
    return

  const { type, data, subObjects, canvasWidth = 300, canvasHeight = 200 } = props.data
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2

  const WALL_HEIGHT = 45
  const CABINET_HEIGHT = 20
  const DOOR_HEIGHT = 35

  const drawWalls = (points: { x: number, y: number }[]) => {
    if (points.length < 2)
      return

    // Floor
    const floorShape = new THREE.Shape()
    floorShape.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      floorShape.lineTo(points[i].x, points[i].y)
    }
    floorShape.lineTo(points[0].x, points[0].y)

    const floorGeo = new THREE.ShapeGeometry(floorShape)
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0', // Distinct floor color (light slate)
      roughness: 0.8,
      metalness: 0.05,
    })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.y = 0.01
    floorMesh.receiveShadow = true
    scene?.add(floorMesh)

    // Walls
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i]
      const p2 = points[(i + 1) % points.length]
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.hypot(dx, dy)

      const wallGeo = new THREE.BoxGeometry(dist, WALL_HEIGHT, 6)
      const wallMat = new THREE.MeshStandardMaterial({
        color: '#ffffff', // Pure white wall
        roughness: 0.9,
      })
      const wallMesh = new THREE.Mesh(wallGeo, wallMat)

      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2
      const angle = Math.atan2(dy, dx)

      wallMesh.position.set(midX, WALL_HEIGHT / 2, midY)
      wallMesh.rotation.y = -angle
      wallMesh.castShadow = true
      wallMesh.receiveShadow = true
      scene?.add(wallMesh)
    }
  }

  // Draw Room Outline
  if (type === 'rect') {
    const rw = data.roomPixelWidth || (data.w * 10)
    const rh = data.roomPixelHeight || (data.h * 10)
    const points = [
      { x: -rw / 2, y: -rh / 2 },
      { x: rw / 2, y: -rh / 2 },
      { x: rw / 2, y: rh / 2 },
      { x: -rw / 2, y: rh / 2 },
    ]
    drawWalls(points)
  }
  else if (type === 'trap') {
    if (data.roomPoints) {
      drawWalls(data.roomPoints)
    }
    else {
      const tt = data.top * 10
      const tb = data.bottom * 10
      const th = data.h * 10
      const to = data.offset * 10
      const points = [
        { x: to - tb / 2, y: -th / 2 },
        { x: to + tt - tb / 2, y: -th / 2 },
        { x: tb / 2, y: th / 2 },
        { x: -tb / 2, y: th / 2 },
      ]
      drawWalls(points)
    }
  }
  else if (type === 'poly') {
    const points = data.points.map((p: any) => ({ x: p.x - centerX, y: p.y - centerY }))
    drawWalls(points)
  }

  // Draw Cabinet & Door (Enhanced Logic)
  subObjects?.forEach((obj: any) => {
    const isCabinet = obj.name === '烟柜' || obj.type === '烟柜'
    const h = isCabinet ? CABINET_HEIGHT : DOOR_HEIGHT

    const group = new THREE.Group()

    if (isCabinet) {
      // Simple Solid Cabinet
      const geo = new THREE.BoxGeometry(obj.width, h, obj.height)
      const mat = new THREE.MeshStandardMaterial({
        color: '#ef4444',
        roughness: 0.4,
        metalness: 0.3,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    }
    else {
      // Enhanced Real Door
      const doorDepth = 3 // Thick door panel
      const frameDepth = 5 // Thicker frame
      const frameWidth = 4 // Frame border width

      // 1. Door Frame (U-shaped frame)
      const frameColor = '#94a3b8' // Distinct gray frame for contrast
      const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.6 })

      // Top bar
      const topBarGeo = new THREE.BoxGeometry(obj.width + frameWidth, 2, frameDepth)
      const topBar = new THREE.Mesh(topBarGeo, frameMat)
      topBar.position.set(0, h, 0)
      group.add(topBar)

      // Left bar
      const sideBarGeo = new THREE.BoxGeometry(frameWidth, h, frameDepth)
      const leftBar = new THREE.Mesh(sideBarGeo, frameMat)
      leftBar.position.set(-(obj.width + frameWidth) / 2 + frameWidth / 2, h / 2, 0)
      group.add(leftBar)

      // Right bar
      const rightBar = leftBar.clone()
      rightBar.position.set((obj.width + frameWidth) / 2 - frameWidth / 2, h / 2, 0)
      group.add(rightBar)

      // 2. Door Panel
      const panelColor = '#f3f4f6' // Off-white panel distinct from #ffffff walls
      const panelMat = new THREE.MeshStandardMaterial({ color: panelColor, roughness: 0.5, metalness: 0.05 })
      const panelGeo = new THREE.BoxGeometry(obj.width - 2, h - 1, doorDepth)
      const panel = new THREE.Mesh(panelGeo, panelMat)
      panel.position.set(0, (h - 1) / 2, 0)
      panel.castShadow = true
      panel.receiveShadow = true
      group.add(panel)

      // 3. Door Handle
      const handleMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.1 })
      const handleGeo = new THREE.CylinderGeometry(0.5, 0.5, 4, 8)
      const handle = new THREE.Mesh(handleGeo, handleMat)
      handle.rotation.z = Math.PI / 2
      // Position handle on one side
      handle.position.set(obj.width / 2 - 6, h / 2, doorDepth / 2 + 1)
      group.add(handle)

      const handlePlateGeo = new THREE.BoxGeometry(1, 4, 0.5)
      const handlePlate = new THREE.Mesh(handlePlateGeo, handleMat)
      handlePlate.position.set(obj.width / 2 - 6, h / 2, doorDepth / 2 + 0.5)
      group.add(handlePlate)
    }

    group.position.set(obj.left - centerX, 0, obj.top - centerY)
    group.rotation.y = -THREE.MathUtils.degToRad(obj.angle)
    scene?.add(group)
  })

  if (camera)
    camera.lookAt(0, 0, 0)
}

watch(() => props.show, (val) => {
  if (val) {
    setTimeout(initThree, 100)
  }
  else {
    if (animationFrameId)
      cancelAnimationFrame(animationFrameId)
    if (renderer) {
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentElement) {
        renderer.domElement.remove()
      }
    }
    scene = null
    camera = null
    renderer = null
    controls = null
  }
})

onUnmounted(() => {
  if (animationFrameId)
    cancelAnimationFrame(animationFrameId)
})

function handleClose() {
  emit('update:show', false)
}
</script>

<template>
  <van-popup
    :show="show"
    position="bottom"
    class="rounded-t-3xl bg-slate-50 flex flex-col h-[85vh] shadow-2xl transition-all overflow-hidden"
    closeable
    @close="handleClose"
  >
    <div class="p-5 flex flex-1 flex-col">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg text-slate-800 font-bold flex gap-2 items-center">
          <van-icon name="points" class="text-primary" />
          3D 预览
        </h3>
      </div>

      <div ref="canvasContainer" class="border border-slate-200 rounded-2xl bg-[#edf2f7] flex-1 shadow-inner relative overflow-hidden">
        <div class="flex flex-col gap-1 pointer-events-none bottom-4 left-4 absolute z-10">
          <div class="text-[10px] text-slate-500 px-2 py-1 border border-slate-100 rounded bg-white/90 shadow-sm backdrop-blur">
            单指：旋转视图
          </div>
          <div class="text-[10px] text-slate-500 px-2 py-1 border border-slate-100 rounded bg-white/90 shadow-sm backdrop-blur">
            双指：缩放视图
          </div>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-slate-200 gap-3 grid grid-cols-3">
        <div class="flex flex-col gap-1 items-center">
          <div class="rounded bg-slate-300 h-3 w-3 shadow-sm" />
          <span class="text-[10px] text-slate-500">实体墙体</span>
        </div>
        <div class="flex flex-col gap-1 items-center">
          <div class="rounded bg-[#ef4444] h-3 w-3 shadow-sm" />
          <span class="text-[10px] text-slate-500">烟柜设施</span>
        </div>
        <div class="flex flex-col gap-1 items-center">
          <div class="border border-slate-300 rounded bg-slate-500 h-3 w-3 shadow-sm" />
          <span class="text-[10px] text-slate-500">出入口</span>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
:deep(.van-popup) {
  background-color: #f8fafc !important;
}
</style>
