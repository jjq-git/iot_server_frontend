// API 聚合：按模块导出请求方法
import http from './http'

// 仪表盘汇总（保留原导出名，调用收敛到独立 API 模块）
export { fetchDashboardSummary as fetchDashboard } from './dashboard'

// 登录
export const login = data => http.post('/auth/login', data)

// 审计日志
export { fetchAuditLogDetail, fetchAuditLogs, exportAuditLogs } from './audit'

// 公司管理
export {
  fetchCompanies,
  fetchCompanyDetail,
  createCompany,
  updateCompany
} from './companies'

export {
  fetchCompanyRelationships,
  requestCompanyRelationship,
  acceptCompanyRelationship,
  rejectCompanyRelationship,
  endCompanyRelationship,
  updateCompanyRelationshipCapabilities
} from './companyRelationships'

// 用户管理
export {
  fetchUsers,
  fetchUserDetail,
  updateUser,
  updateUserRole
} from './users'

// 型号管理
export {
  fetchHnModels,
  fetchHnModelHardwareLines,
  fetchHnModelRevisions,
  fetchHnModelVersions,
  fetchHnModelDetail,
  createHnModel,
  updateHnModel,
  deleteHnModel,
  fetchModelIndexes
} from './hnModels'

export {
  fetchSoftwareVersionWebUi,
  replaceSoftwareVersionWebUi,
  clearSoftwareVersionWebUi,
  downloadSoftwareVersionWebUi,
  downloadSoftwareVersionWebUiAsset
} from './softwareVersionWebUi'

// 主机管理
export {
  fetchHosts,
  fetchHostDetail,
  createHost,
  updateHost,
  retireHost,
  restoreHost,
  shipHost,
  confirmHostReceipt,
  checkFirmwareUpdate,
  fetchHnModelOptions
} from './hosts'

// 节点管理
export {
  fetchNodes,
  fetchNodeDetail,
  createNode,
  updateNode,
  retireNode,
  restoreNode,
  checkNodeFirmware,
  shipNode
} from './nodes'

// 主机节点绑定
export {
  fetchHostNodes,
  createBinding,
  updateCanNodeId,
  replaceNode,
  deleteBinding
} from './hnBindings'

// 位置管理
export {
  fetchLocations,
  fetchLocationDetail,
  createLocation,
  updateLocation,
  deleteLocation
} from './locations'

// 静音仓型号管理
export {
  fetchPodModels,
  fetchPodModelDetail,
  createPodModel,
  updatePodModel,
  deletePodModel,
  fetchHostsForBinding,
  fetchNodesForBinding
} from './podModels'

// 行政区划管理
export {
  fetchDistrictsTree,
  fetchProvinces,
  fetchCities,
  fetchDistricts,
  searchDistricts
} from './districts'

// 文件管理
export {
  fetchFiles,
  fetchFileDetail,
  uploadFile,
  deleteFile,
  downloadFile,
  fetchFileRelations,
  createFileRelation,
  updateFileRelation,
  deleteFileRelation,
  publishFileRelation,
  disableFileRelation,
  fetchFileStats
} from './files'

export {
  fetchEffectiveHostFiles,
  fetchFileDeployments,
  retryFileDeployment,
  rollbackFileDeployment
} from './hostFiles'

// 静音仓管理
export {
  fetchPods,
  fetchPodDetail,
  createPod,
  updatePod,
  retirePod,
  restorePod,
  fetchPodModelOptions,
  fetchPodStatus,
  fetchPodRecords,
  sendPodCommand,
  exportPodRecords
} from './pods'

// 用户管理
export {
  getCurrentUser,
  updateCurrentUser,
  updatePassword,
  fetchLoginLogs,
  getRefreshToken
} from './user'
