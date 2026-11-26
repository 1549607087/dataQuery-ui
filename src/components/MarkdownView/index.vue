<template>
  <div ref="contentRef" class="markdown-view" v-html="renderedMarkdown"></div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import MarkdownIt from 'markdown-it'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/vs2015.min.css'
import hljs from 'highlight.js'

// 定义组件属性
const props = defineProps({
  content: {
    type: String,
    required: true
  }
})

const message = useMessage() // 消息弹窗
const { copy } = useClipboard({ legacy: true }) // 初始化 copy 到粘贴板
const contentRef = ref()

/**
 * LaTeX 公式插件。markdown-it 默认把 `\[` 的反斜杠当转义符吃掉，
 * 结果 `\[x=\frac{...}\]` 只剩 `[x=\frac{...}]` 的裸文本。
 * 这里在 escape 规则之前拦截四种写法，交给本地 KaTeX 渲染：
 * 块级 `$$...$$` / `\[...\]`，行内 `$...$` / `\(...\)`。
 */
const setupKatex = (md: MarkdownIt) => {
  const render = (tex: string, displayMode: boolean) =>
    katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false
    })

  md.inline.ruler.before('escape', 'katex_inline', (state, silent) => {
    const src = state.src
    const pos = state.pos
    let open = ''
    let close = ''
    let displayMode = false
    if (src.startsWith('\\[', pos)) {
      open = '\\['
      close = '\\]'
      displayMode = true
    } else if (src.startsWith('\\(', pos)) {
      open = '\\('
      close = '\\)'
    } else if (src.startsWith('$$', pos)) {
      open = '$$'
      close = '$$'
      displayMode = true
    } else if (src.startsWith('$', pos)) {
      // 金额 $100 或单独一个 $ 不当公式
      if (!src[pos + 1] || src[pos + 1] === '$' || /\s/.test(src[pos + 1])) return false
      open = '$'
      close = '$'
    } else {
      return false
    }
    const start = pos + open.length
    const end = src.indexOf(close, start)
    if (end < 0) return false
    // 行内公式不跨行，跨行的交给块级规则
    const lineEnd = src.indexOf('\n', start)
    if (lineEnd >= 0 && end > lineEnd) return false
    const tex = src.slice(start, end)
    if (!tex.trim()) return false
    // 行内 $...$ 必须带数学符号才认，避免「$100 到 $200」这类金额被当成公式
    if (open === '$' && !/\\[=^_{}+\-*/()]/.test(tex)) return false
    if (silent) return true
    const token = state.push('katex_inline', '', 0)
    token.content = tex
    token.meta = { displayMode }
    state.pos = end + close.length
    return true
  })
  md.renderer.rules.katex_inline = (tokens, idx) =>
    render(tokens[idx].content, !!tokens[idx].meta?.displayMode)

  md.block.ruler.before('fence', 'katex_block', (state, startLine, endLine, silent) => {
    const begin = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const firstLine = state.src.slice(begin, max)
    let open = ''
    let close = ''
    if (firstLine.trimStart().startsWith('$$')) {
      open = '$$'
      close = '$$'
    } else if (firstLine.trimStart().startsWith('\\[')) {
      open = '\\['
      close = '\\]'
    } else {
      return false
    }
    const openPos = begin + firstLine.indexOf(open)
    const firstContentStart = openPos + open.length
    const firstRest = state.src.slice(firstContentStart, max)
    let content = ''
    let nextLine = startLine
    const sameLineClose = firstRest.indexOf(close)
    if (sameLineClose >= 0) {
      content = firstRest.slice(0, sameLineClose)
    } else {
      content = `${firstRest}\n`
      nextLine = startLine + 1
      let found = false
      for (; nextLine < endLine; nextLine++) {
        const lineBegin = state.bMarks[nextLine] + state.tShift[nextLine]
        const line = state.src.slice(lineBegin, state.eMarks[nextLine])
        const closePos = line.indexOf(close)
        if (closePos >= 0) {
          content += line.slice(0, closePos)
          found = true
          break
        }
        content += `${line}\n`
      }
      if (!found) return false
    }
    if (!content.trim()) return false
    if (silent) return true
    const token = state.push('katex_block', '', 0)
    token.content = content
    token.map = [startLine, nextLine + 1] as [number, number]
    state.line = nextLine + 1
    return true
  })
  md.renderer.rules.katex_block = (tokens, idx) => render(tokens[idx].content, true)
}

const md = new MarkdownIt({
  highlight: function (str, lang) {
    // 语言标记、代码正文和复制内容均来自不可信输入，输出 HTML 前必须转义
    const languageHtml = `<span style="position: absolute; left: 10px; top: 5px; color: #fff;">${md.utils.escapeHtml(lang || 'text')}</span>`
    const copyHtml = `<div id="copy" data-copy="${md.utils.escapeHtml(str)}" style="position: absolute; right: 10px; top: 5px; color: #fff;cursor: pointer;">复制</div>`
    let codeHtml = md.utils.escapeHtml(str)
    if (lang && hljs.getLanguage(lang)) {
      try {
        codeHtml = hljs.highlight(lang, str, true).value
      } catch (__) {}
    }
    return `<pre style="position: relative;">${languageHtml}${copyHtml}<code class="hljs">${codeHtml}</code></pre>`
  }
})
setupKatex(md)

/** 渲染 markdown */
const renderedMarkdown = computed(() => {
  return md.render(props.content)
})

/** 初始化 **/
onMounted(async () => {
  // 添加 copy 监听
  contentRef.value.addEventListener('click', (e: any) => {
    if (e.target.id === 'copy') {
      copy(e.target?.dataset?.copy)
      message.success('复制成功!')
    }
  })
})
</script>

<style lang="scss">
.markdown-view {
  max-width: 100%;
  font-family: 'PingFang SC';
  font-size: 0.95rem;
  font-weight: 400;
  line-height: 1.6rem;
  letter-spacing: 0;
  color: #3b3e55;
  text-align: left;

  pre {
    position: relative;
  }

  /* 长公式横向滚动，不撑破回答卡片 */
  .katex-display {
    margin: 12px 0;
    overflow: auto hidden;
  }

  pre code.hljs {
    width: auto;
  }

  code.hljs {
    width: auto;
    padding-top: 20px;
    border-radius: 6px;

    @media screen and (width >= 1536px) {
      width: 960px;
    }

    @media screen and (width <= 1536px) and (width >= 1024px) {
      width: calc(100vw - 400px - 64px - 32px * 2);
    }

    @media screen and (width <= 1024px) and (width >= 768px) {
      width: calc(100vw - 32px * 2);
    }

    @media screen and (width <= 768px) {
      width: calc(100vw - 16px * 2);
    }
  }

  p,
  code.hljs {
    margin-bottom: 16px;
  }

  p {
    //margin-bottom: 1rem !important;
    margin: 0;
    margin-bottom: 3px;
  }

  /* 标题通用格式 */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 24px 0 8px;
    font-weight: 600;
    color: #3b3e55;
  }

  h1 {
    font-size: 22px;
    line-height: 32px;
  }

  h2 {
    font-size: 20px;
    line-height: 30px;
  }

  h3 {
    font-size: 18px;
    line-height: 28px;
  }

  h4 {
    font-size: 16px;
    line-height: 26px;
  }

  h5 {
    font-size: 16px;
    line-height: 24px;
  }

  h6 {
    font-size: 16px;
    line-height: 24px;
  }

  /* 列表（有序，无序） */
  ul,
  ol {
    padding: 0;
    margin: 0 0 8px;
    font-size: 16px;
    line-height: 24px;
    color: #3b3e55; // var(--color-CG600);
  }

  li {
    margin: 4px 0 0 20px;
    margin-bottom: 1rem;
  }

  ol > li {
    margin-bottom: 1rem;
    list-style-type: decimal;
    // 表达式,修复有序列表序号展示不全的问题
    // &:nth-child(n + 10) {
    //     margin-left: 30px;
    // }

    // &:nth-child(n + 100) {
    //     margin-left: 30px;
    // }
  }

  ul > li {
    margin-right: 11px;
    margin-bottom: 1rem;
    font-size: 16px;
    line-height: 24px;
    color: #3b3e55; // var(--color-G900);
    list-style-type: disc;
  }

  ol ul,
  ol ul > li,
  ul ul,
  ul ul li {
    margin-bottom: 1rem;
    margin-left: 6px;
    // list-style: circle;
    font-size: 16px;
    list-style: none;
  }

  ul ul ul,
  ul ul ul li,
  ol ol,
  ol ol > li,
  ol ul ul,
  ol ul ul > li,
  ul ol,
  ul ol > li {
    list-style: square;
  }
}
</style>
