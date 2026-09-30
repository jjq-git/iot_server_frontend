<template>
  <section class="hn-model-version-tree" :aria-label="$t('software_version_web_ui.catalog_title')">
    <header class="hn-model-version-tree__hardware">
      <div class="hn-model-version-tree__hardware-title">
        <base-badge variant="info">{{ $t('hn_models.version_catalog.hw_version') }}</base-badge>
        <strong>{{ hardwareLine.hw_version }}</strong>
      </div>
      <div class="hn-model-version-tree__hardware-actions">
        <span class="hn-model-version-tree__summary">
          {{ $t('hn_models.version_catalog.summary', { versions: hardwareLine.version_count, revisions: hardwareLine.revision_count }) }}
        </span>
        <base-icon-button
          v-if="allowFirmwareManage"
          :label="`${$t('common.add')} ${$t('hn_models.version_catalog.od_version')}`"
          @click="$emit('upload-firmware', { hardwareLine, odVersion: '' })"
        >
          <app-icon name="plus" aria-hidden="true" />
        </base-icon-button>
      </div>
    </header>

    <base-loading v-if="loadingRevisions" />
    <base-alert v-else-if="revisionError" variant="danger">
      {{ revisionError }}
      <base-button variant="link" size="sm" @click="loadRevisions">{{ $t('common.retry') }}</base-button>
    </base-alert>
    <base-alert v-else-if="!revisions.length" variant="secondary" class="mb-0">
      {{ $t('common.no_data') }}
    </base-alert>

    <div v-else class="hn-model-version-tree__revisions">
      <article v-for="revision in revisions" :key="revision.id" class="hn-model-version-tree__revision">
        <div class="hn-model-version-tree__revision-header">
          <base-button
            variant="link"
            class="hn-model-version-tree__revision-toggle"
            :aria-expanded="isRevisionExpanded(revision) ? 'true' : 'false'"
            @click="toggleRevision(revision)"
          >
            <app-icon :name="isRevisionExpanded(revision) ? 'chevron-down' : 'chevron-right'" aria-hidden="true" />
            <base-badge variant="secondary">{{ $t('hn_models.version_catalog.od_version') }}</base-badge>
            <strong>{{ revision.od_ver }}</strong>
            <span v-if="hasLoadedVersions(revision)" class="hn-model-version-tree__revision-count">
              {{ versionsFor(revision).length }} {{ $t('hn_models.version_catalog.software_version') }}
            </span>
          </base-button>
          <base-icon-button
            v-if="allowFirmwareManage"
            :label="`${$t('common.add')} ${$t('hn_models.version_catalog.software_version')}`"
            @click="$emit('upload-firmware', { hardwareLine, odVersion: revision.od_ver })"
          >
            <app-icon name="plus" aria-hidden="true" />
          </base-icon-button>
        </div>

        <div v-if="isRevisionExpanded(revision)" class="hn-model-version-tree__versions">
          <base-loading v-if="versionLoading[revision.id]" />
          <base-alert v-else-if="versionErrors[revision.id]" variant="danger" class="mb-0">
            {{ versionErrors[revision.id] }}
            <base-button variant="link" size="sm" @click="loadVersions(revision, true)">{{ $t('common.retry') }}</base-button>
          </base-alert>
          <p v-else-if="!versionsFor(revision).length" class="hn-model-version-tree__empty">
            {{ $t('software_version_web_ui.no_versions') }}
          </p>
          <div
            v-for="version in versionsFor(revision)"
            v-else
            :key="version.uuid"
            class="hn-model-version-tree__version"
          >
            <div class="hn-model-version-tree__version-identity">
              <base-badge variant="light">{{ $t('hn_models.version_catalog.software_version') }}</base-badge>
              <strong>{{ version.sw_ver }}</strong>
              <span v-if="firmwareFor(version) && firmwareFor(version).file_name" class="hn-model-version-tree__firmware-file">
                <app-icon name="file-earmark" aria-hidden="true" />
                {{ firmwareFor(version).file_name }}
              </span>
              <span v-if="version.updated_at" class="hn-model-version-tree__version-date">
                {{ formatDateTime(version.updated_at) }}
              </span>
            </div>
            <div class="hn-model-version-tree__version-actions">
              <base-badge :variant="version.is_active === false ? 'secondary' : 'success'">
                {{ $t(version.is_active === false ? 'common.disabled' : 'common.active') }}
              </base-badge>
              <base-action-button
                v-if="allowWebUi && hardwareLine.is_host"
                :title="$t('software_version_web_ui.open_catalog')"
                @click="$emit('web-ui', { hardwareLine, revisionId: revision.id, versionUuid: version.uuid })"
              >
                <app-icon name="display" aria-hidden="true" />
                <span>{{ $t('software_version_web_ui.open_catalog') }}</span>
              </base-action-button>
              <base-icon-button
                v-if="allowFirmwareManage && firmwareFor(version)"
                :label="`${$t('common.edit')} ${version.sw_ver}`"
                @click="$emit('edit-firmware', firmwareFor(version))"
              >
                <app-icon name="pencil" aria-hidden="true" />
              </base-icon-button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import { fetchHnModelRevisions, fetchHnModelVersions } from '@/api'
import { fetchFirmwares } from '@/api/firmwares'
import { formatDate } from '@/utils/format'

export default {
  name: 'HnModelVersionTree',
  components: { BaseAlert },
  props: {
    hardwareLine: { type: Object, required: true },
    allowWebUi: { type: Boolean, default: false },
    allowFirmwareManage: { type: Boolean, default: false }
  },
  data () {
    return {
      revisions: [],
      versionsByRevision: {},
      versionLoading: {},
      versionErrors: {},
      expandedRevisionId: null,
      loadingRevisions: false,
      revisionError: '',
      firmwareByVersionId: {}
    }
  },
  created () {
    this.loadRevisions()
    if (this.allowWebUi || this.allowFirmwareManage) this.loadFirmwares()
  },
  methods: {
    async loadRevisions () {
      if (!this.hardwareLine?.id || this.loadingRevisions) return
      this.loadingRevisions = true
      this.revisionError = ''
      this.revisions = []
      this.versionsByRevision = {}
      this.versionLoading = {}
      this.versionErrors = {}
      this.expandedRevisionId = null
      try {
        const response = await fetchHnModelRevisions(this.hardwareLine.id)
        this.revisions = Array.isArray(response) ? response : []
        if (this.revisions.length) {
          this.expandedRevisionId = this.revisions[0].id
          await this.loadVersions(this.revisions[0])
        }
      } catch (error) {
        this.revisionError = this.$getErrorMessage(error) || this.$t('software_version_web_ui.catalog_load_failed')
      } finally {
        this.loadingRevisions = false
      }
    },
    async loadFirmwares () {
      try {
        const response = await fetchFirmwares({ model_code: this.hardwareLine.model_code, page: 1, page_size: 200 })
        const items = response?.items || response?.data || (Array.isArray(response) ? response : [])
        this.firmwareByVersionId = items.reduce((result, item) => {
          if (item.hn_model_id) result[item.hn_model_id] = item
          return result
        }, {})
      } catch (error) {
        this.firmwareByVersionId = {}
      }
    },
    async toggleRevision (revision) {
      if (this.isRevisionExpanded(revision)) {
        this.expandedRevisionId = null
        return
      }
      this.expandedRevisionId = revision.id
      if (!this.hasLoadedVersions(revision)) await this.loadVersions(revision)
    },
    async loadVersions (revision, force = false) {
      if (!revision?.id || this.versionLoading[revision.id]) return
      if (!force && this.hasLoadedVersions(revision)) return
      this.$set(this.versionLoading, revision.id, true)
      this.$set(this.versionErrors, revision.id, '')
      try {
        const response = await fetchHnModelVersions(revision.id)
        this.$set(this.versionsByRevision, revision.id, Array.isArray(response) ? response : [])
      } catch (error) {
        this.$set(this.versionErrors, revision.id, this.$getErrorMessage(error) || this.$t('software_version_web_ui.catalog_load_failed'))
      } finally {
        this.$set(this.versionLoading, revision.id, false)
      }
    },
    isRevisionExpanded (revision) {
      return this.expandedRevisionId === revision.id
    },
    hasLoadedVersions (revision) {
      return Object.prototype.hasOwnProperty.call(this.versionsByRevision, revision.id)
    },
    versionsFor (revision) {
      return this.versionsByRevision[revision.id] || []
    },
    firmwareFor (version) {
      return this.firmwareByVersionId[version.id] || null
    },
    formatDateTime (value) {
      return formatDate(value)
    }
  }
}
</script>
