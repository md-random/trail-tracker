<template>
  <div class="intake-footer glass">
    <div class="footer-stats">
      <div class="stat-badge approved">
        <span class="stat-icon">✅</span>
        <div class="stat-text">
          <span class="stat-val">{{ approvedCount }}</span>
          <span class="stat-label">Approved</span>
        </div>
      </div>
      <div class="stat-badge skipped">
        <span class="stat-icon">⏭️</span>
        <div class="stat-text">
          <span class="stat-val">{{ skippedCount }}</span>
          <span class="stat-label">Skipped</span>
        </div>
      </div>
      <div class="stat-badge remaining">
        <span class="stat-icon">⏳</span>
        <div class="stat-text">
          <span class="stat-val">{{ remainingCount }}</span>
          <span class="stat-label">Remaining</span>
        </div>
      </div>
    </div>

    <div class="footer-actions">
      <button class="btn-secondary" @click="emit('cancel')">Cancel Intake</button>
      <button
        class="btn-primary"
        :disabled="approvedCount === 0 && skippedCount === 0"
        @click="emit('upload')"
      >
        {{ approvedCount > 0 ? `Upload ${approvedCount} Photos` : 'Save Discards & Exit' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { approvedCount, skippedCount, remainingCount } = defineProps<{
  approvedCount: number
  skippedCount: number
  remainingCount: number
}>()

const emit = defineEmits<{
  cancel: []
  upload: []
}>()
</script>

<style scoped>
.intake-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  background: rgba(10, 10, 10, 0.9) !important;
  border-top: 0.5px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.footer-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-text {
  display: flex;
  flex-direction: column;
}

.stat-val {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-badge.approved .stat-val { color: hsl(var(--success)); }
.stat-badge.skipped .stat-val { color: rgba(255, 255, 255, 0.5); }
.stat-badge.remaining .stat-val { color: hsl(var(--warning)); }

.footer-actions {
  display: flex;
  gap: 1rem;
}

.footer-actions button {
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
