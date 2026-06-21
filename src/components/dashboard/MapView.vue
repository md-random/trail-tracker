<template>
  <div class="map-view-container animate-fade-in">
    <div id="main-map" class="full-map"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from 'vue'
import { usePhotoStore } from '@/stores/photoStore'
import { useMap } from '@/composables/useMap'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  active: boolean
}>()

const store = usePhotoStore()
const { filteredPhotos, isAdmin } = storeToRefs(store)

const { map, init, destroy } = useMap('main-map', filteredPhotos, {
  isAdmin,
  onMarkerClick: (photo) => store.selectPhoto(photo),
  onMarkerDrag: async (photo, lat, lng) => {
    await store.savePhoto(photo.id, { latitude: lat, longitude: lng })
  }
})

watch(() => store.photoToFlyTo, (photo) => {
  if (photo && photo.latitude && photo.longitude) {
    nextTick(() => {
      map.value?.flyTo([photo.latitude, photo.longitude], 16)
      store.photoToFlyTo = null
    })
  }
})

watch(() => props.active, (isActive) => {
  if (isActive && map.value) {
    nextTick(() => {
      map.value?.invalidateSize()
    })
  }
})

onMounted(() => {
  init()
  if (props.active && map.value) {
    nextTick(() => {
      map.value?.invalidateSize()
    })
  }
})
onUnmounted(() => destroy())
</script>

<style scoped>
.map-view-container {
  height: 100%;
  position: relative;
}

.full-map {
  width: 100%;
  height: 100%;
}
</style>
