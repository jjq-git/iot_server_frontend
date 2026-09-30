import Vue from 'vue'
import { registerDemoSessionService } from '@/app-mode/runtime'
import { bootstrapDemo } from '@/demo/bootstrap'
import { demoSessionService } from '@/demo/session'

export async function bootstrapAppModeInfrastructure () {
  const [{ default: DemoRolePicker }, { default: DemoToolbar }] = await Promise.all([
    import('@/components/demo/DemoRolePicker.vue'),
    import('@/components/demo/DemoToolbar.vue')
  ])
  Vue.component('DemoRolePicker', DemoRolePicker)
  Vue.component('DemoToolbar', DemoToolbar)
  registerDemoSessionService(demoSessionService)
  await bootstrapDemo()
}
