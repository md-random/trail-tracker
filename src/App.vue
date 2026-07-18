<template>
  <div class="app-wrapper" :class="{ 'admin-mode': isAdmin }">
    <AppHeader
      :current-view="currentView"
      :active-tab="activeTab"
      :show-filters="showFilters"
      @update:active-tab="activeTab = $event"
      @update:current-view="currentView = $event"
      @toggle-filters="showFilters = !showFilters"
    />

    <!-- Slide-Down Global Filter Panel -->
    <div v-show="showFilters && currentView === 'dashboard'" class="filter-panel glass">
      <div class="filter-container">
        <!-- Search -->
        <div class="filter-item search-box">
          <label class="filter-label">Search</label>
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              v-model="store.searchQuery" 
              type="text" 
              placeholder="Search landmarks, descriptions, tags..." 
              class="glass-input"
            />
            <button v-if="store.searchQuery" class="clear-btn" @click="store.searchQuery = ''">✕</button>
          </div>
        </div>

        <!-- Tag categories -->
        <div class="filter-item categories-box">
          <label class="filter-label">Category</label>
          <div class="category-pills">
            <button
              v-for="cat in categories"
              :key="cat.id"
              :class="['category-pill', { active: store.activeCategory === cat.id }]"
              @click="store.activeCategory = cat.id"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>

        <!-- State select -->
        <div class="filter-item state-box">
          <label class="filter-label">State</label>
          <div class="select-wrapper">
            <select v-model="store.selectedState" class="glass-select">
              <option value="all">📍 All States</option>
              <option v-for="state in store.uniqueStates" :key="state" :value="state">
                📍 {{ state }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

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

      <RepairDashboard
        v-show="currentView === 'repair'"
        @back="currentView = 'dashboard'"
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
import RepairDashboard from '@/components/intake/RepairDashboard.vue'

const store = usePhotoStore()
const { isAdmin } = storeToRefs(store)

const currentView = ref<ViewMode>('dashboard')
const activeTab = ref<DashboardTab>('map')
const showFilters = ref(false)

const categories = [
  { id: 'all', name: '🌲 All Adventures' },
  { id: 'basenji', name: '🐕 Basenjis' },
  { id: 'sign', name: '🪧 Trail Signs' },
  { id: 'scenic', name: '🏔️ Scenic Vistas' }
]

onMounted(() => {
  store.initAuthListener()
  store.loadPhotos()
})

watch(() => store.photoToFlyTo, (photo) => {
  if (photo) {
    store.activeCategory = 'all'
    activeTab.value = 'map'
  }
})

// Close photo detail panel on tab or view switch
watch([activeTab, currentView], () => {
  store.selectPhoto(null)
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

/* Glassmorphic Filter Panel */
.filter-panel {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  background: rgba(10, 12, 16, 0.6) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  padding: 1rem 2rem;
  z-index: 100;
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.4);
}

.search-box {
  flex: 1;
  min-width: 250px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 0.85rem;
  opacity: 0.5;
}

.glass-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.5rem 2.25rem 0.5rem 2.25rem;
  color: #fff;
  font-size: 0.85rem;
  transition: all 0.2s;
  outline: none;
}

.glass-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: hsl(var(--primary) / 0.5);
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15);
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 4px;
}

.clear-btn:hover {
  color: #fff;
}

.categories-box {
  flex: 2;
  min-width: 320px;
}

.category-pills {
  display: flex;
  gap: 0.5rem;
}

.category-pill {
  background: rgba(255, 255, 255, 0.04);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-pill:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.category-pill.active {
  background: hsl(var(--primary) / 0.2);
  border-color: hsl(var(--primary) / 0.5);
  color: #fff;
}

.state-box {
  width: 200px;
}

.select-wrapper {
  position: relative;
}

.glass-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.5rem 1.75rem 0.5rem 1rem;
  color: #fff;
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s;
}

.glass-select:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: hsl(var(--primary) / 0.5);
}

/* Custom arrow for select */
.select-wrapper::after {
  content: '▼';
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.4);
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
