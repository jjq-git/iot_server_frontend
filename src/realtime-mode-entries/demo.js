import { createDemoHostRealtime, createDemoPodRealtime } from '@/demo/realtime'

export const podDetailRealtime = createDemoHostRealtime()
export const podControlRealtime = createDemoPodRealtime()
export const legacyRealtimeManager = createDemoHostRealtime()

export function disconnectAllDemoRealtime () {
  podDetailRealtime.disconnect()
  podControlRealtime.disconnect()
  legacyRealtimeManager.disconnect()
}
