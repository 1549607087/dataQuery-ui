# 智能问答 / 智能问数平台（dataQuery）前端说明

> 本文档独立于项目根目录的 `README.md`，只描述本仓库中「智能问答 / 智能问数」相关前端代码。
> 项目整体介绍、启动方式、技术栈请阅读 [`README.md`](./README.md)。

## 1. 简介

本仓库中的智能问答能力由 **dataQuery（智能问数平台）** 前端模块承载，代码分布在：

- 页面：`src/views/dataQuery/`
- 接口：`src/api/dataQuery/`

它提供两种问答模式，统一在一套对话界面中切换：

| 模式 | 名称 | 输入资源 | 后端引擎 | 典型问题 |
| --- | --- | --- | --- | --- |
| `QUERY` | 智能问数（NL2SQL） | `datasourceId` 数据源 | 自然语言 → SQL → 只读执行 → 结果/图表 | 「查询本月销售额前 10 的商品」 |
| `KNOWLEDGE` | 知识库问答（RAG） | `baseId` 知识库 | 检索召回 → 提示词装配 → 大模型 → 引用校验 | 「差旅报销需要哪些材料？」 |

两种模式的会话（`sessionId`）**不能混用**；续聊时 `sessionId` 必须与 `mode` 匹配，否则服务端会拒绝。切换模式必须新建会话。

> 与 `src/views/ai`、`src/api/ai` 的关系：后者是通用 AI 应用矩阵（聊天、绘图、PPT、工作流、知识库等，接口前缀 `/ai/*`）；dataQuery 是面向 NL2SQL 与 RAG 的垂直平台（接口前缀 `/data-query/*`），拥有独立后端 Controller、库表、权限体系与前端组件，二者不共用页面代码。

## 2. 快速开始

### 2.1 环境与脚本

沿用项目根目录约定（Node.js >= 20.19.0、pnpm >= 10.28.0）：

```bash
pnpm install
pnpm dev            # 使用 .env.local，本地后端默认 http://localhost:48080
pnpm build:prod
```

本地接口前缀由 `VITE_API_URL` 决定（`.env.local` 中为 `/admin-api`），完整请求路径为 `VITE_API_URL + BASE_URL + 子路径`。

### 2.2 后端与菜单依赖

- 所有接口要求后端提供 `/data-query/*` 系列端点；枚举值来自后端 `nl2sql-*.sql` 字段注释，目前**前端硬编码**在 `src/api/dataQuery/constants.ts`，不使用 `system_dict_data` / `DictTag`，新增字典时需同步修改该文件。
- dataQuery 页面**没有静态路由**，由后端菜单动态下发组件路径（形如 `dataQuery/chat/index`），再通过 `src/utils/routerHelper.ts` 中的 `import.meta.glob('../views/**/*.{vue,tsx}')` 加载。后端未初始化菜单时页面不可达。
- 按钮权限由 `v-hasPermi` 控制，常见权限点：`data-query:ai-chat:query`、`data-query:knowledge-chat:query`、`data-query:sql-guard:validate`、`data-query:sql-guard:execute`、`data-query:schema-recall:query`、`data-query:ai-chat:feedback`。

## 3. 模块地图

### 3.1 页面（`src/views/dataQuery/`）

| 目录 | 说明 | 主要文件 |
| --- | --- | --- |
| `chat/` | **新版统一对话页**，QUERY / KNOWLEDGE 共用会话、SSE、版本与消息操作 | `index.vue`、`ChatTurn.vue`、`transform.ts`、`types.ts` |
| `aichat/` | 旧版智能问数页；`ChatResultCard.vue` 被统一对话页复用为 QUERY 结果卡 | `index.vue`、`ChatResultCard.vue` |
| `components/` | 问题 / 版本导航侧栏 | `QuestionRail.vue` |
| `knowledge/` | 知识库管理、文档管理、旧版知识问答页 | `index.vue`、`KnowledgeBaseForm.vue`、`document/`、`chat/` |
| `datasource/` | 数据源、表、字段、关联、枚举值、同步日志、表结构一键导入 | `index.vue`、`DatasourceForm.vue`、`table/`、`column/`、`relation/`、`enumvalue/`、`synclog/`、`import/` |
| `metadata/` | 元数据同步、Schema 向量构建 | `sync/`、`vector/` |
| `model/` | 模型供应商 / 配置、调用日志、熔断状态、治理、灰度实验、路由候选、场景绑定 | `provider/`、`config/`、`callLog/`、`circuitState/`、`governance/`、`grayExperiment/`、`routeCandidate/`、`sceneBinding/` |
| `prompt/` | 提示词场景 / 模板 / 变量 / 版本 / 运行时渲染（S4） | `scene/`、`template/`、`variable/`、`version/`、`runtime/` |
| `queryruntime/` | 问数运行时：会话、审计、反馈、查询模板 | `session/`、`audit/`、`feedback/`、`template/` |
| `recall/` | S3 Schema 召回自检：返回 DDL、Join 关系与白名单，不回显业务数据 | `preview/` |
| `sqlguard/` | S6 静态校验、S7 只读执行 | `validate/`、`execute/` |
| `system/` | 租户初始化 | `tenantInit/` |

### 3.2 接口（`src/api/dataQuery/`）

| 分组 | `BASE_URL` |
| --- | --- |
| 统一对话 | `/data-query/chat` |
| 旧版问数 / 旧版知识问答 | `/data-query/ai-chat`、`/data-query/knowledge-chat` |
| 知识库 / 文档 / 切片 | `/data-query/knowledge-base`、`/knowledge-document`、`/knowledge-chunk` |
| 数据源及元数据 | `/data-query/ai-datasource`（含 `-table`、`-column`、`-table-relation`、`-column-enum`、`-sync-log`）、`/metadata-sync`、`/schema-vector`、`/metadata-import` |
| 模型与提示词 | `/data-query/ai-model-*`、`/ai-prompt*`、`/prompt-runtime` |
| 安全 / 运行时 / 调试 | `/data-query/sql-guard`、`/schema-recall`、`/ai-query-session`、`/ai-query-audit`、`/ai-query-feedback`、`/ai-query-template`、`/tenant-init` |

统一对话接口全部定义在 `src/api/dataQuery/chat/index.ts`。

## 4. 统一对话设计

### 4.1 请求约定

```ts
interface UnifiedChatAskReqVO {
  mode: 'QUERY' | 'KNOWLEDGE'
  question: string
  sessionId?: ChatId       // 不传则新建会话
  datasourceId?: ChatId    // mode=QUERY 必填
  baseId?: ChatId          // mode=KNOWLEDGE 必填
  modelConfigId?: ChatId
  sceneCode?: string       // 仅 QUERY，默认 SQL_GEN
  version?: number         // 仅 KNOWLEDGE，文档版本水位
  clientRequestId?: string // 流式请求编号，用于「停止」
}
```

雪花 ID 可能超过 JavaScript 安全整数，`ChatId = string | number`，**必须按原值透传，禁止 `Number()` 转换**。

### 4.2 同步与流式接口

| 能力 | 端点 | 说明 |
| --- | --- | --- |
| 同步提问 | `POST /chat/ask` | 90s 超时 |
| 流式提问 | `POST /chat/ask-stream` | SSE，两种模式均可用 |
| 流式修改问题 | `POST /chat/edit-stream` | 仅 KNOWLEDGE，QUERY 返回 125 错误 |
| 流式重新生成 | `POST /chat/regenerate-stream` | 仅 KNOWLEDGE，QUERY 返回 125 错误 |
| 停止 | `POST /chat/cancel?clientRequestId=` | 仅对携带 `clientRequestId` 的流式请求有效，否则返回 `CHAT_CANCEL_NOT_FOUND` |
| 会话列表 / 重命名 / 删除 | `/chat/session/page`、`/rename`、`/delete` | `mode` 不传时聚合两种模式 |
| 消息列表 / 版本 | `/chat/message/list`、`/versions`、`/question-versions` | 主链按 `seq` 升序；切换版本只改选中标记，不重跑 |
| 重跑 / 修改 / 赞踩 | `/chat/regenerate`、`/edit`、`/rating` | 对应同步实现 |
| 检索预览 | `POST /chat/retrieve-preview` | 仅 KNOWLEDGE，调试召回与 Rerank，不调用大模型 |

流式实现基于 `@microsoft/fetch-event-source`，要点：

- `POST + JSON body`，手动注入 `Authorization: Bearer <token>`；**SSE 不走 axios 拦截器**，鉴权与代理配置需与同步请求保持一致。
- `openWhenHidden: true`；响应必须为 `Content-Type: text/event-stream`，否则按 HTTP 错误体解析错误码（如 124 在途冲突、125 模式不支持）。
- **禁止自动重连**：`onerror` 直接抛错停止，避免重复问数 / 重复写审计。
- 事件分流：`event=delta` 为正文增量（仅 KNOWLEDGE 产生，按 `seq` 拼接）；`event=stage` 或空事件为阶段进度；终态事件 `done|error|stopped` 携带 `status`、`traceId`、消息 ID 等。
- KNOWLEDGE 终态含 `op / version / persisted`；`persisted=false` 表示本轮按版本策略未落库，前端会回滚乐观气泡并提示「本轮未保存」。
- 停止时优先调用服务端 `cancel` 并保持 SSE 连接等待 `stopped` 终态，只在无 `clientRequestId` 或兜底超时时本地 `abort`。

## 5. 智能问数链路（QUERY）

### 5.1 SSE 阶段（S0 ~ S9）

顺序定义在 `src/api/dataQuery/constants.ts` 的 `CHAT_STAGE_OPTIONS`：

| 阶段 | 含义 |
| --- | --- |
| `intent` | 建立上下文 / 意图识别 |
| `rewrite` | 问题规范化 |
| `recalled` | Schema 召回 |
| `generated` | SQL 生成 |
| `validated` | 静态校验 |
| `executing` | 只读执行 |
| `result` | 结果获取 |
| `summary` | 结果加工 |
| `done` \| `error` \| `stopped` | 终态 |

阶段状态为 `RUNNING / DONE / SKIPPED / ERROR / STOPPED`。

终态：`DONE` 成功、`CLARIFY` 需澄清、`REJECT` 拒绝、`DEGRADED` 降级、`FAILED` 失败、`STOPPED` 用户主动停止（中性色，不算故障）。

### 5.2 结果卡

`src/views/dataQuery/aichat/ChatResultCard.vue` 展示：

- 状态标签、耗时、`traceId`、修正轮次；召回方式、命中表数、结构版本、模型、提示词版本、意图等链路信息。
- 非成功终态提示；`REJECT` 明确说明「SQL 未通过安全闸门，已被拒绝执行」，`STOPPED` 不展示半成品表格。
- 三类结果视图：指标卡、`ECharts` 图表（复用 `QueryResult.rows`，不二次查询）、结果表格（含截断 / 脱敏 / 只读连接标记）。
- 折叠展示最终 SQL、`generatedSql` / `executedSql`、口径说明与降级原因。
- 反馈：评分 1~5、反馈类型、文字反馈、纠正 SQL（仅入库供人工审核，不会自动执行或改写线上提示词）。

### 5.3 SQL 安全约束

- S6 `sqlguard/validate`：数据源归属、白名单表 / 列、只读、LIMIT 逐项校验，只校验不执行，通过产出 `SafeSql`。
- S7 `sqlguard/execute`：走**独立只读连接**，提交前二次确认，执行会产生审计记录。
- 审计页 `queryruntime/audit` 支持按 `traceId`、意图、SQL 校验状态、只读连接筛选。

## 6. 知识库问答链路（KNOWLEDGE / RAG）

### 6.1 数据模型

三张核心表：`ai_knowledge_base`（知识库）→ `ai_knowledge_document`（文档）→ `ai_knowledge_chunk`（切片）；切片冗余 `base_id` 以避免检索时 join，并携带 `embedding`（向量）、`page_no`、`heading_path` 用于引用溯源。可视化 ER 图见仓库根目录 [`知识库RAG数据模型ER图.html`](./知识库RAG数据模型ER图.html)。

### 6.2 生命周期

1. **知识库**：配置业务编码、名称、状态与向量模型代号（如 `openai:text-embedding-3-small:1536`）。注意知识库状态 `0=正常 / 1=停用`，与 yudao 通用 `CommonStatusEnum` 语义相反，禁止混用。
2. **文档上传**：异步流程，upload 仅落库 + 发 MQ，返回 `documentId / parseStatus / docKey / version / duplicated`。前端必须拿 `documentId` 轮询 `/get`，直到 `parseStatus ∈ {2 已完成, 3 失败, 4 已下线}`。允许扩展名 `TXT / MD / PDF / DOC / DOCX`，单文件上限 20 MB；按 `content_hash` 做上传幂等。
3. **版本管理**：同 `docKey` 内 `version` 递增，`isLatest` 标记生效版本；`/versions` 列出全部版本，`/switch-version` 只切标记、零 Embedding 成本。
4. **切片**：解析后生成切片与向量；切片 `syncStatus` 为 `0 待构建 / 1 已构建 / 2 需重建 / 4 已下线`（没有 3）。

### 6.3 问答与引用溯源

- 同步 RAG 端点 `/data-query/knowledge-chat/ask`：召回 → 提示词装配 → 模型调用 → 引用校验；`recallMode` 可能为 `VECTOR / HYBRID / KEYWORD_DEGRADED / EMPTY`。
- 引用编号 `[n]` 与 `references[n-1]` 一一对应，正文渲染为可点击角标，点击后滚动定位引用卡；服务端 `CitationValidator` 剔除越界编号，并通过 `citationDroppedCount` 提示。
- **版本水位**：问答请求与检索预览都可传 `version`，表示回退到 `version <= N` 的最高版本；不传则取当前生效版本。页面提供「按此版本重查」。
- **检索预览**：展示 `degraded / degradeReason / tokenEstimate / rerankApplied / rerankModelCode / rerankLatencyMs / rerankSkipReason` 及命中切片分数；与知识问答 S2 使用同一条召回链路，但不调用大模型、不写会话。

## 7. 联调与排错清单

| 现象 / 注意点 | 处理方式 |
| --- | --- |
| SSE 401 / 鉴权失败 | 同步请求走 axios 拦截器，SSE 手动拼 `VITE_API_URL + BASE_URL` 并注入 Bearer Token；检查网关对流式请求、租户头、加密头的处理 |
| SSE 报「流式请求失败」 | 服务端必须返回 `text/event-stream`；HTTP 错误体会解析出原生 `code`（124 在途冲突、125 模式不支持） |
| 流式回答重复执行 / 重复审计 | 不要给 `fetchEventSource` 开启自动重连；`onclose` 必须保留 |
| 「停止」无效 | 提问时必须携带 `clientRequestId`（最长 64），否则后端无法定位在途请求 |
| 角色 ID 精度丢失 | 雪花 ID 按原值透传，禁止 `Number()` 转换 |
| 文档一直显示解析中 | 上传为异步 MQ 消费，需轮询 `parseStatus`，终态为 2/3/4 |
| 知识库状态判断错误 | `0=正常 / 1=停用`，与通用状态枚举相反 |
| 枚举 / 标签不显示 | 后端未初始化 `system_dict_data`，全部枚举在 `src/api/dataQuery/constants.ts` 硬编码 |
| 页面路由 404 | 后端需下发 dataQuery 菜单，组件路径形如 `dataQuery/chat/index` |
| 按钮不可点击 | 检查后端权限点（见 2.2 节） |
| 知识库会话标题搜索不准 | 旧知识问答页的标题搜索是前端当前页过滤，不是服务端模糊查询 |

## 8. 关键依赖

| 依赖 | 用途 |
| --- | --- |
| `@microsoft/fetch-event-source` ^2.0.1 | SSE 流式问答（ask / edit / regenerate） |
| `echarts` ^6.0.0 | 问数结果图表 |
| `markdown-it` ^14.1.1 | 知识库 Markdown 回答渲染 |
| `highlight.js`、`katex`、`vue-dompurify-html` | 代码高亮、公式、HTML 净化 |
| `element-plus` 2.13.7、`vue` 3.5.34、`axios` 1.16.0 | 基础 UI / 框架 / HTTP |

## 9. 常用入口速查

```text
src/views/dataQuery/chat/index.vue              统一对话页（首选入口）
src/views/dataQuery/aichat/index.vue            旧版智能问数页
src/views/dataQuery/aichat/ChatResultCard.vue   问数结果卡
src/views/dataQuery/knowledge/                  知识库 / 文档 / 旧版知识问答
src/api/dataQuery/chat/index.ts                 统一对话接口与 SSE 管线
src/api/dataQuery/aichat/index.ts               旧版问数接口（含 QueryResult / ChartSpec）
src/api/dataQuery/knowledgeChat/index.ts        旧版知识问答接口与引用类型
src/api/dataQuery/constants.ts                  全部本地枚举与工具函数
```
