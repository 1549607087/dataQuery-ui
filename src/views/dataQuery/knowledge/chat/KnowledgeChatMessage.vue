<template>
  <div class="kmsg">
    <div class="kmsg-avatar">AI</div>
    <div class="kmsg-body">
      <!-- 摘要条：终态 / 召回方式 / 命中切片数 / 耗时 -->
      <div class="kmsg-meta">
        <el-tag v-if="message.status" :type="getChatStatusTagType(message.status)" size="small">
          {{ getOptionLabel(CHAT_STATUS_OPTIONS, message.status) }}
        </el-tag>
        <el-tag
          v-if="message.recallMode"
          :type="getRecallModeTagType(message.recallMode)"
          size="small"
          effect="plain"
        >
          {{ getOptionLabel(RECALL_MODE_OPTIONS, message.recallMode) }}
        </el-tag>
        <span class="kmsg-dim">命中 {{ message.retrievedCount ?? 0 }} 切片</span>
        <span v-if="message.latencyMs != null" class="kmsg-dim"> {{ message.latencyMs }} ms </span>
        <span v-if="message.traceId" class="kmsg-dim">trace {{ shortTrace }}</span>
      </div>

      <!-- 异常 / 降级提示：回答里虽已说明，这里仍然显式标出，避免被长文淹没 -->
      <el-alert
        v-for="(alert, idx) in alerts"
        :key="idx"
        :type="alert.type"
        :title="alert.title"
        :closable="false"
        show-icon
        class="mb-8px"
      />

      <div v-if="answerMarkdown" class="kmsg-answer">
        <MarkdownView :content="answerMarkdown" @click="handleAnswerClick" />
      </div>
      <el-empty v-else description="暂无回答内容" :image-size="48" />

      <!-- 引用溯源：折叠卡列表，点卡片看切片原文 -->
      <div v-if="references.length" class="kmsg-refs">
        <div class="kmsg-refs-head" @click="refsOpen = !refsOpen">
          <span class="kmsg-refs-title">
            引用溯源
            <span class="kmsg-refs-count">{{ references.length }} 条</span>
          </span>
          <el-button link size="small" @click.stop="refsOpen = !refsOpen">
            {{ refsOpen ? '收起' : '展开' }}
          </el-button>
        </div>

        <div v-show="refsOpen" ref="refListRef" class="kmsg-refs-list">
          <div
            v-for="ref in references"
            :key="ref.refNo"
            class="kmsg-ref"
            :class="{ 'is-flash': flashRefNo === ref.refNo }"
            :data-ref-no="ref.refNo"
            @click="emit('open-ref', ref)"
          >
            <span class="kmsg-ref-no">{{ ref.refNo }}</span>
            <div class="kmsg-ref-main">
              <div class="kmsg-ref-file">{{ ref.fileName || '未知文档' }}</div>
              <div class="kmsg-ref-loc">{{ locationText(ref) }}</div>
              <div class="kmsg-ref-excerpt">{{ ref.content }}</div>
              <div class="kmsg-ref-foot">查看原文切片 ›</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import MarkdownView from '@/components/MarkdownView/index.vue'
import {
  CHAT_STATUS_OPTIONS,
  RECALL_MODE_OPTIONS,
  getChatStatusTagType,
  getOptionLabel,
  getRecallModeTagType
} from '@/api/dataQuery/constants'
import type { KnowledgeReference } from '@/api/dataQuery/knowledgeChat'
import type { UnifiedChatMessageRespVO } from '@/api/dataQuery/chat'

defineOptions({ name: 'KnowledgeChatMessage' })

// 统一对话 / 老知识库问答页共用：两者的字段是子集关系，统一 VO 只是多了 mode 等可选字段
const props = defineProps<{ message: UnifiedChatMessageRespVO }>()
const emit = defineEmits<{ (e: 'open-ref', ref: KnowledgeReference): void }>()

const tip = useMessage()

const references = computed<KnowledgeReference[]>(() => props.message.references || [])
const refNoSet = computed(() => new Set(references.value.map((r) => r.refNo)))

const refsOpen = ref(true)
const refListRef = ref<HTMLElement>()
const flashRefNo = ref(0)
let flashTimer: ReturnType<typeof setTimeout> | undefined

const shortTrace = computed(() => (props.message.traceId || '').slice(0, 10))

/**
 * 把回答里的 `[n]` 转成 markdown 链接，交给 MarkdownView 渲染成可点击角标。
 * 只转本次 references 里真实存在的编号——越界编号服务端已删除，保持纯文本。
 */
const answerMarkdown = computed(() => {
  const raw = props.message.answer || ''
  if (!raw) return ''
  return raw.replace(/\[(\d{1,2})\]/g, (whole, num: string) => {
    const refNo = Number(num)
    return refNoSet.value.has(refNo) ? `[${refNo}](#kb-cite-${refNo})` : whole
  })
})

/** 异常 / 降级 / 引用被删的显式提示 */
const alerts = computed(() => {
  const list: { type: 'info' | 'warning' | 'error'; title: string }[] = []
  const status = props.message.status
  if (status === 'CLARIFY') {
    list.push({ type: 'info', title: '未召回相关内容，该回答为澄清话术，未基于知识库切片生成' })
  }
  if (status === 'REJECT') {
    list.push({
      type: 'error',
      title: '提问被拒绝：命中提示词注入检测，服务端未执行检索与模型调用'
    })
  }
  if (status === 'DEGRADED') {
    list.push({
      type: 'warning',
      title: `能力降级：${props.message.errorMsg || 'RAG 场景模型未就绪，请检查场景绑定'}`
    })
  }
  if (status === 'FAILED') {
    list.push({ type: 'error', title: `本轮未完成：${props.message.errorMsg || '链路异常'}` })
  }
  if ((props.message.citationDroppedCount ?? 0) > 0) {
    list.push({
      type: 'warning',
      title: `有 ${props.message.citationDroppedCount} 处引用编号超出本次检索范围，已由服务端删除`
    })
  }
  if (props.message.recallDegraded && props.message.recallMode === 'KEYWORD_DEGRADED') {
    list.push({ type: 'warning', title: '召回降级：向量检索不可用，本次结果可能不够完整' })
  }
  return list
})

const locationText = (ref: KnowledgeReference) => {
  const page = ref.pageNo != null ? `第 ${ref.pageNo} 页 · ` : ''
  const heading = ref.headingPath || `切片 #${ref.chunkIndex}`
  return `${page}${heading}`
}

/** 点击回答里的角标：展开引用区并定位到对应引用卡 */
const handleAnswerClick = async (e: MouseEvent) => {
  const anchor = (e.target as HTMLElement).closest?.('a[href^="#kb-cite-"]')
  if (!anchor) return
  e.preventDefault()
  const href = anchor.getAttribute('href') || ''
  const refNo = Number(href.replace('#kb-cite-', ''))
  if (!refNo) return
  refsOpen.value = true
  await nextTick()
  const el = refListRef.value?.querySelector<HTMLElement>(`[data-ref-no="${refNo}"]`)
  if (!el) {
    tip.warning(`引用 [${refNo}] 不在本次引用列表中`)
    return
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  flashRefNo.value = refNo
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashRefNo.value = 0), 1600)
}

onBeforeUnmount(() => clearTimeout(flashTimer))
</script>

<style scoped>
.kmsg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.kmsg-avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 12px;
  font-weight: 700;
  color: var(--el-color-white);
  background: linear-gradient(135deg, var(--el-color-primary), #6f7cf7);
  border-radius: 6px;
}

.kmsg-body {
  flex: 1;
  min-width: 0;
}

.kmsg-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}

.kmsg-dim {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.kmsg-answer {
  padding: 12px 14px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

/* 角标：把 markdown 链接 `[n](#kb-cite-n)` 渲染成小方块数字 */
.kmsg-answer :deep(a[href^='#kb-cite-']) {
  display: inline-block;
  min-width: 16px;
  padding: 0 3px;
  margin: 0 2px;
  font-size: 10px;
  font-weight: 600;
  line-height: 15px;
  color: var(--el-color-primary);
  text-align: center;
  text-decoration: none;
  vertical-align: super;
  cursor: pointer;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 3px;
}

.kmsg-answer :deep(a[href^='#kb-cite-']:hover) {
  color: var(--el-color-white);
  background: var(--el-color-primary);
}

.kmsg-refs {
  margin-top: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.kmsg-refs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  cursor: pointer;
  background: var(--el-fill-color-lighter);
  border-radius: 5px 5px 0 0;
}

.kmsg-refs-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.kmsg-refs-count {
  margin-left: 4px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.kmsg-refs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
}

.kmsg-ref {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 5px;
  transition: background-color 0.5s;
}

.kmsg-ref:hover {
  background: var(--el-fill-color-light);
}

.kmsg-ref.is-flash {
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-5);
}

.kmsg-ref-no {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 3px;
}

.kmsg-ref-main {
  flex: 1;
  min-width: 0;
}

.kmsg-ref-file {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kmsg-ref-loc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.kmsg-ref-excerpt {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.kmsg-ref-foot {
  margin-top: 4px;
  font-size: 11px;
  color: var(--el-color-primary);
}
</style>
