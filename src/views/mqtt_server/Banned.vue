<template>
  <div class="mqtt-banned">
    <base-card v-if="canWrite" class="list-toolbar">
      <div class="d-flex justify-content-end align-items-center flex-wrap">
        <div>
          <base-button variant="primary" size="sm" @click="openAddModal">
        <app-icon name="plus" /> {{ $t('mqtt_banned.actions.add') }}
          </base-button>
        </div>
      </div>
    </base-card>

    <base-card v-if="health && !health.configured" class="text-center py-4 mqtt-notconfigured">
      <app-icon name="cloud-slash" font-scale="3" class="text-secondary mb-3" />
      <h5>{{ $t('mqtt_banned.not_configured_title') }}</h5>
      <p class="text-muted mb-0">
        {{ $t('mqtt_banned.not_configured_desc_prefix') }}<code>EMQX_DASHBOARD_URL/USERNAME/PASSWORD</code>{{ $t('mqtt_banned.not_configured_desc_suffix') }}
      </p>
    </base-card>

    <template v-else-if="health">
      <base-card no-body>
        <base-table
          :items="rows"
          :fields="fields"
          :loading="loading"
          :load-error="loadError"
          small
          striped
          responsive
          :empty-text="$t('mqtt_banned.empty')"
          @retry="loadList"
        >
          <template #table-busy>
            <div class="text-center my-3">
              <b-spinner small /> {{ $t('mqtt_banned.loading') }}
            </div>
          </template>
          <template #cell(as)="row">
            <b-badge :variant="asVariant(row.item.as)">{{ asLabel(row.item.as) }}</b-badge>
          </template>
          <template #cell(who)="row">
            <code>{{ row.item.who }}</code>
          </template>
          <template #cell(until)="row">
            <small>{{ row.item.until ? formatTime(row.item.until) : $t('mqtt_banned.permanent') }}</small>
          </template>
          <template #cell(by)="row">
            <small class="text-muted">{{ row.item.by || '-' }}</small>
          </template>
          <template #cell(actions)="row">
            <div class="action-cell action-cell--nowrap">
              <base-action-button
                v-if="canWrite"
                class="text-danger"
                :title="$t('mqtt_banned.actions.remove')"
                @click="confirmRemove(row.item)"
              >
                <app-icon name="x-circle"  />
                <span>{{ $t('mqtt_banned.actions.remove') }}</span>
              </base-action-button>
              <span v-else class="text-muted small">{{ $t('mqtt_banned.view_only') }}</span>
            </div>
          </template>
        </base-table>
      </base-card>
    </template>

    <!-- 添加 modal -->
    <base-modal
      v-model="addModal.show"
      :title="$t('mqtt_banned.add_modal.title')"
      ok-variant="danger"
      :ok-title="$t('mqtt_banned.add_modal.ok')"
      :cancel-title="$t('mqtt_banned.add_modal.cancel')"
      :ok-disabled="!addModal.form.who"
      :busy="addModal.busy"
      @ok="doAdd"
      @hidden="resetAddForm" :centered="false" :scrollable="false"
    >
      <base-form-group :label="$t('mqtt_banned.add_modal.label_type')" label-cols="3">
        <b-form-select v-model="addModal.form.as" :options="asOptions" />
      </base-form-group>
      <base-form-group :label="whoLabel" label-cols="3">
        <base-input
          v-model.trim="addModal.form.who"
          :placeholder="whoPlaceholder" :clearable="false"
        />
      </base-form-group>
      <base-form-group :label="$t('mqtt_banned.add_modal.label_reason')" label-cols="3">
        <base-input
          v-model.trim="addModal.form.reason"
          :placeholder="$t('mqtt_banned.add_modal.reason_placeholder')" :clearable="false"
        />
      </base-form-group>
      <base-form-group :label="$t('mqtt_banned.add_modal.label_until')" label-cols="3">
        <b-form-datepicker
          v-model="addModal.form.until"
          v-bind="datepickerI18n"
          :placeholder="$t('mqtt_banned.add_modal.until_placeholder')"
          reset-button
          close-button
        />
      </base-form-group>
      <small class="text-muted">
        {{ $t('mqtt_banned.add_modal.warning_prefix') }}{{ asLabel(addModal.form.as) }}{{ $t('mqtt_banned.add_modal.warning_suffix') }}
      </small>
    </base-modal>

    <!-- 移除 modal -->
    <base-modal
      v-model="removeModal.show"
      :title="$t('mqtt_banned.remove_modal.title')"
      ok-variant="warning"
      :ok-title="$t('mqtt_banned.remove_modal.ok')"
      :cancel-title="$t('mqtt_banned.remove_modal.cancel')"
      :busy="removeModal.busy"
      @ok="doRemove" :centered="false" :scrollable="false"
    >
      <p>
        {{ $t('mqtt_banned.remove_modal.confirm_prefix') }}<b-badge>{{ asLabel(removeModal.item && removeModal.item.as) }}</b-badge>
        <code>{{ removeModal.item && removeModal.item.who }}</code>{{ $t('mqtt_banned.remove_modal.confirm_middle') }}
      </p>
      <p class="text-muted small mb-0">
        {{ $t('mqtt_banned.remove_modal.footer_note') }}
      </p>
    </base-modal>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import {
  fetchMqttHealth,
  fetchMqttBanned,
  addMqttBanned,
  removeMqttBanned
} from '@/api/mqtt_server'
import { formatDate } from '@/utils/format'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import datepickerI18n from '@/mixins/datepickerI18n'

export default {
  name: 'MqttServerBanned',
  mixins: [datepickerI18n],
  data () {
    return {
      health: null,
      loading: false,
      loadError: '',
      rows: [],
      addModal: {
        show: false,
        busy: false,
        form: {
          as: 'clientid',
          who: '',
          reason: '',
          until: null
        }
      },
      removeModal: {
        show: false,
        busy: false,
        item: null
      }
    }
  },
  computed: {
    fields () {
      return [
        { key: 'as', label: this.$t('mqtt_banned.fields.as'), thStyle: { width: '120px' } },
        { key: 'who', label: this.$t('mqtt_banned.fields.who') },
        { key: 'reason', label: this.$t('mqtt_banned.fields.reason') },
        { key: 'by', label: this.$t('mqtt_banned.fields.by'), thStyle: { width: '160px' } },
        { key: 'until', label: this.$t('mqtt_banned.fields.until'), thStyle: { width: '180px' } },
        { key: 'actions', label: this.$t('mqtt_banned.fields.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    asOptions () {
      return [
        { value: 'clientid', text: this.$t('mqtt_banned.as_label.clientid') },
        { value: 'username', text: this.$t('mqtt_banned.as_label.username') },
        { value: 'peerhost', text: this.$t('mqtt_banned.as_label.peerhost') }
      ]
    },
    canWrite () {
      try {
        return hasPermission(PERMISSION.MQTT_ADMIN, getCurrentUser())
      } catch (err) {
        return false
      }
    },
    whoLabel () {
      const m = {
        clientid: this.$t('mqtt_banned.as_label.clientid'),
        username: this.$t('mqtt_banned.as_label.username'),
        peerhost: this.$t('mqtt_banned.who_label_ip')
      }
      return m[this.addModal.form.as] || this.$t('mqtt_banned.as_label.default')
    },
    whoPlaceholder () {
      const m = {
        clientid: this.$t('mqtt_banned.add_modal.who_placeholder.clientid'),
        username: this.$t('mqtt_banned.add_modal.who_placeholder.username'),
        peerhost: this.$t('mqtt_banned.add_modal.who_placeholder.peerhost')
      }
      return m[this.addModal.form.as] || ''
    }
  },
  async mounted () {
    await this.loadHealth()
    if (this.health && this.health.configured) {
      await this.loadList()
    }
  },
  methods: {
    async loadHealth () {
      try {
        this.health = await fetchMqttHealth()
      } catch (err) {
        if (err && err.response && err.response.status === 503) {
          this.health = { configured: false, status: 'error' }
        } else {
          console.error(this.$t('mqtt_banned.log.health_failed'), err)
          this.health = { configured: true, status: 'error' }
        }
      }
    },
    async loadList () {
      this.loading = true
      this.loadError = ''
      try {
        const res = await fetchMqttBanned()
        // 兼容 {data:[...]} 与裸数组
        if (Array.isArray(res)) {
          this.rows = res
        } else if (res && Array.isArray(res.data)) {
          this.rows = res.data
        } else {
          this.rows = []
        }
      } catch (err) {
        const msg = this.$getErrorMessage(err) || this.$t('mqtt_banned.toast.fetch_failed')
        this.loadError = msg
        console.error(this.$t('mqtt_banned.log.fetch_failed'), err)
        this.rows = []
        if (this.$uiToast) {
          this.$uiToast.toast(this.$t('mqtt_banned.toast.fetch_failed'), { title: this.$t('mqtt_banned.toast.title'), variant: 'danger' })
        }
      } finally {
        this.loading = false
      }
    },
    openAddModal () {
      this.resetAddForm()
      this.addModal.show = true
    },
    resetAddForm () {
      this.addModal.form = {
        as: 'clientid',
        who: '',
        reason: '',
        until: null
      }
    },
    async doAdd (bvEvt) {
      // 异步提交：先同步阻止 BootstrapVue 默认关闭，成功后再手动关闭，失败保留用户输入
      if (bvEvt) bvEvt.preventDefault()
      const form = this.addModal.form
      if (!form.who || this.addModal.busy) return
      const payload = {
        as: form.as,
        who: form.who
      }
      if (form.reason) payload.reason = form.reason
      if (form.until) {
        // datepicker 返回 YYYY-MM-DD,转 ISO8601 当天结束
        const d = new Date(form.until + 'T23:59:59')
        if (!isNaN(d.getTime())) payload.until = d.toISOString()
      }
      this.addModal.busy = true
      try {
        await addMqttBanned(payload)
        if (this.$uiToast) {
          this.$uiToast.toast(this.$t('mqtt_banned.toast.add_success'), { title: this.$t('mqtt_banned.toast.title'), variant: 'success' })
        }
        this.addModal.show = false
        await this.loadList()
      } catch (err) {
        console.error(this.$t('mqtt_banned.log.add_failed'), err)
        const msg = (err && err.response && err.response.data && err.response.data.error) || this.$getErrorMessage(err) || this.$t('mqtt_banned.toast.add_failed')
        if (this.$uiToast) {
          this.$uiToast.toast(msg, { title: this.$t('mqtt_banned.toast.title'), variant: 'danger' })
        }
      } finally {
        this.addModal.busy = false
      }
    },
    confirmRemove (item) {
      this.removeModal.item = item
      this.removeModal.show = true
    },
    async doRemove (bvEvt) {
      // 异步提交：先同步阻止默认关闭，成功后再手动关闭，失败保留弹窗允许重试
      if (bvEvt) bvEvt.preventDefault()
      const item = this.removeModal.item
      if (!item || this.removeModal.busy) return
      this.removeModal.busy = true
      try {
        await removeMqttBanned(item.as, item.who)
        if (this.$uiToast) {
          this.$uiToast.toast(this.$t('mqtt_banned.toast.remove_success'), { title: this.$t('mqtt_banned.toast.title'), variant: 'success' })
        }
        this.removeModal.show = false
        await this.loadList()
      } catch (err) {
        console.error(this.$t('mqtt_banned.log.remove_failed'), err)
        const msg = (err && err.response && err.response.data && err.response.data.error) || this.$getErrorMessage(err) || this.$t('mqtt_banned.toast.remove_failed')
        if (this.$uiToast) {
          this.$uiToast.toast(msg, { title: this.$t('mqtt_banned.toast.title'), variant: 'danger' })
        }
      } finally {
        this.removeModal.busy = false
      }
    },
    asLabel (a) {
      const m = {
        clientid: this.$t('mqtt_banned.as_label.clientid'),
        username: this.$t('mqtt_banned.as_label.username'),
        peerhost: this.$t('mqtt_banned.as_label.peerhost_short')
      }
      return m[a] || a || '-'
    },
    asVariant (a) {
      const m = { clientid: 'primary', username: 'warning', peerhost: 'danger' }
      return m[a] || 'secondary'
    },
    formatTime (ts) {
      if (!ts) return '-'
      const d = typeof ts === 'string' ? new Date(ts) : new Date(ts * 1000)
      return isNaN(d.getTime()) ? String(ts) : formatDate(d)
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/mqtt-server/banned.scss"></style>
