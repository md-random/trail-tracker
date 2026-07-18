<template>
  <div class="album-view-container animate-fade-in">
    <div class="photo-grid-scroll" @scroll="handleScroll">
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

const store = usePhotoStore()
const { filteredPhotos } = storeToRefs(store)

const handleScroll = () => {
  if (store.selectedPhoto) {
    store.selectPhoto(null)
  }
}
</script>

<style scoped>
.album-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
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
