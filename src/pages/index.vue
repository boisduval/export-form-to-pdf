<script setup lang="ts">
import { computed, ref } from 'vue'
import { showToast } from 'vant'

const active = ref(0)
const selectedTemplate = ref(1)

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

function nextStep() {
  if (active.value < steps.length - 1) {
    active.value++
  }
}

function onSubmit() {
  showToast('提交成功，正在导出结果...')
}

const selectedTemplateName = computed(() => {
  return templates.find(t => t.id === selectedTemplate.value)?.name
})
</script>

<template>
  <div class="text-#333 bg-gray-50 flex flex-col min-h-screen">
    <!-- Consolidated Header & Progress Section -->
    <AppHeader
      :active="active"
      :steps="steps"
      :selected-template-name="selectedTemplateName"
    />

    <!-- Step Content -->
    <div class="px-6 pb-32 pt-1 flex-1 overflow-y-auto">
      <TemplateStep
        v-if="active === 0"
        v-model="selectedTemplate"
        :templates="templates"
      />
      <DrawingStep v-else-if="active === 1" />
      <FormStep v-else-if="active === 2" />
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
