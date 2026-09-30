<template>
  <main class="access-denied" role="main">
    <section class="access-denied__card" aria-labelledby="access-denied-title">
      <div class="access-denied__status" aria-hidden="true">403</div>
      <h1 id="access-denied-title" class="access-denied__title">
        {{ $t('auth.access_denied_title') }}
      </h1>
      <p class="access-denied__message">{{ $t('auth.no_permission') }}</p>
      <p class="access-denied__help">{{ $t('auth.access_denied_help') }}</p>
      <div class="access-denied__actions">
        <base-button variant="primary" @click="goToProfile">
          {{ $t('auth.access_denied_profile') }}
        </base-button>
        <base-button variant="outline-secondary" @click="goBack">
          {{ $t('auth.access_denied_back') }}
        </base-button>
      </div>
    </section>
  </main>
</template>

<script>
export default {
  name: 'AccessDenied',
  methods: {
    goToProfile () {
      this.$router.replace('/user/profile')
    },
    goBack () {
      if (window.history.length > 1) {
        this.$router.go(-1)
        return
      }
      this.goToProfile()
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/access-denied.scss"></style>
