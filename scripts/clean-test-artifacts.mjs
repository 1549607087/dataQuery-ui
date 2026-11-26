import { existsSync, lstatSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 永久删除测试遗留产物（不进入回收站）。
 *
 * 规则见根目录 AGENTS.md：任何测试执行结束后必须运行 `pnpm clean:test`。
 * 这里使用 fs.rmSync 直接删除，跨平台且不依赖 shell 的 rm/del。
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 常见测试框架的默认产物目录/文件；新增测试工具时同步补充此列表 */
const TEST_ARTIFACTS = [
  // 覆盖率
  'coverage',
  'test/unit/coverage',
  '.nyc_output',
  'lcov.info',
  // 测试结果与报告
  'test-results',
  'playwright-report',
  'blob-report',
  'cypress/videos',
  'cypress/screenshots',
  'allure-results',
  'allure-report',
  'junit.xml',
  'test-report.xml',
  'test-results.xml'
]

const removed = []
const failed = []

for (const relativePath of TEST_ARTIFACTS) {
  const absolutePath = resolve(repoRoot, relativePath)
  // 固定清单均来自仓库根目录，避免误删仓库外路径
  if (!absolutePath.startsWith(repoRoot)) continue
  if (!existsSync(absolutePath)) continue

  try {
    // lstatSync 先确认存在，避免把断链/异常路径当成可删除目标
    lstatSync(absolutePath)
    rmSync(absolutePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    if (existsSync(absolutePath)) {
      failed.push(relativePath)
    } else {
      removed.push(relativePath)
    }
  } catch (error) {
    failed.push(`${relativePath}（${error instanceof Error ? error.message : String(error)}）`)
  }
}

if (removed.length) {
  console.log(`[clean:test] 已永久删除 ${removed.length} 项测试产物：`)
  for (const item of removed) console.log(`  - ${item}`)
} else {
  console.log('[clean:test] 未发现测试产物，工作区干净。')
}

if (failed.length) {
  console.error(`[clean:test] 以下产物删除失败，请手动处理：`)
  for (const item of failed) console.error(`  - ${item}`)
  process.exitCode = 1
}
