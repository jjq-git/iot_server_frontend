<template>
  <div class="meeting-page">
    <list-page-card
      :total-rows="total"
      :page="page"
      :per-page="pageSize"
      :show-summary="viewMode === 'list'"
      :show-footer="viewMode === 'list'"
    >
      <template #filters>
        <b-form class="meeting-filters" @submit.prevent="search">
          <div class="filter-row">
            <div class="filter-left">
              <div v-if="viewMode === 'list'" class="filter-control filter-control--date meeting-date-range">
                <base-input
                  v-model="filters.from"
                  type="date"
                  :clearable="false"
                  :aria-label="$t('meeting.from_date')"
                />
                <span class="meeting-date-range__separator" aria-hidden="true">—</span>
                <base-input
                  v-model="filters.to"
                  type="date"
                  :clearable="false"
                  :aria-label="$t('meeting.to_date')"
                />
              </div>
              <base-select
                v-model="filters.pod_uuid"
                class="filter-control"
                :options="roomOptions"
                :aria-label="$t('meeting.room')"
              />
              <base-select
                v-model="filters.status"
                class="filter-control"
                :options="statusOptions"
                :aria-label="$t('meeting.status')"
              />
              <div class="filter-actions">
                <base-button v-if="canWrite" :loading="roomsLoading" @click="handlePrimaryAction">
                  <app-icon name="plus" v-if="!roomsLoading" />
                  {{ primaryActionLabel }}
                </base-button>
              </div>
            </div>
          </div>
        </b-form>
        <base-alert v-if="filterError || roomLoadError" show variant="danger" class="meeting-filter-error">
          {{ filterError || roomLoadError }}
        </base-alert>
      </template>

        <div class="meeting-view-toolbar">
          <div class="meeting-view-toolbar__group" role="group" :aria-label="$t('meeting.view_mode')">
            <base-button size="sm" :variant="viewMode === 'list' ? 'primary' : 'outline-secondary'" @click="setViewMode('list')">
              <app-icon name="list" class="mr-1" />{{ $t('meeting.list_view') }}
            </base-button>
            <base-button size="sm" :variant="viewMode === 'calendar' ? 'primary' : 'outline-secondary'" @click="setViewMode('calendar')">
              <app-icon name="calendar3" class="mr-1" />{{ $t('meeting.calendar_view') }}
            </base-button>
          </div>
          <template v-if="viewMode === 'calendar'">
            <div class="meeting-view-toolbar__group" role="group" :aria-label="$t('meeting.calendar_scale')">
              <base-button size="sm" :variant="calendarScale === 'day' ? 'primary' : 'outline-secondary'" @click="setCalendarScale('day')">{{ $t('meeting.calendar_day') }}</base-button>
              <base-button size="sm" :variant="calendarScale === 'week' ? 'primary' : 'outline-secondary'" @click="setCalendarScale('week')">{{ $t('meeting.calendar_week') }}</base-button>
            </div>
            <div class="meeting-calendar-nav">
              <base-icon-button :label="$t('meeting.calendar_previous')" @click="shiftCalendar(-1)"><app-icon name="chevron-left" /></base-icon-button>
              <base-button size="sm" variant="outline-secondary" @click="goToday">{{ $t('meeting.calendar_today') }}</base-button>
              <base-icon-button :label="$t('meeting.calendar_next')" @click="shiftCalendar(1)"><app-icon name="chevron-right" /></base-icon-button>
              <strong class="meeting-calendar-nav__range">{{ calendarRangeLabel }}</strong>
            </div>
          </template>
        </div>

        <base-table
          v-if="viewMode === 'list'"
          :class="{ 'meeting-results-table--empty': !items.length }"
          :items="items"
          :fields="fields"
          :loading="loading"
          :load-error="loadError"
          show-empty
          :empty-text="$t('meeting.empty')"
          @retry="load"
        >
          <template #empty>
            <div class="meeting-empty-state">
              <app-icon name="calendar3" class="meeting-empty-state__icon" />
              <strong>{{ emptyStateTitle }}</strong>
              <span>{{ emptyStateDescription }}</span>
              <base-button v-if="roomLoadError" size="sm" variant="outline-danger" @click="loadRooms">
                <app-icon name="arrow-clockwise" class="mr-1" />
                {{ $t('common.retry') }}
              </base-button>
              <base-button v-else-if="canWrite && roomsLoaded && !rooms.length" size="sm" @click="goToSettings">
                <app-icon name="gear" class="mr-1" />
                {{ $t('meeting.go_to_settings') }}
              </base-button>
            </div>
          </template>
          <template #cell(subject)="scope">
            <span class="meeting-list__subject">{{ scope.item.subject }}</span>
          </template>
          <template #cell(time)="scope">
            <span>{{ formatDateTimeRange(scope.item.start_at, scope.item.end_at) }}</span>
            <br><small class="text-muted">{{ formatDuration(scope.item.start_at, scope.item.end_at) }}</small>
          </template>
          <template #cell(status)="scope"><base-badge :variant="statusVariant(scope.item.lifecycle || scope.item.status)">{{ $t(`meeting.status_${scope.item.lifecycle || scope.item.status}`) }}</base-badge></template>
          <template #cell(source_type)="scope">{{ $t(`meeting.source_${scope.item.source_type}`) }}</template>
          <template #cell(delivery_status)="scope">
            <base-badge v-if="scope.item.delivery_status" :variant="dispatchVariant(scope.item.delivery_status)">{{ dispatchLabel(scope.item.delivery_status) }}</base-badge>
            <span v-else class="text-muted">{{ $t('meeting.dispatch_not_queued') }}</span>
          </template>
          <template #cell(actions)="scope">
            <span class="meeting-list__actions">
              <base-action-button :title="$t('meeting.details')" @click="handleBookingAction('details', scope.item)">
              <app-icon name="eye"  /> <span>{{ $t('meeting.details') }}</span>
              </base-action-button>
              <base-action-button v-if="canWrite && !isCancelled(scope.item)" :title="$t('meeting.edit')" @click="handleBookingAction('edit', scope.item)">
                <app-icon name="pencil"  /> <span>{{ $t('meeting.edit') }}</span>
              </base-action-button>
              <b-dropdown v-if="canWrite && !isCancelled(scope.item)" right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), scope.item.subject].filter(Boolean).join(' ') }">
                <template #button-content><app-icon name="list" aria-hidden="true" /></template>
                <b-dropdown-item-button class="text-danger" :disabled="Boolean(cancellingUuid)" @click="handleBookingAction('cancel', scope.item)"><app-icon name="x-circle" aria-hidden="true" /> {{ $t('meeting.cancel_booking') }}</b-dropdown-item-button>
              </b-dropdown>
            </span>
          </template>
        </base-table>
        <div v-else class="meeting-calendar-shell">
          <base-alert v-if="loadError" show variant="danger">
            {{ loadError }}
            <base-button size="sm" variant="outline-danger" class="ml-2" @click="load">{{ $t('common.retry') }}</base-button>
          </base-alert>
          <div v-else-if="loading" class="meeting-calendar-state">{{ $t('meeting.loading') }}</div>
          <div v-else class="meeting-calendar" :class="`meeting-calendar--${calendarScale}`">
            <article v-for="day in calendarDays" :key="day.key" class="meeting-calendar-day" :class="{ 'meeting-calendar-day--today': day.isToday }">
              <header class="meeting-calendar-day__header">
                <span>{{ day.weekday }}</span>
                <strong>{{ day.dateLabel }}</strong>
              </header>
              <div class="meeting-calendar-day__events">
                <button
                  v-for="item in day.items"
                  :key="item.uuid"
                  type="button"
                  class="meeting-calendar-event"
                  :class="{ 'meeting-calendar-event--cancelled': isCancelled(item) }"
                  @click="openDetail(item.uuid)"
                >
                  <span class="meeting-calendar-event__time">{{ formatCalendarTime(item.start_at, item.end_at) }}</span>
                  <strong>{{ item.subject }}</strong>
                  <span>{{ item.pod_name }}</span>
                  <base-badge v-if="item.delivery_status" :variant="dispatchVariant(item.delivery_status)">{{ dispatchLabel(item.delivery_status) }}</base-badge>
                </button>
                <span v-if="!day.items.length" class="meeting-calendar-day__empty">{{ $t('meeting.calendar_day_empty') }}</span>
              </div>
            </article>
          </div>
          <small v-if="total > items.length" class="meeting-calendar-limit">{{ $t('meeting.calendar_limit_hint', { count: items.length, total }) }}</small>
        </div>
        <template #footer>
          <base-pagination
            v-if="total > pageSize"
            v-model="page"
            :total-rows="total"
            :per-page.sync="pageSize"
            :show-per-page="true"
            @input="handlePageChange"
          />
        </template>
    </list-page-card>

    <base-modal v-model="showForm" :title="$t('meeting.new_booking')" hide-footer @hidden="resetForm" :centered="false" :scrollable="false">
      <b-form @submit.prevent="submitBooking">
        <base-form-group :label="$t('meeting.room')" label-for="meeting-room"><base-select id="meeting-room" v-model="form.pod_uuid" :options="bookableRoomOptions" required /></base-form-group>
        <base-form-group :label="$t('meeting.subject')" label-for="meeting-subject"><base-input id="meeting-subject" v-model.trim="form.subject" maxlength="255" required :clearable="false" /></base-form-group>
        <base-form-group :label="$t('meeting.start_at')" label-for="meeting-start"><base-input id="meeting-start" v-model="form.start_at" type="datetime-local" required :clearable="false" /></base-form-group>
        <base-form-group :label="$t('meeting.end_at')" label-for="meeting-end"><base-input id="meeting-end" v-model="form.end_at" type="datetime-local" required :clearable="false" /></base-form-group>
        <small class="meeting-timezone-hint">{{ $t('meeting.timezone_hint') }}</small>
        <base-form-group :label="$t('meeting.participant_count')" label-for="meeting-count"><base-input id="meeting-count" v-model.number="form.participant_count" type="number" min="1" max="10000" :clearable="false" /></base-form-group>
        <base-alert v-if="formError" show variant="danger">{{ formError }}</base-alert>
        <div class="d-flex justify-content-end">
          <base-button variant="outline-secondary" class="mr-2" @click="showForm = false">
            <app-icon name="x" class="mr-1" />
            {{ $t('meeting.cancel_action') }}
          </base-button>
          <base-button type="submit" :loading="saving">
            <app-icon name="check" v-if="!saving" class="mr-1" />
            {{ saving ? $t('meeting.saving') : $t('meeting.save') }}
          </base-button>
        </div>
      </b-form>
    </base-modal>

  </div>
</template>

<script>
import { cancelPodBooking, createPodBooking, fetchBookablePods, fetchPodBookings } from '@/api/podBookings'
import { runUiTask } from '@/services/ui/task'
import { success } from '@/services/ui/toast'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import ListPageCard from '@/components/shared/ListPageCard.vue'

const pad = value => String(value).padStart(2, '0')
const dateValue = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const dateTimeValue = date => `${dateValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`

export default {
  name: 'PodBookings',
  components: { ListPageCard },
  data () {
    const today = new Date()
    const later = new Date(today.getTime() + 14 * 86400000)
    return {
      loading: false,
      roomsLoading: false,
      roomsLoaded: false,
      saving: false,
      showForm: false,
      formError: '',
      filterError: '',
      loadError: '',
      roomLoadError: '',
      cancellingUuid: '',
      filterTimer: null,
      items: [],
      rooms: [],
      viewMode: 'list',
      calendarScale: 'week',
      calendarCursor: today,
      page: 1,
      pageSize: 20,
      total: 0,
      filters: { from: dateValue(today), to: dateValue(later), pod_uuid: '', status: '' },
      form: { pod_uuid: '', subject: '', start_at: '', end_at: '', participant_count: null }
    }
  },
  computed: {
    canWrite () {
      const user = getCurrentUser()
      return hasPermission(PERMISSION.POD_RECEIVE, user) && hasPermission(PERMISSION.POD_CONTROL, user)
    },
    primaryActionLabel () { return this.roomLoadError ? this.$t('common.retry') : (this.roomsLoaded && !this.rooms.length ? this.$t('meeting.configure_rooms') : this.$t('meeting.new_booking')) },
    emptyStateTitle () { return this.roomsLoaded && !this.rooms.length ? this.$t('meeting.no_bookable_rooms') : this.$t('meeting.empty') },
    emptyStateDescription () { return this.roomsLoaded && !this.rooms.length ? this.$t('meeting.no_bookable_rooms_hint') : this.$t('meeting.empty_filtered_hint') },
    fields () {
      return [
        { key: 'subject', label: this.$t('meeting.subject'), sortable: true },
        { key: 'pod_name', label: this.$t('meeting.room'), sortable: true },
        { key: 'time', label: this.$t('meeting.time') },
        { key: 'source_type', label: this.$t('meeting.source') },
        { key: 'status', label: this.$t('meeting.status') },
        { key: 'delivery_status', label: this.$t('meeting.dispatch_summary') },
        { key: 'actions', label: this.$t('meeting.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    calendarDays () {
      const first = this.calendarScale === 'week' ? this.startOfWeek(this.calendarCursor) : this.startOfDay(this.calendarCursor)
      const count = this.calendarScale === 'week' ? 7 : 1
      return Array.from({ length: count }, (_, index) => {
        const date = new Date(first)
        date.setDate(first.getDate() + index)
        const next = new Date(date)
        next.setDate(date.getDate() + 1)
        return {
          key: dateValue(date),
          weekday: new Intl.DateTimeFormat(this.$i18n.locale, { weekday: 'short' }).format(date),
          dateLabel: new Intl.DateTimeFormat(this.$i18n.locale, { month: 'short', day: 'numeric' }).format(date),
          isToday: dateValue(date) === dateValue(new Date()),
          items: this.items.filter(item => new Date(item.start_at) < next && new Date(item.end_at) > date)
        }
      })
    },
    calendarRangeLabel () {
      if (!this.calendarDays.length) return ''
      const format = value => new Intl.DateTimeFormat(this.$i18n.locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(value)
      const first = new Date(`${this.calendarDays[0].key}T00:00:00`)
      const last = new Date(`${this.calendarDays[this.calendarDays.length - 1].key}T00:00:00`)
      return this.calendarScale === 'day' ? format(first) : `${format(first)} – ${format(last)}`
    },
    roomOptions () { return [{ value: '', text: this.$t('meeting.all_rooms') }, ...this.rooms.map(room => ({ value: room.pod_uuid, text: room.pod_name }))] },
    bookableRoomOptions () { return [{ value: '', text: this.$t('meeting.select_room'), disabled: true }, ...this.rooms.map(room => ({ value: room.pod_uuid, text: room.pod_name }))] },
    statusOptions () { return [{ value: '', text: this.$t('meeting.all_statuses') }, { value: 'scheduled', text: this.$t('meeting.status_scheduled') }, { value: 'cancelled', text: this.$t('meeting.status_cancelled') }] }
  },
  watch: {
    filters: {
      deep: true,
      handler () {
        clearTimeout(this.filterTimer)
        this.filterTimer = setTimeout(() => this.search(), 250)
      }
    },
    pageSize (value, previous) {
      if (value === previous) return
      this.page = 1
      this.load()
    }
  },
  created () { this.initialize() },
  beforeDestroy () { clearTimeout(this.filterTimer) },
  methods: {
    async initialize () { await Promise.allSettled([this.loadRooms(), this.load()]) },
    async loadRooms () {
      this.roomsLoading = true
      this.roomLoadError = ''
      try {
        const result = await fetchBookablePods() || []
        this.rooms = Array.isArray(result) ? result : (result.items || [])
      } catch (error) {
        this.rooms = []
        this.roomLoadError = this.$getErrorMessage(error) || this.$t('meeting.rooms_load_failed')
      } finally {
        this.roomsLoading = false
        this.roomsLoaded = true
      }
    },
    search () {
      this.filterError = ''
      if (!this.filters.from || !this.filters.to || new Date(`${this.filters.from}T00:00:00`) > new Date(`${this.filters.to}T23:59:59`)) {
        this.filterError = this.$t('meeting.invalid_date_range')
        return
      }
      this.page = 1
      this.load()
    },
    async load () {
      // 请求序号防竞态：快速切筛选/翻页时旧响应不得覆盖新响应
      const reqId = (this._listReqId = (this._listReqId || 0) + 1)
      this.loading = true
      this.loadError = ''
      try {
        const result = await fetchPodBookings({ from: new Date(`${this.filters.from}T00:00:00`).toISOString(), to: new Date(`${this.filters.to}T23:59:59`).toISOString(), pod_uuid: this.filters.pod_uuid || undefined, status: this.filters.status || undefined, page: this.viewMode === 'calendar' ? 1 : this.page, page_size: this.viewMode === 'calendar' ? 100 : this.pageSize }) || []
        if (reqId !== this._listReqId) return
        this.items = Array.isArray(result) ? result : (result.items || [])
        this.total = Number(result.total ?? result.total_items ?? result.count ?? this.items.length)
      } catch (error) {
        if (reqId !== this._listReqId) return
        this.items = []
        this.total = 0
        this.loadError = this.$getErrorMessage(error) || this.$t('meeting.load_failed')
      } finally { if (reqId === this._listReqId) this.loading = false }
    },
    handlePageChange (page) { this.page = page; this.load() },
    startOfDay (value) { const date = new Date(value); date.setHours(0, 0, 0, 0); return date },
    startOfWeek (value) {
      const date = this.startOfDay(value)
      const offset = (date.getDay() + 6) % 7
      date.setDate(date.getDate() - offset)
      return date
    },
    setViewMode (mode) {
      if (this.viewMode === mode) return
      this.viewMode = mode
      if (mode === 'calendar') this.setCalendarRange()
      else this.load()
    },
    setCalendarScale (scale) {
      if (this.calendarScale === scale) return
      this.calendarScale = scale
      this.setCalendarRange()
    },
    shiftCalendar (direction) {
      const date = new Date(this.calendarCursor)
      date.setDate(date.getDate() + direction * (this.calendarScale === 'week' ? 7 : 1))
      this.calendarCursor = date
      this.setCalendarRange()
    },
    goToday () { this.calendarCursor = new Date(); this.setCalendarRange() },
    setCalendarRange () {
      const first = this.calendarScale === 'week' ? this.startOfWeek(this.calendarCursor) : this.startOfDay(this.calendarCursor)
      const last = new Date(first)
      last.setDate(first.getDate() + (this.calendarScale === 'week' ? 6 : 0))
      this.filters.from = dateValue(first)
      this.filters.to = dateValue(last)
    },
    handlePrimaryAction () {
      if (!this.roomsLoaded) return
      if (this.roomLoadError) { this.loadRooms(); return }
      if (!this.rooms.length) { this.goToSettings(); return }
      this.openCreate()
    },
    goToSettings () { this.$router.push('/pod-bookings/settings') },
    openDetail (uuid) { this.$router.push(`/pod-bookings/${uuid}`) },
    isCancelled (item) { return item.status === 'cancelled' || item.lifecycle === 'cancelled' },
    async handleBookingAction (action, item) {
      if (action === 'details') this.openDetail(item.uuid)
      else if (action === 'edit') this.$router.push({ path: `/pod-bookings/${item.uuid}`, query: { edit: '1' } })
      else if (action === 'cancel') await this.cancelRealBooking(item)
    },
    async cancelRealBooking (item) {
      if (this.cancellingUuid) return
      const accepted = await this.confirmCancellation()
      if (!accepted) return
      this.cancellingUuid = item.uuid
      try {
        await cancelPodBooking(item.uuid)
        success(this.$t('meeting.cancelled'))
        await this.load()
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('meeting.action_failed')
      } finally { this.cancellingUuid = '' }
    },
    confirmCancellation () {
      return this.$uiConfirm(this.$t('meeting.cancel_confirm'), { title: this.$t('meeting.cancel_booking'), okVariant: 'danger', okTitle: this.$t('meeting.confirm'), cancelTitle: this.$t('meeting.close') })
    },
    openCreate () {
      if (!this.rooms.length) { this.goToSettings(); return }
      const start = new Date(Date.now() + 3600000)
      start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30, 0, 0)
      this.form.start_at = dateTimeValue(start)
      this.form.end_at = dateTimeValue(new Date(start.getTime() + 3600000))
      this.showForm = true
    },
    resetForm () { this.form = { pod_uuid: '', subject: '', start_at: '', end_at: '', participant_count: null }; this.formError = '' },
    async submitBooking () {
      const room = this.rooms.find(item => item.pod_uuid === this.form.pod_uuid)
      const start = new Date(this.form.start_at)
      const end = new Date(this.form.end_at)
      if (!room) { this.formError = this.$t('meeting.room_required'); return }
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end - start > 86400000) { this.formError = this.$t('meeting.invalid_time'); return }
      if (start.getTime() < Date.now() - 60000) { this.formError = this.$t('meeting.start_in_past'); return }
      if (this.form.participant_count !== null && this.form.participant_count !== '' && this.form.participant_count < 1) { this.formError = this.$t('meeting.invalid_participant_count'); return }
      this.formError = ''
      await runUiTask(async () => {
        const idempotencyKey = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`
        // 清空输入框时 v-model.number 得到空串,后端 int|None 不接受 '' → 归一化为 null
        const participantCount = this.form.participant_count === '' ? null : this.form.participant_count
        await createPodBooking({ pod_uuid: room.pod_uuid, owner_company_id: room.owner_company_id, subject: this.form.subject, start_at: start.toISOString(), end_at: end.toISOString(), timezone: room.timezone, participant_count: participantCount }, idempotencyKey)
        this.showForm = false
        await this.load()
      }, {
        successMessage: this.$t('meeting.created'),
        errorMessage: this.$t('meeting.save_failed'),
        showGlobalLoading: false,
        setPending: value => { this.saving = value },
        onError: (_error, message) => { this.formError = message }
      })
    },
    statusVariant (status) { return { upcoming: 'primary', active: 'success', completed: 'secondary', cancelled: 'secondary', scheduled: 'primary' }[status] || 'secondary' },
    dispatchVariant (status) { return { pending: 'warning', sent: 'info', acked: 'success', superseded: 'secondary', failed: 'danger' }[status] || 'secondary' },
    dispatchLabel (status) { return this.$t(`meeting.dispatch_status_${status}`) },
    formatCalendarTime (startValue, endValue) {
      const format = value => new Intl.DateTimeFormat(this.$i18n.locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
      return `${format(startValue)}–${format(endValue)}`
    },
    formatDateTimeRange (startValue, endValue) {
      const start = new Date(startValue); const end = new Date(endValue)
      const date = new Intl.DateTimeFormat(this.$i18n.locale, { month: '2-digit', day: '2-digit' }).format(start)
      const time = value => new Intl.DateTimeFormat(this.$i18n.locale, { hour: '2-digit', minute: '2-digit' }).format(value)
      if (start.toDateString() === end.toDateString()) return `${date} ${time(start)}–${time(end)}`
      return `${new Intl.DateTimeFormat(this.$i18n.locale, { dateStyle: 'short', timeStyle: 'short' }).format(start)} – ${new Intl.DateTimeFormat(this.$i18n.locale, { dateStyle: 'short', timeStyle: 'short' }).format(end)}`
    },
    formatDuration (startValue, endValue) {
      const minutes = Math.max(0, Math.round((new Date(endValue) - new Date(startValue)) / 60000))
      if (minutes < 60) return this.$t('meeting.duration_minutes', { count: minutes })
      const hours = Math.floor(minutes / 60); const remainder = minutes % 60
      return remainder ? this.$t('meeting.duration_hours_minutes', { hours, minutes: remainder }) : this.$t('meeting.duration_hours', { count: hours })
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/pod-bookings.scss"></style>
