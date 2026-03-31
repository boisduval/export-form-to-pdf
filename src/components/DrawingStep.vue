<script setup lang="ts">
import { ref } from 'vue'

const shapeType = ref<'rect' | 'trap' | 'poly'>('rect')

const rectRef = ref()
const trapRef = ref()
const polyRef = ref()

defineExpose({
  getShapeData: () => {
    const isRect = shapeType.value === 'rect'
    const isTrap = shapeType.value === 'trap'
    let compRef: any
    if (isRect) compRef = rectRef.value
    else if (isTrap) compRef = trapRef.value
    else compRef = polyRef.value
    
    // 获取组件内部的响应式数据
    let data: any
    if (isRect) data = rectRef.value?.rect
    else if (isTrap) data = trapRef.value?.trap
    else data = polyRef.value?.shape

    // 自动计算面积 (u²)
    let area: string | undefined
    if (isRect && data) {
      area = (Number(data.w) * Number(data.h)).toFixed(2)
    } else if (isTrap && data) {
      area = ((Number(data.top) + Number(data.bottom)) * Number(data.h) / 2).toFixed(2)
    } else if (shapeType.value === 'poly' && data?.points?.length >= 3 && data.isClosed) {
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
  <div class="mt-2 flex flex-col gap-4">
    <!-- Type Selector -->
    <div class="p-1 rounded-xl bg-gray-100/50 flex">
      <button
        v-for="(label, type) in { rect: '矩形', trap: '梯形', poly: '自定义' }"
        :key="type"
        class="text-xs font-bold py-1.5 rounded-lg flex-1 transition-all"
        :class="shapeType === type ? 'bg-white shadow-sm text-primary' : 'text-gray-500'"
        @click="shapeType = type as 'rect' | 'trap' | 'poly'"
      >
        {{ label }}
      </button>
    </div>

    <!-- Dynamic Shape Component -->
    <ShapeRect v-show="shapeType === 'rect'" ref="rectRef" />
    <ShapeTrap v-show="shapeType === 'trap'" ref="trapRef" />
    <ShapePoly v-show="shapeType === 'poly'" ref="polyRef" />
  </div>
</template>
