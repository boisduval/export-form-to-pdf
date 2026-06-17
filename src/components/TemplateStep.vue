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

const configs = [
  {
    gradient: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
    activeColor: '#E11D48',
  },
  {
    gradient: 'linear-gradient(135deg, #FFFDF5 0%, #FEF3C7 100%)',
    activeColor: '#EA580C',
  },
  {
    gradient: 'linear-gradient(135deg, #F7FEE7 0%, #ECFCCB 100%)',
    activeColor: '#65A30D',
  },
  {
    gradient: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    activeColor: '#16A34A',
  },
  {
    gradient: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
    activeColor: '#0D9488',
  },
  {
    gradient: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
    activeColor: '#0ea5e9',
  },
  {
    gradient: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
    activeColor: '#4F46E5',
  },
  {
    gradient: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
    activeColor: '#9333EA',
  },
]
</script>

<template>
  <div class="mt-4 gap-3 grid grid-cols-2">
    <div
      v-for="(item, index) in templates"
      :key="item.id"
      class="p-3.5 border-2 rounded-xl flex flex-col min-h-[90px] cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-all duration-300 justify-between relative overflow-hidden active:scale-95"
      :style="{
        background: configs[index % configs.length].gradient,
        borderColor: modelValue === item.id ? configs[index % configs.length].activeColor : 'transparent',
      }"
      @click="select(item.id)"
    >
      <!-- Title Group (Left side, centered vertically) -->
      <div class="pr-2 flex flex-1 items-center z-10">
        <h3 class="text-[14px] text-slate-800 leading-snug font-bold">
          {{ item.name }}
        </h3>
      </div>

      <!-- Icon Group (Background watermark) -->
      <div class="pointer-events-none inset-0 absolute overflow-hidden">
        <!-- Large high-transparency background icon -->
        <div
          class="h-16 w-16 transition-transform duration-300 absolute -bottom-4 -right-2"
          :style="{ color: configs[index % configs.length].activeColor, opacity: 0.12 }"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </div>
      </div>

      <!-- Selection Badge (Top Left / Overlay indicator) -->
      <div
        v-if="modelValue === item.id"
        class="rounded-full bg-white flex h-4 w-4 shadow-sm items-center left-1.5 top-1.5 justify-center absolute z-20"
        :style="{ color: configs[index % configs.length].activeColor }"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3">
          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
  </div>
</template>
