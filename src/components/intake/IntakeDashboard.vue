<template>
  <div class="intake-container animate-fade-in">
    <!-- Idle: show dropzone -->
    <DropZone v-if="workflow.state.value === 'idle'" @files-selected="handleFiles" @back="emit('back')" />

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
</script>

<style scoped>
.intake-container {
  display: flex;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: rgba(10, 10, 10, 0.5);
}

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
