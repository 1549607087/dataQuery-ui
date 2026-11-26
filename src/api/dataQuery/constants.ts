/**
 * 智能问数平台（dataQuery）本地枚举
 * 取值全部来自后端 sql/postgresql/nl2sql-model.sql、nl2sql-prompt.sql 的字段注释
 * 后端未初始化 system_dict_data，因此不使用 DICT_TYPE / DictTag
 */

export interface OptionItem {
  label: string
  value: number | string
}

/** 通用状态：0 启用、1 停用 */
export const COMMON_STATUS: OptionItem[] = [
  { label: '启用', value: 0 },
  { label: '停用', value: 1 }
]

/** 模型配置 / 提示词状态：0 启用、1 停用、2 灰度 */
export const GRAY_STATUS: OptionItem[] = [
  { label: '启用', value: 0 },
  { label: '停用', value: 1 },
  { label: '灰度', value: 2 }
]

/** 供应商协议 */
export const PROTOCOL_OPTIONS: OptionItem[] = [
  { label: 'OPENAI', value: 'OPENAI' },
  { label: 'OLLAMA', value: 'OLLAMA' },
  { label: 'AZURE', value: 'AZURE' },
  { label: 'CUSTOM', value: 'CUSTOM' }
]

/** 模型类型：1 Chat、2 Embedding、3 Rerank、4 SQL 专用 */
export const MODEL_TYPE_OPTIONS: OptionItem[] = [
  { label: 'Chat', value: 1 },
  { label: 'Embedding', value: 2 },
  { label: 'Rerank', value: 3 },
  { label: 'SQL 专用', value: 4 }
]

/** OpenAI 兼容协议（Chat / Embedding / SQL 专用固定使用） */
export const OPENAI_PROTOCOL_OPTIONS: OptionItem[] = [{ label: 'OPENAI', value: 'OPENAI' }]

/** 重排协议（Rerank 模型可选，决定请求路径与请求体格式） */
export const RERANK_PROTOCOL_OPTIONS: OptionItem[] = [
  { label: 'COHERE', value: 'COHERE' },
  { label: 'DASHSCOPE', value: 'DASHSCOPE' }
]

/** 模型类型对应的默认协议：Chat/Embedding/SQL 固定 OPENAI，Rerank 默认 COHERE */
export const MODEL_TYPE_DEFAULT_PROTOCOL: Record<number, string> = {
  1: 'OPENAI',
  2: 'OPENAI',
  3: 'COHERE',
  4: 'OPENAI'
}

/** 健康状态：0 未检测、1 健康、2 异常 */
export const HEALTH_STATUS_OPTIONS: OptionItem[] = [
  { label: '未检测', value: 0 },
  { label: '健康', value: 1 },
  { label: '异常', value: 2 }
]

/** 路由策略：1 固定、2 优先级、3 权重、4 成本优先 */
export const ROUTE_STRATEGY_OPTIONS: OptionItem[] = [
  { label: '固定', value: 1 },
  { label: '优先级', value: 2 },
  { label: '权重', value: 3 },
  { label: '成本优先', value: 4 }
]

/** 提示词类型：1 System、2 User、3 完整模板 */
export const PROMPT_TYPE_OPTIONS: OptionItem[] = [
  { label: 'System', value: 1 },
  { label: 'User', value: 2 },
  { label: '完整模板', value: 3 }
]

/** 提示词来源：1 平台内置、2 租户自定义、3 复制自平台模板 */
export const PROMPT_SOURCE_OPTIONS: OptionItem[] = [
  { label: '平台内置', value: 1 },
  { label: '租户自定义', value: 2 },
  { label: '复制模板', value: 3 }
]

/** 版本状态：0 草稿、1 已发布、2 已回滚、3 归档 */
export const VERSION_STATUS_OPTIONS: OptionItem[] = [
  { label: '草稿', value: 0 },
  { label: '已发布', value: 1 },
  { label: '已回滚', value: 2 },
  { label: '归档', value: 3 }
]

/** 变量值类型 */
export const VAR_TYPE_OPTIONS: OptionItem[] = [
  { label: '文本', value: 1 },
  { label: '数字', value: 2 },
  { label: '日期', value: 3 },
  { label: '枚举', value: 4 },
  { label: 'JSON', value: 5 },
  { label: 'SQL 片段', value: 6 },
  { label: '表结构', value: 7 },
  { label: '结果集', value: 8 }
]

/** 变量注入来源 */
export const SOURCE_TYPE_OPTIONS: OptionItem[] = [
  { label: '系统上下文', value: 1 },
  { label: '用户输入', value: 2 },
  { label: '元数据召回', value: 3 },
  { label: '上一步结果', value: 4 },
  { label: '字典/配置', value: 5 }
]

/** 调用日志状态：0 成功、1 失败、2 超时、3 降级 */
export const CALL_LOG_STATUS_OPTIONS: OptionItem[] = [
  { label: '成功', value: 0 },
  { label: '失败', value: 1 },
  { label: '超时', value: 2 },
  { label: '降级', value: 3 }
]

/** 是/否开关 */
export const YES_NO_OPTIONS: OptionItem[] = [
  { label: '是', value: 1 },
  { label: '否', value: 0 }
]

/**
 * 场景编码：模型场景绑定表列了 14 个，提示词场景字典 13 个
 * 包含新增的 TABLE_NARRATE（表格叙述化，摄取阶段）与 RERANK（重排序）
 * 这里取并集，供下拉框使用；实际可选值以后端表数据为准
 */
export const SCENE_OPTIONS: OptionItem[] = [
  { label: '意图识别', value: 'INTENT' },
  { label: '问题改写', value: 'REWRITE' },
  { label: 'Schema 召回', value: 'SCHEMA_RECALL' },
  { label: 'SQL 生成', value: 'SQL_GEN' },
  { label: 'SQL 修正', value: 'SQL_FIX' },
  { label: '口径解释', value: 'EXPLAIN' },
  { label: '结果解读', value: 'RESULT_SUMMARY' },
  { label: '智能报告', value: 'REPORT' },
  { label: '图表推荐', value: 'CHART' },
  { label: '问题推荐', value: 'RECOMMEND' },
  { label: '知识问答', value: 'RAG' },
  { label: '数据预测', value: 'PREDICT' },
  { label: '向量化', value: 'EMBEDDING' },
  { label: '重排序', value: 'RERANK' },
  { label: '表格叙述化', value: 'TABLE_NARRATE' }
]

/** 熔断三态：运行时以 Redis 为准，DB 只做跃迁快照 */
export const CIRCUIT_STATE_OPTIONS: OptionItem[] = [
  { label: '闭合 CLOSED', value: 'CLOSED' },
  { label: '打开 OPEN', value: 'OPEN' },
  { label: '半开 HALF_OPEN', value: 'HALF_OPEN' }
]

/** 失败细分类：决定是否重试、是否计入熔断 */
export const ERROR_CATEGORY_OPTIONS: OptionItem[] = [
  { label: '限流 RATE_LIMIT', value: 'RATE_LIMIT' },
  { label: '服务端错误 SERVER_ERROR', value: 'SERVER_ERROR' },
  { label: '超时 TIMEOUT', value: 'TIMEOUT' },
  { label: '连接失败 CONNECT', value: 'CONNECT' },
  { label: '鉴权 AUTH', value: 'AUTH' },
  { label: '参数错误 BAD_REQUEST', value: 'BAD_REQUEST' },
  { label: '内容过滤 CONTENT_FILTER', value: 'CONTENT_FILTER' },
  { label: '输出非法 INVALID_OUTPUT', value: 'INVALID_OUTPUT' },
  { label: '熔断打开 CIRCUIT_OPEN', value: 'CIRCUIT_OPEN' }
]

/** 灰度变量：一次实验只允许一个变量，避免归因污染 */
export const GRAY_OBJECT_OPTIONS: OptionItem[] = [
  { label: '模型', value: 'MODEL' },
  { label: '提示词', value: 'PROMPT' }
]

/** 灰度稳定分桶维度：必须稳定，否则同一用户两次命中不同模型 */
export const BUCKET_KEY_OPTIONS: OptionItem[] = [
  { label: '租户 TENANT', value: 'TENANT' },
  { label: '用户 USER', value: 'USER' },
  { label: '会话 SESSION', value: 'SESSION' }
]

/** 灰度实验状态：0 草稿、1 进行中、2 已结束、3 已全量、4 已回滚 */
export const EXPERIMENT_STATUS_OPTIONS: OptionItem[] = [
  { label: '草稿', value: 0 },
  { label: '进行中', value: 1 },
  { label: '已结束', value: 2 },
  { label: '已全量', value: 3 },
  { label: '已回滚', value: 4 }
]

/** 灰度分组：A 对照组、B 灰度组 */
export const GRAY_GROUP_OPTIONS: OptionItem[] = [
  { label: 'A 对照组', value: 'A' },
  { label: 'B 灰度组', value: 'B' }
]

/** 根据枚举值取展示文案 */
export const getOptionLabel = (options: OptionItem[], value: unknown): string => {
  const hit = options.find((item) => item.value === value)
  if (hit) return hit.label
  return value === undefined || value === null || value === '' ? '-' : String(value)
}

/** 状态对应的 el-tag 类型：返回字面量联合，满足 Element Plus 的 type 约束 */
export const getStatusTagType = (status: number): 'success' | 'warning' | 'info' => {
  if (status === 0) return 'success'
  if (status === 2) return 'warning'
  return 'info'
}

// ==================== 数据源 / 元数据 / 问数运行时 ====================
// 取值来自 nl2sql-datasource.sql、nl2sql-query-runtime.sql、nl2sql-vector.sql 的字段注释

/** 数据库类型 */
export const DS_TYPE_OPTIONS: OptionItem[] = [
  { label: 'MySQL', value: 1 },
  { label: 'PostgreSQL', value: 2 },
  { label: 'Oracle', value: 3 },
  { label: 'SQLServer', value: 4 },
  { label: '达梦', value: 5 },
  { label: '人大金仓', value: 6 },
  { label: 'openGauss', value: 7 },
  { label: 'ClickHouse', value: 8 },
  { label: 'Hive', value: 9 }
]

/** SQL 方言 */
export const DIALECT_OPTIONS: OptionItem[] = [
  { label: 'postgresql', value: 'postgresql' },
  { label: 'mysql', value: 'mysql' },
  { label: 'oracle', value: 'oracle' },
  { label: 'sqlserver', value: 'sqlserver' },
  { label: 'dm', value: 'dm' },
  { label: 'clickhouse', value: 'clickhouse' }
]

/** 数据源状态：0 启用、1 停用、2 维护中 */
export const DS_STATUS_OPTIONS: OptionItem[] = [
  { label: '启用', value: 0 },
  { label: '停用', value: 1 },
  { label: '维护中', value: 2 }
]

/** 数据源级同步状态：0 未同步、1 同步中、2 成功、3 失败 */
export const DS_SYNC_STATUS_OPTIONS: OptionItem[] = [
  { label: '未同步', value: 0 },
  { label: '同步中', value: 1 },
  { label: '成功', value: 2 },
  { label: '失败', value: 3 }
]

/** 表/列级同步状态：1 新发现、2 已同步、3 结构已变更、4 源端已删除 */
export const META_SYNC_STATUS_OPTIONS: OptionItem[] = [
  { label: '新发现', value: 1 },
  { label: '已同步', value: 2 },
  { label: '结构已变更', value: 3 },
  { label: '源端已删除', value: 4 }
]

/** 表对象类型 */
export const TABLE_TYPE_OPTIONS: OptionItem[] = [
  { label: '表', value: 1 },
  { label: '视图', value: 2 },
  { label: '物化视图', value: 3 },
  { label: '外部表', value: 4 }
]

/** 表角色 */
export const TABLE_ROLE_OPTIONS: OptionItem[] = [
  { label: '事实表', value: 1 },
  { label: '维表', value: 2 },
  { label: '桥表', value: 3 },
  { label: '字典/配置表', value: 4 },
  { label: '其它', value: 5 }
]

/** 字段语义角色 */
export const SEMANTIC_ROLE_OPTIONS: OptionItem[] = [
  { label: '维度', value: 1 },
  { label: '指标', value: 2 },
  { label: '时间', value: 3 },
  { label: '主键', value: 4 },
  { label: '外键', value: 5 },
  { label: '标识/无关', value: 6 },
  { label: '敏感', value: 7 }
]

/** 敏感类型 */
export const SENSITIVE_TYPE_OPTIONS: OptionItem[] = [
  { label: '无', value: 0 },
  { label: '手机号', value: 1 },
  { label: '身份证', value: 2 },
  { label: '姓名', value: 3 },
  { label: '邮箱', value: 4 },
  { label: '银行卡', value: 5 },
  { label: '金额', value: 6 },
  { label: '自定义', value: 9 }
]

/** 表敏感级别 */
export const SENSITIVE_LEVEL_OPTIONS: OptionItem[] = [
  { label: '无', value: 0 },
  { label: '内部', value: 1 },
  { label: '敏感', value: 2 },
  { label: '高敏', value: 3 }
]

/** Join 连接类型 */
export const JOIN_TYPE_OPTIONS: OptionItem[] = [
  { label: 'INNER', value: 1 },
  { label: 'LEFT', value: 2 },
  { label: 'RIGHT', value: 3 },
  { label: 'FULL', value: 4 },
  { label: 'CROSS', value: 5 }
]

/** Join 基数 */
export const CARDINALITY_OPTIONS: OptionItem[] = [
  { label: '一对一', value: 1 },
  { label: '一对多', value: 2 },
  { label: '多对一', value: 3 },
  { label: '多对多', value: 4 }
]

/** 同步任务类型 */
export const SYNC_TYPE_OPTIONS: OptionItem[] = [
  { label: '连通性检测', value: 1 },
  { label: '全量元数据同步', value: 2 },
  { label: '增量元数据同步', value: 3 },
  { label: '结构变更检测', value: 4 },
  { label: '数据预览采样', value: 5 },
  { label: '枚举值采集', value: 6 }
]

/** 同步触发方式 */
export const TRIGGER_TYPE_OPTIONS: OptionItem[] = [
  { label: '手动', value: 1 },
  { label: '定时', value: 2 },
  { label: '创建后自动', value: 3 },
  { label: '结构变更告警', value: 4 }
]

/** 同步日志状态：0 进行中、1 成功、2 部分成功、3 失败 */
export const SYNC_LOG_STATUS_OPTIONS: OptionItem[] = [
  { label: '进行中', value: 0 },
  { label: '成功', value: 1 },
  { label: '部分成功', value: 2 },
  { label: '失败', value: 3 }
]

/** 问数会话状态：1 进行中、2 已结束、3 归档 */
export const QUERY_SESSION_STATUS_OPTIONS: OptionItem[] = [
  { label: '进行中', value: 1 },
  { label: '已结束', value: 2 },
  { label: '归档', value: 3 }
]

/** 查询审计结果状态：1 成功、2 澄清、3 拒绝、4 降级、5 失败 */
export const AUDIT_STATUS_OPTIONS: OptionItem[] = [
  { label: '成功', value: 1 },
  { label: '澄清', value: 2 },
  { label: '拒绝', value: 3 },
  { label: '降级', value: 4 },
  { label: '失败', value: 5 }
]

/** SQL 校验状态（字符串，由校验器写入） */
export const SQL_STATUS_OPTIONS: OptionItem[] = [
  { label: 'PASS', value: 'PASS' },
  { label: 'REJECT', value: 'REJECT' },
  { label: 'REWRITE', value: 'REWRITE' }
]

/** 反馈审核状态 */
export const REVIEW_STATUS_OPTIONS: OptionItem[] = [
  { label: '待审', value: 0 },
  { label: '已采纳', value: 1 },
  { label: '已驳回', value: 2 }
]

/** 反馈评分 */
export const RATING_OPTIONS: OptionItem[] = [
  { label: '1 星', value: 1 },
  { label: '2 星', value: 2 },
  { label: '3 星', value: 3 },
  { label: '4 星', value: 4 },
  { label: '5 星', value: 5 }
]

/** 向量对象类型 */
export const VECTOR_OBJECT_TYPE_OPTIONS: OptionItem[] = [
  { label: '表级', value: 1 },
  { label: '列级', value: 2 },
  { label: '术语口径级', value: 3 }
]

/** 召回方式 */
export const RECALL_MODE_OPTIONS: OptionItem[] = [
  { label: '混合召回', value: 'HYBRID' },
  { label: '仅向量', value: 'VECTOR' },
  { label: '关键词兜底', value: 'KEYWORD_DEGRADED' },
  { label: '召回为空', value: 'EMPTY' }
]

/** 表结构一键导入终态阶段（PREVIEW / DATASOURCE / CONNECT / SYNC / DONE） */
export const IMPORT_STAGE_OPTIONS: OptionItem[] = [
  { label: '预览', value: 'PREVIEW' },
  { label: '创建数据源', value: 'DATASOURCE' },
  { label: '连通性检测', value: 'CONNECT' },
  { label: '元数据同步', value: 'SYNC' },
  { label: '完成', value: 'DONE' }
]

/** 表结构一键导入分步执行状态（SUCCESS / SKIPPED / WARN / FAILED） */
export const IMPORT_STEP_STATUS_OPTIONS: OptionItem[] = [
  { label: '成功', value: 'SUCCESS' },
  { label: '跳过', value: 'SKIPPED' },
  { label: '告警', value: 'WARN' },
  { label: '失败', value: 'FAILED' }
]

/** 一键导入步骤状态对应的 el-tag 类型 */
export const getImportStepStatusTagType = (
  status: string
): 'success' | 'danger' | 'warning' | 'info' => {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'WARN') return 'warning'
  return 'info'
}

/** 熔断状态对应的 el-tag 类型 */
export const getCircuitStateTagType = (
  state: string
): 'success' | 'danger' | 'warning' | 'info' => {
  if (state === 'CLOSED') return 'success'
  if (state === 'OPEN') return 'danger'
  if (state === 'HALF_OPEN') return 'warning'
  return 'info'
}

/** 灰度实验状态对应的 el-tag 类型 */
export const getExperimentStatusTagType = (
  status: number
): 'success' | 'danger' | 'warning' | 'info' => {
  if (status === 1) return 'success'
  if (status === 3) return 'success'
  if (status === 4) return 'danger'
  if (status === 2) return 'warning'
  return 'info'
}

/** 智能问数终态：DONE 成功 / CLARIFY 需澄清 / REJECT 拒绝 / DEGRADED 降级 / FAILED 失败 / STOPPED 用户主动停止 */
export const CHAT_STATUS_OPTIONS: OptionItem[] = [
  { label: '成功', value: 'DONE' },
  { label: '需澄清', value: 'CLARIFY' },
  { label: '已拒绝', value: 'REJECT' },
  { label: '已降级', value: 'DEGRADED' },
  { label: '失败', value: 'FAILED' },
  { label: '已停止', value: 'STOPPED' }
]

/** 智能问数终态对应的 el-tag 类型 */
export const getChatStatusTagType = (
  status?: string
): 'success' | 'danger' | 'warning' | 'info' => {
  if (status === 'DONE') return 'success'
  if (status === 'REJECT' || status === 'FAILED') return 'danger'
  if (status === 'CLARIFY' || status === 'DEGRADED') return 'warning'
  // STOPPED 是用户主动停止，不是故障，用中性色
  if (status === 'STOPPED') return 'info'
  return 'info'
}

/** 智能问数 SSE 阶段（事件顺序：intent → rewrite → recalled → generated → validated → executing → result → summary → done|error|stopped） */
export const CHAT_STAGE_OPTIONS: OptionItem[] = [
  { label: '建立上下文', value: 'intent' },
  { label: '问题规范化', value: 'rewrite' },
  { label: 'Schema 召回', value: 'recalled' },
  { label: 'SQL 生成', value: 'generated' },
  { label: '静态校验', value: 'validated' },
  { label: '只读执行', value: 'executing' },
  { label: '结果获取', value: 'result' },
  { label: '结果加工', value: 'summary' },
  { label: '完成', value: 'done' },
  { label: '失败', value: 'error' },
  { label: '已停止', value: 'stopped' }
]

/** SSE 阶段状态（RUNNING / DONE / SKIPPED / ERROR）对应的 el-tag 类型 */
export const getStageStateTagType = (state?: string): 'success' | 'danger' | 'warning' | 'info' => {
  if (state === 'DONE') return 'success'
  if (state === 'ERROR') return 'danger'
  if (state === 'RUNNING') return 'warning'
  return 'info'
}

/** 问数结果反馈类型（后端为自由文本，这里给常用值，页面允许自定义输入） */
export const CHAT_FEEDBACK_TYPE_OPTIONS: OptionItem[] = [
  { label: '结果不准', value: '结果不准' },
  { label: 'SQL 错误', value: 'SQL 错误' },
  { label: '口径疑问', value: '口径疑问' },
  { label: '其它', value: '其它' }
]

/** 图表推荐类型（后端 ChartSpec.type） */
export const CHART_TYPE_OPTIONS: OptionItem[] = [
  { label: '折线图', value: 'line' },
  { label: '柱状图', value: 'bar' },
  { label: '饼图', value: 'pie' },
  { label: '指标卡', value: 'metric' },
  { label: '仅表格', value: 'table' },
  { label: '空结果', value: 'none' }
]

/**
 * 知识库状态：0 正常、1 停用
 * 注意：与 yudao CommonStatusEnum（1 启用 / 0 停用）语义相反，禁止混用
 */
export const KNOWLEDGE_BASE_STATUS_OPTIONS: OptionItem[] = [
  { label: '正常', value: 0 },
  { label: '停用', value: 1 }
]

/** 知识库状态对应的 el-tag 类型 */
export const getKnowledgeBaseStatusTagType = (status: number): 'success' | 'info' =>
  status === 0 ? 'success' : 'info'

/**
 * 知识库文档解析状态：0待解析 1解析中 2已完成 3失败 4已下线
 * 与后端 AiKnowledgeDocument.parseStatus 一致；终态为 2/3/4。
 */
export const DOCUMENT_PARSE_STATUS_OPTIONS: OptionItem[] = [
  { label: '待解析', value: 0 },
  { label: '解析中', value: 1 },
  { label: '已完成', value: 2 },
  { label: '失败', value: 3 },
  { label: '已下线', value: 4 }
]

/** 文档解析状态对应的 el-tag 类型 */
export const getDocumentParseStatusTagType = (
  status: number
): 'info' | 'primary' | 'success' | 'danger' => {
  if (status === 0 || status === 4) return 'info'
  if (status === 1) return 'primary'
  if (status === 2) return 'success'
  return 'danger'
}

/** 解析终态：轮询到这些状态即停止 */
export const DOCUMENT_PARSE_FINAL_STATUS = [2, 3, 4]

/** 允许的上传扩展名（与后端 KnowledgeProperties.allowed-file-types 一致） */
export const DOCUMENT_ALLOWED_FILE_TYPES = ['TXT', 'MD', 'PDF', 'DOC', 'DOCX']
/** 上传大小上限（MB，与后端 max-file-size-mb 一致） */
export const DOCUMENT_MAX_FILE_SIZE_MB = 20

/**
 * 切片向量状态：0 待构建、1 已构建、2 需重建、4 已下线
 * 与后端 AiKnowledgeChunk.syncStatus 一致（注意没有 3，不要用通用下标推断）
 */
export const CHUNK_SYNC_STATUS_OPTIONS: OptionItem[] = [
  { label: '待构建', value: 0 },
  { label: '已构建', value: 1 },
  { label: '需重建', value: 2 },
  { label: '已下线', value: 4 }
]

/** 切片向量状态对应的 el-tag 类型 */
export const getChunkSyncStatusTagType = (
  syncStatus?: number
): 'success' | 'danger' | 'warning' | 'info' => {
  if (syncStatus === 1) return 'success'
  if (syncStatus === 2) return 'warning'
  if (syncStatus === 4) return 'danger'
  return 'info'
}

/**
 * 召回方式对应的 el-tag 类型（知识库问答）
 * EMPTY 表示未召回任何切片，KEYWORD_DEGRADED 表示向量不可用降级为关键词召回
 */
export const getRecallModeTagType = (
  recallMode?: string
): 'success' | 'danger' | 'warning' | 'info' => {
  if (recallMode === 'HYBRID' || recallMode === 'VECTOR') return 'success'
  if (recallMode === 'KEYWORD_DEGRADED') return 'warning'
  return 'info'
}
