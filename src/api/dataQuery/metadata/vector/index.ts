import request from '@/config/axios'

/** 管理后台 - Schema 向量索引状态 Response VO */
export interface SchemaVectorStatusRespVO {
  datasourceId: number
  embeddingAvailable: boolean
  modelCode: string
  dimension: number
  vectorCount: number
  builtCount: number
  pendingCount: number
  retiredCount: number
  staleCount: number
  structVersion: number
  lastTaskNo: string
  lastBuildTime: string
  lastBuildStatus: number
  notes: string[]
}

/** 管理后台 - Schema 向量索引构建结果 Response VO */
export interface SchemaVectorBuildRespVO {
  datasourceId: number
  taskNo: string
  rebuild: boolean
  embeddingAvailable: boolean
  modelCode: string
  dimension: number
  totalDocuments: number
  created: number
  updated: number
  skipped: number
  retired: number
  embedded: number
  pendingEmbedding: number
  structVersion: number
  latencyMs: number
  status: number
  warnings: string[]
}

/** 管理后台 - Schema 向量分页 Request VO（继承 PageParam） */
export interface AiSchemaVectorPageReqVO extends PageParam {
  datasourceId: number
  objectType?: number
  syncStatus?: number
  keyword?: string
}

/** 管理后台 - Schema 向量 Response VO（不返回向量字面量） */
export interface AiSchemaVectorRespVO {
  id: number
  datasourceId: number
  objectType: number
  tableId: number
  columnId: number
  schemaName: string
  tableName: string
  columnName: string
  contentPreview: string
  contentHash: string
  embeddingModelCode: string
  embeddingDim: number
  embedded: boolean
  structVersion: number
  visible: number
  queryable: number
  sensitiveType: number
  maskRule: string
  syncStatus: number
}

const BASE_URL = '/data-query/schema-vector'

/** 增量构建 Schema 向量索引（按 content_hash 跳过未变更内容） */
export const syncSchemaVector = (params: { datasourceId: number }) =>
  request.post({ url: `${BASE_URL}/sync`, params })

/** 全量重建当前数据源的 Schema 向量索引 */
export const rebuildSchemaVector = (params: { datasourceId: number }) =>
  request.post({ url: `${BASE_URL}/rebuild`, params })

/** 获得 Schema 向量索引新鲜度与 Embedding 接线状态 */
export const getSchemaVectorStatus = (params: { datasourceId: number }) =>
  request.get({ url: `${BASE_URL}/status`, params })

/** 获得 Schema 向量分页 */
export const getSchemaVectorPage = (params: AiSchemaVectorPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

/** 下线一条 Schema 向量（逻辑删除） */
export const deleteSchemaVector = (params: { id: number }) =>
  request.delete({ url: `${BASE_URL}/delete`, params })
