import request from '@/config/axios'

/** 提示词版本（内容快照，只读 + 回滚） */
export interface AiPromptVersionVO {
  id: number
  promptId: number
  version: number
  content: string
  variableDefs: string
  params: string
  changeLog: string
  contentHash: string
  tokenEstimate: number
  status: number
  publishTime: string
  publisher: string
  remark: string
  createTime: string
}

export interface AiPromptVersionPageReqVO extends PageParam {
  promptId?: number
  version?: number
  status?: number
  publisher?: string
  createTime?: string[]
}

export interface AiPromptVersionDiffVO {
  sourceVersionId: number
  targetVersionId: number
  sourceVersion: number
  targetVersion: number
  sourceContent: string
  targetContent: string
  sourceVariableDefs: string
  targetVariableDefs: string
  contentChanged: boolean
  variableChanged: boolean
}

export interface AiPromptRollbackReqVO {
  promptId: number
  versionId: number
  changeLog: string
}

const BASE_URL = '/data-query/ai-prompt-version'

export const getAiPromptVersionPage = (params: AiPromptVersionPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiPromptVersion = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const getAiPromptVersionListByPrompt = (promptId: number) =>
  request.get({ url: `${BASE_URL}/list-by-prompt`, params: { promptId } })

/** 对比同一条提示词下的两个版本 */
export const diffAiPromptVersion = (sourceId: number, targetId: number) =>
  request.get({ url: `${BASE_URL}/diff`, params: { sourceId, targetId } })

/** 回滚：基于历史版本生成新版本，不改写历史 */
export const rollbackAiPromptVersion = (data: AiPromptRollbackReqVO) =>
  request.put({ url: `${BASE_URL}/rollback`, data })

export const exportAiPromptVersion = (params: AiPromptVersionPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
