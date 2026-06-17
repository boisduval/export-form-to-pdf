<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { templatesPreset } from '@/utils/templatesPreset'
import type { FormField } from '@/utils/templatesPreset'

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

const formData = reactive<Record<string, any>>({
  projectName: '',
  applyNo: '',
  date: '',
  manager: '',
  remark: '',

  applicant_name: '',
  business_area: '',
  street_address: '',
  layout_capacity: '',
  existing_shops: '',
  license_count: '',
  waiting_count: '',
})

// 默认表单字段（当未选中特定核查模版时使用）
const defaultFields: FormField[] = [
  { key: 'projectName', label: '项目名称', placeholder: '请输入名称', type: 'text' },
  { key: 'applyNo', label: '申请编号', placeholder: '请输入编号', type: 'text' },
  { key: 'date', label: '申请日期', placeholder: '请选择', type: 'text' },
  { key: 'manager', label: '负责人', placeholder: '姓名', type: 'text' },
  { key: 'remark', label: '备注', placeholder: '如有说明请填写', type: 'textarea' },
]

// 动态获取当前选中的模板字段配置
const fields = computed(() => {
  if (!props.templateValue || !templatesPreset[props.templateValue]) {
    return defaultFields
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

        <!-- 平面图预览（仅在选择核查模版时显示） -->
        <van-cell v-if="isCheckTemplate" title="平面图预览">
          <template #label>
            <div class="mt-2 p-2 border rounded-lg bg-white flex flex-col min-h-32 shadow-inner items-center justify-center overflow-hidden">
              <img
                v-if="drawingData?.image"
                :src="drawingData.image"
                alt="平面图"
              >
              <div v-else class="text-gray-400 py-10 flex flex-col gap-1 items-center">
                <div class="i-carbon-image h-6 w-6" />
                <span class="text-xs">未获取到平面图数据</span>
              </div>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>
