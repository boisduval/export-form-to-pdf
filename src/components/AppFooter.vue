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
  <div class="px-8 border-t border-gray-50 bg-white/90 flex h-20 items-center bottom-0 left-0 right-0 justify-between fixed z-100 backdrop-blur-md">
    <div
      class="flex flex-col gap-0.5 cursor-pointer transition-all items-center"
      :class="active > 0 ? 'text-gray-600 opacity-100' : 'text-gray-200 opacity-50 cursor-not-allowed'"
      @click="active > 0 && emit('prev')"
    >
      <div class="i-carbon-chevron-left text-lg" />
      <span class="text-[10px] font-bold">上一步</span>
    </div>

    <button
      v-if="active < (maxSteps || 2)"
      class="transition-active text-white px-7 rounded-xl bg-primary flex gap-1.5 h-11 shadow-[0_6px_16px_rgba(0,0,0,0.1)] transition-all items-center justify-center active:scale-95"
      @click="emit('next')"
    >
      <span class="text-[13px] font-bold">下一步</span>
      <div class="i-carbon-chevron-right text-base" />
    </button>

    <div
      v-if="active === (maxSteps || 2)"
      class="text-primary flex flex-col gap-0.5 cursor-pointer items-center"
      @click="emit('submit')"
    >
      <div class="i-carbon-checkmark-filled text-xl" />
      <span class="text-[10px] font-extrabold uppercase">立即提交</span>
    </div>
    <div
      v-else
      class="text-gray-200 flex flex-col gap-0.5 items-center"
    >
      <div class="i-carbon-checkmark text-xl" />
      <span class="text-[10px] font-bold uppercase">提交</span>
    </div>
  </div>
</template>

<style scoped>
.transition-active:active {
  transform: scale(0.96);
  opacity: 0.9;
}
</style>
