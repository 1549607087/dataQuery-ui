<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="Schema 向量索引操作台"
      description="增量构建按 content_hash 跳过未变更内容；全量重建会重新生成当前数据源全部向量。P1 阶段 Embedding 未接线，状态卡片会如实暴露待构建数。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-form :inline="true" label-width="100px" class="-mb-15px">
      <el-form-item label="数据源">
        <el-select
          v-model="datasourceId"
          placeholder="请选择数据源"
          clearable
          filterable
          class="!w-260px"
          @change="handleDatasourceChange"
        >
          <el-option
            v-for="item in datasourceOptions"
            :key="item.id"
            :label="`${item.name} (${item.code})`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          plain
          :loading="statusLoading"
          @click="loadStatus"
          v-hasPermi="['data-query:schema-vector:query']"
        >
          <Icon icon="ep:refresh-right" class="mr-5px" />刷新状态
        </el-button>
        <el-button
          type="primary"
          :loading="syncLoading"
          @click="handleSync"
          v-hasPermi="['data-query:schema-vector:sync']"
        >
          <Icon icon="ep:plus" class="mr-5px" />增量构建
        </el-button>
        <el-button
          type="danger"
          :loading="rebuildLoading"
          @click="handleRebuild"
          v-hasPermi="['data-query:schema-vector:rebuild']"
        >
          <Icon icon="ep:refresh" class="mr-5px" />全量重建
        </el-button>
      </el-form-item>
    </el-form>

    <template v-if="statusData">
      <el-descriptions
        v-loading="statusLoading"
        :column="4"
        border
        class="mt-15px"
        title="索引状态（SchemaVectorStatusRespVO）"
      >
        <el-descriptions-item label="数据源编号">{{ statusData.datasourceId }}</el-descriptions-item>
        <el-descriptions-item label="Embedding 接线">
          <el-tag :type="statusData.embeddingAvailable ? 'success' : 'warning'">
            {{ statusData.embeddingAvailable ? '已接线' : '未接线' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="模型代号">{{ statusData.modelCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="向量维度">{{ statusData.dimension }}</el-descriptions-item>
        <el-descriptions-item label="有效向量行数">{{ statusData.vectorCount }}</el-descriptions-item>
        <el-descriptions-item label="已构建">{{ statusData.builtCount }}</el-descriptions-item>
        <el-descriptions-item label="待构建">{{ statusData.pendingCount }}</el-descriptions-item>
        <el-descriptions-item label="已下线">{{ statusData.retiredCount }}</el-descriptions-item>
        <el-descriptions-item label="结构落后行数">{{ statusData.staleCount }}</el-descriptions-item>
        <el-descriptions-item label="当前结构版本">{{ statusData.structVersion }}</el-descriptions-item>
        <el-descriptions-item label="最近任务编号">{{ statusData.lastTaskNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最近构建时间">{{ statusData.lastBuildTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最近构建状态">
          <el-tag :type="statusData.lastBuildStatus === 1 ? 'success' : statusData.lastBuildStatus === 3 ? 'danger' : statusData.lastBuildStatus === 2 ? 'warning' : 'info'">
            {{ getOptionLabel(SYNC_LOG_STATUS_OPTIONS, statusData.lastBuildStatus) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div class="mt-12px">
        <div class="mb-6px font-bold">口径与风险提示（{{ (statusData.notes || []).length }}）</div>
        <ul v-if="(statusData.notes || []).length" class="m-0 pl-20px text-13px leading-24px">
          <li v-for="(item, index) in statusData.notes" :key="index">{{ item }}</li>
        </ul>
        <span v-else class="text-13px text-gray-400">无</span>
      </div>
    </template>
    <el-empty v-else description="选择数据源后查看索引状态" :image-size="60" />
  </ContentWrap>

  <!-- 构建结果 -->
  <ContentWrap v-if="buildResult">
    <el-divider content-position="left">构建结果（SchemaVectorBuildRespVO）</el-divider>
    <el-descriptions :column="4" border>
      <el-descriptions-item label="数据源编号">{{ buildResult.datasourceId }}</el-descriptions-item>
      <el-descriptions-item label="任务编号">{{ buildResult.taskNo || '-' }}</el-descriptions-item>
      <el-descriptions-item label="全量重建">{{ buildResult.rebuild ? '是' : '否' }}</el-descriptions-item>
      <el-descriptions-item label="Embedding 可用">
        <el-tag :type="buildResult.embeddingAvailable ? 'success' : 'warning'">{{ buildResult.embeddingAvailable ? '是' : '否' }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="模型代号">{{ buildResult.modelCode || '-' }}</el-descriptions-item>
      <el-descriptions-item label="向量维度">{{ buildResult.dimension }}</el-descriptions-item>
      <el-descriptions-item label="Document 总数">{{ buildResult.totalDocuments }}</el-descriptions-item>
      <el-descriptions-item label="新建">{{ buildResult.created }}</el-descriptions-item>
      <el-descriptions-item label="更新">{{ buildResult.updated }}</el-descriptions-item>
      <el-descriptions-item label="跳过">{{ buildResult.skipped }}</el-descriptions-item>
      <el-descriptions-item label="下线">{{ buildResult.retired }}</el-descriptions-item>
      <el-descriptions-item label="已生成向量">{{ buildResult.embedded }}</el-descriptions-item>
      <el-descriptions-item label="待生成向量">{{ buildResult.pendingEmbedding }}</el-descriptions-item>
      <el-descriptions-item label="结构版本">{{ buildResult.structVersion }}</el-descriptions-item>
      <el-descriptions-item label="耗时（ms）">{{ buildResult.latencyMs }}</el-descriptions-item>
      <el-descriptions-item label="任务状态">
        <el-tag :type="buildResult.status === 1 ? 'success' : buildResult.status === 3 ? 'danger' : buildResult.status === 2 ? 'warning' : 'info'">
          {{ getOptionLabel(SYNC_LOG_STATUS_OPTIONS, buildResult.status) }}
        </el-tag>
      </el-descriptions-item>
    </el-descriptions>

    <div class="mt-12px">
      <div class="mb-6px font-bold">错误摘要与告警（{{ (buildResult.warnings || []).length }}）</div>
      <ul v-if="(buildResult.warnings || []).length" class="m-0 pl-20px text-13px leading-24px">
        <li v-for="(item, index) in buildResult.warnings" :key="index">{{ item }}</li>
      </ul>
      <span v-else class="text-13px text-gray-400">无</span>
    </div>
  </ContentWrap>

  <!-- 分页列表 -->
  <ContentWrap>
    <el-divider content-position="left">Schema 向量列表</el-divider>
    <el-form class="-mb-15px" :model="queryParams" ref="queryFormRef" :inline="true" label-width="90px">
      <el-form-item label="对象类型" prop="objectType">
        <el-select v-model="queryParams.objectType" placeholder="请选择" clearable class="!w-200px">
          <el-option v-for="item in VECTOR_OBJECT_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="同步状态" prop="syncStatus">
        <el-select v-model="queryParams.syncStatus" placeholder="请选择" clearable class="!w-200px">
          <el-option v-for="item in VECTOR_SYNC_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键字" prop="keyword">
        <el-input v-model="queryParams.keyword" placeholder="表名 / 列名 / 向量文本" clearable class="!w-220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" class="mt-15px">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="数据源" align="center" prop="datasourceId" width="100" />
      <el-table-column label="对象类型" align="center" width="100">
        <template #default="scope">{{ getOptionLabel(VECTOR_OBJECT_TYPE_OPTIONS, scope.row.objectType) }}</template>
      </el-table-column>
      <el-table-column label="表编号" align="center" prop="tableId" width="90" />
      <el-table-column label="列编号" align="center" prop="columnId" width="90" />
      <el-table-column label="Schema" align="center" prop="schemaName" width="120" :show-overflow-tooltip="true" />
      <el-table-column label="表名" align="center" prop="tableName" min-width="140" :show-overflow-tooltip="true" />
      <el-table-column label="列名" align="center" prop="columnName" min-width="140" :show-overflow-tooltip="true" />
      <el-table-column label="内容预览" align="center" prop="contentPreview" min-width="200" :show-overflow-tooltip="true" />
      <el-table-column label="内容哈希" align="center" prop="contentHash" min-width="160" :show-overflow-tooltip="true" />
      <el-table-column label="嵌入模型" align="center" prop="embeddingModelCode" min-width="140" :show-overflow-tooltip="true" />
      <el-table-column label="向量维度" align="center" prop="embeddingDim" width="100" />
      <el-table-column label="已嵌入" align="center" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.embedded ? 'success' : 'info'">{{ scope.row.embedded ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="结构版本" align="center" prop="structVersion" width="100" />
      <el-table-column label="可见" align="center" width="80">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.visible) }}</template>
      </el-table-column>
      <el-table-column label="可查" align="center" width="80">
        <template #default="scope">{{ getOptionLabel(YES_NO_OPTIONS, scope.row.queryable) }}</template>
      </el-table-column>
      <el-table-column label="敏感类型" align="center" prop="sensitiveType" width="100" />
      <el-table-column label="脱敏规则" align="center" prop="maskRule" min-width="130" :show-overflow-tooltip="true" />
      <el-table-column label="同步状态" align="center" width="110">
        <template #default="scope">{{ getOptionLabel(VECTOR_SYNC_STATUS_OPTIONS, scope.row.syncStatus) }}</template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="90" fixed="right">
        <template #default="scope">
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['data-query:schema-vector:delete']"
          >
            下线
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import {
  YES_NO_OPTIONS,
  VECTOR_OBJECT_TYPE_OPTIONS,
  SYNC_LOG_STATUS_OPTIONS,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as VectorApi from '@/api/dataQuery/metadata/vector'

defineOptions({ name: 'DataQuerySchemaVector' })

const message = useMessage()

/** 向量同步状态：0 待构建 / 1 已构建 / 2 需重建 / 4 已下线（取自后端 VO 字段注释） */
const VECTOR_SYNC_STATUS_OPTIONS = [
  { label: '待构建', value: 0 },
  { label: '已构建', value: 1 },
  { label: '需重建', value: 2 },
  { label: '已下线', value: 4 }
]

const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const datasourceId = ref<number>()

// 分页列表
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  objectType: undefined as number | undefined,
  syncStatus: undefined as number | undefined,
  keyword: '' as string
})
const queryFormRef = ref()
const loading = ref(true)
const total = ref(0)
const list = ref<VectorApi.AiSchemaVectorRespVO[]>([])

const getList = async () => {
  if (!datasourceId.value) {
    list.value = []
    total.value = 0
    loading.value = false
    return
  }
  loading.value = true
  try {
    const params: VectorApi.AiSchemaVectorPageReqVO = {
      pageNo: queryParams.pageNo,
      pageSize: queryParams.pageSize,
      datasourceId: datasourceId.value,
      objectType: queryParams.objectType,
      syncStatus: queryParams.syncStatus,
      keyword: queryParams.keyword || undefined
    }
    const data = await VectorApi.getSchemaVectorPage(params)
    list.value = data.list
    total.value = data.total
  } catch {
    message.error('向量分页查询失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  handleQuery()
}

// 状态卡片
const statusData = ref<VectorApi.SchemaVectorStatusRespVO>()
const statusLoading = ref(false)

const loadStatus = async () => {
  if (!datasourceId.value) {
    statusData.value = undefined
    return
  }
  statusLoading.value = true
  try {
    statusData.value = await VectorApi.getSchemaVectorStatus({ datasourceId: datasourceId.value })
  } catch {
    message.error('向量索引状态查询失败，请稍后重试')
  } finally {
    statusLoading.value = false
  }
}

// 增量构建 / 全量重建
const buildResult = ref<VectorApi.SchemaVectorBuildRespVO>()
const syncLoading = ref(false)
const rebuildLoading = ref(false)

const handleSync = async () => {
  if (!datasourceId.value) {
    message.warning('请先选择数据源')
    return
  }
  syncLoading.value = true
  try {
    buildResult.value = await VectorApi.syncSchemaVector({ datasourceId: datasourceId.value })
    message.success('增量构建已执行')
    await loadStatus()
    handleQuery()
  } catch {
    message.error('增量构建失败，请稍后重试')
  } finally {
    syncLoading.value = false
  }
}

const handleRebuild = async () => {
  if (!datasourceId.value) {
    message.warning('请先选择数据源')
    return
  }
  try {
    await message.confirm('全量重建会重新生成当前数据源的全部 Schema 向量，确认继续？', '全量重建')
  } catch {
    return
  }
  rebuildLoading.value = true
  try {
    buildResult.value = await VectorApi.rebuildSchemaVector({ datasourceId: datasourceId.value })
    message.success('全量重建已执行')
    await loadStatus()
    handleQuery()
  } catch {
    message.error('全量重建失败，请稍后重试')
  } finally {
    rebuildLoading.value = false
  }
}

// 单条下线
const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
  } catch {
    return
  }
  try {
    await VectorApi.deleteSchemaVector({ id })
    message.success('已下线')
    await loadStatus()
    getList()
  } catch {
    message.error('下线失败，请稍后重试')
  }
}

const handleDatasourceChange = () => {
  statusData.value = undefined
  buildResult.value = undefined
  queryParams.pageNo = 1
  loadStatus()
  handleQuery()
}

onMounted(async () => {
  try {
    datasourceOptions.value = await DatasourceApi.getAiDatasourceSimpleList()
  } catch {
    message.error('数据源列表加载失败')
  }
  getList()
})
</script>
