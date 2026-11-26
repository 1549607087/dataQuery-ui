import request from '@/config/axios'

/**
 * 知识库文档（P9.1）
 *
 * 上传是异步的：upload 只做「落库 + 发 MQ」，立即返回 documentId / parseStatus；
 * 解析/切片/向量化由消费端异步完成，前端拿 documentId 轮询 get 直到 parseStatus 落终态。
 */

export interface AiKnowledgeDocumentVO {
  id: number | undefined
  baseId: number
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  contentHash: string
  /** 逻辑文档标识（同 docKey 为同一文档的多个版本） */
  docKey: string
  /** 文档版本号（同 docKey 内从 1 递增） */
  version: number
  /** 是否当前生效版本：1 是 / 0 历史版本 */
  isLatest: number
  /** 0待解析 1解析中 2已完成 3失败 4已下线 */
  parseStatus: number
  parseError: string
  chunkCount: number
  charCount: number
  /** 是否参与检索：1是 0否（只读，无独立切换端点） */
  enabled: number
  creator: string
  createTime: string
  updateTime: string
}

export interface AiKnowledgeDocumentPageReqVO extends PageParam {
  /** 所属知识库（精确） */
  baseId?: number
  /** 文件名模糊 */
  fileName?: string
  /** 扩展名大写，精确 */
  fileType?: string
  /** 逻辑文档标识，精确（查同一文档的所有版本） */
  docKey?: string
  /** 文档版本号，精确 */
  version?: number
  parseStatus?: number
  enabled?: number
  createTime?: string[]
}

export interface AiKnowledgeDocumentUploadRespVO {
  /** 文档编号，前端据此轮询 get */
  documentId: number
  parseStatus: number
  /** true 表示命中幂等，复用已有文档，未重复入库 */
  duplicated: boolean
  /** 逻辑文档标识（版本链的键） */
  docKey: string
  /** 本次上传对应的文档版本号 */
  version: number
  /** 是否当前生效版本：1 是 / 0 否（消费完成后才切 1） */
  isLatest: number
}

/** 切换生效版本请求 */
export interface AiKnowledgeDocumentSwitchReqVO {
  baseId: number
  docKey: string
  version: number
}

const BASE_URL = '/data-query/knowledge-document'

/** 上传：multipart（baseId + file + 可选 docKey）；upload 封装返回整个 CommonResult，这里统一取 .data */
export const uploadKnowledgeDocument = async (
  baseId: number,
  file: File,
  docKey?: string
): Promise<AiKnowledgeDocumentUploadRespVO> => {
  const res: any = await request.upload({
    url: `${BASE_URL}/upload`,
    data: { baseId, file, ...(docKey ? { docKey } : {}) }
  })
  // 拦截器成功分支返回整个 CommonResult（{code,data,msg}），get/post 会自动取 .data，upload 不会
  return (
    res?.data !== undefined && res?.code !== undefined ? res.data : res
  ) as AiKnowledgeDocumentUploadRespVO
}

/** 获得文档（前端轮询 parse_status 用） */
export const getKnowledgeDocument = (id: number) =>
  request.get({ url: `${BASE_URL}/get`, params: { id } }) as Promise<AiKnowledgeDocumentVO>

/** 文档分页 */
export const getKnowledgeDocumentPage = (params: AiKnowledgeDocumentPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

/** 导出 */
export const exportKnowledgeDocument = (params: AiKnowledgeDocumentPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })

/** 删除（级联下线切片 + 维护知识库计数） */
export const deleteKnowledgeDocument = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete`, params: { id } })

/** 重建（重置状态 + 重发解析 MQ） */
export const rebuildKnowledgeDocument = (id: number) =>
  request.post({ url: `${BASE_URL}/rebuild`, params: { id } })

/** 列出某逻辑文档的全部版本（按版本降序，含生效标记/解析状态/切片数） */
export const getDocumentVersions = (baseId: number, docKey: string) =>
  request.get({ url: `${BASE_URL}/versions`, params: { baseId, docKey } }) as Promise<
    AiKnowledgeDocumentVO[]
  >

/** 切换当前生效版本（只切标记，零 Embedding 成本） */
export const switchDocumentVersion = async (data: AiKnowledgeDocumentSwitchReqVO) =>
  await request.post({ url: `${BASE_URL}/switch-version`, data })
