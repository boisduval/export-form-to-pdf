<script setup lang="ts">
interface Template {
  id: number
  name: string
  type: string
}

defineProps<{
  templates: Template[]
  modelValue: number
}>()

const emit = defineEmits(['update:modelValue'])

function select(id: number) {
  emit('update:modelValue', id)
}
</script>

<template>
  <div class="mt-2 gap-x-4 gap-y-6 grid grid-cols-2">
    <div
      v-for="item in templates"
      :key="item.id"
      class="glass-card p-4 rounded-xl flex flex-col h-24 cursor-pointer select-none transition-all duration-300 justify-between relative active:scale-[0.98]"
      :class="{ 'active-ring': modelValue === item.id }"
      @click="select(item.id)"
    >
      <!-- Top info row -->
      <div class="flex min-h-[24px] items-center justify-start">
        <span
          v-if="modelValue === item.id"
          class="material-symbols-outlined text-[20px] text-primary leading-none"
          style="font-variation-settings: 'FILL' 1;"
        >
          check_circle
        </span>
      </div>

      <!-- Template title -->
      <h3 class="text-[15px] text-slate-800 leading-snug font-semibold mb-1">
        {{ item.name }}
      </h3>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.glass-card {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.active-ring {
  box-shadow: 0 0 0 2px #3b66f5;
  background: rgba(255, 255, 255, 0.7);
}

.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}
</style>
