<template>
  <div class="host-node-binding">
    <manual-device-entry-notice />
    <!-- 统计信息 -->
    <div class="stats-card">
      <div class="stats-content">
        <div class="stat-item">
          <div class="stat-icon">
            <app-icon name="link-45deg"  />
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ bindingList.length }}
              <span class="stat-suffix">/ 126</span>
            </div>
            <div class="stat-label">{{ $t('host_node_binding.stats_label') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主机节点列表 -->
    <base-card class="box-card">
      <div class="binding-header">
        <span>{{ $t('host_node_binding.list_title') }}</span>
        <base-button
          v-if="safeCanAddBinding()"
          size="sm"
          @click="showAddDialog"
          :disabled="bindingList.length >= 126">
          <app-icon name="plus" class="mr-1" /> {{ $t('host_node_binding.actions.add') }}
        </base-button>
      </div>

      <base-table :items="bindingList" :fields="bindingTableFields" :loading="loading" bordered>
        <template #cell(can_node_id)="data">
          <span class="can-node-id">#{{ data.item.can_node_id }}</span>
        </template>
        <template #cell(node_pos)="data">
          {{ data.item.node_pos || '-' }}
        </template>
        <template #cell(node_mac_address)="data">
          <app-icon name="link-45deg" class="mr-1" />
          {{ data.item.node_mac_address || '-' }}
        </template>
        <template #cell(node_serial_no)="data">
          {{ data.item.node_serial_no || '-' }}
        </template>
        <template #cell(node_model_name)="data">
          {{ data.item.node_model_name || '-' }}
        </template>
        <template #cell(created_at)="data">
          {{ formatDateTime(data.item.created_at) }}
        </template>
        <template #cell(actions)="data">
          <base-action-button @click="showEditDialog(data.item)" :title="$t('host_node_binding.actions.edit')"> <app-icon name="pencil"  /> <span>{{ $t('host_node_binding.actions.edit') }}</span> </base-action-button>
          <base-action-button class="text-danger" @click="confirmDelete(data.item)" :title="$t('host_node_binding.actions.delete')"> <app-icon name="trash"  /> <span>{{ $t('host_node_binding.actions.delete') }}</span> </base-action-button>
        </template>
      </base-table>

      <!-- 空状态 -->
      <div v-if="!loading && bindingList.length === 0" class="text-center text-muted py-4">
        <p class="mb-2">{{ $t('host_node_binding.empty_text') }}</p>
        <base-button v-if="safeCanAddBinding()" size="sm" @click="showAddDialog">{{ $t('host_node_binding.actions.add') }}</base-button>
      </div>
    </base-card>

    <!-- 添加/编辑对话框 -->
    <base-modal
      id="host-node-binding-modal"
      :title="dialogMode === 'add' ? $t('host_node_binding.modal.title_add') : $t('host_node_binding.modal.title_edit')"
      v-model="dialogVisible"
      size="lg"
      :no-close-on-backdrop="true"
      hide-footer
    >
      <b-form>

        <base-alert
          v-if="dialogMode === 'add'"
          variant="info"
          class="mb-3">
          <strong>{{ $t('host_node_binding.modal.alert_title') }}</strong>
              <div>{{ $t('host_node_binding.modal.alert_line_1_prefix') }}<strong>{{ $t('host_node_binding.modal.alert_line_1_keyword') }}</strong></div>
              <div>{{ $t('host_node_binding.modal.alert_line_2_prefix') }}<strong>{{ $t('host_node_binding.modal.alert_line_2_keyword') }}</strong>{{ $t('host_node_binding.modal.alert_line_2_suffix') }}</div>
        </base-alert>

        <base-form-group
          :label="$t('host_node_binding.modal.label_can_node_id')"
          :state="bindingFieldState('can_node_id')"
          :invalid-feedback="formErrors.can_node_id"
        >
          <base-input
            v-model.number="form.can_node_id"
            type="number"
            min="2"
            max="127"
            :state="bindingFieldState('can_node_id')"
          />
          <div class="form-tip">
            <app-icon name="info-circle" class="mr-1" />
            {{ $t('host_node_binding.modal.tip_can_node_id') }}
          </div>
          <!-- 显示已占用的 CAN Node ID -->
          <div class="occupied-ids" v-if="occupiedCanNodeIds.length > 0">
            <span class="occupied-label">{{ $t('host_node_binding.modal.occupied_label') }}</span>
            <base-badge
              v-for="id in occupiedCanNodeIds.slice(0, 10)"
              :key="id"
              variant="secondary"
              class="mr-1 mb-1">
              {{ id }}
            </base-badge>
            <span v-if="occupiedCanNodeIds.length > 10" class="more-tip">
              {{ $t('host_node_binding.modal.more_count', { count: occupiedCanNodeIds.length }) }}
            </span>
          </div>
        </base-form-group>

        <base-form-group
          v-if="dialogMode === 'add'"
          :label="$t('host_node_binding.modal.alert_line_2_keyword')"
          :state="bindingFieldState('node_pos')"
          :invalid-feedback="formErrors.node_pos"
        >
          <base-input
            v-model.trim="form.node_pos"
            maxlength="16"
            :state="bindingFieldState('node_pos')"
          />
        </base-form-group>

        <base-form-group
          v-if="dialogMode === 'add'"
          :label="$t('host_node_binding.modal.label_select_node')"
          :state="bindingFieldState('node_id')"
          :invalid-feedback="formErrors.node_id"
        >
          <base-select
            v-model="form.node_id"
            :options="availableNodeSelectOptions"
            :state="bindingFieldState('node_id')"
          />
          <div class="form-tip" v-if="availableNodes.length === 0">
            <app-icon name="exclamation-triangle" class="mr-1" />
            {{ $t('host_node_binding.modal.no_available_nodes') }}
          </div>
        </base-form-group>

        <base-form-group :label="$t('host_node_binding.modal.label_current_node')" v-if="dialogMode === 'edit'">
          <div class="current-node-info">
            <div class="node-detail">
              <app-icon name="link-45deg" class="mr-1" />
              <strong>{{ currentNodeInfo.mac_address || 'Unknown' }}</strong>
            </div>
            <div class="node-detail">
              {{ $t('host_node_binding.modal.label_serial') }}{{ currentNodeInfo.serial_no || 'Unknown' }}
            </div>
            <div class="node-detail">
              {{ $t('host_node_binding.modal.label_model') }}{{ currentNodeInfo.model_name || 'Unknown' }}
            </div>
          </div>
        </base-form-group>

        <base-form-group
          :label="$t('host_node_binding.modal.label_replace_node')"
          v-if="dialogMode === 'edit'"
          :state="bindingFieldState('node_id')"
          :invalid-feedback="formErrors.node_id"
        >
          <base-switch v-model="showNodeSelector">
            {{ $t('host_node_binding.modal.switch_replace') }}
          </base-switch>
        <div v-if="showNodeSelector" class="ui-mt-15">
            <base-select
              v-model="form.new_node_id"
              :options="availableNodeSelectOptions"
              :state="bindingFieldState('node_id')"
            />
          </div>
        </base-form-group>

        <base-form-group
          v-if="dialogMode === 'edit' && showNodeSelector"
          :label="$t('pod_history.reason')"
          :state="bindingFieldState('reason')"
          :invalid-feedback="formErrors.reason"
        >
          <base-input v-model.trim="form.reason" :state="bindingFieldState('reason')" />
        </base-form-group>

      </b-form>

      <div class="dialog-footer d-flex justify-content-end">
        <base-button variant="outline-secondary" class="mr-2" @click="dialogVisible = false">{{ $t('host_node_binding.actions.cancel') }}</base-button>
        <base-button
          :disabled="submitting || (dialogMode === 'add' && availableNodes.length === 0)"
          @click="submitForm">
          {{ submitting ? $t('host_node_binding.actions.submit') : (dialogMode === 'add' ? $t('host_node_binding.actions.submit_add') : $t('host_node_binding.actions.submit_save')) }}
        </base-button>
      </div>
    </base-modal>
  </div>
</template>

<script>
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import ManualDeviceEntryNotice from '@/components/ManualDeviceEntryNotice.vue'
import { formatDate, formatList } from '@/utils/format'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import {
  fetchHostNodes,
  createBinding,
  updateCanNodeId,
  replaceNode,
  deleteBinding,
  fetchNodes
} from '@/api'

export default {
  name: 'HostNodeBinding',
  components: {
    BaseAlert,
    BaseButton,
    BaseCard,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    BaseSelect,
    BaseTable,
    ManualDeviceEntryNotice
  },

  props: {
    hostId: {
      type: [String, Number],
      required: true
    }
  },

  data () {
    return {
      loading: false,
      submitting: false,
      bindingList: [],
      availableNodes: [],
      dialogVisible: false,
      dialogMode: 'add', // 'add' or 'edit'
      showNodeSelector: false,
      form: {
        uuid: null,
        host_id: null,
        node_id: null,
        new_node_id: null,
        can_node_id: 1,
        node_pos: '',
        reason: '',
        original_can_node_id: null // 用于验证时排除当前值
      },
      formErrors: {}
    }
  },

  computed: {
    bindingTableFields () {
      const fields = [
        { key: 'can_node_id', label: this.$t('host_node_binding.fields.can_node_id'), thStyle: { minWidth: '140px', width: '140px' } },
        { key: 'node_pos', label: this.$t('host_node_binding.modal.alert_line_2_keyword'), thStyle: { minWidth: '100px', width: '110px' } },
        { key: 'node_mac_address', label: this.$t('host_node_binding.fields.node_mac_address'), thStyle: { minWidth: '180px' } },
        { key: 'node_serial_no', label: this.$t('host_node_binding.fields.node_serial_no'), thStyle: { minWidth: '140px', width: '150px' } },
        { key: 'node_model_name', label: this.$t('host_node_binding.fields.node_model_name'), thStyle: { minWidth: '150px' } },
        { key: 'created_at', label: this.$t('host_node_binding.fields.created_at'), thStyle: { minWidth: '180px', width: '180px' } }
      ]
      if (this.safeCanAddBinding()) {
        fields.push({ key: 'actions', label: this.$t('host_node_binding.fields.actions'), class: 'actions-cell', thClass: 'actions-cell' })
      }
      return fields
    },
    availableNodeSelectOptions () {
      return [
        { value: null, text: this.$t('host_node_binding.modal.node_placeholder') },
        ...this.availableNodes.map(item => ({
          value: item.id,
          text: `${item.mac_address} (${item.serial_no})`
        }))
      ]
    },
    // 已占用的 CAN Node ID 列表
    occupiedCanNodeIds () {
      return this.bindingList
        .filter(b => b.uuid !== this.form.uuid) // 排除当前编辑的绑定
        .map(b => b.can_node_id)
        .sort((a, b) => a - b)
    },
    occupiedNodePositions () {
      return this.bindingList
        .filter(binding => binding.uuid !== this.form.uuid)
        .map(binding => String(binding.node_pos || '').toUpperCase())
        .filter(Boolean)
    },

    // 当前节点信息
    currentNodeInfo () {
      const binding = this.bindingList.find(b => b.uuid === this.form.uuid)
      if (binding) {
        return {
          mac_address: binding.node_mac_address || 'Unknown',
          serial_no: binding.node_serial_no || 'Unknown',
          model_name: binding.node_model_name || 'Unknown'
        }
      }
      return {}
    }
  },

  mounted () {
    this.fetchBindingList()
  },

  methods: {
    // 检查是否可以添加/编辑/删除节点绑定
    // 绑定是设备运维操作：管理员和 maintainer 可操作，data_entry/viewer 只读。
    canAddBinding () {
      const user = getCurrentUser()
      return hasPermission(PERMISSION.POD_MAINTAIN, user)
    },

    // 安全包装 canAddBinding 方法，防止 undefined 错误
    safeCanAddBinding () {
      try {
        return !!this.canAddBinding()
      } catch (error) {
        return false
      }
    },

    // 获取绑定列表
    async fetchBindingList () {
      this.loading = true
      try {
        // 获取绑定列表
        const bindingList = await fetchHostNodes(this.hostId)

        if (bindingList && bindingList.length > 0) {
          // 绑定 API 已经返回了节点信息，直接使用
          this.bindingList = bindingList.map(binding => ({
            ...binding,
            node_mac_address: binding.node_mac_address || '-',
            node_serial_no: binding.node_serial_no || '-',
            node_model_name: binding.node_model_name || '-'
          }))
        } else {
          this.bindingList = []
        }
      } catch (error) {
        this.$uiToast.error(this.$t('host_node_binding.toast.load_failed') + (this.$getErrorMessage(error)))
      } finally {
        this.loading = false
      }
    },

    // 获取可用节点列表
    async fetchAvailableNodes () {
      try {
        const pageSize = 200
        let page = 1
        let total = 0
        let items = []
        do {
          const response = await fetchNodes({
            page,
            page_size: pageSize,
            is_active: true
          })
          const pageItems = response.items || response.data?.items || response.data || []
          if (!Array.isArray(pageItems)) break
          items = items.concat(pageItems)
          total = Number(response.total || response.data?.total || pageItems.length)
          page += 1
        } while (items.length < total)

        // 获取当前主机已绑定的节点 ID
        const currentHostBoundNodeIds = this.bindingList.map(b => b.node_id)

        // 使用后端返回的 is_bound 字段判断节点是否已绑定
        // 过滤掉已绑定到当前主机或已绑定到其他主机的节点
        if (!Array.isArray(items)) {
          this.availableNodes = []
          return
        }
        this.availableNodes = items.filter(node => {
          // 过滤掉已绑定到当前主机的节点
          if (currentHostBoundNodeIds.includes(node.id)) {
            return false
          }
          // 过滤掉已绑定到其他主机的节点
          if (node.is_bound_to_host) {
            return false
          }
          if (node.is_active === false) {
            return false
          }
          // 只显示完全未绑定的节点
          return true
        })
      } catch (error) {
        this.$uiToast.error(this.$t('host_node_binding.toast.load_failed_simple'))
        this.availableNodes = []
      }
    },

    // 显示添加对话框
    async showAddDialog () {
      if (this.bindingList.length >= 126) {
        this.$uiToast.warning(this.$t('host_node_binding.toast.limit_reached'))
        return
      }

      this.dialogMode = 'add'
      this.form = {
        uuid: null,
        host_id: this.hostId,
        node_id: null,
        new_node_id: null,
        can_node_id: this.findAvailableCanNodeId(),
        node_pos: this.findAvailableNodePos(),
        reason: '',
        original_can_node_id: null
      }

      await this.fetchAvailableNodes()
      this.dialogVisible = true
      this.formErrors = {}
    },

    // 显示编辑对话框
    async showEditDialog (row) {
      this.dialogMode = 'edit'
      this.showNodeSelector = false
      this.form = {
        uuid: row.uuid,
        host_id: row.host_id,
        node_id: row.node_id,
        new_node_id: null,
        can_node_id: row.can_node_id,
        node_pos: row.node_pos,
        reason: '',
        original_can_node_id: row.can_node_id // 保存原始值用于验证
      }

      await this.fetchAvailableNodes()
      this.dialogVisible = true
      this.formErrors = {}
    },

    // 查找可用的 CAN Node ID
    findAvailableCanNodeId () {
      const occupied = new Set(this.bindingList.map(b => b.can_node_id))
      for (let i = 2; i <= 127; i++) {
        if (!occupied.has(i)) {
          return i
        }
      }
      return 2 // 如果都占用了，返回 2（容量检查会阻止继续添加）
    },
    findAvailableNodePos () {
      const occupied = new Set(this.occupiedNodePositions)
      for (let index = 0; index < 26; index++) {
        const candidate = String.fromCharCode(65 + index)
        if (!occupied.has(candidate)) return candidate
      }
      for (let index = 1; index <= 127; index++) {
        const candidate = `N${index}`
        if (!occupied.has(candidate)) return candidate
      }
      return ''
    },
    bindingFieldState (field) {
      if (!(field in this.formErrors)) {
        return null
      }
      return !this.formErrors[field]
    },
    validateBindingForm () {
      const errors = {}
      const canNodeId = Number(this.form.can_node_id)
      if (!this.form.can_node_id && this.form.can_node_id !== 0) {
        errors.can_node_id = this.$t('host_node_binding.validation.can_node_id_required')
      } else if (!Number.isInteger(canNodeId) || canNodeId < 2 || canNodeId > 127) {
        errors.can_node_id = this.$t('host_node_binding.validation.can_node_id_invalid')
      } else if (
        this.occupiedCanNodeIds.includes(canNodeId) &&
        (this.dialogMode === 'add' || canNodeId !== Number(this.form.original_can_node_id))
      ) {
        errors.can_node_id = this.$t('host_node_binding.validation.can_node_id_taken', { id: canNodeId })
      }
      if (this.dialogMode === 'add' && !this.form.node_id) {
        errors.node_id = this.$t('host_node_binding.validation.node_required')
      }
      if (this.dialogMode === 'add') {
        const nodePos = String(this.form.node_pos || '').trim().toUpperCase()
        if (!nodePos) {
          errors.node_pos = `${this.$t('host_node_binding.modal.alert_line_2_keyword')} ${this.$t('host_node_binding.validation.node_required')}`
        } else if (this.occupiedNodePositions.includes(nodePos)) {
          errors.node_pos = `${this.$t('host_node_binding.modal.alert_line_2_keyword')} ${nodePos} 已被占用`
        }
      }
      if (this.dialogMode === 'edit' && this.showNodeSelector && !this.form.new_node_id) {
        errors.node_id = this.$t('host_node_binding.validation.node_required')
      }
      if (this.dialogMode === 'edit' && this.showNodeSelector && !this.form.reason.trim()) {
        errors.reason = this.$t('pod_history.reason_required')
      }
      this.formErrors = errors
      return Object.keys(errors).length === 0
    },

    // 提交表单
    async submitForm () {
      if (!this.validateBindingForm()) {
        return
      }
      this.submitting = true
      try {
        if (this.dialogMode === 'add') {
          // 创建新绑定
          const response = await createBinding({
            host_id: parseInt(this.form.host_id),
            node_id: parseInt(this.form.node_id),
            can_node_id: parseInt(this.form.can_node_id),
            node_pos: this.form.node_pos.trim().toUpperCase()
          })

          // 检查是否有静音仓验证结果
          if (response && response.pod_validation) {
            const validation = response.pod_validation

            if (!validation.is_valid && validation.errors && validation.errors.length > 0) {
              // 验证失败，显示警告但不阻止
              const errorMsg = validation.errors.join('\n')
              this.$uiToast.warning(`${errorMsg}${this.$t('host_node_binding.toast.validation_warning_suffix')}`)
            } else if (validation.warnings && validation.warnings.length > 0) {
              // 有警告
              const warningMsg = validation.warnings.join('\n')
              this.$uiToast.warning(`${this.$t('host_node_binding.toast.validation_warning_prefix')}${warningMsg}`)
            } else {
              // 验证通过
              this.$uiToast.success(this.$t('host_node_binding.toast.add_success_with_validation'))
            }
          } else {
            this.$uiToast.success(this.$t('host_node_binding.toast.add_success'))
          }
        } else {
          // 编辑现有绑定
          if (this.showNodeSelector) {
            // 更换节点
            const response = await this.executeWithForceConfirmation(force => replaceNode({
              uuid: this.form.uuid,
              new_node_id: this.form.new_node_id,
              can_node_id: this.form.can_node_id || undefined,
              reason: this.form.reason.trim()
            }, { force }))
            if (!response) return
          } else {
            // 只更新 CAN Node ID
            await updateCanNodeId(this.form.uuid, {
              can_node_id: this.form.can_node_id
            })
          }

          this.$uiToast.success(this.$t('host_node_binding.toast.update_success'))
        }

        this.dialogVisible = false
        this.fetchBindingList()
        this.$emit('success')
      } catch (error) {
        // 检查是否是验证失败错误（400）
        if (error.response?.status === 400 && error.response?.data?.detail) {
          const detail = error.response.data.detail

          // 如果是设备验证失败
          if (detail.error === 'device_validation_failed' && detail.validation) {
            const validation = detail.validation
            const errorMsg = validation.errors ? validation.errors.join('\n') : this.$t('host_node_binding.toast.device_validation_failed_default')

            this.$uiToast.error(`${errorMsg}${this.$t('host_node_binding.toast.device_validation_suffix')}`)
            return
          }
        }

        const errorDetail = error.response?.data?.detail
        const errorMsg = typeof errorDetail === 'string'
          ? errorDetail
          : errorDetail?.message || this.$getErrorMessage(error) || this.$t('host_node_binding.toast.operation_failed')

        // 解析中文错误信息
        let friendlyMsg = errorMsg
        if (typeof errorDetail === 'object' && errorDetail?.error === 'node_model_mismatch') {
          const allowedModels = Array.isArray(errorDetail.allowed_models) && errorDetail.allowed_models.length > 0
            ? `${this.$t('host_node_binding.toast.allowed_models_prefix')}${formatList(errorDetail.allowed_models)}`
            : ''
          friendlyMsg = `${errorDetail.message || this.$t('host_node_binding.toast.model_mismatch_default')}${allowedModels}`
        } else if (errorMsg.includes('绑定关系重复') || errorMsg.includes('duplicate') || errorMsg.includes('Invalid/duplicate')) {
          if (errorMsg.includes('节点已绑定') || errorMsg.includes('node')) {
            friendlyMsg = this.$t('host_node_binding.toast.node_already_bound')
          } else if (errorMsg.includes('CAN Node ID') || errorMsg.includes('CAN address')) {
            friendlyMsg = this.$t('host_node_binding.toast.can_id_taken')
          } else {
            friendlyMsg = this.$t('host_node_binding.toast.duplicate_binding')
          }
        } else if (errorMsg.includes('主机或节点不存在')) {
          friendlyMsg = this.$t('host_node_binding.toast.host_or_node_missing')
        } else if (errorMsg.includes('绑定关系不存在')) {
          friendlyMsg = this.$t('host_node_binding.toast.binding_missing')
        }

        this.$uiToast.error(this.$t('host_node_binding.toast.operation_failed_prefix') + friendlyMsg)
      } finally {
        this.submitting = false
      }
    },

    async executeWithForceConfirmation (requestFn) {
      try {
        return await requestFn(false)
      } catch (error) {
        const detail = error.response?.data?.detail
        if (error.response?.status !== 409 || detail?.error !== 'pod_device_config_invalid') {
          throw error
        }
        const confirmed = await this.$uiConfirm(detail.message, {
          title: this.$t('host_node_binding.delete_confirm.title'),
          okTitle: this.$t('host_node_binding.delete_confirm.ok'),
          cancelTitle: this.$t('host_node_binding.delete_confirm.cancel'),
          okVariant: 'danger'
        })
        if (!confirmed) return null
        return requestFn(true)
      }
    },

    // 确认删除
    async confirmDelete (row) {
      try {
        const confirmed = await this.$uiConfirm(this.$t('host_node_binding.delete_confirm.msg'), {
          title: this.$t('host_node_binding.delete_confirm.title'),
          okTitle: this.$t('host_node_binding.delete_confirm.ok'),
          cancelTitle: this.$t('host_node_binding.delete_confirm.cancel'),
          okVariant: 'danger'
        })
        if (!confirmed) return

        const response = await this.executeWithForceConfirmation(
          force => deleteBinding(row.uuid, { force })
        )
        if (!response) return

        this.$uiToast.success(this.$t('host_node_binding.toast.delete_success'))
        this.fetchBindingList()
        this.$emit('success')
      } catch (error) {
        this.$uiToast.error(this.$t('host_node_binding.toast.delete_failed') + (this.$getErrorMessage(error)))
      }
    },

    // 格式化日期时间
    formatDateTime (dateStr) {
      return formatDate(dateStr)
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/host-node-binding.scss"></style>
