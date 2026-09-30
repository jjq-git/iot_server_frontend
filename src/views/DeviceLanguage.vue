<template>
  <div class="device-language-manager">
    <!-- 切换表单 -->
    <base-card class="mb-3 dlm-card search-card--titled" :header="$t('device_language_manager.send_section')">
      <div class="dlm-form-row">
        <div class="dlm-form-cell">
          <label class="dlm-label">{{ $t('device_language_manager.form.host') }}</label>
          <b-form-select
            v-model="selectedHost"
            :options="hostOptions"
            size="sm"
            :disabled="loadingHosts"
          />
        </div>
        <div class="dlm-form-cell">
          <label class="dlm-label">{{ $t('device_language_manager.form.target_lang') }}</label>
          <b-form-select
            v-model="selectedLangId"
            :options="langOptions"
            size="sm"
            :disabled="loadingLanguages"
          />
        </div>
        <div class="dlm-form-cell dlm-form-cell--device">
          <label class="dlm-label">device_id</label>
          <base-input
            v-model.number="deviceId"
            type="number"
            size="sm"
            min="1"
            max="127" :clearable="false"
          />
        </div>
        <div class="dlm-form-cell dlm-form-cell--btn">
          <base-button
            class="dlm-send-action"
            size="sm"
            variant="primary"
            :disabled="!canSend || sending"
            @click="onSend"
          >
            <b-spinner v-if="sending" small />
            <span v-else>{{ $t('device_language_manager.actions.send') }}</span>
          </base-button>
        </div>
      </div>

      <div v-if="lastResult" class="dlm-last-result mt-3">
        <b-alert :variant="lastResult.success ? 'success' : 'danger'" show>
          <strong>{{ $t(lastResult.success ? 'device_language_manager.toast.send_success' : 'device_language_manager.toast.send_failed') }}:</strong>
          {{ lastResult.message }}
        </b-alert>
      </div>
      <div class="dlm-secondary-actions mt-3">
        <base-button v-if="canViewHistory" size="sm" variant="link" @click="showHistoryDialog">
          <app-icon name="clock-history" class="mr-1" />
          {{ $t('device_language_manager.history.title') }}
        </base-button>
      </div>
    </base-card>

    <!-- 历史切换记录 -->
    <base-modal
      id="device-language-history-modal"
      v-model="historyDialogVisible"
      :title="$t('device_language_manager.history.title')"
      size="xl"
      hide-footer
    >
      <div class="d-flex justify-content-end mb-2">
          <base-button
            size="sm"
            variant="outline-secondary"
            :disabled="loadingHistory"
            @click="loadHistory"
          >
            <b-spinner v-if="loadingHistory" small />
            <span v-else>{{ $t('common.refresh') }}</span>
          </base-button>
      </div>
      <base-table
        :items="historyItems"
        :fields="historyFields"
        :loading="loadingHistory"
        :load-error="historyError"
        small
        sticky-header="50vh"
        :empty-text="$t('device_language_manager.history.empty')"
        show-empty
        @retry="loadHistory"
      >
        <template #cell(created_at)="row">
          <small>{{ formatTime(row.item.created_at) }}</small>
        </template>
        <template #cell(target_id)="row">
          <code class="dlm-code">{{ shortUuid(row.item.target_id) }}</code>
        </template>
        <template #cell(after_data)="row">
          <small class="dlm-muted">
            lang_id={{ readField(row.item.after_data, 'lang_id') }}
            lang_code={{ readField(row.item.after_data, 'lang_code') }}
            <span v-if="readField(row.item.after_data, 'error')" class="text-danger">
              err={{ readField(row.item.after_data, 'error') }}
            </span>
          </small>
        </template>
        <template #cell(result)="row">
          <b-badge :variant="row.item.result === 'success' ? 'success' : 'danger'">
            {{ row.item.result }}
          </b-badge>
        </template>
      </base-table>
    </base-modal>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { fetchHosts } from '@/api/hosts'
import { fetchDeviceLanguages, setHostLanguage } from '@/api/device_language'
import { fetchAuditLogDetail, fetchAuditLogs } from '@/api/audit'
import { formatDate } from '@/utils/format'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'

export default {
  name: 'DeviceLanguage',
  data () {
    return {
      hosts: [],
      languages: [],
      loadingHosts: false,
      loadingLanguages: false,
      selectedHost: '',
      selectedLangId: 0,
      deviceId: 1,
      sending: false,
      lastResult: null,

      historyItems: [],
      loadingHistory: false,
      historyError: '',
      historyDialogVisible: false,
      historyLoaded: false
    }
  },
  computed: {
    canViewHistory () {
      return hasPermission(PERMISSION.AUDIT_VIEW, getCurrentUser())
    },
    historyFields () {
      return [
        { key: 'created_at', label: this.$t('device_language_manager.history.column.time') },
        { key: 'operator_name', label: this.$t('device_language_manager.history.column.operator') },
        { key: 'target_id', label: this.$t('device_language_manager.history.column.host') },
        { key: 'after_data', label: this.$t('device_language_manager.history.column.lang') },
        { key: 'result', label: this.$t('device_language_manager.history.column.result') }
      ]
    },
    hostOptions () {
      const opts = (this.hosts || []).map(h => {
        const shortU = (h.uuid || '').slice(0, 8)
        const sn = h.serial_no ? ` ${h.serial_no}` : ''
        const online = h.status === 'online'
          ? ` [${this.$t('common.status.online')}]`
          : ` [${this.$t('common.status.offline')}]`
        return { value: h.uuid, text: `${shortU}${sn}${online}` }
      })
      return [{ value: '', text: this.$t('device_language_manager.form.host_placeholder') }, ...opts]
    },
    langOptions () {
      return this.languages.map(l => ({
        value: l.id,
        text: `${l.id} - ${l.code} ${l.name}`
      }))
    },
    canSend () {
      return !!this.selectedHost &&
        this.selectedLangId !== null &&
        this.selectedLangId !== undefined &&
        Number.isInteger(this.deviceId) &&
        this.deviceId >= 1 &&
        this.deviceId <= 127
    }
  },
  async mounted () {
    await Promise.all([this.loadHosts(), this.loadLanguages()])
  },
  methods: {
    async loadHosts () {
      this.loadingHosts = true
      try {
        const data = await fetchHosts({ page: 1, page_size: 200 })
        this.hosts = (data && (data.items || data.hosts || data.data)) || data || []
      } catch (e) {
        console.error('加载主机列表失败', e)
        this.$uiToast && this.$uiToast.toast(this.$t('device_language_manager.toast.load_hosts_failed'), {
          variant: 'danger',
          title: this.$t('common.error')
        })
      } finally {
        this.loadingHosts = false
      }
    },
    async loadLanguages () {
      this.loadingLanguages = true
      try {
        const data = await fetchDeviceLanguages()
        this.languages = data?.languages || []
      } catch (e) {
        console.error('加载设备语言索引失败', e)
        this.languages = []
        this.$uiToast && this.$uiToast.toast(this.$t('device_language_manager.toast.load_languages_failed'), {
          variant: 'danger',
          title: this.$t('common.error')
        })
      } finally {
        this.loadingLanguages = false
      }
    },
    async onSend () {
      if (!this.canSend) return
      const langInfo = this.languages.find(l => l.id === this.selectedLangId)
      const ok = await this.$uiConfirm(
        this.$t('device_language_manager.confirm.body', {
          lang_id: this.selectedLangId,
          lang_code: langInfo?.code,
          device_id: this.deviceId
        }),
        {
          title: this.$t('common.confirm'),
          okVariant: 'primary',
          okTitle: this.$t('device_language_manager.confirm.ok'),
          cancelTitle: this.$t('common.cancel'),
          centered: true
        }
      )
      if (!ok) return

      this.sending = true
      this.lastResult = null
      try {
        const res = await setHostLanguage(this.selectedHost, {
          lang_id: this.selectedLangId,
          device_id: this.deviceId
        })
        this.lastResult = {
          success: !!res?.success,
          message: res?.success
            ? this.$t('device_language_manager.toast.switched', {
              host: (this.selectedHost || '').slice(0, 8),
              lang_code: res.lang_code,
              lang_name: res.lang_name
            })
            : `${this.$t('device_language_manager.toast.send_failed')}: ${res?.error || this.$t('common.unknown_error')}`
        }
        if (this.$uiToast) {
          this.$uiToast.toast(this.lastResult.message, {
            variant: this.lastResult.success ? 'success' : 'danger',
            title: this.$t(this.lastResult.success ? 'common.success' : 'common.error')
          })
        }
        if (this.historyDialogVisible) await this.loadHistory()
      } catch (e) {
        const msg = this.$getErrorMessage(e) || this.$t('device_language_manager.toast.send_failed')
        this.lastResult = { success: false, message: msg }
        this.$uiToast && this.$uiToast.toast(msg, { variant: 'danger', title: this.$t('common.error') })
      } finally {
        this.sending = false
      }
    },
    async loadHistory () {
      this.loadingHistory = true
      this.historyError = ''
      try {
        const data = await fetchAuditLogs({
          action: 'host_language_set',
          page: 1,
          page_size: 30
        })
        const items = (data && (data.items || data.logs || data.data)) || data || []
        this.historyItems = await Promise.all(items.map(async item => {
          try {
            const detail = await fetchAuditLogDetail(item.uuid)
            return {
              ...item,
              ...detail,
              created_at: detail.event_at || detail.created_at,
              operator_name: this.auditOperatorName(detail.operator)
            }
          } catch (error) {
            return {
              ...item,
              created_at: item.event_at || item.created_at,
              operator_name: this.auditOperatorName(item.operator),
              after_data: null
            }
          }
        }))
        this.historyLoaded = true
      } catch (e) {
        console.error('加载历史记录失败', e)
        this.historyItems = []
        this.historyError = this.$getErrorMessage(e) || this.$t('device_language_manager.history.empty')
      } finally {
        this.loadingHistory = false
      }
    },
    showHistoryDialog () {
      if (!this.canViewHistory) return
      this.historyDialogVisible = true
      if (!this.historyLoaded) this.loadHistory()
    },
    shortUuid (s) {
      if (!s) return '-'
      return String(s).slice(0, 8)
    },
    readField (obj, key) {
      if (!obj || typeof obj !== 'object') return ''
      const v = obj[key]
      return v === undefined || v === null ? '' : v
    },
    auditOperatorName (operator) {
      return operator?.display_name || operator?.email || '-'
    },
    formatTime (t) {
      return formatDate(t)
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/device-language.scss"></style>
