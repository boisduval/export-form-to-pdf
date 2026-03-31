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
  <div class="flex flex-col gap-3.5 mt-2">
    <div
      v-for="item in templates"
      :key="item.id"
      class="active:scale-98 bg-white border-1.5 flex items-center p-3.5 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all"
      :class="modelValue === item.id ? 'border-primary' : 'border-transparent'"
      @click="select(item.id)"
    >
      <div class="bg-primary/10 flex h-14 items-center justify-center min-w-14 rounded-lg w-14">
        <div class="i-carbon-document text-primary text-xl" />
      </div>
      <div class="flex-1 ml-3.5 overflow-hidden">
        <div class="flex items-start">
          <h3 class="flex-1 font-bold leading-tight text-[14px] text-gray-800">
            {{ item.name }}
          </h3>
          <AppTag class="ml-4 shrink-0" type="primary">
            .{{ item.type }}
          </AppTag>
        </div>
      </div>
    </div>
  </div>
</template>
