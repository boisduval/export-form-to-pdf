<script setup lang="ts">
import { ref } from 'vue'

const shapeType = ref<'rect' | 'trap'>('rect')

const rectRef = ref()
const trapRef = ref()

defineExpose({
  getShapeData: () => {
    const compRef = shapeType.value === 'rect' ? rectRef.value : trapRef.value
    return {
      type: shapeType.value,
      data: shapeType.value === 'rect' ? { ...rectRef.value?.rect } : { ...trapRef.value?.trap },
      image: compRef?.toDataURL()
    }
  },
})
</script>

<template>
  <div class="mt-2 flex flex-col gap-4">
    <!-- Type Selector -->
    <div class="p-1 rounded-xl bg-gray-100/50 flex">
      <button
        v-for="(label, type) in { rect: '矩形', trap: '梯形' }"
        :key="type"
        class="text-xs font-bold py-1.5 rounded-lg flex-1 transition-all"
        :class="shapeType === type ? 'bg-white shadow-sm text-primary' : 'text-gray-500'"
        @click="shapeType = type as 'rect' | 'trap'"
      >
        {{ label }}
      </button>
    </div>

    <!-- Dynamic Shape Component -->
    <ShapeRect v-show="shapeType === 'rect'" ref="rectRef" />
    <ShapeTrap v-show="shapeType === 'trap'" ref="trapRef" />
  </div>
</template>
