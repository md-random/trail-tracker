<template>
  <header class="main-header glass">
    <div class="header-logo">
      <span class="logo-icon">🧭</span>
      <div class="logo-text">
        <h2>TrailTracker</h2>
        <span class="text-muted">Adventure Map &amp; Photo Album</span>
      </div>
    </div>

    <div class="header-center">
      <div class="toggle-group">
        <button
          :class="['toggle-btn', { active: currentView === 'dashboard' && activeTab === 'map' }]"
          @click="handleNav('map')"
        >
          🗺️ Map View
        </button>
        <button
          :class="['toggle-btn', { active: currentView === 'dashboard' && activeTab === 'album' }]"
          @click="handleNav('album')"
        >
          🖼️ Album View
        </button>
        <button
          v-if="intakeWorkflow.state.value !== 'idle'"
          :class="['toggle-btn', { active: currentView === 'intake' }]"
          @click="handleNav('intake')"
        >
          📥 Intake Queue ({{ intakeWorkflow.remainingCount.value }} remaining)
        </button>
      </div>
    </div>

    <div class="header-right">
      <template v-if="currentView === 'dashboard'">
        <button :class="['btn-secondary', { 'admin-active': store.isAdmin }]" @click="handleAdminClick">
          🔒 {{ store.isAdmin ? 'Admin Mode (Active)' : 'Admin Mode' }}
        </button>
        <button v-if="store.isAdmin" class="btn-primary" @click="handleNav('intake')">
          <span>📥</span> Intake Photos
        </button>
      </template>
    </div>

    <!-- Login Modal -->
    <LoginModal v-if="showLoginModal" @close="showLoginModal = false" />
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePhotoStore } from '@/stores/photoStore'
import { useIntakeWorkflow } from '@/composables/useIntakeWorkflow'
import type { ViewMode, DashboardTab } from '@/types'
import LoginModal from './LoginModal.vue'

const { currentView, activeTab } = defineProps<{
  currentView: ViewMode
  activeTab: DashboardTab
}>()

const emit = defineEmits<{
  'update:activeTab': [tab: DashboardTab]
  'update:currentView': [view: ViewMode]
}>()

const store = usePhotoStore()
const intakeWorkflow = useIntakeWorkflow()
const showLoginModal = ref(false)

const handleNav = (target: 'map' | 'album' | 'intake') => {
  if (target === 'intake') {
    emit('update:currentView', 'intake')
  } else {
    emit('update:activeTab', target)
    emit('update:currentView', 'dashboard')
  }
}

const handleAdminClick = async (): Promise<void> => {
  if (store.isAdmin) {
    await store.toggleAdmin()
  } else {
    showLoginModal.value = true
  }
}
</script>

<style scoped>
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  height: 70px;
  z-index: 1000;
  background: rgba(10, 10, 10, 0.4) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08) !important;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 1.75rem;
}

.logo-text h2 {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.logo-text span {
  font-size: 0.7rem;
}

.header-center {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-group {
  display: flex;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 0.5px solid rgba(255, 255, 255, 0.08) !important;
  padding: 2px !important;
  border-radius: 9px !important;
  backdrop-filter: blur(10px);
}

.toggle-btn {
  background: none !important;
  border: none !important;
  color: rgba(255, 255, 255, 0.5) !important;
  font-size: 0.8rem !important;
  font-weight: 600 !important;
  padding: 6px 12px !important;
  cursor: pointer;
  border-radius: 7px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.toggle-btn.active {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #fff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
}

.admin-active {
  border-color: hsl(37 90% 50% / 0.5) !important;
  color: hsl(37 90% 50%) !important;
  background: hsl(37 90% 50% / 0.1) !important;
}

</style>
