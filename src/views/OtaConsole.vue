<template>
  <div class="ota-console">
    <list-page-card :total-rows="totalTasks" :page="page" :per-page="pageSize">
      <template #filters>
        <b-form @submit.stop.prevent="loadTasks">
        <div class="filter-row">
          <div class="filter-left">
            <base-select
              v-model="filterStatus"
              :options="statusOptions"
              class="filter-control"
              @change="applyFilters"
            />
            <base-select
              v-model="filterHost"
              :options="hostFilterOptions"
              class="filter-control"
              @change="applyFilters"
            />
            <div class="filter-actions">
              <span class="toolbar-summary">
                {{ $t('ota_console.filters.total_count', { count: totalTasks }) }}
                <span class="text-muted ml-2">
                  <app-icon name="arrow-clockwise" /> {{ $t('ota_console.filters.realtime') }}
                </span>
              </span>
              <base-button variant="outline-secondary" @click="loadTasks">
                <app-icon name="arrow-clockwise"  /> {{ $t('ota_console.actions.refresh') }}
              </base-button>
              <base-button v-if="canManageOta" variant="primary" @click="showCreateModal = true">
          <app-icon name="plus" /> {{ $t('ota_console.actions.create') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <base-table
        :items="tasks"
        :fields="taskFields"
        :loading="loading"
        small
        :empty-text="$t('ota_console.table.empty')"
        show-empty
      >
        <template #table-busy>
          <div class="text-center my-3">
            <b-spinner small /> {{ $t('ota_console.table.loading') }}
          </div>
        </template>
        <template #cell(status)="row">
          <base-badge :variant="statusVariant(row.item.status)">
            {{ statusLabel(row.item.status) }}
          </base-badge>
        </template>
        <template #cell(progress)="row">
          <b-progress
            :value="row.item.progress || 0"
            :max="100"
            :variant="row.item.status === 'error' ? 'danger' : 'primary'"
            show-progress
            :animated="['sent', 'downloading', 'flashing', 'canceling'].includes(row.item.status)"
            class="filter-min-120"
          />
        </template>
        <template #cell(created_at)="row">
          <small>{{ formatTime(row.item.created_at) }}</small>
        </template>
        <template #cell(actions)="row">
          <div class="action-cell action-cell--nowrap">
            <base-action-button
              :title="$t('ota_console.actions.view_detail')"
              @click="openDetail(row.item)"
            >
              <app-icon name="eye"  />
              <span>{{ $t('ota_console.actions.view_detail') }}</span>
            </base-action-button>
            <base-action-button
              v-if="canManageOta && ['pending', 'sent', 'downloading', 'flashing'].includes(row.item.status)"
              class="text-danger"
              :title="$t('ota_console.actions.cancel')"
              :loading="cancellingUuid === row.item.uuid"
              :disabled="Boolean(cancellingUuid)"
              @click="onCancel(row.item)"
            >
              <app-icon name="x-circle"  />
              <span>{{ $t('ota_console.actions.cancel') }}</span>
            </base-action-button>
          </div>
        </template>
      </base-table>

      <template #footer>
        <base-pagination
          v-if="totalTasks > 0"
          v-model="page"
          :total-rows="totalTasks"
          :per-page="pageSize"
          :show-per-page="true"
          @input="handlePageChange"
          @update:perPage="handlePageSizeChange"
        />
      </template>
    </list-page-card>

    <!-- 创建任务 Modal -->
    <base-modal
      v-model="showCreateModal"
      :title="$t('ota_console.create_dialog.title')"
      @ok="onCreate"
      :busy="creating"
      :ok-title="$t('ota_console.create_dialog.ok_title')"
      :cancel-title="$t('ota_console.create_dialog.cancel_title')" :centered="false" :scrollable="false"
    >
      <base-form-group :label="$t('ota_console.create_dialog.host_label')" label-for="ota-host">
        <base-select id="ota-host" v-model="newTask.host_uuid" :options="hostOptions" required />
      </base-form-group>
      <base-form-group :label="$t('ota_console.create_dialog.node_label')">
        <base-input v-model.trim="newTask.device_id" :placeholder="$t('ota_console.create_dialog.node_placeholder')" :clearable="false" />
      </base-form-group>
      <base-form-group :label="$t('ota_console.create_dialog.firmware_label')" label-for="ota-firmware">
        <base-select
          id="ota-firmware"
          v-model="newTask.firmware_uuid"
          :options="firmwareOptions"
          :disabled="firmwareOptions.length === 0"
          required
        />
      </base-form-group>
    </base-modal>

    <!-- 详情 Modal -->
    <base-modal v-model="showDetailModal" :title="$t('ota_console.detail_dialog.title')" size="lg" hide-footer :centered="false" :scrollable="false">
      <div v-if="detailTask">
        <p><strong>{{ $t('ota_console.detail_dialog.uuid_label') }}</strong>{{ detailTask.uuid }}</p>
        <p><strong>{{ $t('ota_console.detail_dialog.host_label') }}</strong>{{ detailTask.host_uuid || '-' }}</p>
        <p><strong>{{ $t('ota_console.detail_dialog.firmware_label') }}</strong>{{ detailTask.firmware_name || detailTask.firmware_uuid || '-' }}</p>
        <p><strong>{{ $t('ota_console.detail_dialog.status_label') }}</strong>
          <base-badge :variant="statusVariant(detailTask.status)">{{ statusLabel(detailTask.status) }}</base-badge>
        </p>
        <p><strong>{{ $t('ota_console.detail_dialog.progress_label') }}</strong></p>
        <b-progress
          :value="detailTask.progress || 0"
          :max="100"
          show-progress
          :variant="detailTask.status === 'error' ? 'danger' : 'primary'"
        />
        <!-- 后端任务详情无 log 字段,失败原因在 error 字段 -->
        <p class="mt-3"><strong>{{ $t('ota_console.detail_dialog.error_label') }}</strong></p>
        <pre class="bg-light p-2 modal-log-output">{{ detailTask.error || $t('ota_console.detail_dialog.error_empty') }}</pre>
      </div>
    </base-modal>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { fetchOtaTasks, createOtaTask, cancelOtaTask, fetchOtaTask } from '@/api/ota'
import { fetchFirmwares } from '@/api/firmwares'
import { fetchHosts } from '@/api/hosts'
import { formatDate } from '@/utils/format'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import ListPageCard from '@/components/shared/ListPageCard.vue'

export default {
  name: 'OtaConsole',
  components: { ListPageCard },
  data () {
    return {
      tasks: [],
      firmwares: [],
      hosts: [],
      loading: false,
      cancellingUuid: '',
      creating: false,
      filterStatus: '',
      filterHost: '',
      page: 1,
      pageSize: 50,
      totalTasks: 0,
      showCreateModal: false,
      showDetailModal: false,
      detailTask: null,
      newTask: {
        host_uuid: '',
        device_id: '',
        firmware_uuid: ''
      },
      pollTimer: null
    }
  },
  computed: {
    canManageOta () {
      return hasPermission(PERMISSION.OTA_MANAGE, getCurrentUser())
    },
    taskFields () {
      return [
        { key: 'uuid', label: this.$t('ota_console.table.task_uuid'), formatter: v => v ? v.slice(0, 8) : '-' },
        { key: 'host_uuid', label: this.$t('ota_console.table.host'), formatter: v => v ? v.slice(0, 8) : '-' },
        { key: 'firmware_name', label: this.$t('ota_console.table.firmware') },
        { key: 'status', label: this.$t('ota_console.table.status') },
        { key: 'progress', label: this.$t('ota_console.table.progress') },
        { key: 'created_at', label: this.$t('ota_console.table.created_at') },
        { key: 'actions', label: this.$t('ota_console.table.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    statusOptions () {
      return [
        { value: '', text: this.$t('ota_console.status_options.all') },
        { value: 'pending', text: this.$t('ota_console.status_options.pending') },
        { value: 'sent', text: this.$t('ota_console.status_options.sent') },
        { value: 'downloading', text: this.$t('ota_console.status_options.downloading') },
        { value: 'flashing', text: this.$t('ota_console.status_options.flashing') },
        { value: 'canceling', text: this.$t('ota_console.status_options.canceling') },
        { value: 'done', text: this.$t('ota_console.status_options.success') },
        { value: 'error', text: this.$t('ota_console.status_options.failed') },
        { value: 'canceled', text: this.$t('ota_console.status_options.canceled') }
      ]
    },
    firmwareOptions () {
      const opts = [{ value: '', text: this.$t('ota_console.create_dialog.firmware_placeholder') }]
      for (const fw of this.firmwares) {
        opts.push({
          value: fw.uuid,
          text: `${fw.file_name || fw.model_code || fw.uuid.slice(0, 8)} - v${fw.version || '?'}`
        })
      }
      return opts
    },
    hostOptions () {
      const opts = [{ value: '', text: this.$t('ota_console.create_dialog.host_placeholder') }]
      for (const h of this.hosts) {
        const short = (h.uuid || '').slice(0, 8)
        const sn = h.serial_no ? ` ${h.serial_no}` : ''
        const dot = h.status === 'online' ? '🟢' : '⚪'
        opts.push({ value: h.uuid, text: `${dot} ${short}${sn}` })
      }
      return opts
    },
    hostFilterOptions () {
      return [
        { value: '', text: this.$t('ota_console.filters.host_all') },
        ...this.hostOptions.slice(1)
      ]
    }
  },
  async mounted () {
    await this.loadTasks()
    await this.loadFirmwares()
    await this.loadHosts()
    // 后端未实装 WS 进度推送时，3s 兜底轮询
    this.pollTimer = setInterval(() => this.loadTasks(true), 3000)
  },
  beforeDestroy () {
    if (this.pollTimer) clearInterval(this.pollTimer)
  },
  methods: {
    async loadTasks (silent = false) {
      if (!silent) this.loading = true
      try {
        const params = { page: this.page, page_size: this.pageSize }
        if (this.filterStatus) params.status = this.filterStatus
        if (this.filterHost) params.host_uuid = this.filterHost
        const data = await fetchOtaTasks(params)
        this.tasks = (data && (data.items || data.tasks || data.data)) || data || []
        this.totalTasks = (data && data.total) || this.tasks.length
      } catch (err) {
        if (!silent) this.$uiToast.toast(this.$getErrorMessage(err) || this.$t('ota_console.toast.load_failed'), { variant: 'danger', title: this.$t('ota_console.toast.error_title') })
      } finally {
        this.loading = false
      }
    },
    applyFilters () {
      this.page = 1
      this.loadTasks()
    },
    handlePageChange (page) {
      this.page = page
      this.loadTasks()
    },
    handlePageSizeChange (pageSize) {
      this.pageSize = pageSize
      this.page = 1
      this.loadTasks()
    },
    async loadFirmwares () {
      try {
        const data = await fetchFirmwares({ page: 1, page_size: 100 })
        this.firmwares = (data && (data.items || data.firmwares || data.data)) || data || []
      } catch (err) {
        // 固件列表加载失败不阻塞主流程
        console.warn('加载固件列表失败', err)
      }
    },
    async loadHosts () {
      try {
        const data = await fetchHosts({ page: 1, page_size: 100 })
        this.hosts = (data && (data.items || data.hosts || data.data)) || data || []
      } catch (err) {
        // 主机列表加载失败不阻塞主流程（仍可手动选固件）
        console.warn('加载主机列表失败', err)
      }
    },
    async onCreate (bvEvt) {
      // 异步提交：先同步阻止 BootstrapVue 默认关闭，成功后再手动关闭，
      // 否则请求未返回弹窗就已关闭、失败时用户输入丢失
      bvEvt.preventDefault()
      if (this.creating) return
      if (!this.canManageOta) return
      if (!this.newTask.host_uuid) {
        this.$uiToast.toast(this.$t('ota_console.toast.select_host'), { variant: 'warning', title: this.$t('ota_console.toast.warning_title') })
        return
      }
      if (!this.newTask.firmware_uuid) {
        this.$uiToast.toast(this.$t('ota_console.toast.select_firmware'), { variant: 'warning', title: this.$t('ota_console.toast.warning_title') })
        return
      }
      this.creating = true
      try {
        const payload = {
          host_uuid: this.newTask.host_uuid,
          device_id: this.newTask.device_id ? Number(this.newTask.device_id) : 1,
          firmware_uuid: this.newTask.firmware_uuid
        }
        await createOtaTask(payload)
        this.$uiToast.toast(this.$t('ota_console.toast.task_created'), { variant: 'success', title: this.$t('ota_console.toast.success_title') })
        this.newTask = { host_uuid: '', device_id: '', firmware_uuid: '' }
        this.showCreateModal = false
        await this.loadTasks()
      } catch (err) {
        this.$uiToast.toast(this.$getErrorMessage(err) || this.$t('ota_console.toast.create_failed'), { variant: 'danger', title: this.$t('ota_console.toast.error_title') })
      } finally {
        this.creating = false
      }
    },
    async onCancel (task) {
      if (this.cancellingUuid) return
      const confirmed = await this.$uiConfirm(
        this.$t('ota_console.confirm.cancel_task', { id: task.uuid.slice(0, 8) }),
        {
          title: this.$t('common.confirm'),
          okTitle: this.$t('common.confirm'),
          cancelTitle: this.$t('common.cancel'),
          okVariant: 'danger'
        }
      )
      if (!confirmed) return
      this.cancellingUuid = task.uuid
      try {
        await cancelOtaTask(task.uuid)
        await this.loadTasks()
      } catch (err) {
        this.$uiToast.toast(this.$getErrorMessage(err) || this.$t('ota_console.toast.cancel_failed'), { variant: 'danger', title: this.$t('ota_console.toast.error_title') })
      } finally {
        this.cancellingUuid = ''
      }
    },
    async openDetail (task) {
      try {
        this.detailTask = await fetchOtaTask(task.uuid)
        this.showDetailModal = true
      } catch (err) {
        this.detailTask = task
        this.showDetailModal = true
      }
    },
    statusLabel (s) {
      const m = {
        pending: this.$t('ota_console.status_options.pending'),
        sent: this.$t('ota_console.status_options.sent'),
        downloading: this.$t('ota_console.status_options.downloading'),
        flashing: this.$t('ota_console.status_options.flashing'),
        canceling: this.$t('ota_console.status_options.canceling'),
        done: this.$t('ota_console.status_options.success'),
        error: this.$t('ota_console.status_options.failed'),
        canceled: this.$t('ota_console.status_options.canceled')
      }
      return m[s] || s || '-'
    },
    statusVariant (s) {
      const m = {
        pending: 'secondary',
        sent: 'info',
        downloading: 'info',
        flashing: 'primary',
        canceling: 'warning',
        done: 'success',
        error: 'danger',
        canceled: 'warning'
      }
      return m[s] || 'light'
    },
    formatTime (t) {
      return formatDate(t)
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/ota-console.scss"></style>
