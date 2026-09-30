<template>
  <figure class="web-ui-screen__device">
    <div
      class="web-ui-screen__bezel"
      :class="{ 'web-ui-screen__bezel--round': isRound }"
      :data-screen-shape="ir.displayProfile.shape"
    >
      <div
        class="web-ui-screen__viewport"
        :class="{ 'web-ui-screen__viewport--round': isRound }"
        :style="viewportStyle"
      >
        <div
          class="web-ui-screen__surface"
          :class="{ 'web-ui-screen__surface--round': isRound }"
          :style="surfaceStyle"
          role="group"
          :aria-label="$t('web_ui_renderer.preview_label')"
        >
          <web-ui-widget-node
            :ir="ir"
            :screen="screen"
            :node="screen.root"
            :subjects="subjects"
            :asset-urls="assetUrls"
            :interactive="interactive"
            @action="$emit('action', $event)"
          />
        </div>
      </div>
    </div>
    <figcaption class="web-ui-screen__profile">{{ displayProfileLabel }}</figcaption>
  </figure>
</template>

<script>
import WebUiWidgetNode from './WebUiWidgetNode.vue'

export default {
  name: 'WebUiScreen',
  components: { WebUiWidgetNode },
  props: {
    ir: { type: Object, required: true },
    screen: { type: Object, required: true },
    subjects: { type: Object, required: true },
    assetUrls: { type: Object, default: () => ({}) },
    interactive: { type: Boolean, default: false },
    scale: { type: Number, default: 1 }
  },
  computed: {
    isRound () {
      return this.ir.displayProfile.shape === 'round'
    },
    dimensions () {
      return this.ir.displayProfile.logicalSize
    },
    displayProfileLabel () {
      const profile = this.ir.displayProfile
      return profile.displayName || `${this.dimensions.width}×${this.dimensions.height}`
    },
    viewportStyle () {
      return {
        width: `${this.dimensions.width * this.scale}px`,
        height: `${this.dimensions.height * this.scale}px`
      }
    },
    surfaceStyle () {
      const rotation = this.ir.displayProfile.installRotation || 0
      const style = {
        width: `${this.dimensions.width}px`,
        height: `${this.dimensions.height}px`,
        transform: `scale(${this.scale}) rotate(${rotation}deg)`
      }
      const rect = this.ir.displayProfile.visibleRect
      if (rect) {
        const right = Math.max(0, this.dimensions.width - rect.x - rect.width)
        const bottom = Math.max(0, this.dimensions.height - rect.y - rect.height)
        style.clipPath = `inset(${rect.y}px ${right}px ${bottom}px ${rect.x}px)`
      }
      return style
    }
  }
}
</script>
