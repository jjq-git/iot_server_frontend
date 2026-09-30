<template>
  <section v-if="accounts.length" class="login-test-accounts" aria-labelledby="test-account-title">
    <div class="login-test-accounts__header">
      <div id="test-account-title" class="login-test-accounts__title">
        <app-icon name="info-circle"  />
        <span>{{ $t('auth.login_page.test_account_title') }}</span>
      </div>
      <span class="login-test-accounts__environment">DEV</span>
    </div>

    <div class="login-test-accounts__password">
      <span>{{ $t('auth.login_page.password_field') }}</span>
      <code v-if="password">{{ password }}</code>
      <span v-else>{{ $t('auth.login_page.password_placeholder') }}</span>
      <button v-if="password" type="button" @click="$emit('copy', password)">
        <app-icon name="files"  />
        <span>{{ $t('common.copy') }}</span>
      </button>
    </div>

    <div class="login-test-accounts__list">
      <div v-for="account in accounts" :key="account.email" class="login-test-account">
        <button
          type="button"
          class="login-test-account__fill"
          :aria-label="account.email"
          @click="$emit('select', account)"
        >
          <app-icon name="person" />
          <span class="login-test-account__identity">
            <strong>{{ account.email }}</strong>
            <small>#{{ account.companyId }} · {{ $t(`topbar.roles.${account.role}`) }}</small>
          </span>
          <app-icon name="chevron-right"  />
        </button>
        <button
          type="button"
          class="login-test-account__copy"
          :aria-label="$t('auth.login_page.copy_success', { text: account.email })"
          @click="$emit('copy', account.email)"
        >
          <app-icon name="files"  />
          <span>{{ $t('common.copy') }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'LoginTestAccounts',
  props: {
    accounts: {
      type: Array,
      default: () => []
    },
    password: {
      type: String,
      default: ''
    }
  }
}
</script>
