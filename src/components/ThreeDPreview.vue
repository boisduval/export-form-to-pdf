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
let camera: THREE.OrthographicCamera | null = null
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
  scene.background = new THREE.Color('#d1e9ff')

  // 2. Camera setup
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  const aspect = width / height
  const d = 12
  camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000)
  camera.position.set(20, 20, 20)

  // 3. Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  canvasContainer.value.appendChild(renderer.domElement)

  // 4. Controls setup
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // 5. Lights
  scene.add(new THREE.AmbientLight(0xFFFFFF, 2.2)) // Increased for bright white walls

  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.5) // Increased for bright white walls
  directionalLight.position.set(5, 15, 5)
  directionalLight.castShadow = true

  // Set shadow camera bounds to cover the entire room area
  directionalLight.shadow.camera.left = -20
  directionalLight.shadow.camera.right = 20
  directionalLight.shadow.camera.top = 20
  directionalLight.shadow.camera.bottom = -20
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 40

  // Improve shadow resolution and prevent shadow acne
  directionalLight.shadow.mapSize.width = 1024
  directionalLight.shadow.mapSize.height = 1024
  directionalLight.shadow.bias = -0.001
  scene.add(directionalLight)

  // 6. Render current data
  renderScene()

  // 7. Animation loop
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

  const WALL_HEIGHT = 2.5
  const CABINET_HEIGHT = 2.0
  const DOOR_HEIGHT = 2.0

  const drawWalls = (points: { x: number, y: number }[]) => {
    if (points.length < 2)
      return

    // Floor
    const floorShape = new THREE.Shape()
    floorShape.moveTo(points[0].x, -points[0].y)
    for (let i = 1; i < points.length; i++) {
      floorShape.lineTo(points[i].x, -points[i].y)
    }
    floorShape.lineTo(points[0].x, -points[0].y)

    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')

    // Create a procedural tile texture as a fallback in case the online texture fails to load
    const createFallbackTexture = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#f1f5f9' // Soft light slate base
        ctx.fillRect(0, 0, 256, 256)
        ctx.strokeStyle = '#cbd5e1' // Slate border
        ctx.lineWidth = 12
        ctx.strokeRect(0, 0, 256, 256)
      }
      const tex = new THREE.CanvasTexture(canvas)
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(0.25, 0.25)
      return tex
    }

    const floorMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      side: THREE.DoubleSide,
    })

    try {
      loader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/png/1k/granite_tile_04/granite_tile_04_rough_1k.png',
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping
          tex.repeat.set(0.25, 0.25)
          floorMat.map = tex
          floorMat.needsUpdate = true
        },
        undefined,
        () => {
          // Fallback on error
          floorMat.map = createFallbackTexture()
          floorMat.needsUpdate = true
        },
      )
    }
    catch {
      floorMat.map = createFallbackTexture()
    }

    const floorGeo = new THREE.ShapeGeometry(floorShape)

    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.y = 0.01
    floorMesh.receiveShadow = true
    scene?.add(floorMesh)

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: '#ffffff' })
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i]
      const p2 = points[(i + 1) % points.length]
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.hypot(dx, dy)

      const wallGeo = new THREE.BoxGeometry(dist, WALL_HEIGHT, 0.4)
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

  // Draw Room Outline (divided by 10 to scale to 1x meters)
  if (type === 'rect') {
    const rw = (data.roomPixelWidth || (data.w * 10)) / 10
    const rh = (data.roomPixelHeight || (data.h * 10)) / 10
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
      const points = data.roomPoints.map((p: any) => ({ x: p.x / 10, y: p.y / 10 }))
      drawWalls(points)
    }
    else {
      const tt = data.top
      const tb = data.bottom
      const th = data.h
      const to = data.offset
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
    const points = data.points.map((p: any) => ({ x: (p.x - centerX) / 10, y: (p.y - centerY) / 10 }))
    drawWalls(points)
  }

  // Draw Cabinet & Door (Enhanced Logic - divided by 10)
  subObjects?.forEach((obj: any) => {
    const isCabinet = obj.name === '烟柜' || obj.type === '烟柜'
    const h = isCabinet ? CABINET_HEIGHT : DOOR_HEIGHT

    const group = new THREE.Group()
    const w = obj.width / 10
    const d = obj.height / 10

    if (isCabinet) {
      // Simple Solid Cabinet
      const geo = new THREE.BoxGeometry(w, h, d)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xEF9A9A, // soft red to match accentRackMat (0xef9a9a)
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = h / 2 // Move Up: Put bottom on floor
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    }
    else {
      // Enhanced Real Door
      const doorDepth = 0.3 // Thick door panel
      const frameDepth = 0.5 // Thicker frame
      const frameWidth = 0.4 // Frame border width

      // 1. Door Frame (U-shaped frame)
      const frameColor = '#94a3b8' // Distinct gray frame for contrast
      const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.6 })

      // Top bar
      const topBarGeo = new THREE.BoxGeometry(w + frameWidth, 0.2, frameDepth)
      const topBar = new THREE.Mesh(topBarGeo, frameMat)
      topBar.position.set(0, h, 0)
      group.add(topBar)

      // Left bar
      const sideBarGeo = new THREE.BoxGeometry(frameWidth, h, frameDepth)
      const leftBar = new THREE.Mesh(sideBarGeo, frameMat)
      leftBar.position.set(-(w + frameWidth) / 2 + frameWidth / 2, h / 2, 0)
      group.add(leftBar)

      // Right bar
      const rightBar = leftBar.clone()
      rightBar.position.set((w + frameWidth) / 2 - frameWidth / 2, h / 2, 0)
      group.add(rightBar)

      // 2. Door Panel
      const panelColor = '#f3f4f6' // Off-white panel distinct from #ffffff walls
      const panelMat = new THREE.MeshStandardMaterial({ color: panelColor, roughness: 0.5, metalness: 0.05 })
      const panelGeo = new THREE.BoxGeometry(w - 0.2, h - 0.1, doorDepth)
      const panel = new THREE.Mesh(panelGeo, panelMat)
      panel.position.set(0, (h - 0.1) / 2, 0)
      panel.castShadow = true
      panel.receiveShadow = true
      group.add(panel)

      // 3. Door Handle
      const handleMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.1 })
      const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8)
      const handle = new THREE.Mesh(handleGeo, handleMat)
      handle.rotation.z = Math.PI / 2
      // Position handle on one side
      handle.position.set(w / 2 - 0.6, h / 2, doorDepth / 2 + 0.1)
      group.add(handle)

      const handlePlateGeo = new THREE.BoxGeometry(0.1, 0.4, 0.05)
      const handlePlate = new THREE.Mesh(handlePlateGeo, handleMat)
      handlePlate.position.set(w / 2 - 0.6, h / 2, doorDepth / 2 + 0.05)
      group.add(handlePlate)
    }

    group.position.set((obj.left - centerX) / 10, 0, (obj.top - centerY) / 10)
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
          <div class="i-carbon-cube text-lg text-primary" />
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
    </div>
  </van-popup>
</template>

<style scoped>
:deep(.van-popup) {
  background-color: #f8fafc !important;
}
</style>
