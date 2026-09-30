import {
  canWriteCompany,
  canWriteRow,
  getCurrentUser,
  hasPermission,
  isPlatformAdmin,
  PERMISSION
} from '@/utils/permission'

// 兼容现有页面的角色权限 mixin，并提供统一的能力与行级 scope 判断。
export default {
  data () {
    return {
      permissionUser: null
    }
  },
  created () {
    this.checkCurrentUserRole()
  },
  methods: {
    checkCurrentUserRole () {
      // 获取当前登录用户信息
      try {
        const user = getCurrentUser()
        this.permissionUser = user
      } catch (error) {

      }
    },

    // 按能力和公司可写范围判断创建权限
    canCreate (companyId = undefined) {
      const permission = this.$options.permissionCapabilities?.create || PERMISSION.POD_RECEIVE
      if (!hasPermission(permission, this.permissionUser)) return false
      const targetCompanyId = companyId === undefined
        ? this.permissionUser?.company_id
        : companyId
      return canWriteCompany(targetCompanyId, this.permissionUser)
    },

    // 按能力和资源归属判断编辑权限
    canEdit (row = null, resourceType = null) {
      const permission = this.$options.permissionCapabilities?.edit || PERMISSION.POD_RECEIVE
      if (!hasPermission(permission, this.permissionUser)) return false
      return row
        ? canWriteRow(row, resourceType, this.permissionUser)
        : canWriteCompany(this.permissionUser?.company_id, this.permissionUser)
    },

    canPerform (permission) {
      return hasPermission(permission, this.permissionUser)
    },

    canWriteCompany (companyId) {
      return canWriteCompany(companyId, this.permissionUser)
    },

    canWriteRow (row, resourceType) {
      return canWriteRow(row, resourceType, this.permissionUser)
    },

    // 判断是否是平台管理员
    isPlatformAdmin () {
      return isPlatformAdmin(this.permissionUser)
    },

    // 出货属于平台范围能力
    canShipHost () {
      return isPlatformAdmin(this.permissionUser)
    }
  }
}
