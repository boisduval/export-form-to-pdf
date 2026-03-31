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
  <header class="px-4 bg-white flex h-12 shadow-sm/2 items-center top-0 justify-between relative sticky z-100 overflow-hidden">
    <div class="flex gap-3 items-center overflow-hidden">
      <h1 class="text-[15px] text-gray-800 font-extrabold truncate">
        {{ steps[active]?.title }}
      </h1>
    </div>
    <div class="ml-4 flex shrink-0 gap-2 items-center">
      <span v-if="selectedTemplateName" class="text-[12px] text-gray-500 font-bold max-w-32 truncate">
        {{ selectedTemplateName }}
      </span>
      <AppTag v-if="selectedTemplateName" type="primary-light">
        已选模板
      </AppTag>
      <div class="text-[10px] font-bold ml-1 flex gap-0.5 items-baseline">
        <span class="text-primary">{{ active + 1 }}</span>
        <span class="text-gray-200">/</span>
        <span class="text-gray-300 font-extrabold">{{ steps.length }}</span>
      </div>
    </div>

    <!-- Thin Integrated Progress Bar at edges -->
    <div class="bg-primary/5 h-0.8 bottom-0 left-0 right-0 absolute overflow-hidden">
      <div
        class="bg-primary h-full transition-all duration-600 ease-out"
        :style="{ width: `${((active + 1) / steps.length) * 100}%` }"
      />
    </div>
  </header>
</template>
