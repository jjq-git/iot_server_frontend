<template>
  <base-modal
    id="hn-model-version-catalog-modal"
    v-model="visible"
    :title="$t('software_version_web_ui.catalog_title')"
    size="xl"
    hide-footer
    modal-class="dialog-with-header-bg hn-model-version-catalog-modal"
    @hidden="reset"
  >
    <div v-if="hardwareLine" class="hn-model-version-catalog">
      <div class="hn-model-version-catalog__identity">
        <strong>{{ hardwareLine.model_code }}</strong>
        <span>{{ hardwareLine.model_name }}</span>
        <base-badge variant="info">{{ $t('hn_models.version_catalog.hw_version') }} {{ hardwareLine.hw_version }}</base-badge>
      </div>

      <base-alert v-if="loadError" variant="danger">
        {{ loadError }}
        <base-button variant="link" size="sm" @click="loadRevisions">{{ $t('common.retry') }}</base-button>
      </base-alert>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('hn_models.version_catalog.od_version')">
            <base-select
              v-model="selectedRevisionId"
              :options="revisionOptions"
              :disabled="loadingRevisions"
              @input="loadVersions"
            />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('hn_models.version_catalog.software_version')">
            <base-select
              v-model="selectedVersionUuid"
              :options="versionOptions"
              :disabled="loadingVersions || !selectedRevisionId"
            />
          </base-form-group>
        </b-col>
      </b-row>

      <base-loading v-if="loadingRevisions || loadingVersions" />
      <software-version-web-ui-panel
        v-else-if="selectedVersion"
        :key="selectedVersion.uuid"
        :version="selectedVersion"
        :can-manage="canManage"
      />
      <p v-else class="hn-model-version-catalog__empty">{{ $t('software_version_web_ui.no_versions') }}</p>
    </div>
  </base-modal>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import SoftwareVersionWebUiPanel from './SoftwareVersionWebUiPanel.vue'
import { fetchHnModelRevisions, fetchHnModelVersions } from '@/api'

export default {
  name: 'HnModelVersionCatalogModal',
  components: { BaseAlert, SoftwareVersionWebUiPanel },
  props: {
    value: { type: Boolean, default: false },
    hardwareLine: { type: Object, default: null },
    initialRevisionId: { type: Number, default: null },
    initialVersionUuid: { type: String, default: '' },
    canManage: { type: Boolean, default: false }
  },
  data () {
    return {
      revisions: [],
      versions: [],
      selectedRevisionId: null,
      selectedVersionUuid: '',
      loadingRevisions: false,
      loadingVersions: false,
      loadError: ''
    }
  },
  computed: {
    visible: {
      get () { return this.value },
      set (value) { this.$emit('input', value) }
    },
    revisionOptions () {
      const placeholder = [{ value: null, text: this.$t('software_version_web_ui.select_od') }]
      return placeholder.concat(this.revisions.map(item => ({ value: item.id, text: item.od_ver })))
    },
    versionOptions () {
      const placeholder = [{ value: '', text: this.$t('software_version_web_ui.select_software') }]
      return placeholder.concat(this.versions.map(item => ({ value: item.uuid, text: item.sw_ver })))
    },
    selectedVersion () {
      return this.versions.find(item => item.uuid === this.selectedVersionUuid) || null
    }
  },
  watch: {
    value (visible) {
      if (visible) this.loadRevisions()
    },
    'hardwareLine.id' () {
      if (this.value) this.loadRevisions()
    }
  },
  methods: {
    async loadRevisions () {
      if (!this.hardwareLine?.id) return
      this.loadingRevisions = true
      this.loadError = ''
      this.revisions = []
      this.versions = []
      this.selectedRevisionId = null
      this.selectedVersionUuid = ''
      try {
        const response = await fetchHnModelRevisions(this.hardwareLine.id)
        this.revisions = Array.isArray(response) ? response : []
        if (this.revisions.length) {
          const initialRevision = this.revisions.find(item => item.id === this.initialRevisionId)
          this.selectedRevisionId = initialRevision?.id || this.revisions[0].id
          await this.loadVersions()
        }
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('software_version_web_ui.catalog_load_failed')
      } finally {
        this.loadingRevisions = false
      }
    },
    async loadVersions () {
      this.versions = []
      this.selectedVersionUuid = ''
      if (!this.selectedRevisionId) return
      this.loadingVersions = true
      this.loadError = ''
      try {
        const response = await fetchHnModelVersions(this.selectedRevisionId)
        this.versions = Array.isArray(response) ? response : []
        if (this.versions.length) {
          const initialVersion = this.versions.find(item => item.uuid === this.initialVersionUuid)
          this.selectedVersionUuid = initialVersion?.uuid || this.versions[0].uuid
        }
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('software_version_web_ui.catalog_load_failed')
      } finally {
        this.loadingVersions = false
      }
    },
    reset () {
      this.revisions = []
      this.versions = []
      this.selectedRevisionId = null
      this.selectedVersionUuid = ''
      this.loadError = ''
    }
  }
}
</script>
