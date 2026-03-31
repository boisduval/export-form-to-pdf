<script setup lang="ts">
interface Props {
  type?: 'primary' | 'primary-light' | 'gray'
  round?: boolean
}

withDefaults(defineProps<Props>(), {
  type: 'primary-light',
  round: false,
})
</script>

<template>
  <div
    class="flex font-bold items-center justify-center px-1 py-0.2 rounded text-[9px] tracking-tight transition-all"
    :class="[
      type === 'primary' && 'bg-primary/10 text-primary',
      type === 'primary-light' && 'bg-primary/5 text-primary/60',
      type === 'gray' && 'bg-gray-100 text-gray-400',
      round ? 'rounded-full' : 'rounded',
    ]"
  >
    <slot />
  </div>
</template>
