<template>
  <div class="uploading-container animate-fade-in">
    <div class="upload-card glass">
      <div class="upload-icon">⬆️</div>
      <h2>Uploading to Database</h2>
      <p class="status-message">{{ uploadProgressMessage }}</p>

      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: `${uploadPercentage}%` }"></div>
      </div>

      <div class="metrics">
        <span>{{ uploadedCount }} completed</span>
        <span>{{ uploadPercentage }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { uploadProgressMessage, uploadPercentage, uploadedCount } = defineProps<{
  uploadProgressMessage: string
  uploadPercentage: number
  uploadedCount: number
}>()
</script>

<style scoped>
.uploading-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
  border-radius: 24px !important;
  width: 100%;
  max-width: 500px;
  text-align: center;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: bounce 2s infinite;
}

.status-message {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2rem;
  margin-top: 0.5rem;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-bar-fill {
  height: 100%;
  background: hsl(var(--primary-color));
  transition: width 0.3s ease;
}

.metrics {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
