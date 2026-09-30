<template>
  <main class="demo-role-picker">
    <section class="demo-role-picker__panel" aria-labelledby="demo-role-picker-title">
      <div class="demo-role-picker__eyebrow">{{ $t('demo.badge') }}</div>
      <h1 id="demo-role-picker-title">{{ $t('demo.title') }}</h1>
      <p class="demo-role-picker__intro">{{ $t('demo.description') }}</p>

      <div class="demo-role-picker__grid">
        <button
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="demo-role-picker__option"
          type="button"
          :disabled="loading"
          @click="$emit('select', scenario.id)"
        >
          <span class="demo-role-picker__icon" aria-hidden="true">
            <app-icon :name="scenarioIcon(scenario.id)" />
          </span>
          <span class="demo-role-picker__copy">
            <strong>{{ $t(scenario.labelKey) }}</strong>
            <small>{{ $t(scenario.descriptionKey) }}</small>
          </span>
          <app-icon name="arrow-right" class="demo-role-picker__arrow" />
        </button>
      </div>

      <p v-if="error" class="demo-role-picker__error" role="alert">{{ error }}</p>
      <p class="demo-role-picker__notice">{{ $t('demo.notice') }}</p>
    </section>
  </main>
</template>

<script>
export default {
  name: 'DemoRolePicker',
  props: {
    scenarios: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    }
  },
  methods: {
    scenarioIcon (scenarioId) {
      return {
        manufacturer: 'building',
        channel: 'people',
        office: 'house-door',
        rental: 'calendar3'
      }[scenarioId] || 'building'
    }
  }
}
</script>

<style lang="scss" scoped>
.demo-role-picker {
  display: grid;
  min-height: 100vh;
  padding: 48px 24px;
  place-items: center;
  background: var(--color-bg-page);
}

.demo-role-picker__panel {
  width: min(880px, 100%);
  padding: 48px;
  border: 1px solid var(--color-border-divider);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-card);
}

.demo-role-picker__eyebrow {
  display: inline-flex;
  padding: 5px 10px;
  margin-bottom: 18px;
  color: var(--color-brand);
  background: var(--color-brand-soft);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-display-md);
}

.demo-role-picker__intro,
.demo-role-picker__notice {
  color: var(--color-text-muted);
}

.demo-role-picker__intro {
  margin: 10px 0 30px;
  font-size: var(--font-size-subtitle);
}

.demo-role-picker__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.demo-role-picker__option {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 20px;
  border: 1px solid var(--color-border-divider);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  text-align: left;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;

  &:hover:not(:disabled),
  &:focus-visible {
    border-color: var(--color-brand);
    box-shadow: var(--shadow-card);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
}

.demo-role-picker__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: var(--color-brand);
  background: var(--color-brand-soft);
  font-size: var(--icon-size-lg);
}

.demo-role-picker__copy {
  display: grid;
  gap: 5px;

  small {
    color: var(--color-text-muted);
    line-height: 1.45;
  }
}

.demo-role-picker__arrow {
  color: var(--color-brand);
}

.demo-role-picker__error {
  margin: 18px 0 0;
  color: var(--color-error);
}

.demo-role-picker__notice {
  margin: 24px 0 0;
  font-size: var(--font-size-caption);
  text-align: center;
}

@media (width <= 680px) {
  .demo-role-picker {
    padding: 20px 14px;
  }

  .demo-role-picker__panel {
    padding: 28px 20px;
  }

  .demo-role-picker__grid {
    grid-template-columns: 1fr;
  }
}
</style>
