<template>
  <base-card no-body class="list-page-card" v-bind="$attrs" v-on="$listeners">
    <header v-if="$slots.header" class="list-page-card__header">
      <slot name="header" />
    </header>

    <section v-if="$slots.filters" class="list-page-card__filters">
      <slot name="filters" />
    </section>

    <div class="list-page-card__table">
      <slot />
    </div>

    <footer v-if="showFooter && (showSummary || $slots.footer)" class="list-page-card__footer">
      <span v-if="showSummary" class="list-page-card__summary" aria-live="polite">
        {{ paginationSummary }}
      </span>
      <slot name="footer" />
    </footer>
  </base-card>
</template>

<script>
import BaseCard from '@/components/base/BaseCard.vue'

function positiveInteger (value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export default {
  name: 'ListPageCard',
  components: { BaseCard },
  inheritAttrs: false,
  props: {
    totalRows: {
      type: Number,
      default: 0
    },
    page: {
      type: Number,
      default: 1
    },
    perPage: {
      type: Number,
      default: 20
    },
    showSummary: {
      type: Boolean,
      default: true
    },
    showFooter: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    paginationSummary () {
      const total = Math.max(0, Number(this.totalRows) || 0)
      const page = positiveInteger(this.page, 1)
      const perPage = positiveInteger(this.perPage, 20)
      const start = total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total)
      const end = total === 0 ? 0 : Math.min(page * perPage, total)

      return this.$t('common.pagination_range', { start, end, total })
    }
  }
}
</script>
