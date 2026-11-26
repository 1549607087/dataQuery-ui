import request from '@/config/axios'

/**
 * 租户 AI 配置初始化状态
 * 对应 controller/admin/tenant/vo/AiTenantInitStatusRespVO.java
 */
export interface AiTenantInitStatusRespVO {
  tenantId: number
  providerCount: number
  configCount: number
  bindingCount: number
  initialized: boolean
}

const BASE_URL = '/data-query/tenant-init'

/**
 * 初始化指定租户的 AI 模型配置（幂等）
 * tenantId 不传则取当前租户；返回 CommonResult<Boolean>
 * 权限 data-query:tenant-init:create
 */
export const initTenant = (tenantId?: number) =>
  request.post({ url: `${BASE_URL}/init`, params: { tenantId } })

/**
 * 查询指定租户的 AI 配置初始化状态
 * tenantId 不传则取当前租户
 * 权限 data-query:tenant-init:query
 */
export const getTenantInitStatus = (tenantId?: number) =>
  request.get({ url: `${BASE_URL}/status`, params: { tenantId } })
