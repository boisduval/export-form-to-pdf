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
  <nav class="pb-safe px-8 border-t border-gray-100 bg-white/95 flex h-18 w-full shadow-[0_-4px_20px_rgba(0,0,0,0.03)] items-center bottom-0 left-0 justify-between fixed z-50 backdrop-blur-md">
    <!-- Previous Button -->
    <div
      class="flex flex-col cursor-pointer transition-all duration-200 items-center justify-center"
      :class="active > 0 ? 'text-slate-700 active:scale-90 active:text-[#3B66F5]' : 'text-slate-300 cursor-not-allowed opacity-40 pointer-events-none'"
      @click="active > 0 && emit('prev')"
    >
      <div class="i-carbon-chevron-left text-2xl transition-transform duration-200" />
      <span class="text-[10px] tracking-wider font-bold mt-0.5">上一步</span>
    </div>

    <!-- Next Button -->
    <button
      v-if="active < (maxSteps || 2)"
      class="text-white font-bold px-10 py-3 rounded-full border-none flex gap-2.5 cursor-pointer shadow-blue-500/20 shadow-lg transition-all duration-200 items-center from-blue-500 to-indigo-600 bg-gradient-to-r active:shadow-md active:scale-95"
      @click="emit('next')"
    >
      <span class="text-xs tracking-wider">下一步</span>
      <div class="rounded-full bg-white/20 flex h-5.5 w-5.5 items-center justify-center">
        <div class="i-carbon-chevron-right text-[10px] text-white" />
      </div>
    </button>

    <!-- Submit Button (Active) -->
    <button
      v-else-if="active === (maxSteps || 2)"
      class="text-white font-bold px-8 py-3 rounded-full border-none flex gap-2 cursor-pointer shadow-emerald-500/20 shadow-lg transition-all duration-200 items-center from-emerald-500 to-teal-600 bg-gradient-to-r active:shadow-md active:scale-95"
      @click="emit('submit')"
    >
      <span class="text-xs tracking-wider">立即提交</span>
      <div class="rounded-full bg-white/20 flex h-5.5 w-5.5 items-center justify-center">
        <div class="i-carbon-checkmark text-[10px] text-white font-bold" />
      </div>
    </button>

    <!-- Submit Button (Placeholder/Disabled) -->
    <div
      v-else
      class="text-slate-300 opacity-40 flex flex-col select-none items-center justify-center"
    >
      <div class="i-carbon-checkmark text-2xl" />
      <span class="text-[10px] tracking-wider font-bold mt-0.5">立即提交</span>
    </div>
  </nav>
</template>
