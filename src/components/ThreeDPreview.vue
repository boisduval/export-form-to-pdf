<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

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
  renderer.shadowMap.enabled = false
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  canvasContainer.value.appendChild(renderer.domElement)

  // 4. Controls setup
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // 5. Lights
  scene.add(new THREE.AmbientLight(0xFFFFFF, 2.2)) // Increased for bright white walls

  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.5) // Increased for bright white walls
  directionalLight.position.set(5, 15, 5)
  directionalLight.castShadow = false

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
  const CABINET_HEIGHT = 2

  let roomOutlinePoints: { x: number, y: number }[] = []

  const drawWalls = (points: { x: number, y: number }[]) => {
    roomOutlinePoints = points
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

      // Calculate doors overlapping this wall segment
      const segmentDoors: { tStart: number, tEnd: number }[] = []
      const wallVectorX = p2.x - p1.x
      const wallVectorY = p2.y - p1.y
      const segmentLength = Math.hypot(wallVectorX, wallVectorY)

      if (segmentLength > 0.01) {
        subObjects?.forEach((obj: any) => {
          const isDoor = obj.name !== '烟柜' && obj.type !== '烟柜'
          if (!isDoor)
            return

          const doorX = (obj.left - centerX) / 10
          const doorY = (obj.top - centerY) / 10
          const doorW = obj.width / 10

          // Project door center onto wall segment
          const apX = doorX - p1.x
          const apY = doorY - p1.y
          const t = (apX * wallVectorX + apY * wallVectorY) / (segmentLength * segmentLength)

          if (t >= -0.05 && t <= 1.05) {
            const projX = p1.x + t * wallVectorX
            const projY = p1.y + t * wallVectorY
            const distToWall = Math.hypot(doorX - projX, doorY - projY)

            // If the door is close to the wall (within 0.8 meters)
            if (distToWall < 0.8) {
              const clampedT = Math.max(0, Math.min(1, t))
              const tHalf = (doorW / 2) / segmentLength
              segmentDoors.push({
                tStart: Math.max(0, clampedT - tHalf),
                tEnd: Math.min(1, clampedT + tHalf),
              })
            }
          }
        })
      }

      // Sort and merge intervals to split the wall
      segmentDoors.sort((a, b) => a.tStart - b.tStart)
      const wallIntervals: { start: number, end: number }[] = []
      let currentStart = 0

      segmentDoors.forEach((door) => {
        if (door.tStart > currentStart + 0.01) {
          wallIntervals.push({ start: currentStart, end: door.tStart })
        }
        currentStart = Math.max(currentStart, door.tEnd)
      })

      if (currentStart < 0.99) {
        wallIntervals.push({ start: currentStart, end: 1 })
      }

      // Draw the segmented walls
      wallIntervals.forEach((interval) => {
        const startPoint = {
          x: p1.x + interval.start * wallVectorX,
          y: p1.y + interval.start * wallVectorY,
        }
        const endPoint = {
          x: p1.x + interval.end * wallVectorX,
          y: p1.y + interval.end * wallVectorY,
        }

        const dx = endPoint.x - startPoint.x
        const dy = endPoint.y - startPoint.y
        const dist = Math.hypot(dx, dy)
        if (dist < 0.05)
          return

        const wallGeo = new THREE.BoxGeometry(dist, WALL_HEIGHT, 0.4)
        const wallMesh = new THREE.Mesh(wallGeo, wallMat)

        const midX = (startPoint.x + endPoint.x) / 2
        const midY = (startPoint.y + endPoint.y) / 2
        const angle = Math.atan2(dy, dx)

        wallMesh.position.set(midX, WALL_HEIGHT / 2, midY)
        wallMesh.rotation.y = -angle
        wallMesh.castShadow = true
        wallMesh.receiveShadow = true
        scene?.add(wallMesh)
      })
    }

    // Pillars at corners to fill gaps
    const pillarGeo = new THREE.BoxGeometry(0.4, WALL_HEIGHT, 0.4)
    points.forEach((p) => {
      const pillar = new THREE.Mesh(pillarGeo, wallMat)
      pillar.position.set(p.x, WALL_HEIGHT / 2, p.y)
      scene?.add(pillar)
    })
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

  function createGoldenHandle(isOuter: boolean) {
    const h = new THREE.Group()
    const g = new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 1, roughness: 0.15 })
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16), g)
    b.rotation.z = Math.PI / 2
    h.add(b)
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12), g)
    s.rotation.z = Math.PI / 2
    s.position.x = isOuter ? -0.05 : 0.05
    h.add(s)
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 12), g)
    l.rotation.x = Math.PI / 2
    l.position.set(isOuter ? -0.1 : 0.1, 0, -0.15)
    h.add(l)
    h.traverse((c) => {
      if ((c as any).isMesh)
        c.castShadow = false
    })
    return h
  }

  // Draw Cabinet & Door
  subObjects?.forEach((obj: any) => {
    const isCabinet = obj.name === '烟柜' || obj.type === '烟柜'
    const h = isCabinet ? CABINET_HEIGHT : 2.5 // Door height is 2.5 to match wall height

    const group = new THREE.Group()
    const w = obj.width / 10

    let groupX = (obj.left - centerX) / 10
    let groupY = (obj.top - centerY) / 10
    let groupRotationY = -THREE.MathUtils.degToRad(obj.angle)

    if (isCabinet) {
      const loader = new GLTFLoader()
      loader.load(
        '/models/danell_ridge_w556-48_ashley.glb',
        (gltf) => {
          const model = gltf.scene.clone()
          const box = new THREE.Box3().setFromObject(model)
          const size = new THREE.Vector3()
          box.getSize(size)

          if (size.x > 0.001) {
            const scaleFactor = w / size.x
            model.scale.set(scaleFactor, scaleFactor, scaleFactor)

            // Get scaled bounds to align center horizontally and bottom to y=0
            const scaledBox = new THREE.Box3().setFromObject(model)
            const scaledCenter = new THREE.Vector3()
            scaledBox.getCenter(scaledCenter)

            model.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z)
          }
          group.add(model)
        },
        undefined,
        (error) => {
          console.error('Error loading cabinet model:', error)
        },
      )
    }
    else {
      // Find the closest wall segment to align the door
      let minDistance = Infinity
      if (roomOutlinePoints.length >= 2) {
        for (let i = 0; i < roomOutlinePoints.length; i++) {
          const p1 = roomOutlinePoints[i]
          const p2 = roomOutlinePoints[(i + 1) % roomOutlinePoints.length]
          const wallVectorX = p2.x - p1.x
          const wallVectorY = p2.y - p1.y
          const segmentLength = Math.hypot(wallVectorX, wallVectorY)
          if (segmentLength < 0.01)
            continue

          const apX = groupX - p1.x
          const apY = groupY - p1.y
          const t = (apX * wallVectorX + apY * wallVectorY) / (segmentLength * segmentLength)

          if (t >= -0.05 && t <= 1.05) {
            const clampedT = Math.max(0, Math.min(1, t))
            const projX = p1.x + clampedT * wallVectorX
            const projY = p1.y + clampedT * wallVectorY
            const distToWall = Math.hypot(groupX - projX, groupY - projY)

            if (distToWall < 0.8 && distToWall < minDistance) {
              minDistance = distToWall
              groupX = projX
              groupY = projY
              groupRotationY = -Math.atan2(wallVectorY, wallVectorX)
            }
          }
        }
      }

      // Realistic Door based on reference HTML
      const woodLoader = new THREE.TextureLoader()
      woodLoader.setCrossOrigin('anonymous')

      const woodMat = new THREE.MeshStandardMaterial({
        color: '#8b5a2b', // fallback wood brown
        roughness: 0.7,
      })

      woodLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/Textures/png/1k/wooden_garage_door/wooden_garage_door_diff_1k.png',
        (tex) => {
          woodMat.map = tex
          woodMat.needsUpdate = true
        },
      )

      // Leaf (door depth is 0.3)
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), woodMat)
      leaf.position.y = h / 2
      leaf.castShadow = true
      leaf.receiveShadow = true
      group.add(leaf)

      // Handles
      const oh = createGoldenHandle(true)
      oh.position.set(w / 2 - 0.6, h / 2, 0.15)
      group.add(oh)

      const ih = createGoldenHandle(false)
      ih.position.set(w / 2 - 0.6, h / 2, -0.15)
      group.add(ih)
    }

    group.position.set(groupX, 0, groupY)
    group.rotation.y = groupRotationY
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
