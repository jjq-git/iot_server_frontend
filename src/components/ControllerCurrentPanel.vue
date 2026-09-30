<template>
  <div class="controller-current-panel">
    <!-- 实时监视(纯监视,无控制) -->
    <base-card :title="$t('controller_console.current.monitor')">
      <!-- 顶部在线状态 -->
      <div class="d-flex align-items-center mb-3">
        <span class="text-muted small mr-2">{{ $t('controller_console.current.online_status') }}</span>
        <b-badge :variant="online ? 'success' : 'warning'">
          {{ online ? $t('controller_console.current.online_all') : $t('controller_console.current.online_partial') }}
        </b-badge>
      </div>

      <!-- 6 路电流表格 -->
      <base-table
        :items="rows"
        :fields="fields"
        small
        responsive
        striped
        hover
        :empty-text="$t('controller_console.current.empty')"
        show-empty
      >
        <!-- 地址 hex -->
        <template #cell(addr)="data">
          <code>{{ data.value }}</code>
        </template>
        <!-- 在线:绿勾红叉 -->
        <template #cell(ok)="data">
          <span :class="data.value ? 'text-success' : 'text-danger'">
            {{ data.value ? '✓' : '✗' }}
          </span>
        </template>
      </base-table>
    </base-card>
  </div>
</template>

<script>
import { sendRawCommand } from '@/api/controller'

export default {
  name: 'ControllerCurrentPanel',
  props: {
    podUuid: { type: String, required: true },
    // 来自父组件的 status.controller.ina 子树,WS 推送时实时更新
    ina: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      sending: false
    }
  },
  computed: {
    // 顶部在线状态:online 为 1 表示两颗芯片全在线
    online () {
      return !!this.ina.online
    },
    // 表格列定义(标题走 i18n)
    fields () {
      return [
        { key: 'name', label: this.$t('controller_console.current.col_name') },
        { key: 'addr', label: this.$t('controller_console.current.col_addr') },
        { key: 'current', label: this.$t('controller_console.current.col_current') },
        { key: 'voltage', label: this.$t('controller_console.current.col_voltage') },
        { key: 'shunt', label: this.$t('controller_console.current.col_shunt') },
        { key: 'ok', label: this.$t('controller_console.current.col_ok') }
      ]
    },
    // 6 路通道格式化:电流 ma10÷10(mA)、母线 mv÷1000(V,2 位)、分流 uv(µV)
    rows () {
      const ch = Array.isArray(this.ina.ch) ? this.ina.ch : []
      return ch.map((c) => ({
        name: c.n != null ? c.n : '--',
        addr: c.a != null ? '0x' + Number(c.a).toString(16).toUpperCase() : '--',
        current: c.ma10 != null ? (c.ma10 / 10).toFixed(1) + ' mA' : '--',
        voltage: c.mv != null ? (c.mv / 1000).toFixed(2) + ' V' : '--',
        shunt: c.uv != null ? c.uv + ' µV' : '--',
        ok: !!c.ok
      }))
    }
  },
  methods: {
    // 主动读取一次 INA 采样(命令透传;表格仍以父组件 WS 推送为准)
    async refresh () {
      this.sending = true
      try {
        await sendRawCommand(this.podUuid, { op: 'ina.read' })
        this.$uiToast.success(this.$t('controller_console.toast.queued'))
      } catch (e) {
        this.$uiToast.error(this.$t('controller_console.toast.send_failed') +
          (this.$getErrorMessage(e)))
      } finally {
        this.sending = false
      }
    }
  }
}
</script>

<style scoped>
.controller-current-panel code {
  font-size: var(--font-size-code);
}
</style>
