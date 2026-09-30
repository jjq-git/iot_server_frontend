import http from './http'

export const fetchPodBookings = params => http.get('/pod-bookings', { params })
export const fetchPodBooking = uuid => http.get(`/pod-bookings/${uuid}`)
export const fetchPodBookingLogs = uuid => http.get(`/pod-bookings/${uuid}/logs`)
export const fetchPodBookingDeliveries = uuid => http.get(`/pod-bookings/${uuid}/deliveries`)
export const retryPodBookingDelivery = uuid => http.post(`/pod-bookings/${uuid}/retry-delivery`)
export const createPodBooking = (data, idempotencyKey) => http.post('/pod-bookings', data, {
  headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
})
export const updatePodBooking = (uuid, data) => http.patch(`/pod-bookings/${uuid}`, data)
export const cancelPodBooking = uuid => http.post(`/pod-bookings/${uuid}/cancel`)

export const fetchBookablePods = params => http.get('/pod-booking-configs/bookable-pods', { params })
export const fetchPodBookingCapabilities = () => http.get('/pod-booking-configs/pod-capabilities')
export const fetchPodBookingConfigs = () => http.get('/pod-booking-configs')
export const createPodBookingConfig = data => http.post('/pod-booking-configs', data)
export const updatePodBookingConfig = (uuid, data) => http.patch(`/pod-booking-configs/${uuid}`, data)
export const switchPodBookingSource = (uuid, data) => http.post(`/pod-booking-configs/${uuid}/switch-source`, data)
