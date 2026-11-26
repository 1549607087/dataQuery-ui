import request from '@/config/axios'

/** 管理后台 - S4 提示词运行时渲染 Request VO */
export interface PromptRenderReqVO {
  /** 场景编码，不传默认 SQL_GEN */
  sceneCode?: string
  datasourceId: number
  question: string
  /** 不传且 recallSchema=true 时，服务端自动做一次 S3 召回 */
  schema?: string
  /** 扩展变量；后端为 Map<String, String>，内置变量优先级更高 */
  variables?: Record<string, string>
  /** 缺少 schema 时自动执行 S3 召回（需同时提供 datasourceId 与 question） */
  recallSchema?: boolean
  /** 自动召回的 Top-K 表数量 */
  topK?: number
}

/** 管理后台 - S4 提示词运行时渲染 Response VO */
export interface PromptRenderRespVO {
  sceneCode: string
  promptId: number
  promptVersionId: number
  version: number
  templateTenantId: number
  fallbackToPlatform: boolean
  content: string
  contentHash: string
  snapshotHash: string
  tokenEstimate: number
  /** 变量审计：模板声明 / 实际注入 / 未登记 / 缺失必填 / 未使用 */
  declaredVariables: string[]
  providedVariables: string[]
  undeclaredVariables: string[]
  missingVariables: string[]
  unusedVariables: string[]
  recallMode: string
  recallDegraded: boolean
  recallDegradeReason: string
  recallTableCount: number
}

const BASE_URL = '/data-query/prompt-runtime'

/** 按场景锁定版本快照并渲染提示词（可选自动执行 S3 召回注入 schema） */
export const renderPrompt = (data: PromptRenderReqVO) =>
  request.post({ url: `${BASE_URL}/render`, data })
