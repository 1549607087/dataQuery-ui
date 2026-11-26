import request from '@/config/axios'

/** 数据源（表单 = SaveReqVO 全字段 + 后端维护字段可选） */
export interface AiDatasourceVO {
  id: number | undefined
  name: string
  code: string
  dsType: number
  dialect: string
  driverClass: string
  jdbcUrl: string
  username: string
  password: string
  readonlyUrl: string
  readonlyUsername: string
  readonlyPassword: string
  readonlyEnabled: number
  schemaName: string
  catalogName: string
  identifierQuote: string
  quoteAll: number
  sqlRules: string
  maxRows: number
  maxScanRows: number
  queryTimeoutMs: number
  poolMinIdle: number
  poolMaxActive: number
  poolValidationSql: string
  allowDdl: number
  allowedSchemas: string
  tableFilter: string
  syncCron: string
  status: number
  sort: number
  remark: string
  /** 以下字段由后端维护，只展示不提交 */
  syncStatus?: number
  lastSyncTime?: string
  structVersion?: number
  healthStatus?: number
  lastCheckTime?: string
  lastCheckResult?: string
  createTime?: string
  passwordConfigured?: boolean
  readonlyPasswordConfigured?: boolean
}

export interface AiDatasourcePageReqVO extends PageParam {
  name?: string
  code?: string
  dsType?: number
  dialect?: string
  status?: number
  healthStatus?: number
  syncStatus?: number
  createTime?: string[]
}

/** 启用的数据源精简列表（下拉用） */
export interface AiDatasourceSimpleRespVO {
  id: number
  name: string
  code: string
  dsType: number
  dialect: string
  status: number
  healthStatus: number
  readonlyEnabled: number
}

/** 连通性检测结果 */
export interface AiDatasourceTestRespVO {
  datasourceId: number
  success: boolean
  healthStatus: number
  latencyMs: number
  message: string
  checkedAt: string
}

const BASE_URL = '/data-query/ai-datasource'

export const getAiDatasourcePage = (params: AiDatasourcePageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiDatasource = (id: number) =>
  request.get({ url: `${BASE_URL}/get`, params: { id } })

export const getAiDatasourceSimpleList = () =>
  request.get({ url: `${BASE_URL}/simple-list` })

export const createAiDatasource = (data: AiDatasourceVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiDatasource = (data: AiDatasourceVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const updateAiDatasourceStatus = (id: number, status: number) =>
  request.put({ url: `${BASE_URL}/update-status`, params: { id, status } })

export const testAiDatasourceConnection = (id: number) =>
  request.post({ url: `${BASE_URL}/test-connection`, params: { id } })

export const deleteAiDatasource = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete`, params: { id } })

export const deleteAiDatasourceList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiDatasource = (params: AiDatasourcePageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
