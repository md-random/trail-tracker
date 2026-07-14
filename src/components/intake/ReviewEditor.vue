<template>
  <div class="editor-container">
    <div class="editor-main">
      <div class="preview-section">
        <img 
          :src="getActivePreview()" 
          class="hero-preview" 
        />
        <div v-if="item.isCluster" class="cluster-banner">
          Duplicate Burst Detected
        </div>
      </div>

      <DuplicateCluster
        v-if="item.isCluster && item.photos"
        :photos="item.photos"
        :keeperIndex="item.keeperIndex || 0"
        :keeperIndices="item.keeperIndices || []"
        @update:keeperIndex="(idx) => item.keeperIndex = idx"
        @update:keeperIndices="(idxs) => item.keeperIndices = idxs"
      />

      <div class="editor-form">
        <div class="form-header">
          <h3>Location &amp; Details</h3>
          <span :class="['conf-badge', item.confidence.toLowerCase()]">
            AI Confidence: {{ item.confidence }}
          </span>
        </div>

        <div class="form-grid">
          <div class="form-col">
            <div class="form-group">
              <label>Landmark</label>
              <input v-model="item.location" type="text" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>City</label>
                <input v-model="item.city" type="text" />
              </div>
              <div class="form-group">
                <label>State</label>
                <input v-model="item.state" type="text" />
              </div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea v-model="item.description" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Tags</label>
              <div class="tag-input-container">
                <div class="tags-list">
                  <span v-for="(tag, idx) in item.tags" :key="idx" class="badge-tag">
                    {{ tag }}
                    <button @click="item.tags.splice(idx, 1)">✕</button>
                  </span>
                </div>
                <input
                  v-model="newTag"
                  type="text"
                  placeholder="Add tag..."
                  @keydown.enter.prevent="addTag"
                />
              </div>
            </div>
          </div>

          <div class="form-col">
            <div class="form-group map-group">
              <label>GPS Location Verification</label>
              <div class="mini-map-wrapper">
                <div id="intake-map" class="mini-map"></div>
                <button class="map-expand-btn" @click="openMapModal" title="Expand map">⛶</button>
              </div>
              <div class="map-coords">
                Lat: {{ item.latitude?.toFixed(6) || '---' }}, Lng: {{ item.longitude?.toFixed(6) || '---' }}
              </div>
            </div>

            <div class="ai-reasoning glass">
              <div class="reasoning-header">
                <span>🤖 Gemini Analysis</span>
              </div>
              <p>{{ item.reasoning }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="editor-actions">
      <button class="btn-danger btn-large" @click="emit('skip', item)">⏭️ Skip Image</button>
      <button v-if="!item.approved" class="btn-primary btn-large" @click="emit('approve', item)">✅ Approve &amp; Queue</button>
      <button v-else class="btn-secondary btn-large" @click="emit('unapprove', item)">↩️ Remove from Queue</button>
    </div>

    <!-- Map Modal -->
    <Teleport to="body">
      <div v-if="mapModalOpen" class="map-modal-overlay" @click.self="closeMapModal">
        <div class="map-modal">
          <div class="map-modal-header">
            <h3>📍 GPS Location Verification</h3>
            <div class="map-modal-coords">
              Lat: {{ item.latitude?.toFixed(6) || '---' }}, Lng: {{ item.longitude?.toFixed(6) || '---' }}
            </div>
            <button class="map-modal-close" @click="closeMapModal">✕</button>
          </div>
          <div id="modal-map" class="map-modal-body"></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, type Ref } from 'vue'
import { useMap } from '@/composables/useMap'
import DuplicateCluster from './DuplicateCluster.vue'
import type { IntakeItem } from '@/types'

const { item } = defineProps<{
  item: IntakeItem
}>()

const emit = defineEmits<{
  approve: [item: IntakeItem]
  unapprove: [item: IntakeItem]
  skip: [item: IntakeItem]
}>()

const newTag = ref('')

const addTag = (): void => {
  if (newTag.value.trim()) {
    item.tags.push(newTag.value.trim().toLowerCase())
    newTag.value = ''
  }
}

const getActivePreview = (): string => {
  if (item.isCluster && item.photos) {
    return item.photos[item.keeperIndex ?? 0]?.previewUrl ?? ''
  }
  return item.previewUrl ?? ''
}

// Map setup
const photosRef = ref([]) as Ref<any[]>
const { init, destroy, drawMarkers, panTo } = useMap('intake-map', photosRef, {
  draggable: true,
  center: [item.latitude ?? 39.8283, item.longitude ?? -98.5795],
  zoom: item.latitude ? 12 : 4,
  onMarkerDrag: (photo, lat, lng) => {
    item.latitude = lat
    item.longitude = lng
  },
  onMapClick: (lat, lng) => {
    item.latitude = lat
    item.longitude = lng
  }
})

// Sync map with item changes
watch(() => [item.id, item.latitude, item.longitude], () => {
  if (item.latitude && item.longitude) {
    photosRef.value = [item]
    panTo(item.latitude, item.longitude)
  } else {
    photosRef.value = []
  }
}, { immediate: true })

// Modal map
const mapModalOpen = ref(false)
const modalPhotosRef = ref([]) as Ref<any[]>
let modalMap: ReturnType<typeof useMap> | null = null

const openMapModal = (): void => {
  mapModalOpen.value = true
  nextTick(() => {
    modalPhotosRef.value = item.latitude && item.longitude ? [item] : []
    modalMap = useMap('modal-map', modalPhotosRef, {
      draggable: true,
      center: [item.latitude ?? 39.8283, item.longitude ?? -98.5795],
      zoom: item.latitude ? 14 : 4,
      onMarkerDrag: (photo, lat, lng) => {
        item.latitude = lat
        item.longitude = lng
        // Sync mini map
        photosRef.value = [item]
        panTo(lat, lng)
      },
      onMapClick: (lat, lng) => {
        item.latitude = lat
        item.longitude = lng
        modalPhotosRef.value = [item]
        modalMap?.drawMarkers()
        // Sync mini map
        photosRef.value = [item]
        panTo(lat, lng)
      }
    })
    modalMap.init()
  })
}

const closeMapModal = (): void => {
  modalMap?.destroy()
  modalMap = null
  mapModalOpen.value = false
}

onMounted(() => init())
onUnmounted(() => {
  destroy()
  if (modalMap) modalMap.destroy()
})
</script>

<style scoped>
.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: calc(100vh - 70px - 80px); /* minus header and footer */
}

.editor-main {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.preview-section {
  position: relative;
  height: 400px;
  background: #000;
  flex-shrink: 0;
}

.hero-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cluster-banner {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.editor-form {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.1);
}

.form-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
}

.conf-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  text-transform: uppercase;
}
.conf-badge.high { background: hsl(var(--success) / 0.2); color: hsl(var(--success)); }
.conf-badge.medium { background: hsl(var(--warning) / 0.2); color: hsl(var(--warning)); }
.conf-badge.low { background: hsl(var(--danger) / 0.2); color: hsl(var(--danger)); }
.conf-badge.none { background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.4); }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}
.form-row .form-group { flex: 1; }

.form-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-group input,
.form-group textarea {
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: hsl(var(--primary-color) / 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.tag-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: 8px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.badge-tag {
  background: rgba(0, 0, 0, 0.4);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.badge-tag button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
  font-size: 0.7rem;
}

.badge-tag button:hover { color: #fff; }

.tag-input-container input {
  border: none;
  background: transparent;
  padding: 0.25rem;
}

.map-group {
  display: flex;
  flex-direction: column;
}

.mini-map-wrapper {
  position: relative;
}

.mini-map {
  width: 100%;
  height: 280px;
  border-radius: 8px;
  border: 0.5px solid rgba(255, 255, 255, 0.1);
}

.map-expand-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 1000;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  transition: all 0.2s;
}
.map-expand-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: rgba(255, 255, 255, 0.4);
}

.map-coords {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: right;
  margin-top: 0.25rem;
}

.map-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.map-modal {
  width: 90vw;
  height: 85vh;
  background: hsl(var(--surface));
  border-radius: 12px;
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.map-modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
}

.map-modal-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.map-modal-coords {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-left: auto;
}

.map-modal-close {
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.map-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.map-modal-body {
  flex: 1;
}

.ai-reasoning {
  padding: 1rem;
  border-radius: 8px;
  border-left: 3px solid hsl(var(--primary-color));
}

.reasoning-header {
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: hsl(var(--primary-color));
}

.ai-reasoning p {
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
}

.editor-actions {
  display: flex;
  gap: 1rem;
  padding: 1rem 2rem;
  background: rgba(10, 10, 10, 0.8);
  border-top: 0.5px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.btn-large {
  flex: 1;
  padding: 1rem;
  font-size: 1rem;
}
</style>
