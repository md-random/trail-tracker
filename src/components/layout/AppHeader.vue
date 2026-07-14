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
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2.2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            class="toggle-btn-icon"
          >
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
            <line x1="9" y1="3" x2="9" y2="18"></line>
            <line x1="15" y1="6" x2="15" y2="21"></line>
          </svg>
          <span>Map View</span>
        </button>
        <button
          :class="['toggle-btn', { active: currentView === 'dashboard' && activeTab === 'album' }]"
          @click="handleNav('album')"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2.2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            class="toggle-btn-icon"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span>Album View</span>
        </button>
        <button
          v-if="intakeWorkflow.state.value !== 'idle'"
          :class="['toggle-btn', { active: currentView === 'intake' }]"
          @click="handleNav('intake')"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2.2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            class="toggle-btn-icon"
          >
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
          </svg>
          <span>Intake Queue ({{ intakeWorkflow.remainingCount.value }} remaining)</span>
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
        <button v-if="store.isAdmin" class="btn-primary" @click="handleNav('repair')">
          <span>🔧</span> Repair Photos
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

const handleNav = (target: 'map' | 'album' | 'intake' | 'repair') => {
  if (target === 'intake') {
    emit('update:currentView', 'intake')
  } else if (target === 'repair') {
    emit('update:currentView', 'repair')
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
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
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
