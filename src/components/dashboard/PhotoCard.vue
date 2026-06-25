<template>
  <div class="photo-card glass hover-scale">
    <div class="card-img-wrapper">
      <img :src="photo.storage_path + '?cb=' + store.cacheBuster" class="card-img" />
      <div class="card-badges">
        <span v-for="tag in photo.tags.slice(0, 2)" :key="tag" :class="['badge-tag', tag]">
          {{ tag }}
        </span>
      </div>
    </div>
    <div class="card-info">
      <h3>{{ photo.landmark || 'Outdoor Scenic' }}</h3>
      <div class="card-loc">
        📍 {{ photo.city ? `${photo.city}, ` : '' }}{{ photo.state || 'Unknown Location' }}
      </div>
      <div class="card-footer">
        <span class="card-date">{{ formatDate(photo.taken_at) }}</span>
        <svg 
          class="map-link-icon" 
          @click.stop="store.photoToFlyTo = photo" 
          title="View on Map" 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="1.5" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Photo } from '@/types'
import { usePhotoStore } from '@/stores/photoStore'

const store = usePhotoStore()

const { photo } = defineProps<{
  photo: Photo
}>()

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.photo-card {
  overflow: hidden;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(10px);
  border: 0.5px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 14px !important;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15) !important;
  display: flex;
  flex-direction: column;
  height: 340px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.photo-card:hover {
  transform: translateY(-4px) scale(1.01) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3) !important;
}

.card-img-wrapper {
  position: relative;
  height: 200px;
  background: #000;
  overflow: hidden;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.photo-card:hover .card-img {
  transform: scale(1.05);
}

.card-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 0.4rem;
}

.badge-tag {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.card-info {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-info h3 {
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 0.4rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-loc {
  font-size: 0.8rem;
  color: hsl(var(--color-text-muted));
  margin-bottom: auto;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid hsl(var(--border-color) / 0.5);
  color: hsl(var(--color-text-muted));
}

.conf-indicator { font-size: 1.2rem; line-height: 0.5; }
.conf-indicator.high { color: hsl(var(--success)); }
.conf-indicator.medium { color: hsl(var(--warning)); }
.conf-indicator.low { color: hsl(var(--danger)); }
.conf-indicator.none { color: hsl(var(--border-color)); }

.map-link-icon {
  opacity: 0.5;
  cursor: pointer;
  transition: all 0.2s ease;
  color: hsl(var(--color-text));
}

.map-link-icon:hover {
  opacity: 1;
  color: #fff;
  transform: scale(1.15);
}
</style>
