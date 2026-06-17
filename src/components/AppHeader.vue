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
  <header class="px-6 bg-primary flex h-16 w-full shadow-md items-center top-0 justify-between sticky z-50">
    <h1 class="text-[20px] text-white tracking-wide font-bold">
      {{ steps[active]?.title || '选择模板' }}
    </h1>
    <div class="flex gap-3 items-center">
      <div
        v-if="selectedTemplateName"
        class="px-3 py-1 rounded-full bg-white/25 flex shadow-sm items-center backdrop-blur-sm"
      >
        <span class="text-xs text-white font-semibold max-w-28 truncate">
          {{ selectedTemplateName }}
        </span>
      </div>
      <!-- Step Indicator Pill -->
      <div class="px-3.5 py-1 rounded-full bg-white/25 flex shadow-sm items-center backdrop-blur-sm">
        <span class="text-sm text-white font-bold">
          {{ active + 1 }}<span class="font-medium opacity-60">/{{ steps.length }}</span>
        </span>
      </div>
    </div>
  </header>
</template>
