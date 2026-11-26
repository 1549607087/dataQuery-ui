import request from '@/config/axios'

/**
 * S6 仅校验 / S7 只读执行 公共请求体
 * 对应 controller/admin/sqlguard/vo/SqlGuardReqVO.java
 */
export interface SqlGuardReqVO {
  datasourceId: number
  sql: string
  question?: string
  schemaContext?: any
}

/**
 * S6 SQL 静态校验报告
 * 对应 framework/sqlguard/SqlGuardResult.java
 * safeSql 为 SafeSql 对象，拒绝路径为 null，这里用 any 承载
 */
export interface SqlGuardResult {
  passed: boolean
  errorCode?: number | null
  errorMsg?: string | null
  originalSql?: string | null
  safeSql?: any
  checks: string[]
  warnings: string[]
  whitelistTables: string[]
  whitelistColumns: string[]
  recallMode?: string | null
  limitApplied?: boolean | null
  limitClamped?: boolean | null
}

/**
 * S7 只读查询执行结果
 * 对应 framework/sqlguard/QueryResult.java
 * rows 为 List<List<Object>>，用 any[][] 承载动态结果集
 */
export interface QueryResult {
  auditId: number
  traceId: string
  executedSql: string
  columnNames: string[]
  columnTypes: string[]
  rows: any[][]
  rowCount: number
  truncated: boolean
  masked: boolean
  readonlyConnection: boolean
  latencyMs: number
  recallMode?: string | null
  warnings: string[]
}

const BASE_URL = '/data-query/sql-guard'

/** 仅校验不执行：返回 SafeSql 与逐项校验报告（权限 data-query:sql-guard:validate） */
export const validate = (data: SqlGuardReqVO) =>
  request.post({ url: `${BASE_URL}/validate`, data })

/** 校验通过后走独立只读连接执行（权限 data-query:sql-guard:execute） */
export const execute = (data: SqlGuardReqVO) =>
  request.post({ url: `${BASE_URL}/execute`, data })
