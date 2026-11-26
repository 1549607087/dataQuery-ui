import request from '@/config/axios'

/** 管理后台 - S3 Schema 召回 Request VO */
export interface SchemaRecallReqVO {
  datasourceId: number
  question: string
  topK: number
}

/** SchemaContext 内部类：召回的表 */
export interface SchemaContextTableItem {
  tableId: number
  schemaName: string
  tableName: string
  nameZh: string
  description: string
  tableRole: number
  defaultTimeColumn: string
  score: number
  columns: SchemaContextColumnItem[]
}

/** SchemaContext 内部类：召回的列 */
export interface SchemaContextColumnItem {
  columnId: number
  columnName: string
  nameZh: string
  dataType: string
  unit: string
  metricDef: string
  synonyms: string
  sensitiveType: number
  maskRule: string
  ordinalPosition: number
  sort: number
  score: number
  enums: SchemaContextEnumItem[]
}

/** SchemaContext 内部类：枚举映射 */
export interface SchemaContextEnumItem {
  sourceValue: string
  displayName: string
}

/** SchemaContext 内部类：已验证的 Join 路径 */
export interface SchemaContextJoinItem {
  leftTableId: number
  rightTableId: number
  leftTableName: string
  rightTableName: string
  joinType: number
  joinPairs: string
  joinCondition: string
  cost: number
  verified: number
}

/** SchemaContext 内部类：命中记录 */
export interface SchemaContextHitItem {
  vectorId: number
  objectType: number
  tableId: number
  columnId: number
  tableName: string
  columnName: string
  distance: number
  keywordScore: number
  rrfScore: number
  source: string
  vectorRank: number
  keywordRank: number
}

/**
 * S3 Schema 召回结果，同时是 S6 的表列白名单与 S4 的变量来源。
 * 不回显 tenant_id / deleted / embedding 向量字面量与任何业务数据行。
 */
export interface SchemaContext {
  datasourceId: number
  question: string
  recallMode: string
  degraded: boolean
  degradeReason: string
  recommendClarify: boolean
  embeddingModelCode: string
  dimension: number
  structVersion: number
  dialect: string
  identifierQuote: string
  quoteAll: number
  sqlRules: string
  schemaText: string
  tokenEstimate: number
  truncated: boolean
  latencyMs: number
  vectorCandidateCount: number
  keywordCandidateCount: number
  hitTableCount: number
  tables: SchemaContextTableItem[]
  joins: SchemaContextJoinItem[]
  hits: SchemaContextHitItem[]
  tableIds: number[]
  columnIds: number[]
  metricDefs: string[]
  synonyms: string[]
}

const BASE_URL = '/data-query/schema-recall'

/** 召回预览：向量 + 关键词混合重排，返回 SchemaContext 与 S6 白名单 */
export const previewSchemaRecall = (data: SchemaRecallReqVO) =>
  request.post({ url: `${BASE_URL}/preview`, data })
