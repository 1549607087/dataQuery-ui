import request from '@/config/axios'

/** 表关系 / Join 路径（表单 = SaveReqVO 全字段 + 后端维护字段可选） */
export interface AiDatasourceTableRelationVO {
  id: number | undefined
  datasourceId: number | undefined
  leftTableId: number | undefined
  rightTableId: number | undefined
  leftTableName: string
  rightTableName: string
  joinType: number
  joinPairs: string
  joinCondition: string
  cardinality: number
  cost: number
  description: string
  source: number
  verified: number
  enabled: number
  status: number
  sort: number
  remark: string
  /** 以下字段由后端维护，只展示不提交 */
  createTime?: string
}

export interface AiDatasourceTableRelationPageReqVO extends PageParam {
  datasourceId?: number
  leftTableId?: number
  rightTableId?: number
  verified?: number
  enabled?: number
  status?: number
  createTime?: string[]
}

/** 关联字段对：传给后端，由后端拼成 join_pairs JSON */
export interface AiDatasourceTableRelationJoinPairVO {
  left: string
  right: string
}

/**
 * 新增/修改提交体（对齐后端 SaveReqVO）
 * 左右表物理名由后端按 leftTableId/rightTableId 回填，createTime 等由后端维护，均不接受前端提交；
 * joinPairs 传结构化数组，不再由前端拼 JSON 字符串
 */
export type AiDatasourceTableRelationSaveVO = Omit<
  AiDatasourceTableRelationVO,
  'leftTableName' | 'rightTableName' | 'createTime' | 'joinPairs'
> & {
  joinPairs: AiDatasourceTableRelationJoinPairVO[]
}

const BASE_URL = '/data-query/ai-datasource-table-relation'

export const getAiDatasourceTableRelationPage = (params: AiDatasourceTableRelationPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiDatasourceTableRelation = (id: number) =>
  request.get({ url: `${BASE_URL}/get`, params: { id } })

export const getAiDatasourceTableRelationListByDatasource = (datasourceId: number) =>
  request.get({ url: `${BASE_URL}/list-by-datasource`, params: { datasourceId } })

export const createAiDatasourceTableRelation = (data: AiDatasourceTableRelationSaveVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiDatasourceTableRelation = (data: AiDatasourceTableRelationSaveVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const deleteAiDatasourceTableRelation = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete`, params: { id } })

export const deleteAiDatasourceTableRelationList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiDatasourceTableRelation = (params: AiDatasourceTableRelationPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
