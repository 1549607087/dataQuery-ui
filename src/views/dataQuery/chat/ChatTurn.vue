<template>
  <div class="unified-turn">
    <!-- 问题：同一轮可能有多个版本，翻页器与 DeepSeek 一致放在气泡下方 -->
    <div class="msg-user question-anchor" :data-question-id="String(turn.mainUser.id ?? '')">
      <div class="msg-user-bubble">
        <div class="whitespace-pre-wrap text-14px leading-22px">{{ turn.user.question }}</div>
        <div class="msg-ops mt-4px flex items-center justify-end gap-4px">
          <el-tag v-if="turn.isHistory" type="info" size="small" class="mr-2px"> 历史版本 </el-tag>
          <el-tooltip content="复制问题" placement="top">
            <el-button link size="small" @click="emit('copy', turn.user.question)">
              <Icon icon="ep:document-copy" />
            </el-button>
          </el-tooltip>
          <el-tooltip v-if="writable" content="修改问题后从该轮重跑，旧版本会保留" placement="top">
            <el-button link size="small" @click="emit('edit', turn.mainUser)">
              <Icon icon="ep:edit-pen" />
            </el-button>
          </el-tooltip>
          <div v-if="turn.pager" class="version-pager">
            <el-button
              link
              size="small"
              class="version-pager-arrow"
              :disabled="turn.pager.current <= 1 || turn.pager.loading"
              title="上一版问题"
              @click="emit('pager-step', turn.mainUser, -1)"
            >
              <Icon icon="ep:arrow-left" />
            </el-button>
            <span class="version-pager-text">
              {{ turn.pager.current }}/{{ turn.pager.total }}
            </span>
            <el-button
              link
              size="small"
              class="version-pager-arrow"
              :disabled="turn.pager.current >= turn.pager.total || turn.pager.loading"
              title="下一版问题"
              @click="emit('pager-step', turn.mainUser, 1)"
            >
              <Icon icon="ep:arrow-right" />
            </el-button>
            <el-button
              v-if="turn.pager.current < turn.pager.total"
              link
              size="small"
              class="version-pager-latest"
              title="回到最新版（主链）"
              @click="emit('jump-latest', turn.mainUser)"
            >
              回到最新
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 回答：问数走结果卡，知识库走带引用角标的 Markdown 卡 -->
    <div class="msg-assistant">
      <el-alert
        v-if="turn.answerMissing"
        type="info"
        :closable="false"
        show-icon
        class="mb-8px"
        title="该历史问题版本暂无对应回答"
        description="已隐藏主链回答以避免问题与回答版本错配；切回最新版问题可查看主链回答。"
      />
      <template v-else-if="turn.assistant">
        <ChatResultCard
          v-if="mode === 'QUERY'"
          :response="answerView"
          :message-id="turn.assistant.id"
          :rating="turn.assistant.rating"
          :version="turn.assistant.version"
          :active="turn.assistant.active"
          :readonly="turn.isHistory"
          @regenerate="emit('regenerate', $event)"
          @rate="(id, rating) => emit('rate', id, rating)"
          @versions="emit('versions', $event)"
        />
        <template v-else>
          <KnowledgeChatMessage :message="turn.assistant" @open-ref="emit('open-ref', $event)" />
          <div v-if="writable" class="knowledge-ops">
            <el-button
              link
              size="small"
              :disabled="turn.assistant.active === false"
              @click="emit('regenerate', turn.assistant.id)"
            >
              <Icon icon="ep:refresh-right" class="mr-2px" />重新生成
            </el-button>
            <el-button
              size="small"
              :class="{ 'is-liked': turn.assistant.rating === 1 }"
              :title="turn.assistant.rating === 1 ? '点击取消点赞' : '点赞这条回答'"
              @click="emit('rate', turn.assistant.id, turn.assistant.rating === 1 ? 0 : 1)"
            >
              <Icon
                :icon="turn.assistant.rating === 1 ? 'fa-solid:thumbs-up' : 'fa:thumbs-o-up'"
                class="mr-2px"
              />赞
            </el-button>
            <el-button
              size="small"
              :class="{ 'is-disliked': turn.assistant.rating === -1 }"
              :title="turn.assistant.rating === -1 ? '点击取消点踩' : '点踩这条回答'"
              @click="emit('rate', turn.assistant.id, turn.assistant.rating === -1 ? 0 : -1)"
            >
              <Icon
                :icon="turn.assistant.rating === -1 ? 'fa-solid:thumbs-down' : 'fa:thumbs-o-down'"
                class="mr-2px"
              />踩
            </el-button>
            <el-button link size="small" @click="emit('versions', turn.assistant.id)">
              <Icon icon="ep:files" class="mr-2px" />历史版本
            </el-button>
            <el-button
              link
              size="small"
              @click="emit('retrieve-preview', turn.user.question || turn.assistant.question || '')"
            >
              <Icon icon="ep:search" class="mr-2px" />检索调试
            </el-button>
          </div>
        </template>
      </template>
      <el-empty v-else description="本轮暂无回答" :image-size="48" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ChatResultCard from '@/views/dataQuery/aichat/ChatResultCard.vue'
import KnowledgeChatMessage from '@/views/dataQuery/knowledge/chat/KnowledgeChatMessage.vue'
import type { ChatId, ChatMode, UnifiedChatMessageRespVO } from '@/api/dataQuery/chat'
import type { KnowledgeReference } from '@/api/dataQuery/knowledgeChat'
import type { RenderedTurn } from './types'
import { toUnifiedAnswerView } from './transform'

defineOptions({ name: 'DataQueryUnifiedChatTurn' })

const props = defineProps<{
  turn: RenderedTurn
  mode: ChatMode
}>()

const emit = defineEmits<{
  (e: 'copy', text?: string): void
  (e: 'edit', user: UnifiedChatMessageRespVO): void
  (e: 'pager-step', user: UnifiedChatMessageRespVO, delta: number): void
  (e: 'jump-latest', user: UnifiedChatMessageRespVO): void
  (e: 'regenerate', messageId: ChatId): void
  (e: 'rate', messageId: ChatId, rating: number): void
  (e: 'versions', messageId: ChatId): void
  (e: 'open-ref', ref: KnowledgeReference): void
  (e: 'retrieve-preview', question: string): void
}>()

const writable = computed(() => {
  const answerId = props.turn.assistant?.id
  if (!answerId || String(answerId) === '0') return false
  // 知识库侧已放开非主链版本重跑：以历史版本的问题原文为源生成新兄弟版本并切为当前。
  // 问数侧后端仍拒绝非主链 regenerate/edit，保持历史版本只读。
  return props.mode === 'KNOWLEDGE' ? true : !props.turn.isHistory
})

const answerView = computed(() => toUnifiedAnswerView(props.turn.assistant))
</script>

<style scoped>
.unified-turn {
  margin-bottom: 14px;
}

.msg-user {
  display: flex;
  justify-content: flex-end;
  border-radius: 6px;
  transition: background-color 0.6s ease;
}

.msg-user-bubble {
  max-width: 76%;
  padding: 10px 12px;
  color: var(--el-text-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
}

.msg-ops {
  opacity: 0.7;
}

.msg-user:hover .msg-ops {
  opacity: 1;
}

/* DeepSeek 式版本翻页：‹ N/M ›，浅灰小字，不抢问题正文的视觉重心 */
.version-pager {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.version-pager .el-button {
  height: 18px;
  padding: 0;
  margin: 0;
  color: var(--el-text-color-placeholder);
}

.version-pager-text {
  min-width: 30px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

.version-pager-latest {
  height: 18px;
  padding: 0 2px;
  margin: 0 0 0 4px;
  font-size: 11px;
}

.msg-assistant {
  min-width: 0;
}

.knowledge-ops {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 2px;

  .is-liked {
    font-weight: 600;
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
    animation: rate-pop 0.24s ease;
  }

  .is-disliked {
    font-weight: 600;
    color: var(--el-color-danger);
    background-color: var(--el-color-danger-light-9);
    border-color: var(--el-color-danger-light-7);
    animation: rate-pop 0.24s ease;
  }
}

@keyframes rate-pop {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.14);
  }
}

.question-anchor--highlight {
  background-color: var(--el-color-warning-light-9);
}
</style>
