<script setup lang="ts">
defineProps<{
  active: number
  maxSteps?: number
}>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'submit'): void
}>()
</script>

<template>
  <nav class="pb-safe px-8 border-t border-gray-100 bg-white/95 flex h-24 w-full shadow-[0_-4px_20px_rgba(0,0,0,0.03)] items-center bottom-0 left-0 justify-between fixed z-50 backdrop-blur-md">
    <!-- Previous Button -->
    <div
      class="flex flex-col transition-all duration-150 items-center justify-center"
      :class="active > 0 ? 'text-gray-700 cursor-pointer active:scale-95' : 'text-gray-300 cursor-not-allowed opacity-40'"
      @click="active > 0 && emit('prev')"
    >
      <div class="i-carbon-chevron-left text-2xl" />
      <span class="text-[11px] font-bold mt-1">上一步</span>
    </div>

    <!-- Next Button -->
    <button
      v-if="active < (maxSteps || 2)"
      class="text-white font-bold px-10 py-3.5 rounded-full bg-primary flex gap-3 shadow-primary/30 shadow-xl transition-all duration-150 items-center active:scale-95"
      @click="emit('next')"
    >
      <span class="text-sm font-bold">下一步</span>
      <div class="rounded-full bg-white/20 flex h-6 w-6 items-center justify-center">
        <div class="i-carbon-chevron-right text-xs text-white" />
      </div>
    </button>

    <!-- Submit Button -->
    <div
      v-if="active === (maxSteps || 2)"
      class="text-primary flex flex-col cursor-pointer transition-all duration-150 items-center justify-center active:scale-95"
      @click="emit('submit')"
    >
      <div class="i-carbon-checkmark-filled text-2xl" />
      <span class="text-[11px] font-bold mt-1">立即提交</span>
    </div>
    <div
      v-else
      class="text-gray-300 opacity-40 flex flex-col items-center justify-center"
    >
      <div class="i-carbon-checkmark text-2xl" />
      <span class="text-[11px] font-bold mt-1">立即提交</span>
    </div>
  </nav>
</template>
