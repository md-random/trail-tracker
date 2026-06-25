<template>
  <div class="intake-container animate-fade-in" :class="{ 'repair-mode-active': isRepairMode && workflow.state.value === 'idle' }">
    <!-- Mode Selector Header (only shown in idle state and when not actively repairing) -->
    <div v-if="workflow.state.value === 'idle' && !isRepairActive" class="intake-mode-header">
      <div class="mode-tabs glass">
        <button :class="{ active: !isRepairMode }" @click="isRepairMode = false">
          📥 Ingest New Photos
        </button>
        <button :class="{ active: isRepairMode }" @click="isRepairMode = true">
          🔧 Repair Existing Photos
        </button>
      </div>
    </div>

    <!-- Idle & Ingest Mode: show standard dropzone -->
    <DropZone v-if="workflow.state.value === 'idle' && !isRepairMode" @files-selected="handleFiles" @back="emit('back')" />

    <!-- Idle & Repair Mode: show repair dropzone -->
    <div v-else-if="workflow.state.value === 'idle' && isRepairMode && !isRepairActive" class="repair-container animate-fade-in">
      <div class="repair-header">
        <h2>🔧 Retroactive Photo Repair Tool</h2>
        <button class="btn-secondary" @click="emit('back')">← Back to Dashboard</button>
      </div>
      
      <div 
        class="repair-dropzone glass"
        :class="{ 'drag-active': isRepairDragging }"
        @dragenter.prevent="isRepairDragging = true"
        @dragover.prevent="isRepairDragging = true"
        @dragleave.prevent="isRepairDragging = false"
        @drop.prevent="handleRepairDrop"
      >
        <input
          type="file"
          ref="repairFileInput"
          multiple
          accept="image/*"
          class="hidden-input"
          @change="handleRepairFileSelect"
        />
        <input
          type="file"
          ref="repairFolderInput"
          webkitdirectory
          directory
          multiple
          class="hidden-input"
          @change="handleRepairFileSelect"
        />
        
        <div class="drop-content">
          <span class="drop-icon">🛠️</span>
          <h3>Drag &amp; Drop Original Photos Here to Repair</h3>
          <p class="drop-desc">
            Select or drop your entire folder of photos. The tool matches original filenames to your existing database records, resizes them to high-resolution 2048px, and overwrites the blurry versions.
          </p>
          <div class="repair-info-badge">
            ⚡ <strong>Gemini Cost: $0.00</strong> — Preserves all your custom metadata, tags, and edits.
          </div>
          
          <div class="repair-options" @click.stop>
            <label class="enhance-label">
              <input type="checkbox" v-model="applyEnhanceInRepair" />
              <span>🪄 Apply Milder Magic Enhance during repair</span>
            </label>
            <div class="browse-buttons">
              <button class="btn-primary" @click="triggerRepairFileSelect">Browse Files</button>
              <button class="btn-primary" @click="triggerRepairFolderSelect">Browse Folder</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Repair Active State: progress tracking -->
    <div v-else-if="isRepairActive" class="repair-progress-container animate-fade-in">
      <div class="progress-box glass">
        <span class="progress-icon animate-pulse">{{ isRepairing ? '⚙️' : '✅' }}</span>
        <h2>{{ isRepairing ? 'Repairing Photos...' : 'Repair Finished!' }}</h2>
        
        <div class="progress-bar-wrapper">
          <div class="progress-bar" :style="{ width: repairProgress + '%' }"></div>
        </div>
        <span class="progress-percentage">{{ repairProgress }}%</span>
        
        <p class="progress-message">{{ repairMessage }}</p>
        
        <div class="progress-actions" v-if="!isRepairing">
          <button class="btn-primary" @click="resetRepair">Repair More Photos</button>
          <button class="btn-secondary" @click="emit('back')">Back to Dashboard</button>
        </div>
      </div>
    </div>

    <!-- Processing: show progress -->
    <ProcessingProgress
      v-else-if="workflow.state.value === 'processing'"
      :progress-message="workflow.progressMessage.value"
      :progress-percentage="workflow.progressPercentage.value"
      :processed-count="workflow.processedCount.value"
      :total-count="workflow.totalCount.value"
    />

    <!-- Review: sidebar + editor -->
    <template v-else-if="workflow.state.value === 'review'">
      <ReviewSidebar
        :items="workflow.items.value"
        :active-tab="workflow.activeTab.value"
        :selected-item="workflow.selectedItem.value"
        :pending-count="workflow.pendingAnalysisCount.value"
        @select="workflow.selectItem"
        @tab-change="workflow.activeTab.value = $event"
      />
      <ReviewEditor
        v-if="workflow.selectedItem.value"
        :item="workflow.selectedItem.value"
        @approve="workflow.approveItem"
        @unapprove="workflow.unapproveItem"
        @skip="workflow.skipItem"
      />
    </template>

    <!-- Uploading -->
    <UploadProgress
      v-else-if="workflow.state.value === 'uploading'"
      :upload-progress-message="workflow.uploadProgressMessage.value"
      :upload-percentage="workflow.uploadPercentage.value"
      :uploaded-count="workflow.uploadedCount.value"
    />

    <!-- Footer (review mode only) -->
    <IntakeFooter
      v-if="workflow.state.value === 'review'"
      :approved-count="workflow.approvedCount.value"
      :skipped-count="workflow.skippedCount.value"
      :remaining-count="workflow.remainingCount.value"
      @cancel="handleCancelClick"
      @upload="handleUpload"
    />

    <!-- Leave Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showLeaveConfirm" class="confirm-backdrop" @click.self="showLeaveConfirm = false">
        <div class="confirm-content glass animate-scale-in">
          <div class="confirm-header">
            <h3>⚠️ Leave Photo Management?</h3>
          </div>
          <div class="confirm-body">
            <p>Are you sure you want to leave? Any photos currently in the queue that have not been uploaded will be lost.</p>
          </div>
          <div class="confirm-footer">
            <button class="btn-secondary" @click="showLeaveConfirm = false">Stay</button>
            <button class="btn-danger" @click="confirmLeave">Leave</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useIntakeWorkflow } from '@/composables/useIntakeWorkflow'
import { usePhotoRepair } from '@/composables/usePhotoRepair'
import DropZone from './DropZone.vue'
import ProcessingProgress from './ProcessingProgress.vue'
import ReviewSidebar from './ReviewSidebar.vue'
import ReviewEditor from './ReviewEditor.vue'
import IntakeFooter from './IntakeFooter.vue'
import UploadProgress from './UploadProgress.vue'

const emit = defineEmits<{
  back: []
  'upload-completed': []
  uploaded: []
}>()

const workflow = useIntakeWorkflow()
const showLeaveConfirm = ref(false)

// Repair Mode State
const isRepairMode = ref(false)
const isRepairActive = ref(false)
const isRepairDragging = ref(false)
const applyEnhanceInRepair = ref(true)
const repairFileInput = ref<HTMLInputElement | null>(null)
const repairFolderInput = ref<HTMLInputElement | null>(null)

const { isRepairing, repairProgress, repairMessage, repairPhotos } = usePhotoRepair()

const handleFiles = async (files: File[], ignoreRegistry?: boolean) => {
  await workflow.startProcessing(files, ignoreRegistry)
}

const handleCancelClick = () => {
  if (workflow.items.value.length > 0) {
    showLeaveConfirm.value = true
  } else {
    confirmLeave()
  }
}

const confirmLeave = () => {
  showLeaveConfirm.value = false
  workflow.reset()
  emit('back')
}

const handleUpload = async () => {
  await workflow.startUpload()
  emit('uploaded')
  if (workflow.state.value === 'idle') {
    emit('upload-completed')
  }
}

// Repair Mode Actions
const triggerRepairFileSelect = () => {
  repairFileInput.value?.click()
}

const triggerRepairFolderSelect = () => {
  repairFolderInput.value?.click()
}

const handleRepairFileSelect = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const files = Array.from(target.files)
    isRepairActive.value = true
    await repairPhotos(files, applyEnhanceInRepair.value)
  }
  // Reset values so the same folder/files can be selected again
  if (repairFileInput.value) repairFileInput.value.value = ''
  if (repairFolderInput.value) repairFolderInput.value.value = ''
}

const handleRepairDrop = async (e: DragEvent) => {
  isRepairDragging.value = false
  const dt = e.dataTransfer
  if (!dt) return

  const items = dt.items
  const files: File[] = []

  if (items) {
    const traverse = async (item: any) => {
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
          await traverse(entry)
        }
      }
    }

    const promises = []
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry()
      if (entry) {
        promises.push(traverse(entry))
      }
    }
    await Promise.all(promises)
  } else {
    const fileList = dt.files
    if (fileList) {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        if (file.type.startsWith('image/')) {
          files.push(file)
        }
      }
    }
  }

  if (files.length > 0) {
    isRepairActive.value = true
    await repairPhotos(files, applyEnhanceInRepair.value)
  }
}

const resetRepair = () => {
  isRepairActive.value = false
  repairProgress.value = 0
  repairMessage.value = ''
}
</script>

<style scoped>
.intake-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: rgba(10, 10, 10, 0.5);
  width: 100%;
}

.intake-container.repair-mode-active {
  background: rgba(15, 20, 25, 0.6);
}

/* Mode Switcher */
.intake-mode-header {
  display: flex;
  justify-content: center;
  padding: 1.5rem 2rem 0;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  flex-shrink: 0;
}

.mode-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.25rem;
  border-radius: 10px;
  border: 0.5px solid rgba(255, 255, 255, 0.08);
}

.mode-tabs button {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  padding: 0.5rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.mode-tabs button.active {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Repair Layout */
.repair-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.repair-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.repair-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
}

.repair-dropzone {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(255, 255, 255, 0.15) !important;
  border-radius: 20px !important;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  min-height: 400px;
  text-align: center;
  padding: 2rem;
}

.repair-dropzone:hover, .repair-dropzone.drag-active {
  border-color: hsl(var(--primary-color)) !important;
  background: rgba(30, 215, 96, 0.03) !important;
  transform: scale(1.01);
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  max-width: 600px;
}

.drop-icon {
  font-size: 4.5rem;
  margin-bottom: 0.5rem;
}

.drop-desc {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}

.repair-info-badge {
  background: rgba(30, 215, 96, 0.1);
  color: #1ed760;
  border: 0.5px solid rgba(30, 215, 96, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  margin: 0.5rem 0;
}

.repair-options {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.browse-buttons {
  display: flex;
  gap: 1rem;
}

.enhance-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  user-select: none;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.enhance-label:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.enhance-label input[type="checkbox"] {
  accent-color: hsl(var(--primary-color));
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.hidden-input {
  display: none;
}

/* Repair Progress Box */
.repair-progress-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  width: 100%;
}

.progress-box {
  width: 100%;
  max-width: 500px;
  background: rgba(20, 20, 20, 0.8) !important;
  border: 0.5px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 20px !important;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.progress-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  display: inline-block;
}

.progress-box h2 {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.progress-bar-wrapper {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar {
  height: 100%;
  background: hsl(var(--primary-color));
  border-radius: 4px;
  transition: width 0.2s ease;
}

.progress-percentage {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1.5rem;
}

.progress-message {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin-bottom: 2rem;
  word-break: break-all;
  max-width: 100%;
}

.progress-actions {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.progress-actions button {
  flex: 1;
  padding: 0.75rem;
}

/* Confirm modal fallback classes */
.confirm-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.confirm-content {
  width: 100%;
  max-width: 400px;
  background: rgba(15, 15, 15, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5) !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.confirm-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
}

.confirm-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.confirm-body {
  padding: 1.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 0.5px solid rgba(255, 255, 255, 0.08);
}

.confirm-footer button {
  padding: 0.5rem 1.25rem;
  font-size: 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-danger {
  background: rgba(235, 87, 87, 0.15) !important;
  border: 0.5px solid rgba(235, 87, 87, 0.3) !important;
  color: #eb5757 !important;
}

.btn-danger:hover {
  background: rgba(235, 87, 87, 0.3) !important;
  color: #fff !important;
}
</style>
