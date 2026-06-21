<template>
  <div class="sidebar glass">
    <div class="sidebar-header">
      <h3>Review Queue</h3>
      <div v-if="pendingCount > 0" class="processing-badge" :class="{ cooldown: rateLimitStatus.isWaiting }">
        <span class="pulse-dot"></span>
        <span v-if="rateLimitStatus.isWaiting">
          Rate limit cooldown: {{ rateLimitStatus.waitTime }}s
        </span>
        <span v-else>
          {{ pendingCount }} items analyzing...
        </span>
      </div>
    </div>

    <div class="tab-filters">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'duplicates' }"
        @click="emit('tab-change', 'duplicates')"
      >
        <span>Duplicates</span>
        <span class="tab-count">{{ duplicateItems.length }}</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'unverified' }"
        @click="emit('tab-change', 'unverified')"
      >
        <span>Unverified</span>
        <span class="tab-count">{{ unverifiedItems.length }}</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'verified' }"
        @click="emit('tab-change', 'verified')"
      >
        <span>Verified</span>
        <span class="tab-count">{{ verifiedItems.length }}</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'approved' }"
        @click="emit('tab-change', 'approved')"
      >
        <span>Queued</span>
        <span class="tab-count">{{ approvedItems.length }}</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'skipped' }"
        @click="emit('tab-change', 'skipped')"
      >
        <span>Skipped</span>
        <span class="tab-count">{{ skippedItems.length }}</span>
      </button>
    </div>

    <div class="item-list">
      <div
        v-for="item in currentTabItems"
        :key="item.id"
        class="list-item"
        :class="{ active: selectedItem?.id === item.id }"
        @click="emit('select', item)"
      >
        <div class="item-thumb">
          <img :src="item.thumbnailUrl" />
          <div v-if="item.isCluster" class="cluster-badge-small">
            {{ item.photos?.length }}
          </div>
        </div>
        <div class="item-info">
          <h4>{{ item.location || 'Unknown Location' }}</h4>
          <div class="item-meta">
            <span :class="['conf-indicator', item.confidence.toLowerCase()]">●</span>
            {{ item.confidence }}
          </div>
        </div>
      </div>

      <div v-if="currentTabItems.length === 0" class="empty-state">
        <p>No items in this queue.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { rateLimitStatus } from '@/services/geminiService'
import type { IntakeItem, IntakeTabId } from '@/types'

const { items, activeTab, selectedItem, pendingCount } = defineProps<{
  items: IntakeItem[]
  activeTab: IntakeTabId
  selectedItem: IntakeItem | null
  pendingCount: number
}>()

const emit = defineEmits<{
  select: [item: IntakeItem]
  'tab-change': [tab: IntakeTabId]
}>()

const duplicateItems = computed<IntakeItem[]>(() =>
  items.filter(i => i.isCluster && !i.approved && !i.skipped)
)

const unverifiedItems = computed<IntakeItem[]>(() =>
  items.filter(i => !i.isCluster && !i.approved && !i.skipped && (i.confidence === 'LOW' || i.confidence === 'NONE'))
)

const verifiedItems = computed<IntakeItem[]>(() =>
  items.filter(i => !i.isCluster && !i.approved && !i.skipped && (i.confidence === 'HIGH' || i.confidence === 'MEDIUM'))
)

const approvedItems = computed<IntakeItem[]>(() =>
  items.filter(i => i.approved)
)

const skippedItems = computed<IntakeItem[]>(() =>
  items.filter(i => i.skipped)
)

const currentTabItems = computed<IntakeItem[]>(() => {
  switch (activeTab) {
    case 'duplicates': return duplicateItems.value
    case 'unverified': return unverifiedItems.value
    case 'verified': return verifiedItems.value
    case 'approved': return approvedItems.value
    case 'skipped': return skippedItems.value
    default: return []
  }
})
</script>

<style scoped>
.sidebar {
  width: 350px;
  display: flex;
  flex-direction: column;
  border-right: 0.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 0 !important;
  height: calc(100vh - 70px - 80px); /* minus header and footer */
}

.sidebar-header {
  padding: 1.25rem;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
}

.sidebar-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.processing-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(30, 215, 96, 0.1);
  color: hsl(var(--primary-color));
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.processing-badge.cooldown {
  background: rgba(255, 165, 0, 0.1);
  color: #ffa500;
}

.processing-badge.cooldown .pulse-dot {
  background: #ffa500;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: hsl(var(--primary-color));
  border-radius: 50%;
  animation: pulse 1.5s infinite;
  transition: background-color 0.3s ease;
}

.tab-filters {
  display: flex;
  padding: 0.75rem;
  gap: 0.25rem;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.25rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-count {
  font-size: 1.1rem;
  margin-top: 0.25rem;
}

.item-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.list-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.list-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.list-item.active {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.item-thumb {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cluster-badge-small {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  overflow: hidden;
}

.item-info h4 {
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.conf-indicator { font-size: 0.8rem; }
.conf-indicator.high { color: hsl(var(--success)); }
.conf-indicator.medium { color: hsl(var(--warning)); }
.conf-indicator.low { color: hsl(var(--danger)); }
.conf-indicator.none { color: hsl(var(--border-color)); }

.empty-state {
  padding: 3rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}
</style>
