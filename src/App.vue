<template>
  <div class="app-wrapper" :class="{ 'admin-mode': isAdmin }">
    <AppHeader
      :current-view="currentView"
      :active-tab="activeTab"
      @update:active-tab="activeTab = $event"
      @update:current-view="currentView = $event"
    />

    <main class="main-content">
      <div v-show="currentView === 'dashboard'" style="display: contents;">
        <MapView v-show="activeTab === 'map'" :active="activeTab === 'map' && currentView === 'dashboard'" />
        <AlbumView v-show="activeTab === 'album'" />
        <PhotoDetailPanel />
      </div>

      <IntakeDashboard
        v-show="currentView === 'intake'"
        @back="currentView = 'dashboard'"
        @uploaded="store.loadPhotos()"
        @upload-completed="handleUploadComplete"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { usePhotoStore } from '@/stores/photoStore'
import { storeToRefs } from 'pinia'
import type { ViewMode, DashboardTab } from '@/types'

import AppHeader from '@/components/layout/AppHeader.vue'
import MapView from '@/components/dashboard/MapView.vue'
import AlbumView from '@/components/dashboard/AlbumView.vue'
import PhotoDetailPanel from '@/components/dashboard/PhotoDetailPanel.vue'
import IntakeDashboard from '@/components/intake/IntakeDashboard.vue'

const store = usePhotoStore()
const { isAdmin } = storeToRefs(store)

const currentView = ref<ViewMode>('dashboard')
const activeTab = ref<DashboardTab>('map')

onMounted(() => {
  store.initAuthListener()
  store.loadPhotos()
})

watch(() => store.photoToFlyTo, (photo) => {
  if (photo) {
    activeTab.value = 'map'
  }
})

const handleUploadComplete = async (): Promise<void> => {
  await store.loadPhotos()
  currentView.value = 'dashboard'
  activeTab.value = 'album'
}
</script>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: hsl(var(--bg-color));
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
</style>
