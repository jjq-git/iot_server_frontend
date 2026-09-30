<template>
  <div class="controller-register-panel">
    <!-- 寄存器监视 -->
    <base-card :title="$t('controller_console.register.monitor')">
      <!-- 工具条:hex/dec 切换 + 刷新读取 -->
      <div class="d-flex flex-wrap align-items-center justify-content-between mb-3">
        <b-form-radio-group
          v-model="base"
          buttons
          button-variant="outline-secondary"
          size="sm"
        >
          <b-form-radio value="hex">{{ $t('controller_console.register.hex') }}</b-form-radio>
          <b-form-radio value="dec">{{ $t('controller_console.register.dec') }}</b-form-radio>
        </b-form-radio-group>
        <base-button
          variant="outline-secondary"
          size="sm"
          :disabled="sending"
          @click="readRegs"
        >
          <b-spinner v-if="sending" small /> {{ $t('controller_console.register.read') }}
        </base-button>
      </div>

      <!-- 无数据占位 -->
      <div v-if="!hasData" class="text-muted text-center py-4">
        {{ $t('controller_console.register.empty') }}
      </div>

      <!-- 按固件分段展示 -->
      <template v-else>
        <div v-for="seg in segments" :key="seg.start" class="reg-segment mb-3">
          <div class="d-flex align-items-center mb-2">
            <b-badge :variant="seg.variant" class="mr-2">{{ $t(seg.labelKey) }}</b-badge>
            <span class="text-muted small">{{ addrHex(seg.start) }} – {{ addrHex(seg.end) }}</span>
          </div>
          <base-table
            :items="rowsOf(seg)"
            :fields="fields"
            small
            bordered
            striped
            responsive
            class="reg-table mb-0" :hover="false" :show-empty="false"
          >
            <template #cell(addr)="row">
              <code>{{ row.value }}</code>
            </template>
            <template #cell(val)="row">
              <code>{{ row.value }}</code>
            </template>
          </base-table>
        </div>
      </template>
    </base-card>
  </div>
</template>

<script>
import { sendRawCommand } from '@/api/controller'

// 固件寄存器分段定义(每段 16 字节)
const SEGMENTS = [
  { start: 0x00, end: 0x0F, labelKey: 'controller_console.register.seg_system', variant: 'primary' },
  { start: 0x10, end: 0x1F, labelKey: 'controller_console.register.seg_fan', variant: 'info' },
  { start: 0x20, end: 0x2F, labelKey: 'controller_console.register.seg_light', variant: 'warning' },
  { start: 0x30, end: 0x3F, labelKey: 'controller_console.register.seg_radar', variant: 'success' },
  { start: 0x40, end: 0x4F, labelKey: 'controller_console.register.seg_indicator', variant: 'secondary' }
]

export default {
  name: 'ControllerRegisterPanel',
  props: {
    podUuid: { type: String, required: true },
    // 来自父组件的 status.controller.regs 子树,WS 推送时实时更新
    // 形如 128 字节数组,或 { v: [...128] }
    regs: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      sending: false,
      base: 'hex'
    }
  },
  computed: {
    // 归一化为 128 长度字节数组(兼容直接数组 / { v:[...] } 两种形态)
    bytes () {
      const raw = this.regs
      let arr = null
      if (Array.isArray(raw)) {
        arr = raw
      } else if (raw && Array.isArray(raw.v)) {
        arr = raw.v
      }
      if (!arr || !arr.length) return null
      const out = new Array(128).fill(null)
      for (let i = 0; i < 128 && i < arr.length; i++) {
        const n = arr[i]
        out[i] = (n == null || isNaN(n)) ? null : (Number(n) & 0xFF)
      }
      return out
    },
    hasData () {
      return this.bytes != null
    },
    segments () {
      return SEGMENTS
    },
    fields () {
      return [
        { key: 'addr', label: this.$t('controller_console.register.col_addr'), thStyle: { width: '40%' } },
        { key: 'val', label: this.$t('controller_console.register.col_value') }
      ]
    }
  },
  methods: {
    addrHex (n) {
      return '0x' + Number(n).toString(16).toUpperCase().padStart(2, '0')
    },
    fmtVal (n) {
      if (n == null) return '--'
      if (this.base === 'hex') {
        return '0x' + Number(n).toString(16).toUpperCase().padStart(2, '0')
      }
      return String(n)
    },
    rowsOf (seg) {
      const rows = []
      const bytes = this.bytes || []
      for (let a = seg.start; a <= seg.end; a++) {
        rows.push({
          addr: this.addrHex(a),
          val: this.fmtVal(bytes[a])
        })
      }
      return rows
    },
    async readRegs () {
      this.sending = true
      try {
        await sendRawCommand(this.podUuid, { op: 'reg.read' })
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
.reg-table >>> code {
  color: inherit;
}

.reg-segment:last-child {
  margin-bottom: 0 !important;
}
</style>
