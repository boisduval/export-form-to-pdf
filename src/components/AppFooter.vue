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
  <nav class="app-footer-glass pb-safe px-8 flex h-18 items-center bottom-4 left-4 right-4 justify-between fixed z-50">
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

<style scoped>
.app-footer-glass {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0.82) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 24px;
  box-shadow:
    0 -12px 32px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
}
</style>
