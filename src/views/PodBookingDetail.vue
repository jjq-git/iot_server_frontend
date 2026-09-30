<template>
  <div class="meeting-detail">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">{{ booking ? booking.subject : $t('meeting.loading') }}</h2>
      <div class="d-flex align-items-center">
        <base-button v-if="booking" variant="link" class="mr-2" @click="showDispatchDetails">
          <app-icon name="cloud-upload" class="mr-1" />{{ $t('meeting.dispatch_title') }}
        </base-button>
        <base-button v-if="booking" variant="link" class="mr-2" @click="showChangeHistory">
          <app-icon name="clock-history" class="mr-1" />{{ $t('meeting.change_history') }}
        </base-button>
        <base-button variant="outline-secondary" @click="$router.push('/pod-bookings')">{{ $t('meeting.back') }}</base-button>
      </div>
    </div>
    <b-alert v-if="loadError" show variant="danger" class="d-flex align-items-center justify-content-between">
      <span>{{ loadError }}</span>
      <base-button size="sm" variant="outline-danger" @click="load">{{ $t('common.retry') }}</base-button>
    </b-alert>
    <base-card v-if="booking" class="mb-3">
      <b-row>
        <b-col md="6"><dl><dt>{{ $t('meeting.subject') }}</dt><dd>{{ booking.subject }}</dd><dt>{{ $t('meeting.room') }}</dt><dd>{{ booking.pod_name || booking.pod_uuid }}</dd><dt>{{ $t('meeting.source') }}</dt><dd>{{ $t(`meeting.source_${booking.source_type}`) }}</dd></dl></b-col>
        <b-col md="6"><dl><dt>{{ $t('meeting.start_at') }}</dt><dd>{{ formatDateTime(booking.start_at) }}</dd><dt>{{ $t('meeting.end_at') }}</dt><dd>{{ formatDateTime(booking.end_at) }}</dd><dt>{{ $t('meeting.status') }}</dt><dd><b-badge :variant="statusVariant(booking.lifecycle || booking.status)">{{ $t(`meeting.status_${booking.lifecycle || booking.status}`) }}</b-badge></dd></dl></b-col>
      </b-row>
      <div v-if="canWrite && booking.status !== 'cancelled'" class="d-flex justify-content-end"><base-button variant="outline-primary" class="mr-2" @click="openEdit">{{ $t('meeting.edit') }}</base-button><base-button variant="outline-danger" :disabled="cancelling" @click="cancelBooking">{{ $t('meeting.cancel_booking') }}</base-button></div>
    </base-card>
    <base-modal v-model="dispatchDialogVisible" :title="$t('meeting.dispatch_title')" size="xl" hide-footer>
      <div class="d-flex justify-content-end mb-2">
          <base-button v-if="canRetryDispatch" size="sm" variant="outline-primary" :loading="retryingDispatch" @click="retryDispatch">{{ $t('meeting.dispatch_retry') }}</base-button>
      </div>
      <b-alert v-if="dispatchError" show variant="danger" class="d-flex align-items-center justify-content-between">
        <span>{{ dispatchError }}</span>
        <base-button size="sm" variant="outline-danger" @click="loadDispatch">{{ $t('common.retry') }}</base-button>
      </b-alert>
      <base-table :items="dispatchJobs" :fields="dispatchFields" :loading="dispatchLoading" show-empty :empty-text="$t('meeting.dispatch_empty')">
        <template #cell(status)="scope"><base-badge :variant="dispatchStatusVariant(scope.item.status)">{{ $t(`meeting.dispatch_status_${scope.item.status}`) }}</base-badge></template>
        <template #cell(updated_at)="scope">{{ formatOptionalDateTime(scope.item.updated_at) }}</template>
        <template #cell(last_error_code)="scope"><span :title="scope.item.last_error_detail || ''">{{ scope.item.last_error_code || '-' }}</span></template>
      </base-table>
    </base-modal>
    <base-modal v-model="eventsDialogVisible" :title="$t('meeting.change_history')" size="xl" hide-footer>
      <div class="d-flex justify-content-end mb-2">
        <base-button size="sm" variant="outline-secondary" :disabled="eventsLoading" @click="loadEvents">
          <app-icon name="arrow-clockwise" class="mr-1" />{{ $t('common.refresh') }}
        </base-button>
      </div>
      <base-table :items="events" :fields="eventFields" :loading="eventsLoading" :load-error="eventsLoadError" show-empty :empty-text="$t('meeting.no_history')" @retry="loadEvents">
        <template #cell(created_at)="scope">{{ formatDateTime(scope.item.created_at) }}</template>
        <template #cell(event_type)="scope">{{ $t(`meeting.event_${scope.item.event_type}`) }}</template>
        <template #cell(source_type)="scope">{{ $t(`meeting.source_${scope.item.source_type}`) }}</template>
      </base-table>
    </base-modal>

    <base-modal v-model="showEdit" :title="$t('meeting.edit_booking')" hide-footer @hidden="resetEditForm" :centered="false" :scrollable="false">
      <b-form @submit.prevent="saveEdit">
        <base-form-group :label="$t('meeting.subject')"><base-input v-model.trim="editForm.subject" required maxlength="255" :clearable="false" /></base-form-group>
        <base-form-group :label="$t('meeting.start_at')"><base-input v-model="editForm.start_at" type="datetime-local" required :clearable="false" /></base-form-group>
        <base-form-group :label="$t('meeting.end_at')"><base-input v-model="editForm.end_at" type="datetime-local" required :clearable="false" /></base-form-group>
        <small class="meeting-detail__timezone-hint">{{ $t('meeting.timezone_hint') }}</small>
        <b-alert v-if="formError" show variant="danger">{{ formError }}</b-alert>
        <div class="d-flex justify-content-end"><base-button variant="outline-secondary" class="mr-2" @click="showEdit = false">{{ $t('meeting.cancel_action') }}</base-button><base-button type="submit" :loading="saving">{{ saving ? $t('meeting.saving') : $t('meeting.save') }}</base-button></div>
      </b-form>
    </base-modal>
  </div>
</template>

<script>
import { cancelPodBooking, fetchPodBooking, fetchPodBookingDeliveries, fetchPodBookingLogs, retryPodBookingDelivery, updatePodBooking } from '@/api/podBookings'
import { runUiTask } from '@/services/ui/task'
import { success } from '@/services/ui/toast'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import { formatDate } from '@/utils/format'

const pad = value => String(value).padStart(2, '0')
const localValue = value => { const date = new Date(value); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}` }

export default {
  name: 'PodBookingDetail',
  data () { return { booking: null, events: [], dispatchJobs: [], loading: false, dispatchLoading: false, dispatchDialogVisible: false, dispatchLoaded: false, eventsLoading: false, eventsDialogVisible: false, eventsLoaded: false, eventsLoadError: '', loadError: '', dispatchError: '', showEdit: false, saving: false, cancelling: false, retryingDispatch: false, formError: '', editForm: {} } },
  computed: {
    canWrite () {
      const user = getCurrentUser()
      return hasPermission(PERMISSION.POD_RECEIVE, user) && hasPermission(PERMISSION.POD_CONTROL, user)
    },
    canRetryDispatch () { return hasPermission(PERMISSION.POD_MAINTAIN, getCurrentUser()) && this.booking && this.booking.lifecycle !== 'completed' },
    dispatchFields () { return [{ key: 'booking_revision', label: this.$t('meeting.dispatch_revision') }, { key: 'status', label: this.$t('meeting.status') }, { key: 'attempt_count', label: this.$t('meeting.dispatch_attempts') }, { key: 'updated_at', label: this.$t('meeting.dispatch_updated_at') }, { key: 'last_error_code', label: this.$t('meeting.dispatch_error') }] },
    eventFields () { return [{ key: 'created_at', label: this.$t('meeting.time') }, { key: 'event_type', label: this.$t('meeting.change') }, { key: 'source_type', label: this.$t('meeting.source') }, { key: 'reason', label: this.$t('meeting.reason') }] }
  },
  async created () {
    await this.load()
    if (this.$route.query.edit === '1' && this.canWrite && this.booking && this.booking.status !== 'cancelled') this.openEdit()
  },
  methods: {
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        this.booking = await fetchPodBooking(this.$route.params.uuid)
        if (this.dispatchDialogVisible) await this.loadDispatch()
        if (this.eventsDialogVisible) await this.loadEvents()
      } catch (_) { this.loadError = this.$t('meeting.load_failed') } finally { this.loading = false }
    },
    showDispatchDetails () {
      this.dispatchDialogVisible = true
      if (!this.dispatchLoaded) this.loadDispatch()
    },
    showChangeHistory () {
      this.eventsDialogVisible = true
      if (!this.eventsLoaded) this.loadEvents()
    },
    async loadEvents () {
      this.eventsLoading = true
      this.eventsLoadError = ''
      try {
        this.events = await fetchPodBookingLogs(this.$route.params.uuid) || []
        this.eventsLoaded = true
      } catch (error) {
        this.events = []
        this.eventsLoadError = this.$getErrorMessage(error) || this.$t('meeting.load_failed')
      } finally {
        this.eventsLoading = false
      }
    },
    async loadDispatch () {
      this.dispatchLoading = true
      this.dispatchError = ''
      try { this.dispatchJobs = await fetchPodBookingDeliveries(this.$route.params.uuid) || []; this.dispatchLoaded = true } catch (error) { this.dispatchJobs = []; this.dispatchError = this.$getErrorMessage(error) || this.$t('meeting.dispatch_load_failed') } finally { this.dispatchLoading = false }
    },
    openEdit () { this.editForm = { subject: this.booking.subject, start_at: localValue(this.booking.start_at), end_at: localValue(this.booking.end_at) }; this.showEdit = true },
    resetEditForm () { this.editForm = {}; this.formError = '' },
    async saveEdit () {
      const start = new Date(this.editForm.start_at); const end = new Date(this.editForm.end_at)
      if (end <= start || end - start > 86400000) { this.formError = this.$t('meeting.invalid_time'); return }
      this.formError = ''
      await runUiTask(async () => {
        this.booking = await updatePodBooking(this.booking.uuid, { revision: this.booking.revision, subject: this.editForm.subject, start_at: start.toISOString(), end_at: end.toISOString() })
        this.showEdit = false
        await this.load()
      }, {
        successMessage: this.$t('meeting.updated'),
        errorMessage: this.$t('meeting.save_failed'),
        showGlobalLoading: false,
        setPending: value => { this.saving = value },
        onError: (_error, message) => { this.formError = message }
      })
    },
    async cancelBooking () {
      if (this.cancelling) return
      const accepted = await this.$uiConfirm(this.$t('meeting.cancel_confirm'), { title: this.$t('meeting.cancel_booking'), okVariant: 'danger', okTitle: this.$t('meeting.confirm'), cancelTitle: this.$t('meeting.close') })
      if (!accepted) return
      this.cancelling = true
      try { await cancelPodBooking(this.booking.uuid); success(this.$t('meeting.cancelled')); await this.load() } catch (error) { this.loadError = this.$getErrorMessage(error) || this.$t('meeting.action_failed') } finally { this.cancelling = false }
    },
    async retryDispatch () {
      if (this.retryingDispatch) return
      const accepted = await this.$uiConfirm(this.$t('meeting.dispatch_retry_confirm'), { title: this.$t('meeting.dispatch_retry'), okTitle: this.$t('meeting.confirm'), cancelTitle: this.$t('meeting.close') })
      if (!accepted) return
      this.retryingDispatch = true
      try { await retryPodBookingDelivery(this.booking.uuid); success(this.$t('meeting.dispatch_retry_success')); await this.loadDispatch() } catch (error) { this.dispatchError = this.$getErrorMessage(error) || this.$t('meeting.action_failed') } finally { this.retryingDispatch = false }
    },
    statusVariant (status) { return { upcoming: 'primary', active: 'success', completed: 'secondary', cancelled: 'secondary', scheduled: 'primary' }[status] || 'secondary' },
    dispatchStatusVariant (status) { return { pending: 'warning', sent: 'info', acked: 'success', failed: 'danger', superseded: 'secondary' }[status] || 'secondary' },
    formatDateTime (value) { return formatDate(value) },
    formatOptionalDateTime (value) { return formatDate(value) }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/pod-booking-detail.scss"></style>
