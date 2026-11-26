import request from '@/config/axios'

/** 字段枚举映射（表单 = SaveReqVO 全字段 + 后端维护字段可选） */
export interface AiDatasourceColumnEnumVO {
  id: number | undefined
  datasourceId: number | undefined
  tableId: number | undefined
  columnId: number | undefined
  sourceValue: string
  displayName: string
  dictType: string
  dictValue: string
  description: string
  source: number
  sampleCount: number
  status: number
  sort: number
  remark: string
  /** 以下字段由后端维护，只展示不提交 */
  createTime?: string
}

export interface AiDatasourceColumnEnumPageReqVO extends PageParam {
  datasourceId?: number
  tableId?: number
  columnId?: number
  sourceValue?: string
  displayName?: string
  dictType?: string
  status?: number
  createTime?: string[]
}

const BASE_URL = '/data-query/ai-datasource-column-enum'

export const getAiDatasourceColumnEnumPage = (params: AiDatasourceColumnEnumPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiDatasourceColumnEnum = (id: number) =>
  request.get({ url: `${BASE_URL}/get`, params: { id } })

export const getAiDatasourceColumnEnumListByDatasource = (datasourceId: number) =>
  request.get({ url: `${BASE_URL}/list-by-datasource`, params: { datasourceId } })

export const getAiDatasourceColumnEnumListByColumn = (columnId: number) =>
  request.get({ url: `${BASE_URL}/list-by-column`, params: { columnId } })

export const createAiDatasourceColumnEnum = (data: AiDatasourceColumnEnumVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiDatasourceColumnEnum = (data: AiDatasourceColumnEnumVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const deleteAiDatasourceColumnEnum = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete`, params: { id } })

export const deleteAiDatasourceColumnEnumList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiDatasourceColumnEnum = (params: AiDatasourceColumnEnumPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
