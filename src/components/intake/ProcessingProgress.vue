<template>
  <div class="processing-container animate-fade-in">
    <div class="processing-card glass">
      <div class="loader-ring">
        <div class="ring-inner"></div>
      </div>
      <h2>Processing Photos</h2>
      <p class="status-message">{{ progressMessage }}</p>

      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: `${progressPercentage}%` }"></div>
      </div>

      <div class="metrics">
        <span>{{ processedCount }} / {{ totalCount }}</span>
        <span>{{ progressPercentage }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  progressMessage,
  progressPercentage,
  processedCount,
  totalCount
} = defineProps<{
  progressMessage: string
  progressPercentage: number
  processedCount: number
  totalCount: number
}>()
</script>

<style scoped>
.processing-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.processing-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
  border-radius: 24px !important;
  width: 100%;
  max-width: 500px;
  text-align: center;
}

.loader-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: hsl(var(--primary-color));
  animation: spin 1s linear infinite;
  margin-bottom: 2rem;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
