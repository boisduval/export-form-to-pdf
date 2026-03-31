<script setup lang="ts">
import { computed, ref } from 'vue'

const trap = ref({ top: 30, bottom: 50, h: 30, offset: 10 })

const svgSize = { w: 300, h: 200 }
const padding = 40

const scale = computed(() => {
  const maxW = Math.max(trap.value.bottom, trap.value.top + trap.value.offset)
  return Math.min((svgSize.w - padding * 2) / maxW, (svgSize.h - padding * 2) / trap.value.h)
})

const trapData = computed(() => {
  const s = scale.value
  const b = trap.value.bottom * s
  const t = trap.value.top * s
  const h = trap.value.h * s
  const off = trap.value.offset * s
  const totalW = Math.max(b, t + off)
  const ox = (svgSize.w - totalW) / 2
  const oy = (svgSize.h - h) / 2
  return { b, t, h, off, ox, oy }
})

const points = computed(() => {
  const { b, t, h, off, ox, oy } = trapData.value
  return `${ox + off},${oy} ${ox + off + t},${oy} ${ox + b},${oy + h} ${ox},${oy + h}`
})

defineExpose({
  trap,
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
          <template v-if="trapData">
            <text :x="trapData.ox + trapData.off + trapData.t / 2" :y="trapData.oy - 10" text-anchor="middle">{{ trap.top }}m</text>
            <text :x="trapData.ox + trapData.b / 2" :y="trapData.oy + trapData.h + 16" text-anchor="middle">{{ trap.bottom }}m</text>
            <text :x="trapData.ox - 10" :y="trapData.oy + trapData.h / 2" text-anchor="middle" transform-origin="center" transform="rotate(-90)">{{ trap.h }}m</text>
          </template>
        </g>
      </svg>
      <div class="absolute bottom-4 flex gap-2 items-center left-4 right-4">
        <span class="text-gray-400 text-[10px] whitespace-nowrap">上边位移</span>
        <van-slider v-model="trap.offset" :max="trap.bottom" active-color="#3B66F5" bar-height="3px" class="flex-1" />
      </div>
    </div>

    <!-- Inputs -->
    <div class="bg-white border-gray-50 flex flex-col overflow-hidden rounded-xl shadow-sm">
      <van-cell-group :border="false">
        <van-field
          v-model="trap.top"
          input-align="right"
          label="上边长 (m)"
          placeholder="请输入上边长度"
          type="number"
        />
        <van-field
          v-model="trap.bottom"
          input-align="right"
          label="下边长 (m)"
          placeholder="请输入下边长度"
          type="number"
        />
        <van-field
          v-model="trap.h"
          input-align="right"
          label="高度 (m)"
          placeholder="请输入高度"
          type="number"
        />
      </van-cell-group>
    </div>
  </div>
</template>
