<script setup lang="ts">
import { ref } from 'vue'

const shapeType = ref<'rect' | 'trap'>('rect')

const rectRef = ref()
const trapRef = ref()

defineExpose({
  getShapeData: () => (shapeType.value === 'rect' ? rectRef.value?.rect : trapRef.value?.trap),
})
</script>

<template>
  <div class="flex flex-col gap-4 mt-2">
    <!-- Type Selector -->
    <div class="bg-gray-100/50 flex p-1 rounded-xl">
      <button
        v-for="(label, type) in { rect: '矩形', trap: '梯形' }"
        :key="type"
        class="flex-1 font-bold py-1.5 rounded-lg text-xs transition-all"
        :class="shapeType === type ? 'bg-white shadow-sm text-primary' : 'text-gray-500'"
        @click="shapeType = type as 'rect' | 'trap'"
      >
        {{ label }}
      </button>
    </div>

    <!-- Dynamic Shape Component -->
    <ShapeRect v-if="shapeType === 'rect'" ref="rectRef" />
    <ShapeTrap v-else-if="shapeType === 'trap'" ref="trapRef" />
  </div>
</template>
