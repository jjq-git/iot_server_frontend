<template>
  <span class="user-avatar" :title="displayName">
    <img
      v-if="avatarDisplayUrl && !avatarLoadFailed"
      :src="avatarDisplayUrl"
      class="user-avatar__image"
      :alt="displayName"
      loading="lazy"
      @error="handleAvatarError"
    />
    <span v-else class="user-avatar__fallback" aria-hidden="true">{{ initials }}</span>
  </span>
</template>

<script>
import { fetchAuthenticatedImage, normalizeImageUrl } from '@/utils/imageUrlHelper'

export default {
  name: 'UserAvatar',
  props: {
    user: {
      type: Object,
      default: () => ({})
    }
  },
  data () {
    return {
      avatarDisplayUrl: '',
      managedAvatarUrl: '',
      avatarLoadFailed: false,
      avatarRequestId: 0
    }
  },
  computed: {
    avatarSource () {
      const source = this.user.avatar || this.user.avatar_url
      return source ? normalizeImageUrl(source) : ''
    },
    displayName () {
      return this.user.display_name || this.user.username || '-'
    },
    initials () {
      const name = this.displayName.trim()
      if (!name || name === '-') return 'U'
      if (/^[\u4e00-\u9fa5]/.test(name)) return name.charAt(0)
      return name
        .split(/[\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
    }
  },
  watch: {
    avatarSource: {
      immediate: true,
      handler (source) {
        this.loadAvatar(source)
      }
    }
  },
  beforeDestroy () {
    this.avatarRequestId += 1
    this.releaseManagedAvatar()
  },
  methods: {
    releaseManagedAvatar () {
      if (!this.managedAvatarUrl) return
      URL.revokeObjectURL(this.managedAvatarUrl)
      this.managedAvatarUrl = ''
    },
    async loadAvatar (source) {
      const requestId = ++this.avatarRequestId
      this.avatarLoadFailed = false
      this.releaseManagedAvatar()
      this.avatarDisplayUrl = ''
      if (!source) return

      const displayUrl = await fetchAuthenticatedImage(source)
      if (requestId !== this.avatarRequestId) {
        if (displayUrl !== source && displayUrl.startsWith('blob:')) {
          URL.revokeObjectURL(displayUrl)
        }
        return
      }

      this.avatarDisplayUrl = displayUrl
      if (displayUrl !== source && displayUrl.startsWith('blob:')) {
        this.managedAvatarUrl = displayUrl
      }
    },
    handleAvatarError () {
      this.avatarLoadFailed = true
    }
  }
}
</script>
