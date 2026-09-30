<template>
  <main class="invitation-page">
    <section class="invitation-card" aria-labelledby="invitation-title">
      <div class="invitation-mark">WF2</div>
      <h1 id="invitation-title">{{ $t('invitation.title') }}</h1>
      <p v-if="!completed" class="text-muted">{{ $t('invitation.help') }}</p>

      <div v-if="invitation" class="mb-3">
        <strong>{{ invitation.company_name }}</strong>
        <div>{{ invitation.email }} · {{ invitation.role_name }}</div>
      </div>

      <base-alert v-if="errorMessage" variant="danger">
        {{ errorMessage }}
      </base-alert>
      <base-alert v-if="completed" variant="success">
        {{ $t(passwordCreated ? 'invitation.accepted_new_account' : 'invitation.accepted_existing_account') }}
      </base-alert>

      <form v-if="!completed && invitation" @submit.prevent="submit">
        <base-form-group
          v-if="needsPassword"
          :label="$t('invitation.password_label')"
          label-for="invitation-password"
          :description="$t('invitation.password_help')"
        >
          <base-password-input
            id="invitation-password"
            v-model="password"
            autocomplete="new-password"
            :placeholder="$t('invitation.password_placeholder')"
          />
        </base-form-group>
        <base-form-group
          v-if="needsPassword"
          :label="$t('invitation.confirm_label')"
          label-for="invitation-confirm-password"
        >
          <base-password-input
            id="invitation-confirm-password"
            v-model="confirmPassword"
            autocomplete="new-password"
          />
        </base-form-group>
        <p v-if="requiresLogin && !isLoggedIn" class="text-muted">
          {{ $t('invitation.existing_login_required') }}
        </p>
        <base-button v-if="requiresLogin && !isLoggedIn" type="button" variant="primary" block @click="goToLogin">
          {{ $t('invitation.sign_in_to_accept') }}
        </base-button>
        <base-button v-else type="submit" variant="primary" block :disabled="submitting || !token">
          {{ submitting ? $t('invitation.submitting') : $t(needsPassword ? 'invitation.create_account_action' : 'invitation.continue_action') }}
        </base-button>
      </form>

      <base-button v-else variant="primary" block @click="$router.replace('/login')">
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
import { acceptInvitation, inspectInvitation } from '@/api/users'

export default {
  name: 'AcceptInvitation',
  components: { BaseAlert, BaseButton, BaseFormGroup, BasePasswordInput },
  data () {
    return {
      password: '',
      confirmPassword: '',
      submitting: false,
      completed: false,
      needsPassword: false,
      invitation: null,
      passwordCreated: false,
      errorMessage: ''
    }
  },
  computed: {
    token () {
      return typeof this.$route.query.token === 'string' ? this.$route.query.token : ''
    },
    requiresLogin () { return Boolean(this.invitation && this.invitation.requires_login) },
    isLoggedIn () { return Boolean(localStorage.getItem('token')) }
  },
  async mounted () {
    if (!this.token) {
      this.errorMessage = this.$t('invitation.missing_token')
      return
    }
    try {
      this.invitation = await inspectInvitation(this.token)
      this.needsPassword = Boolean(this.invitation.is_new_user)
    } catch (error) {
      this.errorMessage = this.$getErrorMessage(error) || this.$t('invitation.failed')
    }
  },
  methods: {
    goToLogin () {
      this.$router.push({ path: '/login', query: { redirect: this.$route.fullPath } })
    },
    async submit () {
      this.errorMessage = ''
      if (!this.token) {
        this.errorMessage = this.$t('invitation.missing_token')
        return
      }
      if (this.needsPassword && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(this.password)) {
        this.errorMessage = this.$t('invitation.password_invalid')
        return
      }
      if (this.needsPassword && this.password !== this.confirmPassword) {
        this.errorMessage = this.$t('invitation.password_mismatch')
        return
      }
      this.submitting = true
      try {
        const payload = { token: this.token }
        if (this.needsPassword) payload.password = this.password
        const result = await acceptInvitation(payload)
        this.passwordCreated = Boolean(result && result.password_created)
        this.completed = true
        this.password = ''
        this.confirmPassword = ''
      } catch (error) {
        this.errorMessage = this.$getErrorMessage(error) || this.$t('invitation.failed')
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/accept-invitation.scss"></style>
