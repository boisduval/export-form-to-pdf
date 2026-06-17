<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const shapeType = ref<'rect' | 'trap' | 'poly'>('rect')

const rectRef = ref()
const trapRef = ref()
const polyRef = ref()

watch(shapeType, () => {
  nextTick(() => {
    if (shapeType.value === 'rect')
      rectRef.value?.drawRoom?.()
    else if (shapeType.value === 'trap')
      trapRef.value?.drawRoom?.()
    else if (shapeType.value === 'poly')
      polyRef.value?.rebuildShape?.()
  })
})

function triggerResize() {
  nextTick(() => {
    if (shapeType.value === 'rect')
      rectRef.value?.drawRoom?.()
    else if (shapeType.value === 'trap')
      trapRef.value?.drawRoom?.()
    else if (shapeType.value === 'poly')
      polyRef.value?.rebuildShape?.()
  })
}

defineExpose({
  triggerResize,
  getShapeData: () => {
    const isRect = shapeType.value === 'rect'
    const isTrap = shapeType.value === 'trap'
    let compRef: any
    if (isRect)
      compRef = rectRef.value
    else if (isTrap)
      compRef = trapRef.value
    else compRef = polyRef.value

    // 获取组件内部的响应式数据
    let data: any
    if (isRect)
      data = rectRef.value?.rect
    else if (isTrap)
      data = trapRef.value?.trap
    else data = polyRef.value?.shape

    // 自动计算面积 (u²)
    let area: string | undefined
    if (isRect && data) {
      area = (Number(data.w) * Number(data.h)).toFixed(2)
    }
    else if (isTrap && data) {
      area = ((Number(data.top) + Number(data.bottom)) * Number(data.h) / 2).toFixed(2)
    }
    else if (shapeType.value === 'poly' && data?.points?.length >= 3 && data.isClosed) {
      let a = 0
      const pts = data.points
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length
        a += pts[i].x * pts[j].y - pts[j].x * pts[i].y
      }
      const M_SCALE = 40
      area = (Math.abs(a) / 2 / (M_SCALE * M_SCALE)).toFixed(2)
    }

    return {
      type: shapeType.value,
      data: { ...data },
      image: compRef?.toDataURL(),
      calculatedArea: area,
    }
  },
})
</script>

<template>
  <div class="mt-2 flex flex-col gap-5">
    <!-- Type Selector -->
    <div class="p-1.5 border border-slate-200/20 rounded-2xl bg-slate-100/50 flex gap-1.5 shadow-inner backdrop-blur-md">
      <button
        v-for="item in [
          { type: 'rect', label: '矩形房间', desc: '标准方形', icon: 'rect' },
          { type: 'trap', label: '梯形房间', desc: '规则异形', icon: 'trap' },
          { type: 'poly', label: '自由绘制', desc: '多边形', icon: 'poly' },
        ]"
        :key="item.type"
        class="px-1.5 py-3 rounded-xl flex flex-1 flex-col gap-1.5 cursor-pointer transition-all duration-300 items-center justify-center relative overflow-hidden active:scale-95"
        :class="shapeType === item.type
          ? 'bg-white shadow-md shadow-slate-200/80 text-[#3B66F5] font-bold scale-[1.02] border border-slate-200/30'
          : 'text-slate-500 hover:text-slate-700 bg-transparent hover:bg-white/40 border border-transparent'"
        @click="shapeType = item.type as 'rect' | 'trap' | 'poly'"
      >
        <!-- Custom SVGs for shape visualization -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="shapeType === item.type ? 'text-[#3B66F5] scale-110' : 'text-slate-400'"
          class="transition-all duration-300"
        >
          <!-- Rect Icon -->
          <rect v-if="item.type === 'rect'" x="3" y="3" width="18" height="18" rx="2" />
          <!-- Trap Icon -->
          <polygon v-else-if="item.type === 'trap'" points="6,4 18,4 21,20 3,20" />
          <!-- Poly/Pen Icon -->
          <g v-else>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </g>
        </svg>

        <span class="text-xs tracking-wide font-semibold">{{ item.label }}</span>
        <span class="text-[9px] tracking-tight font-normal opacity-75">{{ item.desc }}</span>

        <!-- Active indicator capsule -->
        <span
          v-if="shapeType === item.type"
          class="rounded-full bg-[#3B66F5] h-1 w-3.5 transition-all duration-300 bottom-1 absolute"
        />
      </button>
    </div>

    <!-- Dynamic Shape Component -->
    <div class="transition-all duration-500">
      <ShapeRect v-show="shapeType === 'rect'" ref="rectRef" />
      <ShapeTrap v-show="shapeType === 'trap'" ref="trapRef" />
      <ShapePoly v-show="shapeType === 'poly'" ref="polyRef" />
    </div>
  </div>
</template>
