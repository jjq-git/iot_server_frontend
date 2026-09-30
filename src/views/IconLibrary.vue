<template>
  <div class="icon-library-page">
    <base-card class="mb-3">
      <div class="page-head">
        <div>
          <small class="text-muted">{{ $t('icon_library.subtitle') }}</small>
        </div>
        <div v-if="canWrite" class="head-actions">
          <base-button variant="outline-primary" :disabled="generating" @click="generate">
            <b-spinner v-if="generating" small />
            <app-icon v-else name="arrow-repeat" /> {{ $t('icon_library.generate') }}
          </base-button>
          <base-button variant="primary" @click="openEditor(null)">
            <app-icon name="plus" /> {{ $t('icon_library.add') }}
          </base-button>
        </div>
      </div>
    </base-card>

    <b-alert v-if="error" show variant="danger">{{ error }}</b-alert>

    <div class="stats-grid mb-3">
      <base-card><strong>{{ status.icons || 0 }}</strong><small>{{ $t('icon_library.shared_icons') }}</small></base-card>
      <base-card><strong>{{ status.projects || 0 }}</strong><small>{{ $t('icon_library.connected_projects') }}</small></base-card>
      <base-card><strong>{{ commercialCount }}/{{ status.icons || 0 }}</strong><small>{{ $t('icon_library.commercial') }}</small></base-card>
      <base-card><strong>{{ generatedLabel }}</strong><small>{{ $t('icon_library.lvgl_output') }}</small></base-card>
    </div>

    <base-card class="mb-3">
      <div class="toolbar">
        <base-input v-model.trim="query" :placeholder="$t('icon_library.search')" :clearable="false" />
        <b-form-select v-model="category" :options="categoryOptions" />
        <b-form-select v-model="project" :options="projectOptions" />
        <b-button-group>
          <base-button :variant="view === 'icons' ? 'primary' : 'outline-secondary'" @click="view = 'icons'">
            {{ $t('icon_library.icon_view') }}
          </base-button>
          <base-button :variant="view === 'projects' ? 'primary' : 'outline-secondary'" @click="view = 'projects'">
            {{ $t('icon_library.project_view') }}
          </base-button>
        </b-button-group>
      </div>
    </base-card>

    <div v-if="loading" class="loading-state"><b-spinner /> {{ $t('common.loading') }}</div>

    <template v-else-if="view === 'icons'">
      <div class="result-summary">{{ $t('icon_library.result_count', { shown: filteredIcons.length, total: icons.length }) }}</div>
      <div class="icon-grid">
        <button
          v-for="icon in filteredIcons"
          :key="icon.name"
          type="button"
          class="icon-card"
          :data-icon-name="icon.name"
          :disabled="!canWrite"
          @click="openEditor(icon)"
        >
          <span class="icon-preview" role="img" :aria-label="icon.label_zh" v-html="icon.safe_svg"></span>
          <span class="icon-name">{{ icon.label_zh }} · {{ icon.label_en }}</span>
          <code>{{ icon.symbol }}</code>
          <span class="icon-badges">
            <b-badge variant="secondary">{{ icon.category }}</b-badge>
            <b-badge variant="success">{{ icon.license }}</b-badge>
            <b-badge variant="info">{{ icon.size }}px</b-badge>
          </span>
          <span class="usage-title">{{ $t('icon_library.used_at') }}</span>
          <span v-if="matchingUsages(icon).length" class="usage-copy">
            <span v-for="(usage, index) in matchingUsages(icon)" :key="usage.project + usage.page + usage.location + index">
              {{ projectName(usage.project) }} · {{ usage.page }} · {{ usage.location }}
            </span>
          </span>
          <span v-else class="usage-copy text-muted">{{ $t('icon_library.unused') }}</span>
        </button>
      </div>
    </template>

    <template v-else>
      <base-card v-for="item in projectCards" :key="item.project.id" class="project-card mb-3" :data-project-id="item.project.id">
        <div class="project-head">
          <div>
            <h6>{{ item.project.name }}</h6>
            <small class="text-muted">{{ item.project.path }}</small>
          </div>
          <div class="project-count">
            <strong>{{ item.icons.length }}/{{ icons.length }}</strong>
            <small>{{ $t('icon_library.icons_across_pages', { pages: item.pages }) }}</small>
          </div>
        </div>
        <div class="project-icon-list">
          <button
            v-for="entry in item.icons"
            :key="entry.icon.name"
            type="button"
            class="project-icon-row"
            :data-icon-name="entry.icon.name"
            :disabled="!canWrite"
            @click="openEditor(entry.icon)"
          >
            <span class="row-icon" role="img" :aria-label="entry.icon.label_zh" v-html="entry.icon.safe_svg"></span>
            <span class="row-identity"><strong>{{ entry.icon.label_zh }}</strong><code>{{ entry.icon.symbol }}</code></span>
            <span class="row-usages">
              <span v-for="(usage, index) in entry.usages" :key="usage.page + usage.location + index">
                <b>{{ usage.page }}</b> {{ usage.location }}
              </span>
            </span>
          </button>
        </div>
      </base-card>
    </template>

    <base-modal
      v-model="editorOpen"
      :title="editing ? $t('icon_library.edit_title', { name: editing.label_zh }) : $t('icon_library.add')"
      size="xl"
      :ok-title="$t('common.save')"
      :cancel-title="$t('common.cancel')"
      :ok-disabled="saving"
      @ok.prevent="save" :centered="false" :scrollable="false"
    >
      <b-row>
        <b-col md="4" class="editor-preview-wrap">
          <div class="editor-preview" role="img" :aria-label="form.label_zh" v-html="formPreviewSvg"></div>
          <base-button v-if="editing" variant="outline-danger" size="sm" @click="remove">
            <app-icon name="trash" /> {{ $t('common.delete') }}
          </base-button>
        </b-col>
        <b-col md="8">
          <b-row>
            <b-col md="6"><base-form-group :label="$t('icon_library.name')"><base-input v-model.trim="form.name" :disabled="!!editing" :clearable="false" /></base-form-group></b-col>
            <b-col md="6"><base-form-group :label="$t('icon_library.symbol')"><base-input v-model.trim="form.symbol" :clearable="false" /></base-form-group></b-col>
            <b-col md="6"><base-form-group :label="$t('icon_library.label_zh')"><base-input v-model.trim="form.label_zh" :clearable="false" /></base-form-group></b-col>
            <b-col md="6"><base-form-group :label="$t('icon_library.label_en')"><base-input v-model.trim="form.label_en" :clearable="false" /></base-form-group></b-col>
            <b-col md="6"><base-form-group :label="$t('icon_library.category')"><base-input v-model.trim="form.category" :clearable="false" /></base-form-group></b-col>
            <b-col md="6"><base-form-group :label="$t('icon_library.source')"><base-input v-model.trim="form.source" :clearable="false" /></base-form-group></b-col>
            <b-col md="6"><base-form-group :label="$t('icon_library.license')"><b-form-select v-model="form.license" :options="licenseOptions" /></base-form-group></b-col>
            <b-col md="6"><base-form-group :label="$t('icon_library.size')"><base-input v-model.number="form.size" type="number" min="16" max="128" :clearable="false" /></base-form-group></b-col>
          </b-row>
          <base-form-group :label="$t('icon_library.keywords')"><base-input v-model="form.keywords" :clearable="false" /></base-form-group>
          <base-form-group :label="$t('icon_library.usages')" :description="$t('icon_library.usages_help')">
            <b-form-textarea v-model="form.usages" rows="5" data-testid="icon-usages" />
          </base-form-group>
          <base-form-group :label="$t('icon_library.svg')"><b-form-textarea v-model="form.svg_content" rows="9" class="code-input" /></base-form-group>
          <b-form-checkbox v-model="form.commercial">{{ $t('icon_library.commercial_confirmed') }}</b-form-checkbox>
        </b-col>
      </b-row>
    </base-modal>
  </div>
</template>

<script>
import DOMPurify from 'dompurify'
import { createIcon, deleteIcon, generateIconLibrary, getIconLibrary, updateIcon } from '@/api/iconLibrary'
import { hasPermission, PERMISSION } from '@/utils/permission'

const EMPTY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2"><path d=""/></svg>'

export default {
  name: 'IconLibrary',
  data () {
    return {
      library: { icons: [], projects: [], sets: [], status: {} },
      loading: false,
      generating: false,
      saving: false,
      error: '',
      view: 'icons',
      query: '',
      category: '',
      project: '',
      editorOpen: false,
      editing: null,
      form: this.emptyForm()
    }
  },
  computed: {
    icons () { return this.library.icons || [] },
    status () { return this.library.status || {} },
    canWrite () {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        return hasPermission(PERMISSION.ICON_LIBRARY_MANAGE, user)
      } catch (e) {
        return false
      }
    },
    commercialCount () { return this.icons.filter(icon => icon.commercial).length },
    generatedLabel () { return this.status.generated && this.status.generated.ready ? 'READY' : this.$t('icon_library.not_generated') },
    categoryOptions () {
      return [{ value: '', text: this.$t('icon_library.all_categories') }].concat(
        [...new Set(this.icons.map(icon => icon.category))].sort().map(value => ({ value, text: value }))
      )
    },
    projectOptions () {
      return [{ value: '', text: this.$t('icon_library.all_projects') }].concat(
        (this.library.projects || []).map(item => ({ value: item.id, text: item.name }))
      )
    },
    licenseOptions () { return ['ISC', 'MIT', 'Apache-2.0', 'OFL-1.1', 'CC0-1.0', '项目自有'] },
    filteredIcons () {
      const keyword = this.query.toLowerCase()
      return this.icons.filter(icon => {
        const usages = icon.usages || []
        const searchText = [icon.name, icon.symbol, icon.label_zh, icon.label_en, icon.source]
          .concat(icon.keywords || [], usages.flatMap(usage => [usage.project, usage.page, usage.location]))
          .join(' ').toLowerCase()
        return (!keyword || searchText.includes(keyword)) &&
          (!this.category || icon.category === this.category) &&
          (!this.project || usages.some(usage => usage.project === this.project))
      })
    },
    projectCards () {
      return (this.library.projects || []).map(project => {
        const icons = this.icons.map(icon => ({
          icon,
          usages: (icon.usages || []).filter(usage => usage.project === project.id)
        })).filter(entry => entry.usages.length)
        const pages = new Set(icons.flatMap(entry => entry.usages.map(usage => usage.page))).size
        return { project, icons, pages }
      })
    },
    formPreviewSvg () {
      return this.sanitizeSvg(this.form.svg_content || EMPTY_SVG)
    }
  },
  watch: {
    'form.name' (value) {
      if (!this.editing) this.form.symbol = value ? `ic_${value}` : ''
    }
  },
  created () { this.load() },
  methods: {
    emptyForm () {
      return {
        name: '',
        symbol: '',
        label_zh: '',
        label_en: '',
        category: 'device',
        source: '',
        license: 'ISC',
        commercial: true,
        size: 32,
        keywords: '',
        usages: '',
        svg_content: EMPTY_SVG,
        sets: ['wf2-screen-common']
      }
    },
    async load () {
      this.loading = true
      this.error = ''
      try {
        const library = await getIconLibrary()
        this.library = {
          ...library,
          icons: (library.icons || []).map(icon => ({
            ...icon,
            safe_svg: this.sanitizeSvg(icon.svg_content)
          }))
        }
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.loading = false
      }
    },
    matchingUsages (icon) {
      return (icon.usages || []).filter(usage => !this.project || usage.project === this.project)
    },
    projectName (id) {
      const project = (this.library.projects || []).find(item => item.id === id)
      return project ? project.name : id
    },
    sanitizeSvg (svg) {
      return DOMPurify.sanitize(svg || '', { USE_PROFILES: { svg: true, svgFilters: true } })
    },
    openEditor (icon) {
      if (!this.canWrite) return
      this.editing = icon
      this.form = icon
        ? {
            ...icon,
            keywords: (icon.keywords || []).join(', '),
            usages: (icon.usages || []).map(usage => `${usage.project} | ${usage.page} | ${usage.location}`).join('\n'),
            sets: [...(icon.sets || ['wf2-screen-common'])]
          }
        : this.emptyForm()
      this.editorOpen = true
    },
    payload () {
      const usages = this.form.usages.split(/\n/).map(line => line.trim()).filter(Boolean).map(line => {
        const parts = line.split('|').map(part => part.trim())
        if (parts.length !== 3 || parts.some(part => !part)) throw new Error(this.$t('icon_library.usage_format_error'))
        return { project: parts[0], page: parts[1], location: parts[2] }
      })
      return {
        name: this.form.name,
        symbol: this.form.symbol,
        label_zh: this.form.label_zh,
        label_en: this.form.label_en,
        category: this.form.category,
        source: this.form.source,
        license: this.form.license,
        commercial: this.form.commercial,
        size: Number(this.form.size),
        sets: this.form.sets || ['wf2-screen-common'],
        keywords: this.form.keywords.split(/[,，]/).map(value => value.trim()).filter(Boolean),
        usages,
        svg_content: this.form.svg_content
      }
    },
    async save () {
      this.saving = true
      try {
        const payload = this.payload()
        if (this.editing) await updateIcon(this.editing.name, payload)
        else await createIcon(payload)
        this.editorOpen = false
        this.$uiToast.toast(this.$t('icon_library.saved'), { variant: 'success', title: this.$t('common.success') })
        await this.load()
      } catch (error) {
        this.$uiToast.toast(this.errorMessage(error), { variant: 'danger', title: this.$t('common.error') })
      } finally {
        this.saving = false
      }
    },
    async remove () {
      const name = this.editing && this.editing.name
      if (!name) return
      const confirmed = await this.$uiConfirm(this.$t('icon_library.confirm_delete', { name }), {
        title: this.$t('common.tip'), okVariant: 'danger', okTitle: this.$t('common.delete'), cancelTitle: this.$t('common.cancel')
      })
      if (!confirmed) return
      try {
        await deleteIcon(name)
        this.editorOpen = false
        this.$uiToast.toast(this.$t('icon_library.deleted'), { variant: 'success', title: this.$t('common.success') })
        await this.load()
      } catch (error) {
        this.$uiToast.toast(this.errorMessage(error), { variant: 'danger', title: this.$t('common.error') })
      }
    },
    async generate () {
      this.generating = true
      try {
        await generateIconLibrary()
        this.$uiToast.toast(this.$t('icon_library.generated'), { variant: 'success', title: this.$t('common.success') })
        await this.load()
      } catch (error) {
        this.$uiToast.toast(this.errorMessage(error), { variant: 'danger', title: this.$t('common.error') })
      } finally {
        this.generating = false
      }
    },
    errorMessage (error) {
      return this.$getErrorMessage(error) || (error.response && error.response.data && (error.response.data.detail || error.response.data.message)) || this.$getErrorMessage(error) || this.$t('common.error')
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/icon-library.scss"></style>
