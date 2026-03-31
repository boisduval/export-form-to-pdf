<script setup lang="ts">
import { reactive } from 'vue'

const formData = reactive({
  projectName: '',
  applyNo: '',
  date: '',
  manager: '',
  remark: '',
})

defineExpose({
  formData,
})
</script>

<template>
  <div class="flex flex-col mt-2">
    <div class="bg-white border border-gray-100 overflow-hidden rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <van-cell-group :border="false">
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
