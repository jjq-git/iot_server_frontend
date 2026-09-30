<template>
  <div class="doc-page">
    <div class="page-head">
      <p class="page-desc">{{ description }}</p>
      <base-badge variant="info">{{ section }}</base-badge>
    </div>

    <div class="doc-hint">
      <div class="doc-hint__row">
        {{ $t('doc_page.doc_source') }}<code>{{ docPath }}</code>
      </div>
      <div class="doc-hint__row">
        {{ $t('doc_page.placeholder_tip') }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DocPage',
  computed: {
    description () {
      const key = this.$route.meta && this.$route.meta.description
      return key ? this.$t(key) : this.$t('doc_page.default_description')
    },
    section () {
      const key = this.$route.meta && this.$route.meta.section
      return key ? this.$t(key) : this.$t('doc_page.default_section')
    },
    docPath () {
      return (this.$route.meta && this.$route.meta.docPath) || 'backend/docs'
    }
  }
}
</script>
