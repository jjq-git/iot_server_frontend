<template>
  <div class="meeting-settings">
    <b-alert v-if="loadError" show variant="danger" class="d-flex align-items-center justify-content-between">
      <span>{{ loadError }}</span>
      <base-button size="sm" variant="outline-danger" @click="load">
        <app-icon name="arrow-clockwise" class="mr-1" />
        {{ $t('common.retry') }}
      </base-button>
    </b-alert>
    <base-card class="meeting-settings__workspace">
      <b-tabs v-model="tabIndex" nav-class="meeting-settings__nav" content-class="meeting-settings__content">
        <template v-if="showTabAction" #tabs-end>
          <li role="presentation" class="nav-item meeting-settings__tab-action">
            <base-button v-if="showConnectionAction" @click="showIntegrationForm = true">
              <app-icon name="plus" class="mr-1" />
              {{ $t('meeting.new_connection') }}
            </base-button>
            <base-button v-else :disabled="!canCreateMapping" :title="mappingActionTitle" @click="openMappingForm">
              <app-icon name="plus" class="mr-1" />
              {{ $t('meeting.new_mapping') }}
            </base-button>
          </li>
        </template>
        <b-tab>
          <template #title>
            <span class="meeting-settings__step">1</span>
            <app-icon name="soundproof-pod" class="mr-2" />
            {{ $t('meeting.local_rooms') }}
          </template>
          <div class="settings-panel">
            <b-alert show variant="info" class="settings-notice">
              <app-icon name="info-circle" class="mr-2" />
              {{ $t('meeting.capability_notice') }}
            </b-alert>
            <base-table
              :class="{ 'booking-settings-table--empty': !capabilities.length }"
              :items="capabilities"
              :fields="roomFields"
              :loading="loading"
              show-empty
              :empty-text="$t('meeting.no_rooms')"
            >
              <template #empty>
                <div class="settings-empty-state">
                  <strong>{{ $t('meeting.no_rooms') }}</strong>
                  <span>{{ $t('meeting.no_rooms_hint') }}</span>
                  <base-button size="sm" variant="outline-primary" @click="$router.push('/pods')">{{ $t('meeting.go_to_rooms') }}</base-button>
                </div>
              </template>
              <template #cell(pod_name)="scope">
                <div class="room-identity">
                  <div class="font-weight-bold">{{ roomDisplayName(scope.item) }}</div>
                  <div v-if="roomIdentityDetail(scope.item)" class="room-identity__detail text-monospace" :title="roomIdentityDetail(scope.item)">
                    {{ roomIdentityDetail(scope.item) }}
                  </div>
                </div>
              </template>
              <template #cell(booking_capability)="scope"><base-badge :variant="capabilityVariant(scope.item.booking_capability)">{{ $t(`meeting.capability_${scope.item.booking_capability}`) }}</base-badge></template>
              <template #cell(active_source_type)="scope">{{ scope.item.active_source_type ? $t(`meeting.source_${scope.item.active_source_type}`) : '-' }}</template>
              <template #cell(actions)="scope">
                <span class="booking-settings-actions">
                  <base-button
                    v-if="scope.item.booking_capability === 'unconfigured'"
                    size="sm"
                    variant="outline-primary"
                    :aria-label="$t('meeting.enable_local')"
                    :disabled="Boolean(actionBusyKey)"
                    @click="configureRoom(scope.item)"
                  >
                    <app-icon name="check-circle" class="mr-1" />
                    {{ $t('meeting.enable_local') }}
                  </base-button>
                  <base-button
                    v-else
                    size="sm"
                    :variant="scope.item.active_source_type === 'local' ? 'outline-danger' : 'outline-primary'"
                    :aria-label="$t(scope.item.active_source_type === 'local' ? 'meeting.disable_local' : 'meeting.enable_local')"
                    :disabled="Boolean(actionBusyKey)"
                    @click="toggleLocal(scope.item)"
                  >
                    <app-icon :name="scope.item.active_source_type === 'local' ? 'power' : 'check-circle'" class="mr-1" />
                    {{ $t(scope.item.active_source_type === 'local' ? 'meeting.disable_local' : 'meeting.enable_local') }}
                  </base-button>
                  <base-button
                    v-if="scope.item.booking_capability !== 'unconfigured'"
                    size="sm"
                    variant="outline-secondary"
                    :aria-label="$t('meeting.booking_policy.title')"
                    :disabled="Boolean(actionBusyKey)"
                    @click="openLifecycleForm(scope.item)"
                  >
                    <app-icon name="sliders" class="mr-1" />
                    {{ $t('meeting.booking_policy.title') }}
                  </base-button>
                </span>
              </template>
            </base-table>
          </div>
        </b-tab>

        <b-tab v-if="isPlatformAdmin()">
          <template #title>
            <span class="meeting-settings__step">2</span>
            <app-icon name="cloud" class="mr-2" />
            {{ $t('meeting.providers') }}
          </template>
          <div class="settings-panel">
            <base-table
              :class="{ 'booking-settings-table--empty': !integrations.length }"
              :items="integrations"
              :fields="integrationFields"
              :loading="loading"
              show-empty
              :empty-text="$t('meeting.no_connections')"
            >
              <template #empty>
                <div class="settings-empty-state">
                  <strong>{{ $t('meeting.no_connections') }}</strong>
                  <span>{{ $t('meeting.no_connections_hint') }}</span>
                  <base-button size="sm" @click="showIntegrationForm = true">{{ $t('meeting.new_connection') }}</base-button>
                </div>
              </template>
              <template #cell(owner_company_id)="scope">{{ companyName(scope.item.owner_company_id) }}</template>
              <template #cell(connection_status)="scope">
                <base-badge :variant="connectionVariant(scope.item.connection_status)">{{ $t(`meeting.connection_${scope.item.connection_status}`) }}</base-badge>
                <small v-if="connectionMessage(scope.item)" class="connection-status-message">{{ connectionMessage(scope.item) }}</small>
              </template>
              <template #cell(actions)="scope">
                <button type="button" class="action-icon action-icon--text" :title="$t('meeting.test_connection')" :aria-label="$t('meeting.test_connection')" :disabled="Boolean(actionBusyKey)" @click="testConnection(scope.item)">
                  <app-icon name="arrow-repeat"  /> <span>{{ $t('meeting.test_connection') }}</span>
                </button>
                <button v-if="scope.item.capabilities && scope.item.capabilities.poll_changes" type="button" class="action-icon action-icon--text" :title="$t('meeting.sync_now')" :aria-label="$t('meeting.sync_now')" :disabled="Boolean(actionBusyKey)" @click="syncConnection(scope.item)">
                  <app-icon name="cloud-download"  /> <span>{{ $t('meeting.sync_now') }}</span>
                </button>
              </template>
            </base-table>
            <section class="provider-section">
              <div class="provider-section__heading">
                <app-icon name="layout-three-columns" class="provider-section__icon" />
                <h3>{{ $t('meeting.available_providers') }}</h3>
              </div>
              <div class="provider-grid">
                <article v-for="provider in visibleProviders" :key="provider.provider" class="provider-card">
                  <div class="provider-card__header">
                    <strong>{{ provider.display_name }}</strong>
                    <base-badge :variant="provider.is_available ? 'success' : 'secondary'">{{ $t(provider.is_available ? 'meeting.available' : 'meeting.not_available') }}</base-badge>
                  </div>
                  <small class="provider-card__capabilities">{{ formatLabelList(provider.capabilities.map(capabilityLabel)) || '-' }}</small>
                </article>
              </div>
            </section>
          </div>
        </b-tab>

        <b-tab>
          <template #title>
            <span class="meeting-settings__step">3</span>
            <app-icon name="link-45deg" class="mr-2" />
            {{ $t('meeting.room_mappings') }}
          </template>
          <div class="settings-panel">
            <b-alert show variant="warning" class="settings-notice">
              <app-icon name="info-circle" class="mr-2" />
              {{ $t('meeting.mapping_notice') }}
            </b-alert>
            <base-table
              :class="{ 'booking-settings-table--empty': !mappings.length }"
              :items="mappings"
              :fields="mappingFields"
              :loading="loading"
              show-empty
              :empty-text="$t('meeting.no_mappings')"
            >
              <template #empty>
                <div class="settings-empty-state">
                  <strong>{{ $t('meeting.no_mappings') }}</strong>
                  <span>{{ mappingEmptyHint }}</span>
                  <base-button v-if="canCreateMapping" size="sm" @click="openMappingForm">{{ $t('meeting.new_mapping') }}</base-button>
                </div>
              </template>
              <template #cell(verification_status)="scope"><base-badge :variant="scope.item.verification_status === 'verified' ? 'success' : 'warning'">{{ $t(`meeting.verify_${scope.item.verification_status}`) }}</base-badge></template>
              <template #cell(is_active)="scope"><base-badge :variant="scope.item.is_active ? 'success' : 'secondary'">{{ $t(scope.item.is_active ? 'meeting.yes' : 'meeting.no') }}</base-badge></template>
              <template #cell(actions)="scope">
                <button v-if="scope.item.verification_status !== 'verified'" type="button" class="action-icon action-icon--text" :title="$t('meeting.verify')" :aria-label="$t('meeting.verify')" :disabled="Boolean(actionBusyKey)" @click="verifyMapping(scope.item)">
                  <app-icon name="check-circle"  /> <span>{{ $t('meeting.verify') }}</span>
                </button>
                <button v-else-if="!scope.item.is_active" type="button" class="action-icon action-icon--text" :title="$t('meeting.use_as_source')" :aria-label="$t('meeting.use_as_source')" :disabled="Boolean(actionBusyKey)" @click="activateMapping(scope.item)">
                  <app-icon name="arrow-repeat"  /> <span>{{ $t('meeting.use_as_source') }}</span>
                </button>
              </template>
            </base-table>
          </div>
        </b-tab>
      </b-tabs>
    </base-card>

    <base-modal
      v-model="showIntegrationForm"
      :title="$t('meeting.new_connection')"
      centered
      scrollable
      @hidden="resetIntegrationForm"
    >
      <b-form id="meeting-integration-form" @submit.prevent="createConnection">
        <base-form-group :label="$t('meeting.company')"><b-form-select v-model="integrationForm.owner_company_id" :options="companyOptions" required /></base-form-group>
        <base-form-group :label="$t('meeting.provider')"><b-form-select v-model="integrationForm.provider" :options="providerOptions" required @change="selectProvider" /></base-form-group>
        <base-form-group :label="$t('meeting.connection_name')"><base-input v-model.trim="integrationForm.name" required maxlength="128" :clearable="false" /></base-form-group>
        <base-form-group v-for="field in selectedProviderCredentialFields" :key="`credential-${field.name}`" :label="field.label || field.name">
          <base-input
            v-model.trim="integrationForm.credentials[field.name]"
            :type="field.type === 'password' ? 'password' : 'text'"
            :required="field.required"
            autocomplete="new-password" :clearable="false"
          />
          <small v-if="field.description || field.help_text" class="form-text text-muted">{{ field.description || field.help_text }}</small>
        </base-form-group>
        <base-form-group v-for="field in selectedProviderConfigFields" :key="`config-${field.name}`" :label="field.label || field.name">
          <base-input
            v-model="integrationForm.provider_config[field.name]"
            :type="field.type === 'number' ? 'number' : 'text'"
            :required="field.required"
            :min="field.min"
            :max="field.max" :clearable="false"
          />
          <small v-if="field.description || field.help_text" class="form-text text-muted">{{ field.description || field.help_text }}</small>
        </base-form-group>
        <b-alert v-if="formError" show variant="danger">{{ formError }}</b-alert>
      </b-form>
      <template #modal-footer>
        <base-button type="button" variant="outline-secondary" class="mr-2" @click="showIntegrationForm = false">
          <app-icon name="x" class="mr-1" />
          {{ $t('meeting.cancel_action') }}
        </base-button>
        <base-button type="submit" form="meeting-integration-form" :loading="savingConnection">
          <app-icon name="check" v-if="!savingConnection" class="mr-1" />
          {{ savingConnection ? $t('meeting.saving') : $t('meeting.save_connection') }}
        </base-button>
      </template>
    </base-modal>

    <base-modal v-model="showMappingForm" :title="$t('meeting.new_mapping')" hide-footer @hidden="resetMappingForm" :centered="false" :scrollable="false">
      <b-form @submit.prevent="createMapping">
        <base-form-group :label="$t('meeting.connection')"><b-form-select v-model="mappingForm.integration_uuid" :options="integrationOptions" required /></base-form-group>
        <base-form-group :label="$t('meeting.room')"><b-form-select v-model="mappingForm.room_config_uuid" :options="configOptions" required /></base-form-group>
        <base-form-group :label="$t('meeting.external_room_id')">
          <b-form-select v-if="selectedMappingSupportsRoomList" v-model="mappingForm.external_room_id" :options="roomCandidateOptions" :disabled="roomCandidatesLoading || !roomCandidates.length" required @change="selectRoomCandidate" />
          <base-input v-else v-model.trim="mappingForm.external_room_id" required maxlength="255" :clearable="false" />
          <small v-if="roomCandidatesLoading" class="form-text text-muted">{{ $t('meeting.loading_external_rooms') }}</small>
          <small v-else-if="selectedMappingSupportsRoomList && !roomCandidates.length" class="form-text text-warning">{{ $t('meeting.no_external_rooms_hint') }}</small>
        </base-form-group>
        <base-form-group :label="$t('meeting.external_room_name')"><base-input v-model.trim="mappingForm.external_room_name" maxlength="255" :clearable="false" /></base-form-group>
        <b-alert v-if="formError" show variant="danger">{{ formError }}</b-alert>
        <div class="d-flex justify-content-end">
          <base-button variant="outline-secondary" class="mr-2" @click="showMappingForm = false">
            <app-icon name="x" class="mr-1" />
            {{ $t('meeting.cancel_action') }}
          </base-button>
          <base-button type="submit" :loading="savingMapping" :disabled="selectedMappingSupportsRoomList && !roomCandidates.length">
            <app-icon name="check" v-if="!savingMapping" class="mr-1" />
            {{ savingMapping ? $t('meeting.saving') : $t('meeting.save') }}
          </base-button>
        </div>
      </b-form>
    </base-modal>

    <base-modal
      v-model="showLifecycleForm"
      :title="$t('meeting.booking_policy.title')"
      size="lg"
      modal-class="booking-policy-modal"
      centered
      scrollable
      @hidden="resetLifecycleForm"
    >
      <b-form id="booking-lifecycle-form" class="booking-policy-form" @submit.prevent="saveLifecycle">
        <base-form-group :label="$t('meeting.booking_policy.default_scene')">
          <b-form-select v-model="defaultSceneKey" :options="lifecycleSceneOptions" />
          <small class="form-text text-muted">{{ $t('meeting.booking_policy.default_scene_help') }}</small>
        </base-form-group>
        <fieldset class="booking-policy-section">
          <legend class="booking-policy-section__title">{{ $t('meeting.booking_policy.cleaning_policy') }}</legend>
          <b-form-checkbox v-model="cleaningForm.per_session.enabled" class="mb-2">{{ $t('meeting.booking_policy.clean_after_session') }}</b-form-checkbox>
          <base-form-group v-if="cleaningForm.per_session.enabled" :label="$t('meeting.booking_policy.cleaning_buffer_minutes')">
            <base-input v-model.number="cleaningForm.per_session.buffer_minutes" type="number" min="1" max="1440" :clearable="false" />
          </base-form-group>
          <b-form-checkbox v-model="cleaningForm.scheduled.enabled" class="mb-2">{{ $t('meeting.booking_policy.scheduled_cleaning') }}</b-form-checkbox>
          <div v-if="cleaningForm.scheduled.enabled">
            <div v-for="(window, index) in cleaningForm.scheduled.windows" :key="index" class="booking-policy-cleaning-window">
              <base-form-group :label="$t('meeting.booking_policy.start_time')">
                <base-input v-model="window.at" type="time" required :clearable="false" />
              </base-form-group>
              <base-form-group :label="$t('meeting.booking_policy.cleaning_duration_minutes')">
                <base-input v-model.number="window.duration_minutes" type="number" min="1" max="1440" required :clearable="false" />
              </base-form-group>
              <base-form-group :label="$t('meeting.booking_policy.iso_weekdays')">
                <base-input v-model.trim="window.days_text" :placeholder="$t('meeting.booking_policy.iso_weekdays_placeholder')" :clearable="false" />
              </base-form-group>
              <div class="booking-policy-cleaning-window__remove">
                <base-icon-button tone="danger" :label="$t('meeting.booking_policy.remove_cleaning_window')" @click="removeCleaningWindow(index)">
                  <app-icon name="trash" />
                </base-icon-button>
              </div>
            </div>
            <base-button type="button" size="sm" variant="outline-primary" @click="addCleaningWindow">
              <app-icon name="plus" class="mr-1" />
              {{ $t('meeting.booking_policy.add_cleaning_window') }}
            </base-button>
          </div>
        </fieldset>
        <h6 class="booking-policy-form__heading">{{ $t('meeting.booking_policy.lifecycle_actions') }}</h6>
        <div class="booking-policy-phase-list">
          <div v-for="row in lifecycleRows" :key="row.phase" class="booking-policy-phase-card">
            <strong class="booking-policy-phase-card__title">{{ lifecyclePhaseLabel(row.phase) }}</strong>
            <div :class="['booking-policy-phase-card__action-grid', { 'booking-policy-phase-card__action-grid--timed': row.phase === 'pre_start' || row.phase === 'overstay' }]">
              <base-form-group :label="$t('meeting.booking_policy.scene_action')">
                <b-form-select v-model="row.scene" :options="lifecycleSceneOptions" />
              </base-form-group>
              <base-form-group v-if="row.phase === 'pre_start'" :label="$t('meeting.booking_policy.offset_minutes')">
                <base-input v-model.number="row.offset_minutes" type="number" min="0" max="1440" :clearable="false" />
              </base-form-group>
              <base-form-group v-if="row.phase === 'overstay'" :label="$t('meeting.booking_policy.grace_minutes')">
                <base-input v-model.number="row.grace_minutes" type="number" min="0" max="1440" :clearable="false" />
              </base-form-group>
            </div>
            <b-form-checkbox v-model="row.notify_enabled" class="booking-policy-phase-card__notify-toggle">{{ $t('meeting.booking_policy.notify') }}</b-form-checkbox>
            <div v-if="row.notify_enabled" class="booking-policy-phase-card__notify-grid">
              <base-form-group :label="$t('meeting.booking_policy.audience')">
                <b-form-select v-model="row.audience" :options="lifecycleAudienceOptions" required />
              </base-form-group>
              <base-form-group :label="$t('meeting.booking_policy.channel')">
                <b-form-select v-model="row.channel" :options="lifecycleChannelOptions" required />
              </base-form-group>
              <base-form-group :label="$t('meeting.booking_policy.template')">
                <base-input v-model.trim="row.template" pattern="[a-z][a-z0-9_]*" maxlength="48" required :clearable="false" />
              </base-form-group>
            </div>
          </div>
        </div>
        <b-alert v-if="lifecycleFormError" show variant="danger">{{ lifecycleFormError }}</b-alert>
      </b-form>
      <template #modal-footer>
        <base-button type="button" variant="outline-secondary" class="mr-2" @click="showLifecycleForm = false">{{ $t('meeting.cancel_action') }}</base-button>
        <base-button type="submit" form="booking-lifecycle-form" :loading="savingLifecycle">{{ $t('meeting.save') }}</base-button>
      </template>
    </base-modal>
  </div>
</template>

<script>
import { fetchCompanies } from '@/api/pods'
import { createMeetingIntegration, createMeetingRoomMapping, fetchMeetingIntegrations, fetchMeetingProviders, fetchMeetingRoomCandidates, fetchMeetingRoomMappings, syncMeetingIntegration, testMeetingIntegration, verifyMeetingRoomMapping } from '@/api/meeting'
import { createPodBookingConfig, fetchPodBookingCapabilities, fetchPodBookingConfigs, switchPodBookingSource, updatePodBookingConfig } from '@/api/podBookings'
import { success } from '@/services/ui/toast'
import { formatList } from '@/utils/format'

export default {
  name: 'PodBookingSettings',
  data () { return { loading: false, loadError: '', tabIndex: 0, capabilities: [], roomConfigs: [], providers: [], integrations: [], mappings: [], companies: [], roomCandidates: [], roomCandidatesLoading: false, showIntegrationForm: false, showMappingForm: false, showLifecycleForm: false, savingConnection: false, savingMapping: false, savingLifecycle: false, lifecycleConfigUuid: '', lifecycleScenes: [], lifecycleRows: [], defaultSceneKey: '', cleaningForm: { per_session: { enabled: false, buffer_minutes: 15 }, scheduled: { enabled: false, windows: [] } }, lifecycleFormError: '', actionBusyKey: '', formError: '', integrationForm: { owner_company_id: '', provider: '', name: '', credentials: {}, provider_config: {} }, mappingForm: { integration_uuid: '', room_config_uuid: '', external_room_id: '', external_room_name: '' } } },
  computed: {
    showConnectionAction () { return this.isPlatformAdmin() && this.tabIndex === 1 },
    mappingTabIndex () { return this.isPlatformAdmin() ? 2 : 1 },
    showMappingAction () { return this.tabIndex === this.mappingTabIndex },
    showTabAction () { return this.showConnectionAction || this.showMappingAction },
    connectedIntegrations () { return this.integrations.filter(item => item.connection_status === 'connected') },
    mappableIntegrations () { return this.connectedIntegrations.filter(integration => this.roomConfigs.some(config => String(config.owner_company_id) === String(integration.owner_company_id))) },
    canCreateMapping () { return Boolean(this.mappableIntegrations.length) },
    mappingActionTitle () { return this.canCreateMapping ? this.$t('meeting.new_mapping') : this.$t('meeting.mapping_prerequisites') },
    mappingEmptyHint () { return this.canCreateMapping ? this.$t('meeting.no_mappings_hint') : this.$t('meeting.mapping_prerequisites') },
    roomFields () { return [{ key: 'pod_name', label: this.$t('meeting.room') }, { key: 'booking_capability', label: this.$t('meeting.capability') }, { key: 'active_source_type', label: this.$t('meeting.active_source') }, { key: 'actions', label: this.$t('meeting.actions'), class: 'actions-cell', thClass: 'actions-cell' }] },
    integrationFields () { return [{ key: 'name', label: this.$t('meeting.connection_name') }, { key: 'provider_display_name', label: this.$t('meeting.provider') }, { key: 'owner_company_id', label: this.$t('meeting.company') }, { key: 'connection_status', label: this.$t('meeting.connection_status') }, { key: 'actions', label: this.$t('meeting.actions'), class: 'actions-cell', thClass: 'actions-cell' }] },
    mappingFields () { return [{ key: 'pod_name', label: this.$t('meeting.room') }, { key: 'integration_name', label: this.$t('meeting.connection') }, { key: 'external_room_name', label: this.$t('meeting.external_room') }, { key: 'verification_status', label: this.$t('meeting.verification') }, { key: 'is_active', label: this.$t('meeting.active') }, { key: 'actions', label: this.$t('meeting.actions'), class: 'actions-cell', thClass: 'actions-cell' }] },
    companyOptions () { return [{ value: '', text: this.$t('meeting.select_company'), disabled: true }, ...this.companies.map(item => ({ value: item.id, text: item.company_name || item.name || item.company_code }))] },
    visibleProviders () { return this.providers.filter(item => !(process.env.NODE_ENV === 'production' && (item.provider === 'fake' || /fake/i.test(item.display_name || '')))) },
    providerOptions () { return [{ value: '', text: this.$t('meeting.select_provider'), disabled: true }, ...this.visibleProviders.filter(item => item.is_available).map(item => ({ value: item.provider, text: item.display_name }))] },
    integrationOptions () { return [{ value: '', text: this.$t('meeting.select_connection'), disabled: true }, ...this.mappableIntegrations.map(item => ({ value: item.uuid, text: item.name }))] },
    selectedMappingIntegration () { return this.integrations.find(item => item.uuid === this.mappingForm.integration_uuid) || null },
    selectedMappingSupportsRoomList () { return Boolean(this.selectedMappingIntegration?.capabilities?.room_list) },
    configOptions () {
      const ownerCompanyId = this.selectedMappingIntegration?.owner_company_id
      const configs = ownerCompanyId === undefined || ownerCompanyId === null
        ? this.roomConfigs
        : this.roomConfigs.filter(item => String(item.owner_company_id) === String(ownerCompanyId))
      return [{ value: '', text: this.$t('meeting.select_room'), disabled: true }, ...configs.map(item => ({ value: item.uuid, text: item.pod_name }))]
    },
    selectedProvider () { return this.providers.find(item => item.provider === this.integrationForm.provider) || null },
    selectedProviderCredentialFields () { return this.selectedProvider ? this.selectedProvider.credential_fields || [] : [] },
    selectedProviderConfigFields () { return this.selectedProvider ? this.selectedProvider.config_fields || [] : [] },
    lifecycleSceneOptions () { return [{ value: '', text: this.$t('meeting.booking_policy.none_option') }, ...this.lifecycleScenes.map(scene => ({ value: scene.key, text: scene.name || scene.key }))] },
    lifecycleAudienceOptions () { return ['occupant', 'organizer', 'guest', 'cleaner', 'staff'].map(value => ({ value, text: this.$t(`meeting.booking_policy.audience_${value}`) })) },
    lifecycleChannelOptions () { return ['dashboard', 'pod_screen'].map(value => ({ value, text: this.$t(`meeting.booking_policy.channel_${value}`) })) },
    roomCandidateOptions () {
      return [
        { value: '', text: this.$t('meeting.external_room'), disabled: true },
        ...this.roomCandidates.map(item => ({
          value: item.external_room_id,
          text: this.roomCandidateLabel(item)
        }))
      ]
    }
  },
  watch: {
    'mappingForm.integration_uuid' (uuid) {
      this.mappingForm.room_config_uuid = ''
      this.loadRoomCandidates(uuid)
    }
  },
  created () { this.load() },
  methods: {
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const requests = [
          { key: 'capabilities', request: fetchPodBookingCapabilities() },
          { key: 'configs', request: fetchPodBookingConfigs() },
          { key: 'providers', request: fetchMeetingProviders() },
          { key: 'integrations', request: fetchMeetingIntegrations() },
          { key: 'mappings', request: fetchMeetingRoomMappings() }
        ]
        if (this.isPlatformAdmin()) requests.push({ key: 'companies', request: fetchCompanies({ page: 1, page_size: 200 }) })
        const results = await Promise.allSettled(requests.map(item => item.request))
        const failures = []
        results.forEach((result, index) => {
          const key = requests[index].key
          if (result.status === 'rejected') { failures.push(result.reason); return }
          const value = result.value || []
          if (key === 'capabilities') this.capabilities = value.items || value
          else if (key === 'configs') this.roomConfigs = value.items || value
          else if (key === 'providers') this.providers = value.items || value
          else if (key === 'integrations') this.integrations = value.items || value
          else if (key === 'mappings') this.mappings = value.items || value
          else if (key === 'companies') this.companies = value.items || value.data || value
        })
        if (failures.length) {
          const first = failures[0]
          this.loadError = first?.response?.status === 404 ? this.$t('meeting.backend_unavailable') : (this.$getErrorMessage(first) || this.$t('meeting.settings_partial_load_failed'))
        }
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('meeting.settings_load_failed')
      } finally { this.loading = false }
    },
    capabilityVariant (value) { return value === 'enabled' ? 'success' : value === 'disabled' ? 'warning' : 'secondary' },
    roomDisplayName (item) {
      return item.pod_name || item.pod_uuid || '-'
    },
    roomIdentityDetail (item) {
      const displayName = this.roomDisplayName(item)
      const details = []
      if (item.pod_uuid && item.pod_uuid !== displayName) details.push(item.pod_uuid)
      return details.join(' · ')
    },
    companyName (companyId) {
      const company = this.companies.find(item => String(item.id) === String(companyId))
      return company ? (company.company_name || company.name || company.company_code) : (companyId || '-')
    },
    connectionVariant (status) { return { connected: 'success', degraded: 'danger', untested: 'warning', disabled: 'secondary' }[status] || 'secondary' },
    // 后端 MeetingIntegrationResponse 只提供 last_error_code(无 *_message 字段)
    connectionMessage (item) { return item.last_error_code || '' },
    formatLabelList (items) { return formatList(items) },
    capabilityLabel (capability) {
      const key = `meeting.provider_capability_${capability}`
      const translated = this.$t(key)
      return translated === key ? capability : translated
    },
    lifecyclePhaseLabel (phase) {
      const key = `route.notifications.phase_labels.${phase}`
      const translated = this.$t(key)
      return translated === key ? phase : translated
    },
    async configureRoom (item) { await this.runAction(async () => { await createPodBookingConfig({ pod_uuid: item.pod_uuid, booking_mode: 'local_private' }); success(this.$t('meeting.room_enabled')) }, `room-${item.pod_uuid}`) },
    openLifecycleForm (item) {
      const config = this.roomConfigs.find(candidate => candidate.uuid === item.uuid) || item
      const lifecycle = config.lifecycle || {}
      const cleaning = config.cleaning_config || {}
      this.lifecycleConfigUuid = config.uuid
      this.lifecycleScenes = config.automation_config || []
      this.defaultSceneKey = config.default_scene_key || ''
      this.cleaningForm = {
        per_session: {
          enabled: Boolean(cleaning.per_session?.enabled),
          buffer_minutes: cleaning.per_session?.buffer_minutes ?? 15
        },
        scheduled: {
          enabled: Boolean(cleaning.scheduled?.enabled),
          windows: (cleaning.scheduled?.windows || []).map(window => ({
            at: window.at,
            duration_minutes: window.duration_minutes,
            days_text: Array.isArray(window.days) ? window.days.join(',') : ''
          }))
        }
      }
      if (this.cleaningForm.scheduled.enabled && !this.cleaningForm.scheduled.windows.length) this.addCleaningWindow()
      this.lifecycleRows = ['pre_start', 'start', 'end', 'overstay', 'vacated', 'cleaning', 'cleaned'].map(phase => {
        const phaseConfig = lifecycle[phase] || {}
        const notify = phaseConfig.notify || {}
        return {
          phase,
          scene: phaseConfig.scene || '',
          offset_minutes: phaseConfig.offset_minutes ?? 5,
          grace_minutes: phaseConfig.grace_minutes ?? 5,
          notify_enabled: Boolean(phaseConfig.notify),
          audience: notify.to || 'staff',
          channel: notify.channel || 'dashboard',
          template: notify.template || ''
        }
      })
      this.lifecycleFormError = ''
      this.showLifecycleForm = true
    },
    resetLifecycleForm () {
      this.lifecycleConfigUuid = ''
      this.lifecycleScenes = []
      this.lifecycleRows = []
      this.defaultSceneKey = ''
      this.cleaningForm = { per_session: { enabled: false, buffer_minutes: 15 }, scheduled: { enabled: false, windows: [] } }
      this.lifecycleFormError = ''
    },
    addCleaningWindow () {
      if (this.cleaningForm.scheduled.windows.length < 16) this.cleaningForm.scheduled.windows.push({ at: '07:00', duration_minutes: 30, days_text: '' })
    },
    removeCleaningWindow (index) { this.cleaningForm.scheduled.windows.splice(index, 1) },
    parseCleaningDays (value) {
      const text = String(value || '').trim()
      if (!text) return undefined
      const days = text.split(',').map(item => Number(item.trim()))
      if (days.some(day => !Number.isInteger(day) || day < 1 || day > 7) || new Set(days).size !== days.length) throw new Error(this.$t('meeting.booking_policy.invalid_iso_weekdays'))
      return days
    },
    async saveLifecycle () {
      if (this.savingLifecycle || !this.lifecycleConfigUuid) return
      const lifecycle = {}
      for (const row of this.lifecycleRows) {
        if (!row.scene && !row.notify_enabled) continue
        const phase = {}
        if (row.scene) phase.scene = row.scene
        if (row.phase === 'pre_start') phase.offset_minutes = Number(row.offset_minutes)
        if (row.phase === 'overstay') phase.grace_minutes = Number(row.grace_minutes)
        if (row.notify_enabled) phase.notify = { to: row.audience, template: row.template, channel: row.channel }
        lifecycle[row.phase] = phase
      }
      this.savingLifecycle = true
      this.lifecycleFormError = ''
      try {
        const cleaningConfig = {}
        if (this.cleaningForm.per_session.enabled) {
          cleaningConfig.per_session = { enabled: true, buffer_minutes: Number(this.cleaningForm.per_session.buffer_minutes) }
        }
        if (this.cleaningForm.scheduled.enabled) {
          cleaningConfig.scheduled = {
            enabled: true,
            windows: this.cleaningForm.scheduled.windows.map(window => {
              const days = this.parseCleaningDays(window.days_text)
              return { at: window.at, duration_minutes: Number(window.duration_minutes), ...(days ? { days } : {}) }
            })
          }
        }
        await updatePodBookingConfig(this.lifecycleConfigUuid, { default_scene_key: this.defaultSceneKey || null, cleaning_config: cleaningConfig, lifecycle })
        success(this.$t('meeting.source_updated'))
        this.showLifecycleForm = false
        await this.load()
      } catch (error) {
        this.lifecycleFormError = this.$getErrorMessage(error) || this.$t('meeting.save_failed')
      } finally {
        this.savingLifecycle = false
      }
    },
    async toggleLocal (item) {
      const accepted = await this.$uiConfirm(this.$t('meeting.source_switch_confirm', { room: item.pod_name || item.pod_uuid }), { title: this.$t('meeting.source_switch_title'), okTitle: this.$t('meeting.confirm'), cancelTitle: this.$t('meeting.cancel_action') })
      if (!accepted) return
      await this.runAction(async () => { await switchPodBookingSource(item.uuid, { source_type: item.active_source_type === 'local' ? 'none' : 'local', expected_source_type: item.active_source_type }); success(this.$t('meeting.source_updated')) }, `room-${item.pod_uuid}`)
    },
    async createConnection () {
      if (this.savingConnection) return
      this.savingConnection = true
      this.formError = ''
      try { await createMeetingIntegration({ ...this.integrationForm, sync_mode: 'poll', is_enabled: true }); success(this.$t('meeting.connection_created')); this.showIntegrationForm = false; await this.load() } catch (error) { this.formError = this.$getErrorMessage(error) || this.$t('meeting.save_failed') } finally { this.savingConnection = false }
    },
    selectProvider () {
      const credentials = {}; const providerConfig = {}
      this.selectedProviderCredentialFields.forEach(field => { credentials[field.name] = '' })
      this.selectedProviderConfigFields.forEach(field => { providerConfig[field.name] = field.default ?? '' })
      this.integrationForm.credentials = credentials; this.integrationForm.provider_config = providerConfig
    },
    resetIntegrationForm () { this.integrationForm = { owner_company_id: '', provider: '', name: '', credentials: {}, provider_config: {} }; this.formError = '' },
    async testConnection (item) { await this.runAction(async () => { await testMeetingIntegration(item.uuid); success(this.$t('meeting.connection_ok')) }, `integration-${item.uuid}`) },
    async syncConnection (item) { await this.runAction(async () => { const result = await syncMeetingIntegration(item.uuid); success(this.$t('meeting.sync_completed', result)) }, `integration-${item.uuid}`) },
    async loadRoomCandidates (uuid) {
      this.roomCandidatesLoading = false
      this.roomCandidates = []; this.mappingForm.external_room_id = ''; this.mappingForm.external_room_name = ''
      if (!uuid) return
      const integration = this.integrations.find(item => item.uuid === uuid)
      if (!integration || !integration.capabilities || !integration.capabilities.room_list) return
      this.roomCandidatesLoading = true
      try {
        const result = await fetchMeetingRoomCandidates(uuid)
        this.roomCandidates = Array.isArray(result) ? result : (result.items || [])
      } catch (error) { this.formError = this.$getErrorMessage(error) || this.$t('meeting.action_failed') } finally { this.roomCandidatesLoading = false }
    },
    roomCandidateLabel (room) {
      const metadata = room.provider_metadata || {}
      const location = [metadata.city, metadata.building, metadata.floor].filter(Boolean).join(' / ')
      const name = room.external_room_name || room.external_room_id
      return [name, location, `ID: ${room.external_room_id}`].filter(Boolean).join(' ｜ ')
    },
    selectRoomCandidate (externalRoomId) { const room = this.roomCandidates.find(item => item.external_room_id === externalRoomId); this.mappingForm.external_room_name = room ? room.external_room_name || '' : '' },
    openMappingForm () { if (this.canCreateMapping) this.showMappingForm = true },
    resetMappingForm () { this.mappingForm = { integration_uuid: '', room_config_uuid: '', external_room_id: '', external_room_name: '' }; this.roomCandidates = []; this.roomCandidatesLoading = false; this.formError = '' },
    async createMapping () {
      if (this.savingMapping) return
      const integration = this.integrations.find(item => item.uuid === this.mappingForm.integration_uuid); const config = this.roomConfigs.find(item => item.uuid === this.mappingForm.room_config_uuid)
      if (!integration || !config || String(integration.owner_company_id) !== String(config.owner_company_id)) { this.formError = this.$t('meeting.company_mismatch'); return }
      this.savingMapping = true
      try { await createMeetingRoomMapping({ owner_company_id: config.owner_company_id, ...this.mappingForm, candidate_source: 'manual' }); success(this.$t('meeting.mapping_created')); this.showMappingForm = false; await this.load() } catch (error) { this.formError = this.$getErrorMessage(error) || this.$t('meeting.save_failed') } finally { this.savingMapping = false }
    },
    async verifyMapping (item) { await this.runAction(async () => { await verifyMeetingRoomMapping(item.uuid); success(this.$t('meeting.mapping_verified')) }, `mapping-${item.uuid}`) },
    async activateMapping (mapping) {
      const accepted = await this.$uiConfirm(this.$t('meeting.activate_mapping_confirm', { room: mapping.pod_name || mapping.external_room_name }), { title: this.$t('meeting.source_switch_title'), okTitle: this.$t('meeting.confirm'), cancelTitle: this.$t('meeting.cancel_action') })
      if (!accepted) return
      await this.runAction(async () => { const config = this.roomConfigs.find(item => item.uuid === mapping.room_config_uuid); await switchPodBookingSource(mapping.room_config_uuid, { source_type: 'integration', room_mapping_uuid: mapping.uuid, expected_source_type: config ? config.active_source_type : undefined }); success(this.$t('meeting.source_updated')) }, `mapping-${mapping.uuid}`)
    },
    async runAction (action, busyKey) {
      if (this.actionBusyKey) return
      this.actionBusyKey = busyKey || 'global'
      this.loadError = ''
      try { await action(); await this.load() } catch (error) { this.loadError = this.$getErrorMessage(error) || this.$t('meeting.action_failed') } finally { this.actionBusyKey = '' }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/pod-booking-settings.scss"></style>
