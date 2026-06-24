<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { templatesPreset } from '@/utils/templatesPreset'

interface DrawingData {
  type: 'rect' | 'trap' | 'poly'
  data: any
  image?: string
  calculatedArea?: string
}

const props = defineProps<{
  templateValue?: string
  drawingData?: DrawingData
}>()

const formData = reactive<Record<string, any>>({})

// 动态获取当前选中的模板字段配置
const fields = computed(() => {
  if (!props.templateValue || !templatesPreset[props.templateValue]) {
    return []
  }
  return templatesPreset[props.templateValue].fields
})

// 是否为有效的核查模板模式
const isCheckTemplate = computed(() => {
  return !!(props.templateValue && templatesPreset[props.templateValue])
})

// 自动填充矩形/多边形面积
watch(() => props.drawingData, (newVal) => {
  if (isCheckTemplate.value && newVal?.calculatedArea) {
    formData.business_area = newVal.calculatedArea
  }
}, { immediate: true })

defineExpose({
  formData,
})
</script>

<template>
  <div class="mt-2 flex flex-col">
    <!-- 标题 1 -->
    <div class="px-1 pb-2 flex items-center justify-between">
      <div class="flex gap-2 items-center">
        <div class="rounded-full bg-blue-500 h-3.5 w-1" />
        <span class="text-sm text-gray-800 font-semibold">表单数据登记</span>
      </div>
      <span class="text-[11px] text-gray-400 font-normal">请完善核查表单</span>
    </div>

    <!-- 卡片 1 -->
    <div class="border border-gray-100 rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
      <van-cell-group :border="false">
        <!-- 动态循环渲染配置的表单项 -->
        <van-field
          v-for="field in fields"
          :key="field.key"
          v-model="formData[field.key]"
          :label="field.label"
          :placeholder="field.placeholder"
          :type="field.type === 'textarea' ? 'textarea' : (field.type === 'number' ? 'number' : 'text')"
          :rows="field.type === 'textarea' ? 2 : undefined"
          :autosize="field.type === 'textarea' ? true : undefined"
          :readonly="field.key === 'date'"
          :is-link="field.key === 'date'"
        >
          <template v-if="field.suffix" #right-icon>
            {{ field.suffix }}
          </template>
        </van-field>
      </van-cell-group>
    </div>

    <!-- 标题 2 （仅在选择核查模版时显示） -->
    <div v-if="isCheckTemplate" class="mt-5 px-1 pb-2 flex items-center justify-between">
      <div class="flex gap-2 items-center">
        <div class="rounded-full bg-emerald-500 h-3.5 w-1" />
        <span class="text-sm text-gray-800 font-semibold">核查平面图</span>
      </div>
      <span class="text-[11px] text-gray-400 font-normal">区域图绘制预览</span>
    </div>

    <!-- 卡片 2 （仅在选择核查模版时显示） -->
    <div v-if="isCheckTemplate" class="border border-gray-100 rounded-xl bg-white overflow-hidden">
      <div class="p-4 bg-white flex flex-col h-64 items-center justify-center overflow-hidden">
        <img
          v-if="drawingData?.image"
          :src="drawingData.image"
          alt="平面图"
          class="rounded-lg max-h-full object-contain"
        >
        <div v-else class="text-gray-400 py-10 flex flex-col gap-1 items-center">
          <div class="i-carbon-image h-6 w-6" />
          <span class="text-xs">未获取到平面图数据</span>
        </div>
      </div>
    </div>
  </div>
</template>
