import request from '@/config/axios'

/** 提示词模板 */
export interface AiPromptVO {
  id: number | undefined
  sceneCode: string
  name: string
  code: string
  promptType: number
  /** 占位符统一 {{var_name}} */
  content: string
  /** 变量定义只读快照，由发布接口生成，不允许前端提交 */
  variableDefs?: string
  modelId: number | undefined
  params: string
  source?: number
  parentId?: number
  version?: number
  currentVersionId?: number
  status: number
  grayRatio: number
  sort: number
  remark: string
  tenantId?: number
  createTime?: string
}

export interface AiPromptPageReqVO extends PageParam {
  sceneCode?: string
  name?: string
  code?: string
  promptType?: number
  status?: number
  source?: number
  modelId?: number
  createTime?: string[]
}

export interface AiPromptSimpleVO {
  id: number
  name: string
  code: string
  sceneCode: string
  status: number
  version: number
}

export interface AiPromptPublishReqVO {
  id: number
  changeLog: string
}

export interface AiPromptCopyReqVO {
  id: number
  name: string
  code: string
}

export interface AiPromptRenderReqVO {
  promptId?: number
  content?: string
  variables?: Record<string, string>
  strict?: boolean
}

export interface AiPromptRenderRespVO {
  content: string
  variables: string[]
  undeclaredVariables: string[]
  unusedVariables: string[]
  missingVariables: string[]
  valid: boolean
  tokenEstimate: number
}

export interface AiPromptValidateRespVO {
  valid: boolean
  contentVariables: string[]
  declaredVariables: string[]
  undeclaredVariables: string[]
  unusedVariables: string[]
  suspiciousVariables: string[]
}

const BASE_URL = '/data-query/ai-prompt'

export const getAiPromptPage = (params: AiPromptPageReqVO) =>
  request.get({ url: `${BASE_URL}/page`, params })

export const getAiPrompt = (id: number) => request.get({ url: `${BASE_URL}/get?id=${id}` })

export const getAiPromptSimpleList = (sceneCode?: string) =>
  request.get({ url: `${BASE_URL}/simple-list`, params: { sceneCode } })

export const getAiPromptByScene = (sceneCode: string) =>
  request.get({ url: `${BASE_URL}/get-by-scene`, params: { sceneCode } })

export const createAiPrompt = (data: AiPromptVO) =>
  request.post({ url: `${BASE_URL}/create`, data })

export const updateAiPrompt = (data: AiPromptVO) =>
  request.put({ url: `${BASE_URL}/update`, data })

export const updateAiPromptStatus = (id: number, status: number) =>
  request.put({ url: `${BASE_URL}/update-status`, params: { id, status } })

export const deleteAiPrompt = (id: number) =>
  request.delete({ url: `${BASE_URL}/delete?id=${id}` })

export const deleteAiPromptList = (ids: number[]) =>
  request.delete({ url: `${BASE_URL}/delete-list`, params: { ids: ids.join(',') } })

export const exportAiPrompt = (params: AiPromptPageReqVO) =>
  request.download({ url: `${BASE_URL}/export-excel`, params })

/** 发布：生成版本快照并切换当前版本 */
export const publishAiPrompt = (data: AiPromptPublishReqVO) =>
  request.post({ url: `${BASE_URL}/publish`, data })

/** 复制：连同变量定义一起复制 */
export const copyAiPrompt = (data: AiPromptCopyReqVO) =>
  request.post({ url: `${BASE_URL}/copy`, data })

/** 校验正文 {{var}} 与变量定义是否一致 */
export const validateAiPrompt = (id: number) =>
  request.get({ url: `${BASE_URL}/validate?id=${id}` })

/** 渲染调试：传 promptId 读库，或传 content 做编辑态试渲染 */
export const renderAiPrompt = (data: AiPromptRenderReqVO) =>
  request.post({ url: `${BASE_URL}/render`, data })
