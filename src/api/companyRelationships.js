import http from './http'

export const fetchCompanyRelationships = () => http.get('/company-relationships')

export const requestCompanyRelationship = (buyerCompanyCode, capabilities = {}) => http.post('/company-relationships', {
  buyer_company_code: buyerCompanyCode,
  ...capabilities
})

export const acceptCompanyRelationship = relationshipId => http.post(`/company-relationships/${relationshipId}/accept`)

export const rejectCompanyRelationship = relationshipId => http.post(`/company-relationships/${relationshipId}/reject`)

export const endCompanyRelationship = relationshipId => http.post(`/company-relationships/${relationshipId}/end`)

export const updateCompanyRelationshipCapabilities = (relationshipId, data) => http.put(
  `/company-relationships/${relationshipId}/capabilities`,
  data
)
