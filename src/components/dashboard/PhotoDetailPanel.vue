<template>
  <transition name="slide">
    <div v-if="selectedPhoto" class="details-panel glass">
      <div class="panel-header">
        <h3>Photo Details</h3>
        <button class="btn-close" @click="store.selectPhoto(null)">✕</button>
      </div>

      <div class="panel-hero">
        <img :src="selectedPhoto.storage_path" :alt="selectedPhoto.landmark || 'Photo'" />
      </div>

      <div v-if="!isEditing" class="panel-meta">
        <div class="meta-row">
          <span class="meta-label">📍 Location</span>
          <span>{{ selectedPhoto.landmark || 'Unknown Trail' }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">🌐 Coordinates</span>
          <span>
            <template v-if="selectedPhoto.latitude != null && selectedPhoto.longitude != null">
              {{ selectedPhoto.latitude.toFixed(6) }}, {{ selectedPhoto.longitude.toFixed(6) }}
            </template>
            <template v-else>
              —
            </template>
          </span>
        </div>
        <p class="meta-desc">{{ selectedPhoto.description }}</p>
        <div class="meta-tags">
          <span v-for="tag in selectedPhoto.tags" :key="tag" class="badge-tag">{{ tag }}</span>
        </div>

        <div v-if="isAdmin" class="admin-actions">
          <button class="btn-primary" @click="isEditing = true">✏️ Edit</button>
          <button class="btn-danger" @click="handleDelete">🗑️ Delete</button>
        </div>
      </div>

      <div v-else class="panel-edit">
        <div class="form-group">
          <label>Landmark</label>
          <input v-model="editForm.landmark" type="text" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>City</label>
            <input v-model="editForm.city" type="text" />
          </div>
          <div class="form-group">
            <label>State</label>
            <input v-model="editForm.state" type="text" />
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="editForm.description" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>Tags (comma-separated)</label>
          <input v-model="editForm.tagsString" type="text" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Latitude</label>
            <input v-model.number="editForm.latitude" type="number" step="0.000001" />
          </div>
          <div class="form-group">
            <label>Longitude</label>
            <input v-model.number="editForm.longitude" type="number" step="0.000001" />
          </div>
        </div>
        <div class="edit-actions">
          <button class="btn-primary" @click="handleSave">💾 Save</button>
          <button class="btn-secondary" @click="isEditing = false">Cancel</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePhotoStore } from '@/stores/photoStore'
import { storeToRefs } from 'pinia'
import type { EditForm, Photo } from '@/types'

const store = usePhotoStore()
const { selectedPhoto, isAdmin, isEditing } = storeToRefs(store)

const editForm = ref<EditForm>({
  landmark: '',
  city: '',
  state: '',
  description: '',
  tagsString: '',
  latitude: null,
  longitude: null
})

watch(selectedPhoto, (photo: Photo | null) => {
  if (photo) {
    editForm.value = {
      landmark: photo.landmark || '',
      city: photo.city || '',
      state: photo.state || '',
      description: photo.description || '',
      tagsString: photo.tags?.join(', ') || '',
      latitude: photo.latitude,
      longitude: photo.longitude
    }
  }
  isEditing.value = false
})

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

const handleSave = async (): Promise<void> => {
  if (!selectedPhoto.value) return
  await store.savePhoto(selectedPhoto.value.id, {
    landmark: editForm.value.landmark,
    city: editForm.value.city,
    state: editForm.value.state,
    description: editForm.value.description,
    tags: editForm.value.tagsString.split(',').map(t => t.trim()).filter(Boolean),
    latitude: editForm.value.latitude,
    longitude: editForm.value.longitude
  })
  isEditing.value = false
}

const handleDelete = async (): Promise<void> => {
  if (!selectedPhoto.value) return
  if (confirm(`Delete "${selectedPhoto.value.landmark || selectedPhoto.value.filename}"?`)) {
    await store.removePhoto(selectedPhoto.value.id)
  }
}
</script>

<style scoped>
.details-panel {
  position: fixed;
  top: 70px;
  right: 0;
  width: 400px;
  height: calc(100vh - 70px);
  background: rgba(10, 10, 10, 0.85) !important;
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-left: 0.5px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
}

.panel-header h3 {
  font-size: 1rem;
  font-weight: 600;
}

.btn-close {
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.panel-hero {
  width: 100%;
  height: 250px;
  overflow: hidden;
}

.panel-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.panel-meta {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.meta-label {
  color: rgba(255, 255, 255, 0.5);
}

.meta-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.25rem;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.conf-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.conf-badge.high { background: hsl(var(--success) / 0.2); color: hsl(var(--success)); }
.conf-badge.medium { background: hsl(var(--warning) / 0.2); color: hsl(var(--warning)); }
.conf-badge.low { background: hsl(var(--danger) / 0.2); color: hsl(var(--danger)); }
.conf-badge.none { background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.3); }

.admin-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 0.5px solid rgba(255, 255, 255, 0.08);
}

.panel-edit {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.form-group label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-group input,
.form-group textarea {
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.edit-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
