<template>
  <component
    :is="widgetComponent"
    :class="widgetClasses"
    :style="widgetStyle"
    :node="node"
    :widget-props="resolved.props"
    :widget-styles="resolved.styles"
    :widget-part-styles="partCss"
    :widget-part-style-props="resolved.partStyles"
    :display-dpi="ir.displayProfile.dpi"
    :widget-states="resolved.states"
    :asset-urls="assetUrls"
    :interactive="interactive"
    :has-children="node.children.length > 0"
    @activate="handleActivate"
    @value-change="handleValueChange"
    @property-change="handlePropertyChange"
    @mouseenter.native="setInteractionState('hovered', true)"
    @mouseleave.native="clearPointerStates"
    @focusin.native="setInteractionState('focused', true)"
    @focusout.native="setInteractionState('focused', false)"
    @pointerdown.native="setInteractionState('pressed', true)"
    @pointerup.native="setInteractionState('pressed', false)"
    @pointercancel.native="setInteractionState('pressed', false)"
  >
    <web-ui-widget-node
      v-for="child in node.children"
      :key="child.id"
      :ir="ir"
      :screen="screen"
      :node="child"
      :subjects="subjects"
      :asset-urls="assetUrls"
      :interactive="interactive"
      @action="$emit('action', $event)"
    />
  </component>
</template>

<script>
import webUiNormalize from '@/services/webUi/normalize'
import { WEB_UI_WIDGET_REGISTRY } from './widgets/registry'

const { resolveWebUiNode, webUiStyleToCss } = webUiNormalize

export default {
  name: 'WebUiWidgetNode',
  props: {
    ir: { type: Object, required: true },
    screen: { type: Object, required: true },
    node: { type: Object, required: true },
    subjects: { type: Object, required: true },
    assetUrls: { type: Object, default: () => ({}) },
    interactive: { type: Boolean, default: false }
  },
  data () {
    return {
      localProps: {},
      localStates: {},
      interactionStates: {}
    }
  },
  watch: {
    'node.id': {
      immediate: true,
      handler () {
        this.localProps = {}
        this.localStates = {}
        this.interactionStates = {}
      }
    }
  },
  computed: {
    widgetComponent () {
      return WEB_UI_WIDGET_REGISTRY[this.node.type]
    },
    resolved () {
      return resolveWebUiNode(this.ir, this.screen, this.node, this.subjects, {
        props: this.localProps,
        states: { ...this.localStates, ...this.interactionStates }
      })
    },
    widgetStyle () {
      const style = webUiStyleToCss(this.resolved.props, this.resolved.styles, this.assetUrls)
      if (['bar', 'slider'].includes(this.node.type) && style.backgroundColor) {
        style['--web-ui-widget-track'] = style.backgroundColor
      }
      return style
    },
    partCss () {
      return Object.fromEntries(Object.entries(this.resolved.partStyles)
        .map(([part, styles]) => [part, webUiStyleToCss({}, styles, this.assetUrls)]))
    },
    widgetClasses () {
      return {
        'web-ui-widget': true,
        [`web-ui-widget--${this.node.type}`]: true,
        'web-ui-widget--flex': Boolean(this.resolved.props.flex_flow || this.resolved.styles.flex_flow || this.resolved.styles.layout === 'flex'),
        'web-ui-widget--vertical': this.isVertical,
        'is-layout-ignored': this.resolved.flags.ignore_layout === true || this.resolved.flags.floating === true,
        'is-hidden': this.resolved.flags.hidden === true,
        'is-disabled': this.resolved.states.disabled === true,
        'is-checked': this.resolved.states.checked === true,
        'is-pressed': this.resolved.states.pressed === true
      }
    },
    isVertical () {
      if (this.resolved.props.orientation === 'vertical') return true
      if (this.resolved.props.orientation === 'horizontal') return false
      const width = Number(this.resolved.props.width)
      const height = Number(this.resolved.props.height)
      return Number.isFinite(width) && Number.isFinite(height) && height > width
    }
  },
  methods: {
    handleActivate () {
      if (this.interactive && this.resolved.flags.checkable === true) {
        this.$set(this.localStates, 'checked', !this.resolved.states.checked)
      }
      this.handleTrigger('clicked')
    },
    handleTrigger (trigger, value) {
      if (!this.interactive) return
      this.node.events
        .filter(event => event.on === trigger || event.on === 'all')
        .forEach(event => this.$emit('action', {
          actionId: event.action,
          args: event.args || {},
          nodeId: this.node.id,
          trigger,
          value
        }))
    },
    handleValueChange (value) {
      if (['switch', 'checkbox'].includes(this.node.type)) this.$set(this.localStates, 'checked', Boolean(value))
      else if (['slider', 'arc', 'spinbox'].includes(this.node.type)) this.$set(this.localProps, 'value', value)
      else if (this.node.type === 'buttonmatrix') this.$set(this.localProps, 'selected_button', value)
      this.handleTrigger('value_changed', value)
    },
    handlePropertyChange ({ prop, state, value }) {
      if (prop) this.$set(this.localProps, prop, value)
      if (state) this.$set(this.localStates, state, value)
      this.handleTrigger('value_changed', value)
    },
    setInteractionState (state, enabled) {
      if (!this.interactive) return
      this.$set(this.interactionStates, state, enabled)
    },
    clearPointerStates () {
      this.setInteractionState('hovered', false)
      this.setInteractionState('pressed', false)
    }
  }
}
</script>
