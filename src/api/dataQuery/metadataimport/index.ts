import request from '@/config/axios'
import type { AiDatasourceTestRespVO } from '@/api/dataQuery/datasource'
import type { MetadataSyncRespVO } from '@/api/dataQuery/metadata/sync'
import type { SchemaVectorBuildRespVO } from '@/api/dataQuery/metadata/vector'

/**
 * 表结构一键导入 Request VO
 *
 * 两种模式二选一：
 * 1) 已有数据源：只传 datasourceId；
 * 2) 新建数据源：最少只需 name / code / jdbcUrl（其余按 dsType 自动推断）。
 * 租户 ID 由服务端上下文决定，前端不传；密码只在本次请求内使用。
 */
export interface MetadataImportReqVO {
  /** 已有数据源编号；传入即走「已有数据源」模式，忽略新建连接字段 */
  datasourceId?: number
  /** 数据源显示名称（新建模式必填） */
  name?: string
  /** 数据源编码，租户内唯一（新建模式必填） */
  code?: string
  /** 数据库类型：1 MySQL、2 PostgreSQL、3 Oracle、4 SQLServer、5 达梦、6 人大金仓、7 openGauss、8 ClickHouse、9 Hive；默认 2 */
  dsType?: number
  /** 管理连接 JDBC URL（新建模式必填） */
  jdbcUrl?: string
  username?: string
  password?: string
  /** 默认 schema / database */
  schemaName?: string
  /** 默认 catalog */
  catalogName?: string
  /** JDBC 驱动类名；不填按 dsType 自动推断（仅允许白名单内驱动） */
  driverClass?: string
  /** SQL 方言；不填按 dsType 自动推断 */
  dialect?: string
  readonlyUrl?: string
  readonlyUsername?: string
  readonlyPassword?: string
  /** schema 白名单，如 ['public']；为空表示全部非系统 schema */
  allowedSchemas?: string[]
  /** 表名包含正则数组，命中才导入 */
  includeTables?: string[]
  /** 表名排除正则数组，命中即跳过 */
  excludeTables?: string[]
  /** 单次查询最大返回行数，默认 1000 */
  maxRows?: number
  /** 只预览不落库 */
  dryRun?: boolean
  /** 导入完成后是否构建向量索引，默认 true；失败只告警不回滚 */
  buildVector?: boolean
  /** 编码已存在且连接配置一致时复用该数据源，默认 true */
  reuseExisting?: boolean
}

/** 一键导入预览 - 表项 */
export interface MetadataPreviewTableItem {
  schemaName: string
  tableName: string
  /** 1 物理表 / 2 视图 */
  tableType: number
  columnCount: number
  primaryKeys: string[]
  columns: string[]
  columnsTruncated: boolean
}

/** 一键导入预览 Response VO（只读扫描，无落库副作用，不回显连接串与凭证） */
export interface MetadataPreviewRespVO {
  success: boolean
  datasourceId: number
  dialect: string
  schemaName: string
  tableCount: number
  columnCount: number
  relationCount: number
  maxTables: number
  maxPreviewTables: number
  truncated: boolean
  tables: MetadataPreviewTableItem[]
  warnings: string[]
  latencyMs: number
  errorMsg: string
}

/** 一键导入 - 分步执行记录 */
export interface MetadataImportStep {
  /** PREVIEW / DATASOURCE / CONNECT / SYNC / VECTOR */
  name: string
  /** SUCCESS / SKIPPED / WARN / FAILED */
  status: string
  detail: string
  latencyMs: number
}

/** 一键导入结果 Response VO */
export interface MetadataImportRespVO {
  /** 整条链路是否成功（向量为非阻断告警，不影响本值） */
  success: boolean
  /** 终态阶段：PREVIEW / DATASOURCE / CONNECT / SYNC / DONE */
  stage: string
  dryRun: boolean
  /** 数据源编号；失败时若已创建也返回，便于带 datasourceId 重试 */
  datasourceId: number
  datasourceCreated: boolean
  datasourceReused: boolean
  preview: MetadataPreviewRespVO
  connection: AiDatasourceTestRespVO
  sync: MetadataSyncRespVO
  /** 未构建时为 null */
  vector: SchemaVectorBuildRespVO
  steps: MetadataImportStep[]
  warnings: string[]
  errorCode: number
  errorMsg: string
  summary: string
  latencyMs: number
}

const BASE_URL = '/data-query/metadata-import'

/** 一键导入预览：只读扫描目标库结构，不创建数据源、不写任何元数据行 */
export const previewMetadataImport = (data: MetadataImportReqVO) =>
  request.post({ url: `${BASE_URL}/preview`, data })

/** 一键导入：创建/复用数据源 → 测连接 → 全量表列导入 → 向量索引 */
export const importMetadata = (data: MetadataImportReqVO) =>
  request.post({ url: `${BASE_URL}/import`, data })
