import http from './http'

export const fetchMeetingProviders = () => http.get('/meeting-providers')
export const fetchMeetingIntegrations = () => http.get('/meeting-integrations')
export const createMeetingIntegration = data => http.post('/meeting-integrations', data)
export const testMeetingIntegration = uuid => http.post(`/meeting-integrations/${uuid}/test`)
export const syncMeetingIntegration = uuid => http.post(`/meeting-integrations/${uuid}/sync`)
export const fetchMeetingRoomCandidates = uuid => http.get(`/meeting-integrations/${uuid}/room-candidates`)

export const fetchMeetingRoomMappings = () => http.get('/meeting-room-mappings')
export const createMeetingRoomMapping = data => http.post('/meeting-room-mappings', data)
export const verifyMeetingRoomMapping = uuid => http.post(`/meeting-room-mappings/${uuid}/verify`)
