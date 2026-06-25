import { ref, computed, watch } from 'vue'
import { analyzePhotos, rateLimitStatus } from '@/services/geminiService'
import * as supabase from '@/services/supabaseService'
import { usePhotoProcessing } from './usePhotoProcessing'
import { usePhotoStore } from '@/stores/photoStore'
import type { IntakeItem, IntakeState, IntakeTabId, ProcessedFile } from '@/types'

const CACHE_KEY = 'intake_analysis_cache'

const getCache = (): Record<string, any> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

const saveToCache = (key: string, data: any) => {
  const cache = getCache()
  cache[key] = data
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

const clearCache = () => {
  localStorage.removeItem(CACHE_KEY)
}

// Shared module-level state refs
const state = ref<IntakeState>('idle')
const items = ref<IntakeItem[]>([])
const selectedItem = ref<IntakeItem | null>(null)
const activeTab = ref<IntakeTabId>('duplicates')
const pendingAnalysisCount = ref(0)
const skippedCount = ref(0)
const duplicateClustersCount = ref(0)
const currentClusterIdx = ref(0)

// Upload state
const uploadedCount = ref(0)
const uploadProgressMessage = ref('')
const uploadPercentage = ref(0)

// Shared photo processing state
const { processFiles, compressImage, enhanceImageFile, processedCount, totalCount, progressPercentage, progressMessage } = usePhotoProcessing()

export const useIntakeWorkflow = () => {
  watch(
    () => rateLimitStatus.value,
    (status) => {
      if (status.isWaiting) {
        progressMessage.value = `Rate limit cooldown: Pausing for ${status.waitTime}s to avoid API limits...`
      } else if (state.value === 'review' || state.value === 'processing') {
        progressMessage.value = `Analyzing cluster ${currentClusterIdx.value + 1} of ${totalCount.value}...`
      }
    },
    { deep: true }
  )

  // ─── Computed filters ───
  const approvedCount = computed<number>(() => items.value.filter(i => i.approved && !i.skipped).length)
  const remainingCount = computed<number>(() => items.value.filter(i => !i.approved && !i.skipped).length)

  const getTabItems = (tabId: IntakeTabId): IntakeItem[] => {
    switch (tabId) {
      case 'duplicates':
        return items.value.filter(item => item.isCluster && !item.approved && !item.skipped)
      case 'unverified':
        return items.value.filter(item => !item.isCluster && !item.approved && !item.skipped && (item.confidence === 'LOW' || item.confidence === 'NONE'))
      case 'verified':
        return items.value.filter(item => !item.isCluster && !item.approved && !item.skipped && (item.confidence === 'HIGH' || item.confidence === 'MEDIUM'))
      case 'approved':
        return items.value.filter(item => item.approved)
      case 'skipped':
        return items.value.filter(item => item.skipped)
      default:
        return []
    }
  }

  const getTabCount = (tabId: IntakeTabId): number => {
    return getTabItems(tabId).length
  }

  // ─── Actions ───
  const startProcessing = async (
    files: File[],
    ignoreRegistry?: boolean
  ): Promise<void> => {
    state.value = 'processing'
    
    progressMessage.value = 'Loading skipped photos registry...'
    let skippedRegistry: string[] = []
    try {
      skippedRegistry = await supabase.getProcessedRegistry()
    } catch (e) {
      console.warn('Failed to load skipped registry', e)
    }

    // Process all files through the duplicate filter first
    const clusters = await processFiles(files, ignoreRegistry, skippedRegistry)

    processedCount.value = 0
    totalCount.value += clusters.length
    pendingAnalysisCount.value += clusters.length

    state.value = 'review'

    // Analyze each cluster individually for best accuracy (1 cluster = 1 API call)
    const analyzeInBackground = async () => {
      const cache = getCache()

      for (let i = 0; i < clusters.length; i++) {
        if (state.value !== 'review') break

        currentClusterIdx.value = i
        const cluster = clusters[i]
        progressMessage.value = `Analyzing cluster ${i + 1} of ${clusters.length}...`
        progressPercentage.value = 30 + Math.round((i / clusters.length) * 70)

        // Compute cache key for this cluster
        const cacheKey = cluster.map(c => `${c.file.name}_${c.taken_at}`).sort().join('|')

        try {
          let analysis: any

          if (cache[cacheKey]) {
            console.log(`[Cache Hit] Restoring cached analysis for cluster ${i + 1}:`, cacheKey)
            analysis = cache[cacheKey]
          } else {
            const filesToAnalyze = cluster.map(c => c.file)

            const metadata = cluster.map(c => ({
              filename: c.file.name,
              taken_at: c.taken_at,
              latitude: c.latitude,
              longitude: c.longitude
            }))

            console.log(`[Gemini Request] Sending cluster ${i + 1} EXIF metadata to AI:`, JSON.stringify(metadata, null, 2))

            analysis = await analyzePhotos(filesToAnalyze, metadata)
            saveToCache(cacheKey, analysis)
          }

          if (!analysis.is_adventure_photo) {
            skippedCount.value += cluster.length
            cluster.forEach(c => {
              items.value.push({
                id: `skipped-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                isCluster: false,
                filename: c.file.name,
                file: c.file,
                originalSize: c.originalSize,
                previewUrl: c.previewUrl,
                thumbnailUrl: c.previewUrl,
                latitude: c.latitude,
                longitude: c.longitude,
                taken_at: c.taken_at,
                location: 'Filtered Out',
                city: '',
                state: '',
                confidence: 'NONE',
                tags: [],
                description: 'Skipped - Not classified as an adventure photo.',
                reasoning: analysis.reasoning || '',
                skipped: true,
                approved: false
              })
            })
            processedCount.value++
            pendingAnalysisCount.value--
            if (!selectedItem.value && items.value.length > 0) {
              const first = getTabItems('duplicates')[0] || getTabItems('unverified')[0] || getTabItems('verified')[0]
              if (first) selectedItem.value = first
            }
            continue
          }

          if (cluster.length > 1) {
            duplicateClustersCount.value++
            const keeperIdx = analysis.selected_keeper || 0
            items.value.push({
              id: `cluster-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              isCluster: true,
              photos: cluster,
              keeperIndex: keeperIdx,
              keeperIndices: [keeperIdx],
              thumbnailUrl: cluster[keeperIdx].previewUrl,
              latitude: cluster[keeperIdx].latitude || analysis.latitude || null,
              longitude: cluster[keeperIdx].longitude || analysis.longitude || null,
              taken_at: cluster[keeperIdx].taken_at,
              location: analysis.location || 'Unknown Trail',
              city: analysis.city || '',
              state: analysis.state || '',
              description: analysis.description || '',
              tags: analysis.tags || [],
              confidence: analysis.confidence || 'LOW',
              reasoning: analysis.reasoning || '',
              skipped: false,
              approved: false
            })
          } else {
            const photo = cluster[0]
            items.value.push({
              id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              isCluster: false,
              filename: photo.file.name,
              file: photo.file,
              originalFile: photo.originalFile,
              originalSize: photo.originalSize,
              previewUrl: photo.previewUrl,
              thumbnailUrl: photo.previewUrl,
              latitude: photo.latitude || analysis.latitude || null,
              longitude: photo.longitude || analysis.longitude || null,
              taken_at: photo.taken_at,
              location: analysis.location || 'Unknown Trail',
              city: analysis.city || '',
              state: analysis.state || '',
              description: analysis.description || '',
              tags: analysis.tags || [],
              confidence: analysis.confidence || 'LOW',
              reasoning: analysis.reasoning || '',
              skipped: false,
              approved: false
            })
          }
        } catch (e: unknown) {
          const error = e as Error
          console.error(`[analyzeInBackground] cluster ${i} failed:`, e)

          cluster.forEach(photo => {
            items.value.push({
              id: `error-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              isCluster: false,
              filename: photo.file.name,
              file: photo.file,
              originalSize: photo.originalSize,
              previewUrl: photo.previewUrl,
              thumbnailUrl: photo.previewUrl,
              latitude: photo.latitude || null,
              longitude: photo.longitude || null,
              taken_at: photo.taken_at,
              location: 'Error during analysis',
              city: '',
              state: '',
              description: 'Failed to analyze this photo with Gemini.',
              tags: [],
              confidence: 'NONE',
              reasoning: error.message || '',
              skipped: false,
              approved: false
            })
          })

          // Check if it's a quota issue to stop entirely
          if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
            progressMessage.value = 'API quota reached — stopping.'
            break
          }
        }

        processedCount.value++
        pendingAnalysisCount.value--

        if (!selectedItem.value && items.value.length > 0) {
          const first = getTabItems('duplicates')[0] || getTabItems('unverified')[0] || getTabItems('verified')[0]
          if (first) selectedItem.value = first
        }
      }

      progressMessage.value = 'Analysis complete.'
      progressPercentage.value = 100
    }

    analyzeInBackground().catch(e => console.error('[analyzeInBackground] unhandled:', e))
  }

  const approveItem = (item: IntakeItem): void => {
    item.approved = true
    item.skipped = false
    selectNext()
  }

  const unapproveItem = (item: IntakeItem): void => {
    item.approved = false
    item.skipped = false
    selectNext()
  }

  const skipItem = (item: IntakeItem): void => {
    item.approved = false
    item.skipped = true
    selectNext()
  }

  const selectItem = (item: IntakeItem): void => {
    selectedItem.value = item
  }

  const selectNext = (): void => {
    const currentTabItems = getTabItems(activeTab.value)
    if (currentTabItems.length > 0) {
      selectedItem.value = currentTabItems[0]
    } else {
      selectedItem.value = null
    }
  }

  const syncSkippedRegistry = async (uploadedItems: IntakeItem[]): Promise<void> => {
    try {
      const currentRegistry = await supabase.getProcessedRegistry()
      const registrySet = new Set(currentRegistry)

      // 1. Add non-selected photos from approved clusters
      uploadedItems.forEach(item => {
        if (item.isCluster && item.photos) {
          const keepers = item.keeperIndices || [item.keeperIndex || 0]
          item.photos.forEach((photo, idx) => {
            if (!keepers.includes(idx)) {
              const key = `${photo.file.name}_${photo.originalSize}`
              registrySet.add(key)
              console.log(`[Registry Sync] Adding non-keeper duplicate: ${key}`)
            }
          })
        }
      })

      // 2. Add manually skipped items or auto-skipped non-adventure photos
      items.value.forEach(item => {
        if (item.skipped) {
          if (item.isCluster && item.photos) {
            item.photos.forEach(photo => {
              const key = `${photo.file.name}_${photo.originalSize}`
              registrySet.add(key)
              console.log(`[Registry Sync] Adding skipped cluster photo: ${key}`)
            })
          } else {
            const filename = item.filename || item.file?.name
            const size = item.originalSize
            if (filename && size) {
              const key = `${filename}_${size}`
              registrySet.add(key)
              console.log(`[Registry Sync] Adding skipped photo: ${key}`)
            }
          }
        }
      })

      if (registrySet.size > currentRegistry.length) {
        await supabase.saveProcessedRegistry(Array.from(registrySet))
        console.log(`[Registry Sync] Saved ${registrySet.size} keys to local storage.`)
      }
    } catch (e) {
      console.error('Failed to sync skipped registry:', e)
    }
  }

  const startUpload = async (): Promise<void> => {
    const approved = items.value.filter(item => item.approved)
    state.value = 'uploading'
    uploadedCount.value = 0

    const uploadedIds = new Set<string>()

    // Count total actual photos to upload (handling multiple keepers)
    let totalPhotosToUpload = 0
    approved.forEach(item => {
      if (item.isCluster && item.photos) {
        totalPhotosToUpload += (item.keeperIndices || [item.keeperIndex || 0]).length
      } else {
        totalPhotosToUpload += 1
      }
    })

    let uploadedPhotosCount = 0

    for (let i = 0; i < approved.length; i++) {
      const item = approved[i]

      if (item.isCluster && item.photos) {
        const keepers = item.keeperIndices || [item.keeperIndex || 0]
        for (const idx of keepers) {
          const photo = item.photos[idx]
          uploadProgressMessage.value = `Uploading ${photo.file.name}...`
          uploadPercentage.value = Math.round((uploadedPhotosCount / totalPhotosToUpload) * 100)

          try {
            const sourceFile = photo.originalFile || photo.file
            let fileToUpload
            if (item.magicEnhance) {
              uploadProgressMessage.value = `Enhancing ${photo.file.name}...`
              fileToUpload = await compressImage(sourceFile, 2048, 2048, 0.85, true)
            } else {
              uploadProgressMessage.value = `Processing ${photo.file.name}...`
              fileToUpload = await compressImage(sourceFile, 2048, 2048, 0.85, false)
            }

            const photoMetadata = {
              ...item,
              filename: fileToUpload.name,
              taken_at: photo.taken_at
            }
            await supabase.uploadPhoto(photoMetadata, fileToUpload)
            uploadedPhotosCount++
            uploadedIds.add(item.id)
          } catch (e) {
            console.error(`Upload failed for ${photo.file.name}:`, e)
          }
        }
      } else {
        const sourceFile = item.originalFile || item.file
        if (!sourceFile) continue

        uploadProgressMessage.value = `Uploading ${sourceFile.name}...`
        uploadPercentage.value = Math.round((uploadedPhotosCount / totalPhotosToUpload) * 100)

        try {
          let fileToUpload
          if (item.magicEnhance) {
            uploadProgressMessage.value = `Enhancing ${sourceFile.name}...`
            fileToUpload = await compressImage(sourceFile, 2048, 2048, 0.85, true)
          } else {
            uploadProgressMessage.value = `Processing ${sourceFile.name}...`
            fileToUpload = await compressImage(sourceFile, 2048, 2048, 0.85, false)
          }

          await supabase.uploadPhoto(item, fileToUpload)
          uploadedPhotosCount++
          uploadedIds.add(item.id)
        } catch (e) {
          console.error(`Upload failed for ${sourceFile.name}:`, e)
        }
      }

      // Clean up object URLs
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      if (item.photos) {
        item.photos.forEach((p: ProcessedFile) => URL.revokeObjectURL(p.previewUrl))
      }
    }

    // Sync skipped/rejected items to the Supabase registry file
    await syncSkippedRegistry(approved)

    // Filter out successfully uploaded and skipped items
    items.value = items.value.filter(item => !uploadedIds.has(item.id) && !item.skipped)

    // Tell the main album to reload and fetch the new photos we just uploaded
    usePhotoStore().loadPhotos()

    if (items.value.length > 0) {
      state.value = 'review'
      selectNext()
    } else {
      clearCache()
      state.value = 'idle'
    }
  }

  const reset = (): void => {
    items.value.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      if (item.photos) {
        item.photos.forEach((p: ProcessedFile) => URL.revokeObjectURL(p.previewUrl))
      }
    })
    items.value = []
    selectedItem.value = null
    clearCache()
    state.value = 'idle'
  }

  return {
    state, items, selectedItem, activeTab, pendingAnalysisCount,
    skippedCount, duplicateClustersCount,
    approvedCount, remainingCount,
    processedCount, totalCount, progressPercentage, progressMessage,
    uploadedCount, uploadProgressMessage, uploadPercentage,
    getTabItems, getTabCount,
    startProcessing, approveItem, unapproveItem, skipItem, selectItem, selectNext,
    startUpload, reset
  }
}
