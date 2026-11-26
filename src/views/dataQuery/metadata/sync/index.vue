<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="元数据同步与可见性维护"
      description="接入新库请优先使用「表结构一键导入」，它会一次完成建源、测连接、全量导入与向量索引；本页用于已接入数据源的重同步与可见性维护。所有操作都以数据源为边界：同步会采集表 / 列 / 主键 / 外键；状态概览反映新鲜度与向量待构建数；可见性维护会同时标记向量需重建。"
    />
    <el-button link type="primary" class="mt-8px" @click="goImport">
      <Icon icon="ep:upload-filled" class="mr-5px" />去「表结构一键导入」
    </el-button>
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
    </el-form>
  </ContentWrap>

  <!-- 1. 元数据同步 -->
  <ContentWrap>
    <el-divider content-position="left">1. 元数据同步</el-divider>
    <el-form :inline="true" label-width="100px" class="-mb-15px">
      <el-form-item label="同步范围">
        <el-switch v-model="full" active-text="全量同步" inactive-text="增量同步" />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :loading="syncLoading"
          @click="handleSync"
          v-hasPermi="['data-query:metadata-sync:sync']"
        >
          <Icon icon="ep:refresh" class="mr-5px" />执行同步
        </el-button>
      </el-form-item>
    </el-form>

    <template v-if="syncResult">
      <el-descriptions :column="4" border class="mt-15px" title="同步结果（MetadataSyncRespVO）">
        <el-descriptions-item label="数据源编号">{{ syncResult.datasourceId }}</el-descriptions-item>
        <el-descriptions-item label="任务编号">{{ syncResult.taskNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ getOptionLabel(SYNC_TYPE_OPTIONS, syncResult.syncType) }}</el-descriptions-item>
        <el-descriptions-item label="是否成功">
          <el-tag :type="syncResult.success ? 'success' : 'danger'">{{ syncResult.success ? '成功' : '失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="日志状态">{{ getOptionLabel(SYNC_LOG_STATUS_OPTIONS, syncResult.status) }}</el-descriptions-item>
        <el-descriptions-item label="新增表">{{ syncResult.tableAdded }}</el-descriptions-item>
        <el-descriptions-item label="变更表">{{ syncResult.tableChanged }}</el-descriptions-item>
        <el-descriptions-item label="失效表">{{ syncResult.tableRemoved }}</el-descriptions-item>
        <el-descriptions-item label="新增列">{{ syncResult.columnAdded }}</el-descriptions-item>
        <el-descriptions-item label="变更列">{{ syncResult.columnChanged }}</el-descriptions-item>
        <el-descriptions-item label="失效列">{{ syncResult.columnRemoved }}</el-descriptions-item>
        <el-descriptions-item label="新增 Join 路径">{{ syncResult.relationAdded }}</el-descriptions-item>
        <el-descriptions-item label="变更前结构版本">{{ syncResult.structVersionBefore }}</el-descriptions-item>
        <el-descriptions-item label="变更后结构版本">{{ syncResult.structVersionAfter }}</el-descriptions-item>
        <el-descriptions-item label="耗时（ms）">{{ syncResult.latencyMs }}</el-descriptions-item>
        <el-descriptions-item label="只读连接">
          <el-tag :type="syncResult.readonlyConnection ? 'success' : 'info'">{{ syncResult.readonlyConnection ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="错误摘要" :span="4">{{ syncResult.errorMsg || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div class="mt-12px">
        <div class="mb-6px font-bold">变更明细与非阻断告警（{{ (syncResult.warnings || []).length }}）</div>
        <ul v-if="(syncResult.warnings || []).length" class="m-0 pl-20px text-13px leading-24px">
          <li v-for="(item, index) in syncResult.warnings" :key="index">{{ item }}</li>
        </ul>
        <span v-else class="text-13px text-gray-400">无</span>
      </div>
    </template>
    <el-empty v-else description="选择数据源后点击「执行同步」" :image-size="60" />
  </ContentWrap>

  <!-- 2. 同步状态 -->
  <ContentWrap>
    <el-divider content-position="left">2. 同步状态与新鲜度</el-divider>
    <el-form :inline="true" label-width="100px" class="-mb-15px">
      <el-form-item>
        <el-button
          type="primary"
          plain
          :loading="statusLoading"
          @click="handleStatus"
          v-hasPermi="['data-query:metadata-sync:query']"
        >
          <Icon icon="ep:search" class="mr-5px" />查询状态
        </el-button>
      </el-form-item>
    </el-form>

    <template v-if="statusResult">
      <el-descriptions :column="4" border class="mt-15px" title="状态概览（MetadataSyncStatusRespVO）">
        <el-descriptions-item label="数据源编号">{{ statusResult.datasourceId }}</el-descriptions-item>
        <el-descriptions-item label="同步状态">
          <el-tag :type="statusResult.syncStatus === 2 ? 'success' : statusResult.syncStatus === 3 ? 'danger' : 'info'">
            {{ getOptionLabel(DS_SYNC_STATUS_OPTIONS, statusResult.syncStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最近同步时间">{{ statusResult.lastSyncTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="当前结构版本">{{ statusResult.structVersion }}</el-descriptions-item>
        <el-descriptions-item label="表总数">{{ statusResult.tableCount }}</el-descriptions-item>
        <el-descriptions-item label="可见且可查表数">{{ statusResult.visibleTableCount }}</el-descriptions-item>
        <el-descriptions-item label="结构待确认表数">{{ statusResult.structChangedTableCount }}</el-descriptions-item>
        <el-descriptions-item label="列总数">{{ statusResult.columnCount }}</el-descriptions-item>
        <el-descriptions-item label="可见且可查列数">{{ statusResult.visibleColumnCount }}</el-descriptions-item>
        <el-descriptions-item label="结构待确认列数">{{ statusResult.structChangedColumnCount }}</el-descriptions-item>
        <el-descriptions-item label="Join 路径数">{{ statusResult.relationCount }}</el-descriptions-item>
        <el-descriptions-item label="已验证启用数">{{ statusResult.verifiedRelationCount }}</el-descriptions-item>
        <el-descriptions-item label="向量行数">{{ statusResult.vectorCount }}</el-descriptions-item>
        <el-descriptions-item label="已构建向量数">{{ statusResult.vectorBuiltCount }}</el-descriptions-item>
        <el-descriptions-item label="待构建向量数">{{ statusResult.vectorPendingCount }}</el-descriptions-item>
      </el-descriptions>
    </template>
    <el-empty v-else description="选择数据源后点击「查询状态」" :image-size="60" />
  </ContentWrap>

  <!-- 3. 可见性批量维护 -->
  <ContentWrap>
    <el-divider content-position="left">3. 可见性批量维护</el-divider>
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      class="mb-12px"
      title="留空表示不修改"
      description="「是否可见 / 是否可查」留空即不修改该项；表 / 列编号支持每行一个或逗号分隔。提交后受影响的向量会标记为需重建。"
    />
    <el-form label-width="130px" class="-mb-15px">
      <el-form-item label="表元数据编号">
        <el-input v-model="visibilityForm.tableIdsText" type="textarea" :rows="3" placeholder="每行一个表元数据编号，也可用逗号分隔" />
      </el-form-item>
      <el-form-item label="列元数据编号">
        <el-input v-model="visibilityForm.columnIdsText" type="textarea" :rows="3" placeholder="每行一个列元数据编号，也可用逗号分隔" />
      </el-form-item>
      <el-form-item label="是否可见">
        <el-select v-model="visibilityForm.visible" placeholder="留空表示不修改" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否可查">
        <el-select v-model="visibilityForm.queryable" placeholder="留空表示不修改" clearable class="!w-220px">
          <el-option v-for="item in YES_NO_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :loading="visibilityLoading"
          @click="handleVisibility"
          v-hasPermi="['data-query:metadata-sync:update']"
        >
          <Icon icon="ep:check" class="mr-5px" />提交维护
        </el-button>
        <span v-if="visibilityResult !== undefined" class="ml-12px text-13px">影响行数：{{ visibilityResult }}</span>
      </el-form-item>
    </el-form>
  </ContentWrap>
</template>

<script lang="ts" setup>
import {
  YES_NO_OPTIONS,
  SYNC_TYPE_OPTIONS,
  SYNC_LOG_STATUS_OPTIONS,
  DS_SYNC_STATUS_OPTIONS,
  getOptionLabel
} from '@/api/dataQuery/constants'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as SyncApi from '@/api/dataQuery/metadata/sync'

defineOptions({ name: 'DataQueryMetadataSync' })

const message = useMessage()
const router = useRouter()
const goImport = () => router.push('/data-query/datasource/metadata-import')

const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const datasourceId = ref<number>()

// 1. 元数据同步
const full = ref(false)
const syncLoading = ref(false)
const syncResult = ref<SyncApi.MetadataSyncRespVO>()

const handleSync = async () => {
  if (!datasourceId.value) {
    message.warning('请先选择数据源')
    return
  }
  syncLoading.value = true
  try {
    syncResult.value = await SyncApi.syncMetadata({
      datasourceId: datasourceId.value,
      full: full.value
    })
    message.success('同步任务已执行')
  } catch {
    message.error('元数据同步失败，请稍后重试')
  } finally {
    syncLoading.value = false
  }
}

// 2. 同步状态
const statusLoading = ref(false)
const statusResult = ref<SyncApi.MetadataSyncStatusRespVO>()

const handleStatus = async () => {
  if (!datasourceId.value) {
    message.warning('请先选择数据源')
    return
  }
  statusLoading.value = true
  try {
    statusResult.value = await SyncApi.getMetadataSyncStatus({ datasourceId: datasourceId.value })
  } catch {
    message.error('同步状态查询失败，请稍后重试')
  } finally {
    statusLoading.value = false
  }
}

// 3. 可见性批量维护
const visibilityForm = reactive({
  tableIdsText: '',
  columnIdsText: '',
  visible: undefined as number | undefined,
  queryable: undefined as number | undefined
})
const visibilityLoading = ref(false)
const visibilityResult = ref<number>()

/** 切换数据源后清空上一次的展示结果，避免误读旧数据 */
const handleDatasourceChange = () => {
  syncResult.value = undefined
  statusResult.value = undefined
  visibilityResult.value = undefined
}

const parseIds = (text: string): number[] =>
  text
    .split(/[\n,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(Number)
    .filter((num) => !Number.isNaN(num))

const handleVisibility = async () => {
  if (!datasourceId.value) {
    message.warning('请先选择数据源')
    return
  }
  const tableIds = parseIds(visibilityForm.tableIdsText)
  const columnIds = parseIds(visibilityForm.columnIdsText)
  if (!tableIds.length && !columnIds.length) {
    message.warning('请至少填写一个表或列元数据编号')
    return
  }
  if (visibilityForm.visible === undefined && visibilityForm.queryable === undefined) {
    message.warning('请至少设置「是否可见」或「是否可查」之一')
    return
  }
  visibilityLoading.value = true
  try {
    visibilityResult.value = await SyncApi.updateMetadataVisibility({
      datasourceId: datasourceId.value,
      tableIds: tableIds.length ? tableIds : undefined,
      columnIds: columnIds.length ? columnIds : undefined,
      visible: visibilityForm.visible,
      queryable: visibilityForm.queryable
    })
    message.success('可见性维护已提交')
  } catch {
    message.error('可见性维护失败，请稍后重试')
  } finally {
    visibilityLoading.value = false
  }
}

onMounted(async () => {
  try {
    datasourceOptions.value = await DatasourceApi.getAiDatasourceSimpleList()
  } catch {
    message.error('数据源列表加载失败')
  }
})
</script>
