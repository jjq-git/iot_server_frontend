<template>
  <div class="controller-console">
    <div class="interaction-list-card-shell">
      <page-section-card class="filter-card">
        <div class="filter-row">
          <div class="filter-left">
            <b-form-select
              v-model="selectedUuid"
              :options="controllerOptions"
              class="filter-control"
              @change="onSelect"
            />
            <div class="filter-actions">
              <b-badge :variant="online ? 'success' : 'secondary'">
                {{ online ? $t('controller_console.online') : $t('controller_console.offline') }}
              </b-badge>
              <base-button variant="outline-secondary" :disabled="!selectedUuid" @click="reload">
                <app-icon name="arrow-clockwise" /> {{ $t('controller_console.refresh') }}
              </base-button>
            </div>
          </div>
        </div>
      </page-section-card>

      <base-card class="resource-table-card controller-console__workspace">
        <div v-if="loading" class="resource-loading-state">
          <b-spinner /> {{ $t('common.loading') }}
        </div>

        <div v-else-if="!selectedUuid" class="resource-empty-state">
          <app-icon name="sliders" />
          <span>{{ $t('controller_console.select_hint') }}</span>
        </div>

        <b-tabs v-else pills>
      <b-tab :title="$t('controller_console.tabs.radar')" active>
        <controller-radar-panel :pod-uuid="selectedUuid" :radar="ctrl.radar || {}" />
      </b-tab>
      <b-tab :title="$t('controller_console.tabs.fan')">
        <controller-fan-panel :pod-uuid="selectedUuid" :fan="ctrl.fan || {}" />
      </b-tab>
      <b-tab :title="$t('controller_console.tabs.light')">
        <controller-light-panel :pod-uuid="selectedUuid" :light="ctrl.led || {}" />
      </b-tab>
      <b-tab :title="$t('controller_console.tabs.indicator')">
        <controller-indicator-panel :pod-uuid="selectedUuid" :indicator="ctrl.indicator || {}" />
      </b-tab>
      <b-tab :title="$t('controller_console.tabs.system')">
        <controller-system-panel :pod-uuid="selectedUuid" :sys="ctrl.sys || {}" />
      </b-tab>
      <b-tab :title="$t('controller_console.tabs.current')">
        <controller-current-panel :pod-uuid="selectedUuid" :ina="ctrl.ina || {}" />
      </b-tab>
      <b-tab :title="$t('controller_console.tabs.register')">
        <controller-register-panel :pod-uuid="selectedUuid" :regs="ctrl.regs || {}" />
      </b-tab>
      <b-tab :title="$t('controller_console.tabs.commands')">
        <base-table
          :items="commands"
          :fields="commandFields"
          :empty-text="$t('controller_console.no_commands')"
        >
          <template #cell(status)="data">
            <b-badge :variant="statusVariant(data.value)">{{ data.value }}</b-badge>
          </template>
        </base-table>
      </b-tab>
        </b-tabs>
      </base-card>
    </div>
  </div>
</template>

<script>
import {
  fetchControllerStatus,
  fetchControllerCommands
} from '@/api/controller'
import { fetchPods } from '@/api/pods'
import { legacyRealtimeManager as wsManager } from '@realtime-mode-entry'
import ControllerRadarPanel from '@/components/ControllerRadarPanel.vue'
import ControllerFanPanel from '@/components/ControllerFanPanel.vue'
import ControllerLightPanel from '@/components/ControllerLightPanel.vue'
import ControllerIndicatorPanel from '@/components/ControllerIndicatorPanel.vue'
import ControllerSystemPanel from '@/components/ControllerSystemPanel.vue'
import ControllerCurrentPanel from '@/components/ControllerCurrentPanel.vue'
import ControllerRegisterPanel from '@/components/ControllerRegisterPanel.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseTable from '@/components/base/BaseTable.vue'

export default {
  name: 'ControllerWebConsole',
  components: {
    ControllerRadarPanel,
    ControllerFanPanel,
    ControllerLightPanel,
    ControllerIndicatorPanel,
    ControllerSystemPanel,
    ControllerCurrentPanel,
    ControllerRegisterPanel,
    BaseCard,
    BaseTable
  },
  data () {
    return {
      loading: false,
      controllers: [],
      selectedUuid: '',
      online: false,
      status: {},
      commands: []
    }
  },
  computed: {
    // 必须是 computed：放在 data() 里 $t 只求值一次，切换语言后表头不会更新
    commandFields () {
      return [
        { key: 'command', label: this.$t('controller_console.cmd_op') },
        { key: 'status', label: this.$t('controller_console.cmd_status') },
        { key: 'queued_at', label: this.$t('controller_console.cmd_time') }
      ]
    },
    controllerOptions () {
      const opts = this.controllers.map(c => ({
        value: c.uuid,
        text: c.name || c.uuid
      }))
      return [{ value: '', text: this.$t('controller_console.select_placeholder') }, ...opts]
    },
    // status.controller 子树(后端 _merge_status 归类)
    ctrl () {
      return (this.status && this.status.controller) || {}
    }
  },
  async mounted () {
    await this.loadControllers()
  },
  beforeDestroy () {
    wsManager.disconnect()
  },
  methods: {
    async loadControllers () {
      this.loading = true
      try {
        const res = await fetchPods({ page_size: 200 })
        this.controllers = res.items || res.data || res || []
      } catch (e) {
        this.$uiToast.error(this.$t('controller_console.toast.load_failed'))
      } finally {
        this.loading = false
      }
    },
    async onSelect () {
      wsManager.disconnect()
      if (!this.selectedUuid) return
      await this.loadData()
      this.connectWs()
    },
    async loadData () {
      try {
        const [st, cmds] = await Promise.all([
          fetchControllerStatus(this.selectedUuid),
          fetchControllerCommands(this.selectedUuid, { page_size: 20 })
        ])
        this.status = st.status || st || {}
        this.online = st.is_online || false
        this.commands = cmds.items || cmds.data || cmds || []
      } catch (e) {
        this.$uiToast.error(this.$t('controller_console.toast.load_failed'))
      }
    },
    reload () {
      if (this.selectedUuid) this.loadData()
    },
    connectWs () {
      wsManager.connectSingle(this.selectedUuid, {
        status_update: (data) => {
          // 后端 WS 推 {type:'status_update', status:{...}} 或 fields
          const s = data.status || data.fields || data
          if (s && typeof s === 'object') {
            this.status = { ...this.status, ...s }
            if (s.is_online != null) this.online = s.is_online
          }
        },
        command_ack: () => {
          // 命令回执:刷新命令历史
          this.loadData()
        }
      })
    },
    statusVariant (s) {
      return { success: 'success', failed: 'danger', timeout: 'warning', sent: 'info', queued: 'secondary' }[s] || 'secondary'
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/controller-web-console.scss"></style>
