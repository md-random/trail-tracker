<template>
  <div class="duplicate-cluster glass">
    <div class="cluster-header">
      <div class="header-info">
        <h4>{{ photos.length }} Duplicates Detected</h4>
        <p>Gemini has pre-selected the best shot. Click photos to select or deselect multiple keepers.</p>
      </div>
    </div>
    
    <div class="cluster-grid">
      <div
        v-for="(photo, idx) in photos"
        :key="idx"
        class="cluster-item"
        :class="{ selected: isKeeper(idx) }"
        @click="toggleKeeper(idx)"
      >
        <img :src="photo.previewUrl" />
        <div v-if="isKeeper(idx)" class="keeper-badge">
          <span class="checkmark">✓</span> Keeper
        </div>
        <div class="item-time">{{ formatTime(photo.taken_at) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProcessedFile } from '@/types'

const { photos, keeperIndex, keeperIndices = [] } = defineProps<{
  photos: ProcessedFile[]
  keeperIndex?: number
  keeperIndices?: number[]
}>()

const emit = defineEmits<{
  'update:keeperIndex': [index: number]
  'update:keeperIndices': [indices: number[]]
}>()

const isKeeper = (idx: number): boolean => {
  return keeperIndices.includes(idx)
}

const toggleKeeper = (idx: number): void => {
  let newIndices = [...keeperIndices]
  if (newIndices.includes(idx)) {
    // Prevent deselecting if it is the only keeper left
    if (newIndices.length > 1) {
      newIndices = newIndices.filter(i => i !== idx)
    }
  } else {
    newIndices.push(idx)
  }
  emit('update:keeperIndices', newIndices)
  if (newIndices.length > 0) {
    emit('update:keeperIndex', newIndices[0])
  }
}

const formatTime = (dateStr: string | null): string => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.duplicate-cluster {
  margin: 1rem 2rem;
  padding: 1.5rem;
  border-radius: 12px !important;
  border-left: 4px solid hsl(var(--primary-color)) !important;
}

.cluster-header {
  margin-bottom: 1rem;
}

.cluster-header h4 {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.cluster-header p {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.cluster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.cluster-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.cluster-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.cluster-item:hover img {
  opacity: 0.75;
}

.cluster-item.selected {
  border-color: hsl(var(--primary-color));
  box-shadow: 0 0 15px hsl(var(--primary-color) / 0.3);
}

.cluster-item.selected img {
  opacity: 1;
}

.keeper-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: hsl(var(--primary-color));
  color: #000;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.checkmark {
  font-weight: 900;
}

.item-time {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.7rem;
  padding: 0.25rem;
  text-align: center;
}
</style>
