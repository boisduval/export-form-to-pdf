<script setup lang="ts">
import { computed, ref } from 'vue'
import { saveAs } from 'file-saver'
import { showFailToast, showLoadingToast, showSuccessToast, showToast } from 'vant'
import { generateDocx } from '@/utils/docxExport'

const active = ref(0)
const selectedTemplate = ref(1)
const drawingRef = ref()
const drawingData = ref()
const formStepRef = ref()

const steps = [
  { title: '选择模板' },
  { title: '绘制平面图' },
  { title: '填写表单' },
]

const templates = [
  { id: 1, name: '延续变更', type: 'DOCX', value: 'change' },
  { id: 2, name: '实地核查普通版', type: 'DOCX', value: 'normal' },
  { id: 3, name: '新实地勘验普通版 1000平方米', type: 'DOCX' },
  { id: 4, name: '实地核查普通版 (排队)', type: 'DOCX' },
]

const selectedTemplateName = computed(() => {
  return templates.find(t => t.id === selectedTemplate.value)?.name
})

const selectedTemplateValue = computed(() => {
  return templates.find(t => t.id === selectedTemplate.value)?.value
})

function nextStep() {
  if (active.value === 1 && drawingRef.value) {
    drawingData.value = drawingRef.value.getShapeData()
  }
  if (active.value < steps.length - 1) {
    active.value++
  }
}

async function onSubmit() {
  if (!formStepRef.value?.formData) {
    showToast('表单数据异常')
    return
  }

  const loading = showLoadingToast({
    message: '正在生成文档...',
    forbidClick: true,
    duration: 0,
  })

  try {
    const formData = formStepRef.value.formData
    const imageData = drawingData.value?.image

    // 调用简化后的导出函数
    const blob = await generateDocx(
      formData,
      imageData,
      `/${selectedTemplateValue.value}.docx`,
    )

    const fileName = `${formData.applicant_name || '未命名'}_核查报告.docx`
    saveAs(blob, fileName)

    loading.close()
    showSuccessToast('导出成功')
  }
  catch (error) {
    console.error('Export error:', error)
    loading.close()
    showFailToast('导出失败')
  }
}
</script>

<template>
  <div class="text-#333 bg-gray-50 flex flex-col min-h-screen">
    <!-- Consolidated Header & Progress Section -->
    <AppHeader
      :active="active"
      :selected-template-name="selectedTemplateName"
      :steps="steps"
    />

    <!-- Step Content -->
    <div class="px-6 pb-32 pt-1 flex-1 overflow-y-auto">
      <TemplateStep
        v-show="active === 0"
        v-model="selectedTemplate"
        :templates="templates"
      />
      <DrawingStep v-show="active === 1" ref="drawingRef" />
      <FormStep
        v-show="active === 2"
        ref="formStepRef"
        :drawing-data="drawingData"
        :template-value="selectedTemplateValue"
      />
    </div>

    <!-- Styled Bottom Nav -->
    <AppFooter
      :active="active"
      :max-steps="steps.length - 1"
      @prev="active--"
      @next="nextStep"
      @submit="onSubmit"
    />
  </div>
</template>

<style scoped>
:deep(.van-cell) {
  padding: 16px 20px;
  background: transparent;
}

:deep(.van-field__label) {
  color: #666;
  font-weight: 500;
}

.transition-active:active {
  transform: scale(0.96);
  opacity: 0.9;
}

/* Custom Scrollbar for better look */
div::-webkit-scrollbar {
  width: 4px;
}
div::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 10px;
}
</style>
