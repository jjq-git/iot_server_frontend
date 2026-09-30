<template>
  <main class="invitation-page">
    <section class="invitation-card" aria-labelledby="password-reset-request-title">
      <div class="invitation-mark">WF2</div>
      <h1 id="password-reset-request-title">{{ $t('auth.password_reset.title') }}</h1>
      <p class="text-muted">{{ $t('auth.password_reset.account_help') }}</p>
      <base-alert v-if="message" variant="success">{{ message }}</base-alert>
      <base-alert v-if="errorMessage" variant="danger">{{ errorMessage }}</base-alert>
      <form v-if="!message" @submit.prevent="submit">
        <base-form-group :label="$t('auth.password_reset.account_label')" label-for="password-reset-email" required>
          <base-input id="password-reset-email" v-model.trim="email" type="email" autocomplete="email" :placeholder="$t('auth.login_page.account_placeholder')" />
        </base-form-group>
        <base-button type="submit" variant="primary" block :loading="submitting" :disabled="submitting || !email">
          {{ $t('auth.password_reset.send_code') }}
        </base-button>
      </form>
      <base-button class="mt-3" variant="link" block @click="$router.replace('/login')">
        {{ $t('invitation.sign_in') }}
      </base-button>
    </section>
  </main>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import { requestPasswordReset } from '@/api/passwordReset'

export default {
  name: 'RequestPasswordReset',
  components: { BaseAlert, BaseButton, BaseFormGroup, BaseInput },
  data: () => ({ email: '', submitting: false, message: '', errorMessage: '' }),
  methods: {
    async submit () {
      if (!this.email || this.submitting) return
      this.submitting = true
      this.errorMessage = ''
      try {
        await requestPasswordReset(this.email)
        this.message = this.$t('auth.password_reset.request_accepted')
      } catch (error) {
        this.errorMessage = this.$getErrorMessage(error) || this.$t('auth.password_reset.request_failed')
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/accept-invitation.scss"></style>
