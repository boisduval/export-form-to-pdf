<script setup lang="ts">
defineProps<{
  readOnly?: boolean
  activeObject?: any
  heightClass?: string
  showAddCabinet?: boolean
}>()

const emit = defineEmits<{
  (e: 'addDoor'): void
  (e: 'deleteSelected'): void
  (e: 'addCabinet'): void
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

    <!-- Actions Toolbar -->
    <div v-if="!readOnly" class="px-1 flex flex-col gap-4">
      <!-- Slot for toolbar controls (like snap switcher, close/undo/clear buttons) -->
      <slot name="toolbar" />

      <div class="gap-3 grid grid-cols-2">
        <van-button icon="plus" plain size="small" type="primary" block class="shadow-sm !rounded-xl" @click="emit('addDoor')">
          添加大门
        </van-button>
        <van-button
          v-if="activeObject && activeObject.associatedLabel?.text !== '烟柜'"
          icon="delete"
          plain
          size="small"
          type="danger"
          block
          class="shadow-sm !rounded-xl"
          @click="emit('deleteSelected')"
        >
          删除选中
        </van-button>
      </div>

      <van-button
        v-if="showAddCabinet"
        icon="shop-o"
        size="small"
        type="primary"
        block
        class="shadow-sm !rounded-xl"
        @click="emit('addCabinet')"
      >
        添加烟柜
      </van-button>
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
