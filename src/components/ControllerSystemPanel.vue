<template>
  <div class="controller-system-panel">
    <!-- 实时监视 -->
    <base-card class="mb-3" :title="$t('controller_console.system.monitor')">
      <div class="d-flex flex-wrap align-items-center">
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.system.vext') }}</div>
          <div class="h5 mb-0">{{ vextText }}</div>
        </div>
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.system.ext_pwr') }}</div>
          <b-badge :variant="extPwrOk ? 'success' : 'danger'">
            {{ extPwrOk ? $t('controller_console.system.online') : $t('controller_console.system.missing') }}
          </b-badge>
        </div>
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.system.overcur') }}</div>
          <b-badge :variant="overcurOk ? 'success' : 'danger'">
            {{ overcurOk ? $t('controller_console.system.normal') : $t('controller_console.system.overcurrent') }}
          </b-badge>
        </div>
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.system.ready') }}</div>
          <b-badge :variant="sys.ready ? 'success' : 'secondary'">
            {{ sys.ready ? $t('controller_console.system.yes') : $t('controller_console.system.no') }}
          </b-badge>
        </div>
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.system.cfg_err') }}</div>
          <b-badge :variant="cfgErrOk ? 'success' : 'danger'">
            {{ cfgErrOk ? $t('controller_console.system.normal') : $t('controller_console.system.error') }}
          </b-badge>
        </div>
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.system.int_flags') }}</div>
          <div class="h5 mb-0">{{ intFlagsText }}</div>
        </div>
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.system.chip') }}</div>
          <div class="h5 mb-0">{{ chipText }}</div>
        </div>
        <div class="mb-2">
          <div class="text-muted small">{{ $t('controller_console.system.fw') }}</div>
          <div class="h5 mb-0">{{ fwText }}</div>
        </div>
      </div>
    </base-card>

    <!-- 系统控制 -->
    <base-card :title="$t('controller_console.system.control')">
      <base-form-group :label="$t('controller_console.system.wdt') + '：' + form.timeout + ' s'">
        <base-input v-model.number="form.timeout" type="number" min="0" max="255" step="1" :clearable="false" />
      </base-form-group>
      <div class="mb-3">
        <base-button variant="primary" :disabled="sending" @click="applyWdt">
          <b-spinner v-if="sending" small /> {{ $t('controller_console.system.set_wdt') }}
        </base-button>
      </div>

      <hr />

      <div class="d-flex flex-wrap">
        <base-button variant="success" class="mr-2 mb-2" :disabled="sending" @click="save">
          <b-spinner v-if="sending" small /> {{ $t('controller_console.system.save') }}
        </base-button>
        <base-button variant="warning" class="mr-2 mb-2" :disabled="sending" @click="reset">
          {{ $t('controller_console.system.reset') }}
        </base-button>
        <base-button variant="danger" class="mb-2" :disabled="sending" @click="confirmFactory">
          {{ $t('controller_console.system.factory') }}
        </base-button>
      </div>
    </base-card>

    <!-- 恢复出厂二次确认 -->
    <base-modal
      v-model="factoryModal"
      :title="$t('controller_console.system.factory')"
      :ok-title="$t('controller_console.system.factory_ok')"
      :cancel-title="$t('controller_console.cancel')"
      ok-variant="danger"
      @ok="factory" :centered="false" :scrollable="false"
    >
      {{ $t('controller_console.system.factory_confirm') }}
    </base-modal>
  </div>
</template>

<script>
import { sendRawCommand } from '@/api/controller'

export default {
  name: 'ControllerSystemPanel',
  props: {
    podUuid: { type: String, required: true },
    // 来自父组件的 status.controller.sys 子树,WS 推送时实时更新
    sys: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      sending: false,
      factoryModal: false,
      form: { timeout: 30 }
    }
  },
  computed: {
    vextText () {
      const v = this.sys.vext
      if (v == null) return '--'
      return (v / 1000).toFixed(2) + ' V'
    },
    extPwrOk () {
      return Number(this.sys.extPwr) === 1
    },
    overcurOk () {
      // overcur: 0 正常 / 1 过流
      return Number(this.sys.overcur || 0) === 0
    },
    cfgErrOk () {
      // cfgErr: 0 正常 / 1 错
      return Number(this.sys.cfgErr || 0) === 0
    },
    intFlagsText () {
      const v = this.sys.intFlags
      if (v == null) return '--'
      return '0x' + Number(v).toString(16).toUpperCase()
    },
    chipText () {
      return this.sys.chip || '--'
    },
    fwText () {
      const v = this.sys.fw
      if (v == null) return '--'
      return 'FW ' + v
    }
  },
  methods: {
    async send (payload) {
      this.sending = true
      try {
        await sendRawCommand(this.podUuid, payload)
        this.$uiToast.success(this.$t('controller_console.toast.queued'))
      } catch (e) {
        this.$uiToast.error(this.$t('controller_console.toast.send_failed') +
          (this.$getErrorMessage(e)))
      } finally {
        this.sending = false
      }
    },
    applyWdt () {
      this.send({ op: 'sys.wdt', timeout: this.form.timeout })
    },
    save () {
      this.send({ op: 'sys.save' })
    },
    reset () {
      this.send({ op: 'sys.reset' })
    },
    confirmFactory () {
      this.factoryModal = true
    },
    factory () {
      this.send({ op: 'sys.factory' })
    }
  }
}
</script>

<style scoped>
.controller-system-panel hr {
  margin: 0.75rem 0;
}
</style>
