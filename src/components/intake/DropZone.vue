<template>
  <div class="drop-container animate-fade-in">
    <div class="drop-header">
      <h2>Intake New Photos</h2>
      <button class="btn-secondary" @click="emit('back')">← Back to Dashboard</button>
    </div>

    <div
      class="drop-zone glass"
      :class="{ 'drag-active': isDragging }"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input
        type="file"
        ref="fileInput"
        multiple
        accept="image/*"
        class="hidden-input"
        @change="handleFileSelect"
      />
      <input
        type="file"
        ref="folderInput"
        webkitdirectory
        directory
        multiple
        class="hidden-input"
        @change="handleFileSelect"
      />
      <div class="drop-content">
        <span class="drop-icon">📸</span>
        <h3>Drag &amp; Drop Adventure Photos Here</h3>
        <p>or</p>
        <div class="browse-buttons">
          <button class="btn-primary" @click.stop="triggerFileSelect">Browse Files</button>
          <button class="btn-primary" @click.stop="triggerFolderSelect">Browse Folder</button>
        </div>
        <div class="intake-options">
          <div class="option-item">
            <label class="option-label">
              <input type="checkbox" v-model="ignoreRegistry" @click.stop />
              Bypass previously skipped registry (Force import all)
            </label>
          </div>
        </div>
        <div class="drop-hints">
          <span class="badge-tag">JPEG</span>
          <span class="badge-tag">PNG</span>
          <span class="badge-tag">HEIC</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'files-selected': [files: File[], ignoreRegistry?: boolean]
  back: []
}>()

const isDragging = ref(false)
const ignoreRegistry = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)

const handleFiles = (fileList: FileList | null): void => {
  if (!fileList) return
  const files = Array.from(fileList).filter(f => f.type.startsWith('image/'))
  if (files.length > 0) {
    emit('files-selected', files, ignoreRegistry.value)
  }
}

const handleDrop = async (e: DragEvent): Promise<void> => {
  isDragging.value = false
  
  const items = e.dataTransfer?.items
  if (!items) {
    handleFiles(e.dataTransfer?.files || null)
    return
  }

  const files: File[] = []
  
  const traverseFileTree = async (item: any): Promise<void> => {
    if (item.isFile) {
      const file = await new Promise<File>(resolve => item.file(resolve))
      if (file.type.startsWith('image/')) {
        files.push(file)
      }
    } else if (item.isDirectory) {
      const dirReader = item.createReader()
      
      const readAllEntries = async () => {
        let allEntries: any[] = []
        let hasMore = true
        while (hasMore) {
          const entries = await new Promise<any[]>(resolve => dirReader.readEntries(resolve))
          if (entries.length === 0) {
            hasMore = false
          } else {
            allEntries = allEntries.concat(entries)
          }
        }
        return allEntries
      }
      
      const entries = await readAllEntries()
      for (const entry of entries) {
        await traverseFileTree(entry)
      }
    }
  }

  const promises = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i].webkitGetAsEntry()
    if (item) {
      promises.push(traverseFileTree(item))
    }
  }

  await Promise.all(promises)

  if (files.length > 0) {
    emit('files-selected', files, ignoreRegistry.value)
  }
}

const handleFileSelect = (e: Event): void => {
  const target = e.target as HTMLInputElement
  handleFiles(target.files)
  // Reset inputs so the same files can be selected again if needed
  if (fileInput.value) fileInput.value.value = ''
  if (folderInput.value) folderInput.value.value = ''
}

const triggerFileSelect = (): void => {
  fileInput.value?.click()
}

const triggerFolderSelect = (): void => {
  folderInput.value?.click()
}
</script>

<style scoped>
.drop-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.drop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.drop-zone {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(255, 255, 255, 0.2) !important;
  border-radius: 20px !important;
  cursor: pointer;
  transition: all 0.3s ease !important;
  min-height: 400px;
}

.drop-zone:hover, .drop-zone.drag-active {
  border-color: hsl(var(--primary-color)) !important;
  background: rgba(30, 215, 96, 0.05) !important;
  transform: scale(1.02);
}

.hidden-input {
  display: none;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.browse-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.drop-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.drop-hints {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.intake-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.option-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.option-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.option-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  user-select: none;
}

.option-label input[type="checkbox"] {
  accent-color: hsl(var(--primary-color));
  cursor: pointer;
  width: 16px;
  height: 16px;
}
</style>
