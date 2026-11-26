<template>
  <ContentWrap>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="110px">
      <el-form-item label="知识库名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入知识库名称"
          clearable
          class="!w-220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="业务编码" prop="code">
        <el-input
          v-model="queryParams.code"
          placeholder="请输入业务编码"
          clearable
          class="!w-220px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-220px">
          <el-option v-for="item in KNOWLEDGE_BASE_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="向量模型代号" prop="embeddingModelCode">
        <el-input
          v-model="queryParams.embeddingModelCode"
          placeholder="精确匹配，如 openai:text-embedding-3-small:1536"
          clearable
          class="!w-320px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-240px"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['data-query:knowledge-base:create']">
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
        <el-button
          type="danger"
          plain
          :disabled="checkedIds.length === 0"
          @click="handleDeleteBatch"
          v-hasPermi="['data-query:knowledge-base:delete']"
        >
          <Icon icon="ep:delete" class="mr-5px" />批量删除
        </el-button>
        <el-button type="success" plain :loading="exportLoading" @click="handleExport" v-hasPermi="['data-query:knowledge-base:export']">
          <Icon icon="ep:download" class="mr-5px" />导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mb-15px"
      title="向量模型代号由系统写入"
      description="embeddingModelCode 是运行时指纹（provider.code:model_id:dimension），在文档上传 / 向量重建时由服务端按租户 EMBEDDING 场景写入，创建与更新接口不接受该字段。"
    />
    <el-table v-loading="loading" :data="list" @selection-change="handleRowCheckboxChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="知识库名称" align="center" prop="name" :show-overflow-tooltip="true" />
      <el-table-column label="业务编码" align="center" prop="code" :show-overflow-tooltip="true" />
      <el-table-column label="描述" align="center" prop="description" :show-overflow-tooltip="true" />
      <el-table-column label="文档数" align="center" prop="documentCount" width="90" />
      <el-table-column label="切片数" align="center" prop="chunkCount" width="90" />
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <el-tag :type="getKnowledgeBaseStatusTagType(scope.row.status)">
            {{ getOptionLabel(KNOWLEDGE_BASE_STATUS_OPTIONS, scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="向量模型代号" align="center" prop="embeddingModelCode" min-width="240" :show-overflow-tooltip="true">
        <template #default="scope">
          <span class="text-12px">{{ scope.row.embeddingModelCode || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建人" align="center" prop="creator" width="100" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="200" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="goDocument(scope.row.id)" v-hasPermi="['data-query:knowledge-document:query']">
            文档管理
          </el-button>
          <el-button link type="primary" @click="openForm('update', scope.row.id)" v-hasPermi="['data-query:knowledge-base:update']">
            编辑
          </el-button>
          <el-button link type="warning" @click="handleStatusChange(scope.row)" v-hasPermi="['data-query:knowledge-base:update']">
            {{ scope.row.status === 0 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="handleDelete(scope.row.id)" v-hasPermi="['data-query:knowledge-base:delete']">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <KnowledgeBaseForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import {
  KNOWLEDGE_BASE_STATUS_OPTIONS,
  getKnowledgeBaseStatusTagType,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as KnowledgeBaseApi from '@/api/dataQuery/knowledge'
import KnowledgeBaseForm from './KnowledgeBaseForm.vue'

defineOptions({ name: 'DataQueryKnowledgeBase' })

const message = useMessage()
const { t } = useI18n()
const router = useRouter()

/** 跳转知识库文档页，携带知识库编号定位 */
const goDocument = (baseId: number) =>
  router.push({ path: '/data-query/knowledge-document', query: { baseId: String(baseId) } })

const loading = ref(true)
const total = ref(0)
const list = ref<KnowledgeBaseApi.AiKnowledgeBaseVO[]>([])
const queryParams = reactive<KnowledgeBaseApi.AiKnowledgeBasePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  code: undefined,
  status: undefined,
  embeddingModelCode: undefined,
  createTime: []
})
const queryFormRef = ref()
const exportLoading = ref(false)

const getList = async () => {
  loading.value = true
  try {
    // 后端 createTime 是 between(LocalDateTime[])，空数组归一化为 undefined 避免报参
    const params = {
      ...queryParams,
      createTime: queryParams.createTime?.length === 2 ? queryParams.createTime : undefined
    }
    const data = await KnowledgeBaseApi.getAiKnowledgeBasePage(params)
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

const handleStatusChange = async (row: KnowledgeBaseApi.AiKnowledgeBaseVO) => {
  await KnowledgeBaseApi.updateAiKnowledgeBaseStatus(row.id!, row.status === 0 ? 1 : 0)
  message.success('状态修改成功')
  await getList()
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await KnowledgeBaseApi.deleteAiKnowledgeBase(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const checkedIds = ref<number[]>([])
const handleRowCheckboxChange = (rows: KnowledgeBaseApi.AiKnowledgeBaseVO[]) => {
  checkedIds.value = rows.map((row) => row.id!).filter(Boolean)
}
const handleDeleteBatch = async () => {
  try {
    await message.delConfirm()
    await KnowledgeBaseApi.deleteAiKnowledgeBaseList(checkedIds.value)
    checkedIds.value = []
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const params = {
      ...queryParams,
      createTime: queryParams.createTime?.length === 2 ? queryParams.createTime : undefined
    }
    const data = await KnowledgeBaseApi.exportAiKnowledgeBase(params)
    download.excel(data, '知识库.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => getList())
</script>
