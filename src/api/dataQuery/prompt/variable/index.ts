import request from '@/config/axios'

/** 提示词模板变量（占位符定义，编辑态） */
export interface AiPromptVariableVO {
  id: number | undefined
  promptId: number | undefined
  sceneCode: string
  /** 占位符名，不含双花括号 */
  varName: string
  varLabel: string
  varType: number
  sourceType: number
  sourceKey: string
  required: number
  defaultValue: string
  sampleValue: string
  validateRegex: string
  maxLength: number
  status: number
  sort: number
  remark: string
  createTime?: string
}

export interface AiPromptVariablePageReqVO extends PageParam {
  promptId?: number
  sceneCode?: string
  varName?: string
  varLabel?: string
  varType?: number
  sourceType?: number
  required?: number
  status?: number
  createTime?: string[]
}

export interface AiPromptVariableBatchSaveReqVO {
  promptId: number
  sceneCode: string
  variables: AiPromptVariableVO[]
}

const BASE_URL = '/data-query/ai-prompt-variable'

export const getAiPromptVariablePage = (params: AiPromptVariablePageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiPromptVariable = (id: number) =>
  request.get({ url: `${BASE_URL}/get?id=${id}` })

export const getAiPromptVariableListByPrompt = (promptId: number) =>
  request.get({ url: `${BASE_URL}/list-by-prompt`, params: { promptId } })

export const createAiPromptVariable = (data: AiPromptVariableVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiPromptVariable = (data: AiPromptVariableVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const updateAiPromptVariableStatus = (id: number, status: number) =>
  request.put({ url: `${BASE_URL}/update-status`, params: { id, status } })

export const deleteAiPromptVariable = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiPromptVariableList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

/** 整包覆盖某条提示词的变量定义，并回写 ai_prompt.variable_defs 快照 */
export const batchSaveAiPromptVariable = (data: AiPromptVariableBatchSaveReqVO) =>
  request.post({ url: `${BASE_URL}/batch-save`, data })

export const exportAiPromptVariable = (params: AiPromptVariablePageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })
