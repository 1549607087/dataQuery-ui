import type { ChatAnswerView } from '@/api/dataQuery/aichat'
import type { UnifiedChatMessageRespVO } from '@/api/dataQuery/chat'

/**
 * 统一消息 → 问数结果卡的输入。
 * 后端统一 VO 把回答文本放在 answer（老问数 VO 叫 summary），这里做一次字段归一，
 * 让 ChatResultCard 不必感知实时响应 / 历史消息 / 统一 VO 三套结构。
 */
export const toUnifiedAnswerView = (msg?: UnifiedChatMessageRespVO): ChatAnswerView => {
  if (!msg) return {}
  return {
    status: msg.status,
    messageId: msg.id != null ? String(msg.id) : undefined,
    traceId: msg.traceId,
    question: msg.question,
    sql: msg.executedSql || msg.generatedSql,
    generatedSql: msg.generatedSql,
    executedSql: msg.executedSql,
    result: msg.result,
    chartSpec: msg.chartSpec,
    explain: msg.explain,
    summary: msg.answer,
    recallMode: msg.result?.recallMode || msg.recallMode,
    recallDegraded: msg.recallDegraded,
    errorCode: msg.errorCode,
    errorMsg: msg.errorMsg,
    latencyMs: msg.latencyMs
  }
}
