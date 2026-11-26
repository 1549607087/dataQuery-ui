<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="模板名称" prop="name">
        <el-input v-model="queryParams.name" placeholder="请输入模板名称" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="模板编码" prop="code">
        <el-input v-model="queryParams.code" placeholder="请输入模板编码" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-input v-model="queryParams.category" placeholder="如 销售 / 财务 / 运营" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="数据源 ID" prop="datasourceId">
        <el-input-number v-model="queryParams.datasourceId" :controls="false" :min="0" class="!w-220px" />
      </el-form-item>
      <el-form-item label="是否启用" prop="enabled">
        <el-select v-model="queryParams.enabled" placeholder="请选择" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:ai-query-template:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button type="danger" plain :disabled="checkedIds.length === 0" @click="handleDeleteBatch" v-hasPermi="['data-query:ai-query-template:delete']">
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:ai-query-template:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="模板名称" align="center" prop="name" :show-overflow-tooltip="true" />
      <el-table-column label="模板编码" align="center" prop="code" :show-overflow-tooltip="true" />
      <el-table-column label="分类" align="center" prop="category" />
      <el-table-column label="问题模板" align="center" prop="questionTemplate" :show-overflow-tooltip="true" />
      <el-table-column label="SQL 模板" align="center" prop="sqlTemplate" :show-overflow-tooltip="true" />
      <el-table-column label="参数定义" align="center" prop="paramsDef" :show-overflow-tooltip="true" />
      <el-table-column label="数据源 ID" align="center" prop="datasourceId" width="110" />
      <el-table-column label="是否启用" align="center" prop="enabled">
        <template #default="scope">
          <el-tag :type="scope.row.enabled === 1 ? 'success' : 'info'">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.enabled) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" align="center" prop="sort" width="80" />
      <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:ai-query-template:update']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:ai-query-template:delete']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <TemplateForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { YES_NO_OPTIONS, getOptionLabel } from '@/api/dataQuery/constants'
import * as TemplateApi from '@/api/dataQuery/queryruntime/template'
import TemplateForm from './TemplateForm.vue'

defineOptions({ name: 'DataQueryQueryTemplate' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<TemplateApi.AiQueryTemplateVO[]>([])
const queryParams = reactive<TemplateApi.AiQueryTemplatePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  code: undefined,
  category: undefined,
  datasourceId: undefined,
  enabled: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    const data = await TemplateApi.getAiQueryTemplatePage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

const formRef = ref()
const openForm = (type: string, id?: number) => formRef.value.open(type, id)

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await TemplateApi.deleteAiQueryTemplate(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: TemplateApi.AiQueryTemplateVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await TemplateApi.deleteAiQueryTemplateList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await TemplateApi.exportAiQueryTemplate(queryParams)
    download.excel(data, '查询模板.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
