<template>
  <div class="album-view-container animate-fade-in">
    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.id"
        :class="['category-btn', { active: activeCategory === cat.id }]"
        @click="activeCategory = cat.id"
      >
        {{ cat.name }}
      </button>
    </div>

    <div class="photo-grid-scroll">
      <div v-if="filteredPhotos.length === 0" class="empty-album glass">
        <span class="empty-icon">📭</span>
        <h3>No adventure photos match your filter</h3>
      </div>

      <div v-else class="photo-grid">
        <PhotoCard
          v-for="photo in filteredPhotos"
          :key="photo.id"
          :photo="photo"
          @click="store.selectPhoto(photo)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePhotoStore } from '@/stores/photoStore'
import { storeToRefs } from 'pinia'
import PhotoCard from './PhotoCard.vue'
import type { Category } from '@/types'

const store = usePhotoStore()
const { filteredPhotos, activeCategory } = storeToRefs(store)

const categories: Category[] = [
  { id: 'all', name: '🌲 All Adventures' },
  { id: 'basenji', name: '🐕 Basenjis' },
  { id: 'sign', name: '🪧 Trail Signs' },
  { id: 'scenic', name: '🏔️ Scenic Vistas' }
]
</script>

<style scoped>
.album-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
}

.category-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 0.25rem;
  flex-shrink: 0;
}

.category-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-btn.active {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.photo-grid-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.25rem 1rem;
}

.photo-grid {
  column-width: 320px;
  column-gap: 1.25rem;
  width: 100%;
}

.empty-album {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
</style>
