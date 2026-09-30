<template>
  <base-card no-body border-variant="light" class="mb-3">
    <b-row class="file-stats">
      <b-col cols="12" sm="6" md="3" class="stat-col">
        <base-card no-body class="stat-card text-bg-pink" bg-variant="warning">
          <div class="stat-card-inner">
            <div class="stat-icon total"><app-icon name="folder" /></div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total_files || 0 }}</div>
              <div class="stat-label">{{ $t('file_manager.stats.total_files') }}</div>
            </div>
          </div>
        </base-card>
      </b-col>
      <b-col cols="12" sm="6" md="3" class="stat-col">
        <base-card no-body class="stat-card text-bg-purple" bg-variant="success">
          <div class="stat-card-inner">
            <div class="stat-icon size"><app-icon name="folder" /></div>
            <div class="stat-content">
              <div class="stat-value">{{ formatFileSize(stats.total_size || 0) }}</div>
              <div class="stat-label">{{ $t('file_manager.stats.total_size') }}</div>
            </div>
          </div>
        </base-card>
      </b-col>
      <b-col cols="12" sm="6" md="3" class="stat-col">
        <base-card no-body class="stat-card text-bg-info" bg-variant="danger">
          <div class="stat-card-inner">
            <div class="stat-icon image"><app-icon name="image" /></div>
            <div class="stat-content">
              <div class="stat-value">{{ getImageCount(stats.by_mime_type) }}</div>
              <div class="stat-label">{{ $t('file_manager.stats.image_files') }}</div>
            </div>
          </div>
        </base-card>
      </b-col>
      <b-col cols="12" sm="6" md="3" class="stat-col">
        <base-card no-body class="stat-card text-bg-primary" bg-variant="primary">
          <div class="stat-card-inner">
            <div class="stat-icon video"><app-icon name="camera-video" /></div>
            <div class="stat-content">
              <div class="stat-value">{{ getVideoCount(stats.by_mime_type) }}</div>
              <div class="stat-label">{{ $t('file_manager.stats.video_files') }}</div>
            </div>
          </div>
        </base-card>
      </b-col>
    </b-row>
  </base-card>
</template>

<script>
export default {
  name: 'FileStatsOverview',
  props: {
    stats: { type: Object, required: true },
    formatFileSize: { type: Function, required: true },
    getImageCount: { type: Function, required: true },
    getVideoCount: { type: Function, required: true }
  }
}
</script>
