<template>
  <section class="web-ui-renderer" :aria-label="$t('web_ui_renderer.preview_label')">
    <div v-if="diagnostics.length" class="web-ui-renderer__diagnostics" role="alert">
      <p>{{ $t('web_ui_renderer.invalid_document') }}</p>
      <ul>
        <li v-for="diagnostic in diagnostics" :key="`${diagnostic.path}:${diagnostic.code}`">
          <code>{{ diagnostic.path }}</code>: {{ diagnostic.code }}
        </li>
      </ul>
    </div>
    <p v-else-if="!activeScreen" class="web-ui-renderer__empty">
      {{ $t('web_ui_renderer.no_screen') }}
    </p>
    <web-ui-screen
      v-else
      :ir="ir"
      :screen="activeScreen"
      :subjects="runtime.subjects"
      :asset-urls="assetUrls"
      :interactive="interactive"
      :scale="scale"
      @action="handleAction"
    />
  </section>
</template>

<script>
import webUiActions from '@/services/webUi/actionRuntime'
import webUiNormalize from '@/services/webUi/normalize'
import WebUiScreen from './WebUiScreen.vue'

const { createWebUiRuntime, executeWebUiAction } = webUiActions
const { WebUiValidationError, normalizeWebUiDocument } = webUiNormalize

export default {
  name: 'WebUiRenderer',
  components: { WebUiScreen },
  props: {
    document: { type: Object, required: true },
    assetUrls: { type: Object, default: () => ({}) },
    interactive: { type: Boolean, default: false },
    scale: { type: Number, default: 1 }
  },
  data () {
    return {
      ir: null,
      runtime: null,
      diagnostics: []
    }
  },
  computed: {
    activeScreen () {
      if (!this.ir || !this.runtime) return null
      return this.ir.screenIndex[this.runtime.activeScreenId] || null
    }
  },
  watch: {
    document: {
      immediate: true,
      handler (document) {
        this.loadDocument(document)
      }
    }
  },
  methods: {
    loadDocument (document) {
      try {
        this.ir = normalizeWebUiDocument(document)
        this.runtime = createWebUiRuntime(this.ir)
        this.diagnostics = []
        this.$emit('ready', { source: this.ir.source })
      } catch (error) {
        this.ir = null
        this.runtime = null
        this.diagnostics = error instanceof WebUiValidationError
          ? error.issues
          : [{ path: '(root)', code: 'renderer_failed' }]
        this.$emit('invalid', this.diagnostics)
      }
    },
    handleAction ({ actionId, args, nodeId, trigger, value }) {
      const previousScreen = this.runtime.activeScreenId
      const previousSubjects = this.runtime.subjects
      this.runtime = executeWebUiAction(this.ir, this.runtime, actionId, args)
      if (this.runtime.activeScreenId !== previousScreen) this.$emit('screen-change', this.runtime.activeScreenId)
      if (this.runtime.subjects !== previousSubjects) this.$emit('subjects-change', { ...this.runtime.subjects })
      this.$emit('action', { actionId, args, nodeId, trigger, value })
    }
  }
}
</script>
