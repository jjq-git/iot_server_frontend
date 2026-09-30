<template>
  <!-- 404 页面 -->
  <div class="not-found">
    <h1>404</h1>
    <p>{{ $t('not_found.message') }}</p>
    <base-button variant="primary" @click="$router.push('/dashboard')">{{ $t('not_found.back_home') }}</base-button>
  </div>
</template>

<script>
// 404 页面
export default {
  name: 'NotFound'
}
</script>
