<template>
  <div class="column-visibility">
    <b-dropdown
      right
      no-caret
      variant="link"
      toggle-class="column-toggle-button"
      menu-class="column-visibility-menu"
      no-close-on-click
      boundary="viewport"
      :popper-opts="{ positionFixed: true }"
      :toggle-attrs="{
        'aria-label': $t('column_visibility.toggle'),
        title: $t('column_visibility.toggle')
      }"
    >
      <template #button-content>
        <span class="column-toggle-content" aria-hidden="true">
          <app-icon name="layout-three-columns" class="column-toggle-icon" />
        </span>
      </template>

      <div class="column-dropdown">
        <div class="column-dropdown-header">
          <span>{{ $t('column_visibility.title') }}</span>
        </div>

        <div class="dropdown-divider my-2" />

        <div class="checkbox-group-container">
          <b-form-checkbox-group v-model="localVisibleColumns" @change="handleColumnChange">
            <div
              v-for="column in localColumns"
              :key="column.prop || column.label"
              class="checkbox-item"
            >
              <b-form-checkbox
                :value="column.prop || column.label"
                :disabled="column.disabled"
                :class="{ 'disabled-checkbox': column.disabled }"
              >
                {{ column.label }}
              </b-form-checkbox>
            </div>
          </b-form-checkbox-group>
        </div>
      </div>
    </b-dropdown>
  </div>
</template>

<script>
export default {
  name: 'ColumnVisibility',
  props: {
    columns: {
      type: Array,
      required: true,
      validator: value => {
        return value.every(col =>
          typeof col === 'object' &&
          (col.prop || col.label) &&
          'visible' in col
        )
      }
    },
    tableKey: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      localColumns: [],
      localVisibleColumns: [],
      isInitialized: false
    }
  },
  watch: {
    columns: {
      immediate: true,
      handler (newColumns) {
        this.initializeColumns(newColumns)
      }
    },
    localColumns: {
      deep: true,
      handler () {
        this.updateVisibleColumns()
      }
    }
  },
  mounted () {
    this.initializeColumns(this.columns)
  },
  methods: {
    initializeColumns (columns) {
      this.localColumns = JSON.parse(JSON.stringify(columns))

      if (!this.isInitialized) {
        const savedSettings = this.getSavedSettings()
        if (savedSettings) {
          this.localColumns.forEach(col => {
            const savedCol = savedSettings.find(
              saved => saved.prop === col.prop && saved.label === col.label
            )
            if (savedCol && !col.disabled) {
              col.visible = savedCol.visible
            }
          })
        }
        this.isInitialized = true
      }

      this.updateVisibleColumns()
    },

    updateVisibleColumns () {
      const newVisibleColumns = this.localColumns
        .filter(col => col.visible && !col.disabled)
        .map(col => col.prop || col.label)
      this.localVisibleColumns.splice(0, this.localVisibleColumns.length, ...newVisibleColumns)
    },

    getSavedSettings () {
      try {
        const settings = localStorage.getItem(`columnVisibility_${this.tableKey}`)
        return settings ? JSON.parse(settings) : null
      } catch (error) {
        return null
      }
    },

    saveSettings () {
      try {
        const settings = this.localColumns.map(col => ({
          prop: col.prop,
          label: col.label,
          visible: col.visible
        }))
        localStorage.setItem(`columnVisibility_${this.tableKey}`, JSON.stringify(settings))
      } catch (error) {}
    },

    handleColumnChange (visibleValues) {
      this.localColumns.forEach(col => {
        if (!col.disabled) {
          const isVisible = visibleValues.includes(col.prop || col.label)
          if (col.visible !== isVisible) {
            col.visible = isVisible
          }
        }
      })
      this.saveSettings()
      this.$emit('update:columns', this.localColumns)
    },

    resetColumns () {
      const defaultColumns = JSON.parse(JSON.stringify(this.columns))
      this.localColumns = defaultColumns
      this.updateVisibleColumns()
      try {
        localStorage.removeItem(`columnVisibility_${this.tableKey}`)
      } catch (error) {}
      this.$emit('update:columns', this.localColumns)
    }
  }
}
</script>

<style scoped>
.column-visibility {
  display: inline-block;
}

.column-toggle-button {
  display: inline-grid;
  width: var(--table-action-size);
  min-width: var(--table-action-size);
  height: var(--table-action-size);
  min-height: var(--table-action-size);
  padding: 0 !important;
  font-size: var(--font-size-control) !important;
  color: var(--color-text-secondary) !important;
  text-decoration: none !important;
  background: transparent !important;
  place-items: center;
}

.column-toggle-button:hover {
  color: var(--color-brand) !important;
}

/* 真正的图标+文字布局放在内层 span 上，避免 BootstrapVue 默认 toggle 样式干扰 */
.column-toggle-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  vertical-align: middle;
  line-height: 1;
}

.column-toggle-icon {
  font-size: var(--font-size-subtitle);
  flex-shrink: 0;
}

::v-deep .column-visibility-menu {
  min-width: 220px;
  padding: 0;
}

.column-dropdown {
  max-height: 400px;
  overflow-y: auto;
}

.column-dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px 0;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.checkbox-group-container {
  padding: 5px 15px 15px;
  max-height: 300px;
  overflow-y: auto;
}

.checkbox-item {
  margin: 6px 0;
  display: block;
}

.checkbox-item .custom-control-label {
  font-size: var(--font-size-control);
  color: var(--color-text-secondary);
  line-height: 20px;
}

.disabled-checkbox .custom-control-label {
  color: var(--color-text-disabled);
}
</style>
