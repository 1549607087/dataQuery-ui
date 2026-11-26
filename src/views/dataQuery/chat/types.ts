import type { ChatId, UnifiedChatMessageRespVO } from '@/api/dataQuery/chat'

/** 懒加载的「同一轮问题全部版本」面板 */
export interface QuestionVersionPanel {
  list: UnifiedChatMessageRespVO[]
  current: number
  total: number
  loading: boolean
}

/** 一条渲染轮次：问题（可能是历史版本）+ 对应回答（可能是该版本的回答） */
export interface RenderedTurn {
  key: string
  /** 当前展示的 USER 消息（翻页后可能是历史版本） */
  user: UnifiedChatMessageRespVO
  /** 主链 USER：操作按钮与右侧轨道锚点都用它 */
  mainUser: UnifiedChatMessageRespVO
  /** 当前展示的 ASSISTANT；历史问题没有对应回答时为空 */
  assistant?: UnifiedChatMessageRespVO
  isHistory: boolean
  answerMissing: boolean
  pager?: { userMsgId: ChatId; current: number; total: number; loading: boolean }
  questionVersion: number
}
