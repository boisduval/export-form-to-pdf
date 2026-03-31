<script setup lang="ts">
import { computed, ref } from 'vue'

const rect = ref({ w: 40, h: 30 })

const svgSize = { w: 300, h: 200 }

const scale = computed(() => {
  const padding = 40
  return Math.min((svgSize.w - padding * 2) / rect.value.w, (svgSize.h - padding * 2) / rect.value.h)
})

const rectData = computed(() => {
  const s = scale.value
  const w = rect.value.w * s
  const h = rect.value.h * s
  const ox = (svgSize.w - w) / 2
  const oy = (svgSize.h - h) / 2
  return { w, h, ox, oy }
})

const points = computed(() => {
  const { w, h, ox, oy } = rectData.value
  return `${ox},${oy} ${ox + w},${oy} ${ox + w},${oy + h} ${ox},${oy + h}`
})

defineExpose({
  rect,
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Preview Area -->
    <div class="bg-transparent border-1.5 border-dashed border-gray-200 flex flex-col h-64 items-center justify-center overflow-hidden relative rounded-2xl shadow-none">
      <svg :height="svgSize.h" :viewBox="`0 0 ${svgSize.w} ${svgSize.h}`" :width="svgSize.w">
        <polygon
          :points="points"
          class="fill-transparent stroke-primary stroke-2"
          stroke-linejoin="round"
        />
        <g class="font-bold fill-primary/80 text-[10px]">
          <!-- Top label (Always above top edge) -->
          <text
            :x="rectData.ox + rectData.w / 2"
            :y="rectData.oy - 12"
            text-anchor="middle"
            dominant-baseline="auto"
          >
            {{ rect.w }}m
          </text>
          <!-- Left label (Always to the left of left edge) -->
          <text
            :x="rectData.ox - 12"
            :y="rectData.oy + rectData.h / 2"
            text-anchor="middle"
            dominant-baseline="middle"
            :transform="`rotate(-90, ${rectData.ox - 12}, ${rectData.oy + rectData.h / 2})`"
          >
            {{ rect.h }}m
          </text>
        </g>
      </svg>
    </div>

    <!-- Inputs -->
    <div class="bg-white border-gray-50 flex flex-col overflow-hidden rounded-xl shadow-sm">
      <van-cell-group :border="false">
        <van-field
          v-model="rect.w"
          input-align="right"
          label="长度 (m)"
          placeholder="请输入长度"
          type="number"
        />
        <van-field
          v-model="rect.h"
          input-align="right"
          label="宽度 (m)"
          placeholder="请输入宽度"
          type="number"
        />
      </van-cell-group>
    </div>
  </div>
</template>
