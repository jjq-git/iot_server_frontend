import http from './http'

export const fetchEffectiveHostFiles = hostUuid =>
  http.get(`/hosts/${encodeURIComponent(hostUuid)}/files/effective`)

export const fetchFileDeployments = (hostUuid, params = {}) =>
  http.get(`/hosts/${encodeURIComponent(hostUuid)}/file-deployments`, { params })

export const retryFileDeployment = (hostUuid, deploymentUuid) =>
  http.post(`/hosts/${encodeURIComponent(hostUuid)}/file-deployments/${deploymentUuid}/retry`)

export const rollbackFileDeployment = (hostUuid, deploymentUuid, targetDeploymentUuid = null) =>
  http.post(
    `/hosts/${encodeURIComponent(hostUuid)}/file-deployments/${deploymentUuid}/rollback`,
    { target_deployment_uuid: targetDeploymentUuid }
  )
