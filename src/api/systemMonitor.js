import http from './http'

export const fetchSystemHealth = () => http.get('/system-monitor/health')

export const fetchSystemMetrics = () => http.get('/system-monitor/metrics')

export const fetchSystemMqtt = () => http.get('/system-monitor/mqtt')
