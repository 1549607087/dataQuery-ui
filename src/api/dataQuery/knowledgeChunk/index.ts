import request from '@/config/axios'

/**
 * 知识库切片
 *
 * 问答引用里只带截断正文（1000 字），核对原文时通过 /get 取完整切片。
 */
export interface AiKnowledgeChunkVO {
  id: number
  baseId: number
  documentId: number
  fileName?: string
  /** 切片序号，从 0 开始 */
  chunkIndex?: number
  content?: string
  contentHash?: string
  tokenCount?: number
  /** 向量模型代号指纹 */
  embeddingModelCode?: string
  embeddingDim?: number
  /** 向量状态：0 待构建 / 1 已构建 / 2 需重建 / 4 已下线 */
  syncStatus?: number
  /** PDF 页码，TXT / MD 为 null */
  pageNo?: number | null
  headingPath?: string
  charStart?: number
  charEnd?: number
  /** 0 正常 / 1 停用 */
  status?: number
  createTime?: string
}

export interface AiKnowledgeChunkPageReqVO extends PageParam {
  baseId?: number
  documentId?: number
  fileName?: string
  syncStatus?: number
}

const BASE_URL = '/data-query/knowledge-chunk'

export const getAiKnowledgeChunkPage = (params: AiKnowledgeChunkPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiKnowledgeChunk = (id: number) =>
  request.get({ url: `${BASE_URL}/get`, params: { id } })
