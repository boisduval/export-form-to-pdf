<script setup lang="ts">
defineProps<{
  readOnly?: boolean
  heightClass?: string
}>()

const emit = defineEmits<{
  (e: 'toggle3d'): void
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Preview Area -->
    <div :class="[readOnly ? 'h-40 border-none rounded-lg bg-slate-50' : [heightClass || 'h-64', 'rounded-2xl shadow-lg shadow-slate-300/40']]" class="grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      <div class="canvas-wrapper">
        <slot name="canvas" />
      </div>

      <!-- Slot for overlays (like 3D Preview button) -->
      <slot name="overlay" />
    </div>

    <!-- Legend (图例) -->
    <div class="text-[10px] text-slate-500 font-semibold px-1 flex gap-3 items-center">
      <div class="flex gap-1.5 items-center">
        <span class="rounded-sm bg-[#B57474] h-2 w-3.5" />
        <span>烟柜</span>
      </div>
      <div class="flex gap-1.5 items-center">
        <span class="rounded-sm bg-[#527EBF] h-2 w-3.5" />
        <span>大门</span>
      </div>
    </div>

    <!-- Actions Toolbar -->
    <div v-if="!readOnly" class="px-1 flex flex-col gap-4">
      <!-- Slot for toolbar controls (like snap switcher, close/undo/clear buttons) -->
      <slot name="toolbar" />

      <div>
        <button
          class="text-xs text-white font-bold px-4 py-2.5 rounded-xl border-none flex gap-1.5 w-full cursor-pointer shadow-blue-500/15 shadow-md transition-all duration-200 items-center justify-center from-blue-500 to-indigo-600 bg-gradient-to-r active:scale-95"
          @click="emit('toggle3d')"
        >
          <div class="i-carbon-cube text-sm" />
          3D 预览
        </button>
      </div>
    </div>

    <!-- Custom content slot (like forms/inputs) -->
    <slot name="inputs" />

    <slot />
  </div>
</template>

<style scoped>
.grid-bg {
  background-color: #f8fafc;
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
  background-size: 16px 16px;
}

.canvas-wrapper {
  width: 100%;
  height: 100%;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  box-shadow:
    0 15px 30px -8px rgba(15, 23, 42, 0.12),
    0 4px 12px -3px rgba(15, 23, 42, 0.08);
  border: none;
  overflow: hidden;
}

:deep(.canvas-container) {
  margin: 0 auto;
}
</style>
