<template>
  <div
    v-if="items.length"
    class="question-rail"
    @mouseenter="open = true"
    @mouseleave="open = false"
  >
    <!-- 默认态：右边缘一列灰色短横线，当前项蓝色加宽；绝对定位不占布局宽度 -->
    <div class="question-rail__strip" :style="stripStyle">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="question-rail__line"
        :class="{ 'is-active': item.active }"
        :title="item.question"
        :aria-label="item.question"
        @click="handleSelect(item.id)"
      ></button>
    </div>

    <!-- hover 展开：向左浮出的问题列表；与 strip 同属一个 hover 容器 -->
    <transition name="question-rail-panel">
      <div v-show="open" class="question-rail__panel">
        <div class="question-rail__panel-head">
          <span class="question-rail__panel-title">问题</span>
          <span class="question-rail__panel-count">{{ items.length }}</span>
        </div>
        <div class="question-rail__panel-list">
          <div
            v-for="item in items"
            :key="item.id"
            class="question-rail__panel-item"
            :class="{ 'is-active': item.active }"
            @click="handleSelect(item.id)"
          >
            <span class="question-rail__panel-text">{{ item.question }}</span>
            <span v-if="item.total > 1" class="question-rail__panel-badge">
              {{ item.current }}/{{ item.total }}
            </span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'DataQueryQuestionRail' })

interface QuestionNavItem {
  /**
   * 消息 id。雪花 ID 超过 JS 安全整数范围，后端序列化为字符串，
   * 因此这里同时允许 string，避免被强转成 number 后精度丢失。
   */
  id: string | number
  question: string
  current: number
  total: number
  active: boolean
}

const props = defineProps<{ items: QuestionNavItem[] }>()
const emit = defineEmits<{ (e: 'select', id: string | number): void }>()

const open = ref(false)

/** 横线一一对应问题；间距在 [3px, 9px] 内自适应，任意条数都能收进 320px 轨道 */
const RAIL_MAX_HEIGHT = 320
const RAIL_MIN_GAP = 3
const RAIL_MAX_GAP = 9
const RAIL_LINE_HEIGHT = 2

const stripStyle = computed(() => {
  const count = Math.max(props.items.length, 1)
  const gap = Math.max(
    RAIL_MIN_GAP,
    Math.min(RAIL_MAX_GAP, Math.floor((RAIL_MAX_HEIGHT - RAIL_LINE_HEIGHT) / count))
  )
  return { gap: `${gap}px` }
})

const handleSelect = (id: string | number) => {
  emit('select', id)
  open.value = false
}
</script>

<style scoped>
.question-rail {
  position: absolute;
  top: 50%;
  right: 6px;
  z-index: 20;
  transform: translateY(-50%);
}

.question-rail__strip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-height: 320px;
  padding: 6px 2px;
  overflow: hidden;
  cursor: pointer;
  background: transparent;
  border-radius: 6px;
}

/* 透明桥接：覆盖 strip 与 panel 之间的 6px 间隙，避免鼠标移动时浮层闪断 */
.question-rail__strip::before {
  position: absolute;
  top: 0;
  right: 100%;
  width: 6px;
  height: 100%;
  content: '';
}

.question-rail__strip:hover {
  background: var(--el-fill-color-light);
}

.question-rail__line {
  display: block;
  width: 14px;
  height: 2px;
  padding: 0;
  cursor: pointer;
  background: var(--el-border-color);
  border: none;
  border-radius: 1px;
  transition:
    background-color 0.15s,
    width 0.15s;
}

.question-rail__line:hover {
  width: 18px;
  background: var(--el-text-color-placeholder);
}

.question-rail__line.is-active {
  width: 18px;
  background: var(--el-color-primary);
}

.question-rail__panel {
  position: absolute;
  top: 50%;
  right: calc(100% + 6px);
  width: 280px;
  max-height: min(60vh, 420px);
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transform: translateY(-50%);
  box-shadow: var(--el-box-shadow-light);
}

/* 桥接 panel 一侧：与 strip::before 重叠覆盖整段间隙 */
.question-rail__panel::before {
  position: absolute;
  top: 0;
  right: -6px;
  width: 6px;
  height: 100%;
  content: '';
}

.question-rail__panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  border-radius: 7px 7px 0 0;
}

.question-rail__panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.question-rail__panel-count {
  padding: 0 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  border-radius: 8px;
}

.question-rail__panel-list {
  max-height: calc(min(60vh, 420px) - 40px);
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.question-rail__panel-item {
  display: flex;
  padding: 7px 8px;
  margin-bottom: 2px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: background-color 0.15s;
  align-items: center;
  gap: 6px;
}

.question-rail__panel-item:hover {
  background: var(--el-fill-color-light);
}

.question-rail__panel-item.is-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.question-rail__panel-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-regular);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.question-rail__panel-item.is-active .question-rail__panel-text {
  color: var(--el-color-primary);
}

.question-rail__panel-badge {
  flex: none;
  padding: 0 4px;
  font-size: 11px;
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border-radius: 4px;
}

.question-rail-panel-enter-active,
.question-rail-panel-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.question-rail-panel-enter-from,
.question-rail-panel-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(6px);
}

@media (width <= 1440px) {
  .question-rail__panel {
    width: 240px;
  }
}
</style>
