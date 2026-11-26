import request from '@/config/axios'

/** 管理后台 - 元数据同步结果 Response VO */
export interface MetadataSyncRespVO {
  datasourceId: number
  taskNo: string
  /** 任务类型：2 全量同步、3 增量同步 */
  syncType: number
  success: boolean
  /** 同步日志状态：1 成功、2 部分成功、3 失败 */
  status: number
  tableAdded: number
  tableChanged: number
  tableRemoved: number
  columnAdded: number
  columnChanged: number
  columnRemoved: number
  relationAdded: number
  structVersionBefore: number
  structVersionAfter: number
  latencyMs: number
  errorMsg: string
  warnings: string[]
  readonlyConnection: boolean
}

/** 管理后台 - 元数据同步状态 Response VO */
export interface MetadataSyncStatusRespVO {
  datasourceId: number
  /** 数据源同步状态：0 未同步、1 同步中、2 成功、3 失败 */
  syncStatus: number
  lastSyncTime: string
  structVersion: number
  tableCount: number
  visibleTableCount: number
  structChangedTableCount: number
  columnCount: number
  visibleColumnCount: number
  structChangedColumnCount: number
  relationCount: number
  verifiedRelationCount: number
  vectorCount: number
  vectorBuiltCount: number
  vectorPendingCount: number
}

/** 管理后台 - 元数据可见性批量维护 Request VO */
export interface MetadataVisibilityReqVO {
  datasourceId: number
  tableIds?: number[]
  columnIds?: number[]
  /** 是否可见：0 否、1 是；为空表示不修改 */
  visible?: number
  /** 是否允许 LLM 引用：0 否、1 是；为空表示不修改 */
  queryable?: number
}

const BASE_URL = '/data-query/metadata-sync'

/** 同步数据源元数据（full=true 全量 / false 增量） */
export const syncMetadata = (params: { datasourceId: number; full?: boolean }) =>
  request.post({ url: `${BASE_URL}/sync`, params })

/** 批量维护表 / 列的可见性与可查性 */
export const updateMetadataVisibility = (data: MetadataVisibilityReqVO) =>
  request.put({ url: `${BASE_URL}/visibility`, data })

/** 获得元数据同步状态与新鲜度概览 */
export const getMetadataSyncStatus = (params: { datasourceId: number }) =>
  request.get({ url: `${BASE_URL}/status`, params })
