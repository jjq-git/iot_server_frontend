<template>
  <section class="software-version-web-ui" :aria-label="$t('software_version_web_ui.title')">
    <div class="software-version-web-ui__toolbar">
      <div>
        <h5>{{ $t('software_version_web_ui.title') }}</h5>
        <p class="software-version-web-ui__hint">{{ $t('software_version_web_ui.description') }}</p>
      </div>
      <base-icon-button
        class="software-version-web-ui__refresh"
        :label="$t('common.refresh')"
        :disabled="loading || busy"
        @click="load"
      >
        <app-icon name="arrow-clockwise" />
      </base-icon-button>
    </div>

    <base-loading v-if="loading" />
    <base-alert v-else-if="loadError" variant="danger">
      {{ loadError }}
      <base-button variant="link" size="sm" @click="load">{{ $t('common.retry') }}</base-button>
    </base-alert>

    <template v-else-if="resource">
      <base-alert v-if="!resource.applicable" variant="secondary">
        {{ $t('software_version_web_ui.not_applicable') }}
      </base-alert>

      <template v-else>
        <dl class="software-version-web-ui__metadata">
          <div>
            <dt>{{ $t('software_version_web_ui.status') }}</dt>
            <dd><base-badge :variant="resource.has_ui ? 'success' : 'secondary'">{{ $t(resource.has_ui ? 'software_version_web_ui.configured' : 'software_version_web_ui.unconfigured') }}</base-badge></dd>
          </div>
          <div>
            <dt>{{ $t('software_version_web_ui.schema_version') }}</dt>
            <dd>{{ resource.schema_version || '-' }}</dd>
          </div>
          <div>
            <dt>{{ $t('software_version_web_ui.source_project') }}</dt>
            <dd>{{ resource.source_project_id || '-' }}</dd>
          </div>
          <div>
            <dt>{{ $t('software_version_web_ui.source_revision') }}</dt>
            <dd>{{ resource.source_revision === null || resource.source_revision === undefined ? '-' : resource.source_revision }}</dd>
          </div>
          <div>
            <dt>{{ $t('common.updated_at') }}</dt>
            <dd>{{ resource.updated_at ? formatDateTime(resource.updated_at) : '-' }}</dd>
          </div>
          <div class="software-version-web-ui__metadata-hash">
            <dt>SHA-256</dt>
            <dd><code>{{ resource.sha256 || '-' }}</code></dd>
          </div>
        </dl>

        <base-alert v-if="conflict" variant="warning">
          {{ $t('software_version_web_ui.conflict') }}
          <base-button variant="link" size="sm" @click="load">{{ $t('software_version_web_ui.reload_latest') }}</base-button>
        </base-alert>

        <div v-if="canManage" class="software-version-web-ui__actions">
          <input ref="jsonFile" class="sr-only" type="file" accept="application/json,.json" @change="selectDocument">
          <base-button variant="outline-primary" :disabled="busy" @click="$refs.jsonFile.click()">
            <app-icon name="upload" class="mr-1" />
            {{ $t(resource.has_ui ? 'software_version_web_ui.select_replacement' : 'software_version_web_ui.select_upload') }}
          </base-button>
          <base-button v-if="pendingDocument" variant="primary" :loading="saving" :disabled="busy" @click="saveDocument">
            <app-icon name="check" class="mr-1" />
            {{ $t(resource.has_ui ? 'software_version_web_ui.replace' : 'software_version_web_ui.upload') }}
          </base-button>
          <span v-if="pendingFileName" class="software-version-web-ui__file">{{ pendingFileName }}</span>
          <base-button v-if="resource.has_ui" variant="outline-danger" :loading="deleting" :disabled="busy" @click="confirmClear">
            <app-icon name="trash" class="mr-1" />
            {{ $t('software_version_web_ui.clear') }}
          </base-button>
          <base-button v-if="resource.has_ui" class="software-version-web-ui__download" variant="outline-secondary" :disabled="busy" @click="downloadDocument">
            <app-icon name="download" class="mr-1" />
            {{ $t('software_version_web_ui.download_json') }}
          </base-button>
        </div>

        <base-alert v-if="fileError" variant="danger">{{ fileError }}</base-alert>
        <div v-if="validationIssues.length" class="software-version-web-ui__issues" role="alert">
          <strong>{{ $t('software_version_web_ui.validation_failed') }}</strong>
          <ul>
            <li v-for="issue in validationIssues" :key="`${issue.path}:${issue.code}`">
              <code>{{ issue.path }}</code>: {{ issue.code }}<span v-if="issue.message"> — {{ issue.message }}</span>
            </li>
          </ul>
        </div>

        <div v-if="resource.assets && resource.assets.length" class="software-version-web-ui__assets">
          <h6>{{ $t('software_version_web_ui.assets') }}</h6>
          <ul>
            <li v-for="asset in resource.assets" :key="`${asset.kind}:${asset.asset_id}`">
              <span>{{ asset.file_name }} · {{ asset.media_type }} · {{ formatBytes(asset.byte_size) }}</span>
              <base-button variant="link" size="sm" @click="downloadAsset(asset)">{{ $t('common.download') }}</base-button>
            </li>
          </ul>
        </div>

        <base-alert v-if="assetLoadIssues.length" variant="warning">
          {{ $t('software_version_web_ui.asset_preview_failed') }}
          <ul>
            <li v-for="item in assetLoadIssues" :key="item">{{ item }}</li>
          </ul>
        </base-alert>

        <div v-if="resource.has_ui && resource.ui_json" class="software-version-web-ui__preview">
          <h6>{{ $t('software_version_web_ui.preview') }}</h6>
          <div class="software-version-web-ui__preview-stage">
            <web-ui-renderer :document="resource.ui_json" :asset-urls="assetUrls" :scale="previewScale" interactive @invalid="validationIssues = $event" />
          </div>
        </div>
        <p v-else class="software-version-web-ui__empty">{{ $t('software_version_web_ui.no_document') }}</p>
      </template>
    </template>
  </section>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import WebUiRenderer from '@/components/device-ui/WebUiRenderer.vue'
import webUiValidation from '@/services/webUi/validate'
import { sha256Hex } from '@/services/webUi/sha256'
import { formatDate } from '@/utils/format'
import {
  fetchSoftwareVersionWebUi,
  replaceSoftwareVersionWebUi,
  clearSoftwareVersionWebUi,
  downloadSoftwareVersionWebUi,
  downloadSoftwareVersionWebUiAsset
} from '@/api'

const { validateWebUiDocument } = webUiValidation
const MAX_JSON_BYTES = 1048576

export default {
  name: 'SoftwareVersionWebUiPanel',
  components: { BaseAlert, WebUiRenderer },
  props: {
    version: { type: Object, required: true },
    canManage: { type: Boolean, default: false }
  },
  data () {
    return {
      loading: false,
      saving: false,
      deleting: false,
      loadError: '',
      fileError: '',
      conflict: false,
      resource: null,
      etag: null,
      pendingDocument: null,
      pendingFileName: '',
      validationIssues: [],
      assetUrls: {},
      assetLoadIssues: []
    }
  },
  computed: {
    busy () {
      return this.loading || this.saving || this.deleting
    },
    previewScale () {
      const size = this.resource?.ui_json?.displayProfile?.logicalSize
      const width = Number(size?.width)
      const height = Number(size?.height)
      if (!width || !height) return 1
      return Math.max(0.5, Math.min(1.35, 360 / width, 320 / height))
    }
  },
  watch: {
    'version.uuid': {
      immediate: true,
      handler () {
        this.load()
      }
    }
  },
  beforeDestroy () {
    this.revokeAssetUrls()
  },
  methods: {
    async load () {
      if (!this.version?.uuid) return
      this.loading = true
      this.loadError = ''
      this.conflict = false
      this.resetPending()
      try {
        const response = await fetchSoftwareVersionWebUi(this.version.uuid)
        await this.applyResource(response)
      } catch (error) {
        this.resource = null
        this.etag = null
        this.loadError = this.$getErrorMessage(error) || this.$t('software_version_web_ui.load_failed')
      } finally {
        this.loading = false
      }
    },
    resetPending () {
      this.pendingDocument = null
      this.pendingFileName = ''
      this.fileError = ''
      this.validationIssues = []
      if (this.$refs.jsonFile) this.$refs.jsonFile.value = ''
    },
    revokeAssetUrls () {
      Object.values(this.assetUrls).forEach(url => window.URL.revokeObjectURL(url))
      this.assetUrls = {}
      this.assetLoadIssues = []
    },
    async applyResource (response) {
      this.revokeAssetUrls()
      this.resource = response
      this.etag = response.etag
      if (!response.has_ui || !Array.isArray(response.assets)) return
      for (const asset of response.assets) {
        try {
          const blob = await downloadSoftwareVersionWebUiAsset(asset)
          await this.verifyAsset(blob, asset)
          this.$set(this.assetUrls, asset.asset_id, window.URL.createObjectURL(blob))
        } catch (error) {
          this.assetLoadIssues.push(asset.file_name || asset.asset_id)
        }
      }
    },
    readBlob (blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(blob)
      })
    },
    async verifyAsset (blob, asset) {
      if (blob.size !== Number(asset.byte_size)) throw new Error('Web UI asset size mismatch')
      const actual = await sha256Hex(await this.readBlob(blob))
      if (actual !== asset.sha256) throw new Error('Web UI asset hash mismatch')
    },
    readText (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file, 'UTF-8')
      })
    },
    async selectDocument (event) {
      const file = event.target.files?.[0]
      this.resetPending()
      if (!file) return
      this.pendingFileName = file.name
      if (file.size > MAX_JSON_BYTES) {
        this.fileError = this.$t('software_version_web_ui.file_too_large')
        return
      }
      try {
        const document = JSON.parse(await this.readText(file))
        const validation = validateWebUiDocument(document)
        if (!validation.valid) {
          this.validationIssues = validation.errors
          return
        }
        this.pendingDocument = document
      } catch (error) {
        this.fileError = this.$t('software_version_web_ui.invalid_json')
      }
    },
    async saveDocument () {
      if (!this.pendingDocument || this.saving) return
      if (this.resource.has_ui) {
        const confirmed = await this.$uiConfirm(this.$t('software_version_web_ui.confirm_replace'), {
          title: this.$t('common.confirm'),
          okTitle: this.$t('software_version_web_ui.replace'),
          cancelTitle: this.$t('common.cancel')
        })
        if (!confirmed) return
      }
      this.saving = true
      this.conflict = false
      try {
        const response = await replaceSoftwareVersionWebUi(this.version.uuid, this.pendingDocument, this.etag)
        await this.applyResource(response)
        this.resetPending()
        this.$uiToast.success(this.$t('software_version_web_ui.save_success'))
        this.$emit('changed', response)
      } catch (error) {
        this.handleMutationError(error, 'software_version_web_ui.save_failed')
      } finally {
        this.saving = false
      }
    },
    async confirmClear () {
      if (!this.resource?.has_ui || this.deleting) return
      const confirmed = await this.$uiConfirm(this.$t('software_version_web_ui.confirm_clear'), {
        title: this.$t('common.confirm'),
        okTitle: this.$t('software_version_web_ui.clear'),
        cancelTitle: this.$t('common.cancel'),
        okVariant: 'danger'
      })
      if (!confirmed) return
      this.deleting = true
      this.conflict = false
      try {
        await clearSoftwareVersionWebUi(this.version.uuid, this.etag)
        this.$uiToast.success(this.$t('software_version_web_ui.clear_success'))
        this.$emit('changed', { has_ui: false })
        await this.load()
      } catch (error) {
        this.handleMutationError(error, 'software_version_web_ui.clear_failed')
      } finally {
        this.deleting = false
      }
    },
    handleMutationError (error, fallbackKey) {
      const detail = error?.response?.data?.detail
      this.validationIssues = Array.isArray(detail?.issues) ? detail.issues : []
      if (error?.response?.status === 412) this.conflict = true
      this.$uiToast.error(this.$getErrorMessage(error) || detail?.message || this.$t(fallbackKey))
    },
    async downloadDocument () {
      try {
        const blob = await downloadSoftwareVersionWebUi(this.version.uuid)
        this.saveBlob(blob, this.documentFileName())
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('software_version_web_ui.download_failed'))
      }
    },
    async downloadAsset (asset) {
      try {
        const blob = await downloadSoftwareVersionWebUiAsset(asset)
        this.saveBlob(blob, asset.file_name)
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('software_version_web_ui.asset_download_failed'))
      }
    },
    saveBlob (blob, fileName) {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    documentFileName () {
      const project = String(this.resource?.source_project_id || 'device-ui').replace(/[^a-z0-9._-]+/gi, '-')
      return `${project}-wf2-web-ui.v1.json`
    },
    formatDateTime (value) {
      return formatDate(value)
    },
    formatBytes (value) {
      const bytes = Number(value || 0)
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
  }
}
</script>
