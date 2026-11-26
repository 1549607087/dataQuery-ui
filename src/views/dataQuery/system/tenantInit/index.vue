<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="租户 AI 配置初始化（兜底 / 存量补刷）"
      description="正常路径由新建租户事件自动初始化；本页用于存量租户补刷或自动初始化失败后的手动重试。接口只创建密钥为空的配置骨架，不读取也不返回任何凭证或业务数据。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">1. 操作参数</el-divider>
    <el-form :inline="true" label-width="100px" class="-mb-15px">
      <el-form-item label="数据源">
        <el-select v-model="datasourceId" placeholder="请选择数据源" filterable clearable class="!w-260px">
          <el-option
            v-for="ds in datasourceOptions"
            :key="ds.id"
            :label="`${ds.name} (${ds.code})`"
            :value="ds.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="租户编号">
        <el-input-number
          v-model="tenantId"
          :min="0"
          :controls="false"
          class="!w-200px"
          :placeholder="tenantPlaceholder"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :loading="statusLoading"
          v-hasPermi="['data-query:tenant-init:query']"
          @click="handleStatus"
        >
          <Icon icon="ep:search" class="mr-5px" />查询状态
        </el-button>
        <el-button
          type="danger"
          plain
          :loading="initLoading"
          v-hasPermi="['data-query:tenant-init:create']"
          @click="handleInit"
        >
          <Icon icon="ep:refresh" class="mr-5px" />执行初始化
        </el-button>
      </el-form-item>
    </el-form>
    <div class="text-12px text-gray-400 mt-8px">
      数据源下拉仅作环境参考；初始化 / 状态接口按「租户编号」工作，留空则取当前租户。
    </div>
  </ContentWrap>

  <ContentWrap>
    <el-divider content-position="left">2. 初始化状态</el-divider>
    <template v-if="status">
      <el-alert
        :type="status.initialized ? 'success' : 'warning'"
        :closable="false"
        show-icon
        :title="status.initialized ? '已完成初始化' : '尚未完成初始化'"
        :description="`租户 ${status.tenantId}：供应商 / 配置 / 绑定三类计数需全部大于 0 才算完成初始化。`"
        class="mb-15px"
      />
      <el-descriptions :column="4" border>
        <el-descriptions-item label="租户编号 tenantId">{{ status.tenantId }}</el-descriptions-item>
        <el-descriptions-item label="是否初始化 initialized">
          <el-tag :type="status.initialized ? 'success' : 'warning'">
            {{ status.initialized ? '已初始化' : '未初始化' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="模型供应商数 providerCount">
          <span class="count-value">{{ status.providerCount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="模型配置数 configCount">
          <span class="count-value">{{ status.configCount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="场景绑定数 bindingCount">
          <span class="count-value">{{ status.bindingCount }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <el-collapse v-model="activeNames" class="mt-15px">
        <el-collapse-item title="字段说明（AiTenantInitStatusRespVO）" name="tips">
          <pre class="tips-pre">{{ statusTips }}</pre>
        </el-collapse-item>
      </el-collapse>
    </template>
    <el-empty v-else description="点击「查询状态」查看租户 AI 配置初始化情况" :image-size="60" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import * as TenantInitApi from '@/api/dataQuery/system/tenantInit'
import { getAiDatasourceSimpleList } from '@/api/dataQuery/datasource'
import type { AiDatasourceSimpleRespVO } from '@/api/dataQuery/datasource'

defineOptions({ name: 'DataQueryTenantInit' })

const message = useMessage()

const datasourceOptions = ref<AiDatasourceSimpleRespVO[]>([])
const loadDatasourceList = async () => {
  try {
    datasourceOptions.value = await getAiDatasourceSimpleList()
  } catch {
    // 数据源列表仅作参考，加载失败不阻塞状态查询
  }
}
onMounted(() => {
  loadDatasourceList()
})

const datasourceId = ref<number | undefined>()
const tenantId = ref<number | undefined>()
const tenantPlaceholder = '留空则取当前租户'
const statusLoading = ref(false)
const initLoading = ref(false)
const status = ref<TenantInitApi.AiTenantInitStatusRespVO>()
const activeNames = ref<string[]>([])

const statusTips = `AiTenantInitStatusRespVO 字段：
- tenantId：租户编号（未指定时为当前租户）
- providerCount：模型供应商数量
- configCount：模型配置数量
- bindingCount：场景绑定数量
- initialized：providerCount / configCount / bindingCount 三者均大于 0 时为 true`

const handleStatus = async () => {
  statusLoading.value = true
  try {
    status.value = await TenantInitApi.getTenantInitStatus(tenantId.value)
  } finally {
    statusLoading.value = false
  }
}

const handleInit = async () => {
  const targetLabel = tenantId.value == null ? '当前租户' : `租户 ${tenantId.value}`
  try {
    await message.confirm(
      `确认为${targetLabel}初始化 AI 模型配置骨架？该操作幂等，执行后将自动刷新状态。`,
      '执行初始化'
    )
  } catch {
    return
  }
  initLoading.value = true
  try {
    await TenantInitApi.initTenant(tenantId.value)
    message.success('初始化完成')
    await handleStatus()
  } finally {
    initLoading.value = false
  }
}
</script>

<style scoped>
.count-value {
  font-size: 16px;
  font-weight: 600;
}
.tips-pre {
  margin: 0;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
