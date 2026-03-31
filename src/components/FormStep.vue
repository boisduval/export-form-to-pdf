<script setup lang="ts">
import { reactive, watch } from 'vue'

interface DrawingData {
  type: 'rect' | 'trap'
  data: any
  image?: string
  calculatedArea?: string
}

const props = defineProps<{
  templateValue?: string
  drawingData?: DrawingData
}>()

const formData = reactive({
  projectName: '',
  applyNo: '',
  date: '',
  manager: '',
  remark: '',

  // Specific for 'change'
  applicant_name: '',
  business_area: '',
})

// 自动填充矩形面积
watch(() => props.drawingData, (newVal) => {
  if (newVal?.type === 'rect' && newVal.calculatedArea) {
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
      <van-cell-group v-if="templateValue === 'change'" :border="false">
        <van-field v-model="formData.applicant_name" label="申请人" placeholder="请输入姓名" />
        <van-field v-model="formData.business_area" label="经营面积" placeholder="请输入面积" type="number">
          <template #right-icon>
            ㎡
          </template>
        </van-field>
        <van-cell title="平面图预览">
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

      <van-cell-group v-else :border="false">
        <van-field v-model="formData.projectName" label="项目名称" placeholder="请输入名称" />
        <van-field v-model="formData.applyNo" label="申请编号" placeholder="请输入编号" />
        <van-field v-model="formData.date" is-link label="申请日期" placeholder="请选择" readonly />
        <van-field v-model="formData.manager" label="负责人" placeholder="姓名" />
        <van-field
          v-model="formData.remark"
          autosize
          label="备注"
          placeholder="如有说明请填写"
          rows="2"
          type="textarea"
        />
      </van-cell-group>
    </div>
  </div>
</template>
