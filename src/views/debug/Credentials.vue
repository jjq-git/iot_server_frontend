<template>
  <div class="debug-credentials">
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #header>
        <div class="interaction-list-heading">
          <span class="interaction-list-heading__mark" aria-hidden="true"></span>
          <h2>{{ $t('debug_credentials.filter_section') }}</h2>
        </div>
      </template>
      <template #filters>
        <b-form @submit.stop.prevent="loadCredentials">
        <div class="filter-row">
          <div class="filter-left">
            <base-input
              v-model.trim="hostFilter"
              class="filter-control debug-filter-host"
              :placeholder="$t('debug_credentials.filter.host_placeholder')"
              @change="handleFilterChange" :clearable="false"
            />
            <b-form-checkbox
              v-model="showRevoked"
              class="toolbar-checkbox"
              @change="handleFilterChange"
            >
              {{ $t('debug_credentials.filter.show_revoked') }}
            </b-form-checkbox>
            <div class="filter-actions">
              <base-button variant="outline-secondary" :disabled="loading" @click="loadCredentials">
                <app-icon name="arrow-clockwise"  />
                {{ $t('common.refresh') }}
              </base-button>
              <base-button v-if="canCreateCredentials" variant="primary" @click="openCreateDialog">
          <app-icon name="plus" /> {{ $t('debug_credentials.actions.create') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <base-table
        :items="credentials"
        :fields="fields"
        :loading="loading"
        :load-error="loadError"
        small
        striped
        responsive
        :empty-text="$t('debug_credentials.empty')"
        @retry="loadCredentials"
      >
        <template #cell(uuid)="row">
          <code class="small">{{ row.item.uuid }}</code>
        </template>

        <template #cell(host_uuid)="row">
          <code v-if="row.item.host_uuid" class="small">{{ row.item.host_uuid }}</code>
          <span v-else class="text-muted">—</span>
        </template>

        <template #cell(revoked)="row">
          <base-badge v-if="row.item.revoked" variant="danger">{{ $t('debug_credentials.status.revoked') }}</base-badge>
          <base-badge v-else variant="success">{{ $t('debug_credentials.status.normal') }}</base-badge>
        </template>

        <template #cell(last_seen_at)="row">
          {{ formatDateTime(row.item.last_seen_at) }}
        </template>

        <template #cell(created_at)="row">
          {{ formatDateTime(row.item.created_at) }}
        </template>

        <template #cell(actions)="row">
          <div class="action-cell action-cell--nowrap">
            <template v-if="!row.item.revoked">
              <base-action-button
                v-if="canManageCredentials"
                :title="$t('debug_credentials.actions.reset_password')"
                @click="resetPassword(row.item)"
              >
                <app-icon name="key"  />
                <span>{{ $t('debug_credentials.actions.reset_password') }}</span>
              </base-action-button>
              <base-action-button
                v-if="canManageCredentials"
                class="text-danger"
                :title="$t('debug_credentials.actions.revoke')"
                @click="revoke(row.item)"
              >
                <app-icon name="x-circle"  />
                <span>{{ $t('debug_credentials.actions.revoke') }}</span>
              </base-action-button>
            </template>
            <template v-else>
              <base-action-button
                v-if="canManageCredentials"
                :title="$t('debug_credentials.actions.restore')"
                @click="restore(row.item)"
              >
                <app-icon name="arrow-clockwise"  />
                <span>{{ $t('debug_credentials.actions.restore') }}</span>
              </base-action-button>
              <base-action-button
                v-if="canCreateCredentials"
                class="text-danger"
                :title="$t('debug_credentials.actions.delete')"
                @click="remove(row.item)"
              >
                <app-icon name="trash"  />
                <span>{{ $t('debug_credentials.actions.delete') }}</span>
              </base-action-button>
            </template>
          </div>
        </template>
      </base-table>
      <template #footer>
        <base-pagination
          v-model="query.page"
          :total-rows="total"
          :per-page.sync="query.page_size"
          :show-per-page="true"
          @input="handlePageChange"
        />
      </template>
    </list-page-card>

    <!-- 新建凭证 -->
    <base-modal v-model="createDialog" :title="$t('debug_credentials.dialog.create_title')" hide-footer @hidden="resetCreateForm" :centered="false" :scrollable="false">
      <b-form @submit.prevent="submitCreate">
        <base-form-group :label="$t('debug_credentials.form.serial')">
          <base-input v-model.trim="createForm.serial" required minlength="4" maxlength="64" :clearable="false" />
        </base-form-group>
        <base-form-group :label="$t('debug_credentials.form.host_uuid')">
          <base-input
            v-model.trim="createForm.host_uuid"
            :placeholder="$t('debug_credentials.form.host_uuid_placeholder')" :clearable="false"
          />
        </base-form-group>
        <base-form-group :label="$t('debug_credentials.form.region')">
          <base-input v-model.trim="createForm.region" placeholder="cn" :clearable="false" />
        </base-form-group>
        <base-form-group :label="$t('debug_credentials.form.factory_batch')">
          <base-input v-model.trim="createForm.factory_batch" :clearable="false" />
        </base-form-group>
        <base-form-group :label="$t('debug_credentials.form.notes')">
          <b-form-textarea v-model.trim="createForm.notes" rows="2" />
        </base-form-group>
        <div class="text-right">
          <base-button class="mr-2" @click="createDialog = false" variant="secondary">{{ $t('common.cancel') }}</base-button>
          <base-button type="submit" variant="primary" :disabled="submitting">{{ $t('debug_credentials.actions.submit_create') }}</base-button>
        </div>
      </b-form>
    </base-modal>

    <!-- 密码一次性显示弹窗 -->
    <base-modal
      v-model="secretDialog"
      :title="$t('debug_credentials.dialog.secret_title')"
      :hide-header-close="true"
      :no-close-on-backdrop="true"
      :no-close-on-esc="true"
      hide-footer
      @hidden="onSecretDismiss" :centered="false" :scrollable="false"
    >
      <b-alert show variant="warning">
        <span v-html="$t('debug_credentials.dialog.secret_warning_html')"></span>
      </b-alert>
      <base-form-group :label="$t('debug_credentials.form.username')">
        <base-input :value="secret.username" readonly :clearable="false" />
      </base-form-group>
      <base-form-group :label="$t('debug_credentials.form.password_plain')">
        <b-input-group>
          <base-input
            ref="secretPasswordInput"
            :value="secret.password"
            readonly
            @focus="$event.target.select()"
            @click="$event.target.select()"
            @copy="onSecretCopied" :clearable="false"
          />
          <b-input-group-append>
            <base-button variant="primary" @click="copySecret">{{ $t('debug_credentials.actions.copy') }}</base-button>
          </b-input-group-append>
        </b-input-group>
      </base-form-group>
      <div class="text-right mt-3">
        <base-button variant="success" :disabled="!hasCopied" @click="dismissSecret">
          {{ $t('debug_credentials.actions.dismiss_recorded') }}
        </base-button>
        <small v-if="!hasCopied" class="text-muted ml-2">{{ $t('debug_credentials.dialog.click_copy_first') }}</small>
      </div>
    </base-modal>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import {
  fetchCredentials,
  createCredential,
  rotateCredentialPassword,
  revokeCredential,
  restoreCredential,
  deleteCredential
} from '@/api/debug/credentials'
import { formatDate } from '@/utils/format'
import { copyText } from '@/utils/clipboard'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import BasePagination from '@/components/base/BasePagination.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'

export default {
  name: 'DebugCredentials',
  components: { BasePagination, ListPageCard },
  data () {
    return {
      credentials: [],
      total: 0,
      query: {
        page: 1,
        page_size: 50
      },
      hostFilter: '',
      showRevoked: false,
      loading: false,
      loadError: '',
      createDialog: false,
      submitting: false,
      createForm: {
        serial: '',
        host_uuid: '',
        region: 'cn',
        factory_batch: '',
        notes: ''
      },
      secretDialog: false,
      secret: { username: '', password: '' },
      hasCopied: false
    }
  },
  computed: {
    canCreateCredentials () {
      return hasPermission(PERMISSION.PLATFORM_DEVICE_MANAGE, getCurrentUser())
    },
    canManageCredentials () {
      return hasPermission(PERMISSION.DEVICE_OPERATE, getCurrentUser())
    },
    fields () {
      return [
        { key: 'uuid', label: this.$t('debug_credentials.column.uuid'), class: 'credential-id-cell', thClass: 'credential-id-cell' },
        { key: 'serial', label: this.$t('debug_credentials.column.serial'), class: 'credential-serial-cell', thClass: 'credential-serial-cell' },
        { key: 'host_uuid', label: this.$t('debug_credentials.column.host'), class: 'credential-id-cell', thClass: 'credential-id-cell' },
        { key: 'mqtt_username', label: this.$t('debug_credentials.column.mqtt_username'), class: 'credential-id-cell', thClass: 'credential-id-cell' },
        { key: 'region', label: this.$t('debug_credentials.column.region'), thStyle: { width: '80px' } },
        { key: 'factory_batch', label: this.$t('debug_credentials.column.factory_batch'), class: 'credential-batch-cell', thClass: 'credential-batch-cell' },
        { key: 'revoked', label: this.$t('debug_credentials.column.revoked'), thStyle: { width: '100px' } },
        { key: 'last_seen_at', label: this.$t('debug_credentials.column.last_seen_at'), class: 'credential-date-cell', thClass: 'credential-date-cell' },
        { key: 'created_at', label: this.$t('debug_credentials.column.created_at'), class: 'credential-date-cell', thClass: 'credential-date-cell' },
        { key: 'actions', label: this.$t('debug_credentials.column.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    }
  },
  async mounted () {
    await this.loadCredentials()
  },
  watch: {
    'query.page_size' () {
      this.query.page = 1
      this.loadCredentials()
    }
  },
  methods: {
    formatDateTime (value) {
      return formatDate(value)
    },
    async loadCredentials () {
      this.loading = true
      this.loadError = ''
      try {
        const params = {
          page: this.query.page,
          page_size: this.query.page_size
        }
        if (this.hostFilter) params.host_uuid = this.hostFilter
        // 默认只看正常凭证;勾选后才返回全部(含已吊销)
        if (!this.showRevoked) params.revoked = false
        const data = await fetchCredentials(params)
        this.credentials = (data && (data.items || data.data)) || data || []
        this.total = Number(data?.total ?? this.credentials.length)
      } catch (e) {
        this.credentials = []
        this.total = 0
        const msg = this.$getErrorMessage(e) || this.$t('debug_credentials.toast.load_failed')
        this.loadError = msg
        console.error('加载凭证失败', e)
        this.$uiToast && this.$uiToast.toast(this.$t('debug_credentials.toast.load_failed'), { variant: 'danger', title: this.$t('common.error') })
      } finally {
        this.loading = false
      }
    },
    openCreateDialog () {
      if (!this.canCreateCredentials) return
      this.createDialog = true
    },
    handleFilterChange () {
      this.query.page = 1
      this.loadCredentials()
    },
    handlePageChange (page) {
      this.query.page = page
      this.loadCredentials()
    },
    resetCreateForm () {
      this.createForm = {
        serial: '',
        host_uuid: '',
        region: 'cn',
        factory_batch: '',
        notes: ''
      }
    },
    buildCreatePayload () {
      const payload = {}
      Object.keys(this.createForm).forEach((key) => {
        const value = this.createForm[key]
        if (value !== '' && value !== null && value !== undefined) {
          payload[key] = value
        }
      })
      return payload
    },
    async submitCreate () {
      if (!this.canCreateCredentials) return
      this.submitting = true
      try {
        const data = await createCredential(this.buildCreatePayload())
        this.createDialog = false
        this.showSecret(data)
        await this.loadCredentials()
      } catch (e) {
        this.$uiToast && this.$uiToast.toast(this.$t('debug_credentials.toast.create_failed'), { variant: 'danger', title: this.$t('common.error') })
      } finally {
        this.submitting = false
      }
    },
    async resetPassword (item) {
      if (!this.canManageCredentials) return
      const ok = await this.$uiConfirm(this.$t('debug_credentials.confirm.reset', { serial: item.serial }), {
        title: this.$t('common.confirm'),
        okVariant: 'warning',
        okTitle: this.$t('debug_credentials.confirm.reset_ok'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!ok) return
      try {
        const data = await rotateCredentialPassword(item.uuid)
        this.showSecret(data)
      } catch (e) {
        this.$uiToast && this.$uiToast.toast(this.$t('debug_credentials.toast.reset_failed'), { variant: 'danger', title: this.$t('common.error') })
      }
    },
    async revoke (item) {
      if (!this.canManageCredentials) return
      const ok = await this.$uiConfirm(this.$t('debug_credentials.confirm.revoke', { serial: item.serial }), {
        title: this.$t('common.confirm'),
        okVariant: 'danger',
        okTitle: this.$t('debug_credentials.actions.revoke'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!ok) return
      try {
        await revokeCredential(item.uuid)
        await this.loadCredentials()
      } catch (e) {
        this.$uiToast && this.$uiToast.toast(this.$t('debug_credentials.toast.revoke_failed'), { variant: 'danger', title: this.$t('common.error') })
      }
    },
    async restore (item) {
      if (!this.canManageCredentials) return
      const ok = await this.$uiConfirm(this.$t('debug_credentials.confirm.restore', { serial: item.serial }), {
        title: this.$t('common.confirm'),
        okVariant: 'success',
        okTitle: this.$t('debug_credentials.actions.restore'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!ok) return
      try {
        await restoreCredential(item.uuid)
        await this.loadCredentials()
      } catch (e) {
        this.$uiToast && this.$uiToast.toast(this.$t('debug_credentials.toast.restore_failed'), { variant: 'danger', title: this.$t('common.error') })
      }
    },
    async remove (item) {
      if (!this.canCreateCredentials) return
      const ok = await this.$uiConfirm(this.$t('debug_credentials.confirm.delete', { serial: item.serial }), {
        title: this.$t('common.confirm'),
        okVariant: 'danger',
        okTitle: this.$t('debug_credentials.actions.delete'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!ok) return
      try {
        await deleteCredential(item.uuid)
        await this.loadCredentials()
      } catch (e) {
        this.$uiToast && this.$uiToast.toast(this.$t('debug_credentials.toast.delete_failed'), { variant: 'danger', title: this.$t('common.error') })
      }
    },
    showSecret (data) {
      this.secret = {
        username: (data && data.mqtt_username) || '',
        password: (data && data.mqtt_password) || ''
      }
      this.hasCopied = false
      this.secretDialog = true
    },
    async copySecret () {
      const input = this.getSecretPasswordInput()
      try {
        await copyText(this.secret.password, { target: input })
        this.hasCopied = true
        this.$uiToast && this.$uiToast.toast(this.$t('debug_credentials.toast.copied'), { variant: 'success' })
      } catch (e) {
        this.selectSecretPassword()
        this.$uiToast && this.$uiToast.toast(this.$t('debug_credentials.toast.copy_failed'), { variant: 'warning' })
      }
    },
    getSecretPasswordInput () {
      const ref = this.$refs.secretPasswordInput
      return ref && ref.$el ? ref.$el : ref
    },
    selectSecretPassword () {
      const input = this.getSecretPasswordInput()
      if (!input) return
      input.focus()
      input.select()
      if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(0, String(input.value || '').length)
      }
    },
    onSecretCopied () {
      if (this.secret.password) this.hasCopied = true
    },
    dismissSecret () {
      this.secretDialog = false
    },
    onSecretDismiss () {
      // 关闭后立即从内存清除明文,防止驻留
      this.secret = { username: '', password: '' }
      this.hasCopied = false
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/debug/credentials.scss"></style>
