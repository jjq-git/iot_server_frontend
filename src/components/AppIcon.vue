<template>
  <svg
    class="app-icon"
    :class="iconClasses"
    :style="iconStyle"
    :role="title ? 'img' : null"
    :aria-hidden="title ? null : 'true'"
    :aria-label="title || null"
    focusable="false"
    v-bind="$attrs"
  >
    <title v-if="title">{{ title }}</title>
    <use :href="iconHref" :xlink:href="iconHref" class="app-icon__base" />
    <use v-if="modifier" :href="modifierHref" :xlink:href="modifierHref" class="app-icon__modifier" />
  </svg>
</template>

<script>
import spriteUrl from '@/assets/icons/icons.svg'

const aliases = Object.freeze({
  activity: 'graph-up',
  'diagram-3': 'diagram3',
  'diagram-3-fill': 'diagram3-fill',
  'link-45deg': 'link45deg',
  'plus-circle': 'clipboard-plus',
  'x-circle': 'xcircle',
  'x-lg': 'xlg'
})

export default {
  name: 'AppIcon',
  inheritAttrs: false,
  props: {
    name: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    size: {
      type: [String, Number],
      default: 'var(--app-icon-size, 1em)'
    },
    fontScale: {
      type: [String, Number],
      default: null
    },
    stroke: {
      type: String,
      default: 'thin',
      validator: value => ['thin', 'bold'].includes(value)
    },
    modifier: {
      type: String,
      default: '',
      validator: value => ['', 'list', 'dot'].includes(value)
    },
    animation: {
      type: String,
      default: ''
    },
    variant: {
      type: String,
      default: ''
    },
    rotate: {
      type: [String, Number],
      default: 0
    },
    flipH: {
      type: Boolean,
      default: false
    },
    flipV: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    resolvedName () {
      return aliases[this.name] || this.name || 'info-circle'
    },
    iconHref () {
      return `${spriteUrl}#icon-${this.resolvedName}`
    },
    modifierHref () {
      return `${spriteUrl}#icon-modifier-${this.modifier}`
    },
    resolvedSize () {
      if (this.fontScale !== null) return `${this.fontScale}em`
      return typeof this.size === 'number' ? `${this.size}px` : this.size
    },
    iconClasses () {
      return {
        'app-icon--bold': this.stroke === 'bold',
        'app-icon--corner-modifier': this.modifier === 'list',
        [`app-icon--modifier-${this.modifier}`]: Boolean(this.modifier),
        [`app-icon--${this.animation}`]: Boolean(this.animation),
        [`text-${this.variant}`]: Boolean(this.variant)
      }
    },
    iconStyle () {
      const scaleX = this.flipH ? -1 : 1
      const scaleY = this.flipV ? -1 : 1
      return {
        width: this.resolvedSize,
        height: this.resolvedSize,
        transform: `rotate(${Number(this.rotate) || 0}deg) scale(${scaleX}, ${scaleY})`
      }
    }
  }
}
</script>

<style scoped>
.app-icon {
  display: inline-block;
  flex: none;
  overflow: visible;
  color: inherit;
  stroke-width: 1;
  vertical-align: -0.125em;
  transform-origin: center;
}

.app-icon--bold {
  stroke-width: 1.5;
}

.app-icon--corner-modifier .app-icon__base {
  clip-path: polygon(0 0, 100% 0, 100% 43.75%, 43.75% 43.75%, 43.75% 100%, 0 100%);
}

.app-icon--modifier-list .app-icon__modifier {
  color: var(--color-text-muted);
}

.app-icon--modifier-dot .app-icon__modifier {
  color: var(--color-error);
}

.app-icon--modifier-dot .app-icon__base {
  clip-path: polygon(0 0, 62% 0, 62% 37.5%, 100% 37.5%, 100% 100%, 0 100%);
}

.app-icon--spin {
  animation: app-icon-spin 1s linear infinite;
}

.app-icon--throb {
  animation: app-icon-throb 1s ease-in-out infinite alternate;
}

@keyframes app-icon-spin {
  to { transform: rotate(360deg); }
}

@keyframes app-icon-throb {
  to { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .app-icon {
    animation: none;
  }
}
</style>
