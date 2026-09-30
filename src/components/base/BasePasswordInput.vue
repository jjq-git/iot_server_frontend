<template>
  <!-- 密码输入框：包含眼睛图标 toggle 显示/隐藏，从 Login.vue 抽取后供改密表单复用 -->
  <b-input-group>
    <base-input
      :id="id"
      :value="value"
      :type="showPassword ? 'text' : 'password'"
      :placeholder="placeholder"
      :state="state"
      :disabled="disabled"
      :clearable="false"
      :autocomplete="autocomplete"
      v-bind="$attrs"
      @input="$emit('input', $event)"
      v-on="$listeners"
    />
    <b-input-group-append>
      <b-button
        variant="outline-secondary"
        :disabled="disabled"
        :title="showPassword ? $t('common.hide') : $t('common.show')"
        @click="showPassword = !showPassword"
      >
        <app-icon v-show="showPassword" name="eye-slash" />
        <app-icon v-show="!showPassword" name="eye" />
      </b-button>
    </b-input-group-append>
  </b-input-group>
</template>

<script>
import BaseInput from '@/components/base/BaseInput.vue'

export default {
  name: 'BasePasswordInput',
  components: { BaseInput },
  inheritAttrs: false,
  props: {
    value: {
      type: [String, Number],
      default: ''
    },
    id: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    state: {
      type: Boolean,
      default: null
    },
    autocomplete: {
      type: String,
      default: 'current-password'
    }
  },
  data () {
    return {
      showPassword: false
    }
  }
}
</script>
