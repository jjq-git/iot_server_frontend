<template>
  <main class="invitation-page">
    <section class="invitation-card" aria-labelledby="password-reset-title">
      <div class="invitation-mark">WF2</div>
      <h1 id="password-reset-title">{{ $t('auth.password_reset.title') }}</h1>
      <p v-if="maskedEmail" class="text-muted">{{ maskedEmail }}</p>
      <base-alert v-if="errorMessage" variant="danger">{{ errorMessage }}</base-alert>
      <base-alert v-if="completed" variant="success">{{ $t('auth.password_reset.success') }}</base-alert>
      <form v-if="valid && !completed" @submit.prevent="submit">
        <base-form-group :label="$t('auth.password_reset.new_password_label')" label-for="password-reset-new" required>
          <base-password-input id="password-reset-new" v-model="password" autocomplete="new-password" />
          <small class="text-muted">{{ $t('auth.password_reset.password_hint') }}</small>
        </base-form-group>
        <base-form-group :label="$t('auth.password_reset.confirm_password_label')" label-for="password-reset-confirm" required>
          <base-password-input id="password-reset-confirm" v-model="confirmPassword" autocomplete="new-password" />
        </base-form-group>
        <base-button type="submit" variant="primary" block :loading="submitting" :disabled="submitting">
          {{ $t('auth.password_reset.reset_password') }}
        </base-button>
      </form>
      <base-button v-if="completed" variant="primary" block @click="$router.replace('/login')">
        {{ $t('invitation.sign_in') }}
      </base-button>
    </section>
  </main>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BasePasswordInput from '@/components/base/BasePasswordInput.vue'
import { completePasswordReset, inspectPasswordReset } from '@/api/passwordReset'

export default {
  name: 'ResetPassword',
  components: { BaseAlert, BaseButton, BaseFormGroup, BasePasswordInput },
  data: () => ({ valid: false, completed: false, submitting: false, password: '', confirmPassword: '', maskedEmail: '', errorMessage: '' }),
  computed: {
    token () { return typeof this.$route.query.token === 'string' ? this.$route.query.token : '' }
  },
  async mounted () {
    if (!this.token) {
      this.errorMessage = this.$t('auth.password_reset.reset_failed')
      return
    }
    try {
      const result = await inspectPasswordReset(this.token)
      this.maskedEmail = result.masked_email
      this.valid = true
    } catch (error) {
      this.errorMessage = this.$getErrorMessage(error) || this.$t('auth.password_reset.reset_failed')
    }
  },
  methods: {
    async submit () {
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(this.password)) {
        this.errorMessage = this.$t('auth.password_reset.password_invalid')
        return
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = this.$t('auth.password_reset.password_mismatch')
        return
      }
      this.submitting = true
      this.errorMessage = ''
      try {
        await completePasswordReset(this.token, this.password)
        this.completed = true
        this.valid = false
      } catch (error) {
        this.errorMessage = this.$getErrorMessage(error) || this.$t('auth.password_reset.reset_failed')
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/accept-invitation.scss"></style>
