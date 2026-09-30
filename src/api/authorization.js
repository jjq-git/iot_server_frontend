import http from './http'

export const fetchAuthorizationContexts = () => http.get('/authorization/contexts')
export const switchOrganization = companyId => http.post('/auth/switch-organization', { company_id: companyId })
export const fetchDelegablePermissions = () => http.get('/authorization/permissions')
export const fetchOrganizationRoles = companyId => http.get(`/authorization/companies/${companyId}/roles`)
export const createOrganizationRole = (companyId, data) => http.post(`/authorization/companies/${companyId}/roles`, data)
export const fetchOrganizationMemberships = companyId => http.get(`/authorization/companies/${companyId}/memberships`)
export const updateMembershipRole = (membershipId, roleId) => http.put(`/authorization/memberships/${membershipId}/roles`, { role_id: roleId })
export const deactivateMembership = membershipId => http.delete(`/authorization/memberships/${membershipId}`)
