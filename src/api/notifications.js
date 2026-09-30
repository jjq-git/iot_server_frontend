import http from './http'

export const fetchNotifications = (params = {}) => http.get('/notifications', { params })

export const acknowledgeNotification = uuid => (
  http.post(`/notifications/${encodeURIComponent(uuid)}/ack`)
)
