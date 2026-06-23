<script setup lang="ts">
interface Step {
  title: string
}

defineProps<{
  active: number
  steps: Step[]
  selectedTemplateName?: string
}>()
</script>

<template>
  <header class="px-6 border-b border-slate-100 bg-white flex h-14 w-full items-center top-0 justify-between sticky z-50">
    <h1 class="text-sm text-slate-800 tracking-wide font-bold">
      {{ steps[active]?.title || '选择模板' }}
    </h1>
    <div class="flex gap-3 items-center">
      <div
        v-if="selectedTemplateName"
        class="px-3 py-1 rounded-full bg-slate-100 flex items-center"
      >
        <span class="text-xs text-slate-600 font-semibold max-w-28 truncate">
          {{ selectedTemplateName }}
        </span>
      </div>
      <!-- Step Indicator Pill -->
      <div class="px-3.5 py-1 rounded-full bg-slate-100 flex items-center">
        <span class="text-sm text-slate-700 font-bold">
          {{ active + 1 }}<span class="font-medium opacity-60">/{{ steps.length }}</span>
        </span>
      </div>
    </div>
  </header>
</template>
