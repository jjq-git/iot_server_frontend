<template>
  <b-form-group
    :label-for="labelFor"
    :description="description"
    :state="state"
    :invalid-feedback="invalidFeedback"
    :valid-feedback="validFeedback"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <!-- 用 b-form-group 的 label slot 自定义渲染 label,以便在必填项末尾追加红色 *
         没有 label 时不渲染整行（保持原 b-form-group 默认行为） -->
    <template v-if="label || required" #label>
      <span>{{ label }}</span><span v-if="required" class="required-mark" aria-hidden="true">*</span>
    </template>
    <slot />
  </b-form-group>
</template>

<script>
export default {
  name: 'BaseFormGroup',
  inheritAttrs: false,
  props: {
    label: {
      type: String,
      default: ''
    },
    labelFor: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    state: {
      type: Boolean,
      default: null
    },
    invalidFeedback: {
      type: String,
      default: ''
    },
    validFeedback: {
      type: String,
      default: ''
    },
    // 是否为必填项,true 时在 label 末尾加红色 *
    required: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.required-mark {
  color: var(--color-error);
  margin-left: 4px;
  font-weight: var(--font-weight-bold);
  user-select: none;
}
</style>
