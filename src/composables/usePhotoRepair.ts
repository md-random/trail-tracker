import { ref } from 'vue'
import { supabaseClient } from '@/services/supabaseService'
import { usePhotoProcessing } from './usePhotoProcessing'
import { usePhotoStore } from '@/stores/photoStore'

export const usePhotoRepair = () => {
  const isRepairing = ref(false)
  const repairProgress = ref(0)
  const repairMessage = ref('')
  const { compressImage } = usePhotoProcessing()
  const store = usePhotoStore()

  const repairPhotos = async (files: File[], applyEnhance: boolean): Promise<void> => {
    if (files.length === 0) {
      repairMessage.value = 'No files selected.'
      return
    }

    isRepairing.value = true
    repairProgress.value = 0
    repairMessage.value = 'Fetching existing photo records from database...'

    try {
      // 1. Fetch existing non-deleted photo records from the database
      const { data: existingPhotos, error } = await supabaseClient
        .from('photos')
        .select('id, filename')
        .eq('is_deleted', false)

      if (error) throw error

      if (!existingPhotos || existingPhotos.length === 0) {
        repairMessage.value = 'No photos found in database to repair.'
        isRepairing.value = false
        return
      }

      // Create a map of original_filename -> photo_uuid for fast lookup
      const photoMap = new Map<string, string>(
        existingPhotos.map(p => [p.filename, p.id])
      )

      // 2. Filter the dropped files to find matches in the database
      const matchedFiles = files.filter(f => photoMap.has(f.name))

      if (matchedFiles.length === 0) {
        repairMessage.value = 'No matches found. Drag and drop the original files that are already in your album.'
        isRepairing.value = false
        return
      }

      repairMessage.value = `Found ${matchedFiles.length} matching photos to repair out of ${files.length} dropped files. Starting sequential repair...`

      let successCount = 0

      // 3. Process and upload matched files one-by-one to keep memory low
      for (let i = 0; i < matchedFiles.length; i++) {
        const file = matchedFiles[i]
        const id = photoMap.get(file.name)!
        
        repairMessage.value = `[${i + 1}/${matchedFiles.length}] Processing ${file.name}...`
        
        try {
          // Compress the original file directly to 2048px high quality (with optional gentle sharpening)
          const processedFile = await compressImage(file, 2048, 2048, 0.85, applyEnhance)

          // Upload and overwrite (upsert) in Supabase Storage
          const fileExt = file.name.split('.').pop() || 'jpg'
          const filePath = `${id}.${fileExt}`

          const { error: uploadError } = await supabaseClient.storage
            .from('photos')
            .upload(filePath, processedFile, {
              cacheControl: '3600',
              upsert: true // Overwrites the existing low-res file
            })

          if (uploadError) throw uploadError

          successCount++
        } catch (err: any) {
          console.error(`Failed to repair photo ${file.name}:`, err)
        }

        // Update progress percentage
        repairProgress.value = Math.round(((i + 1) / matchedFiles.length) * 100)
      }

      // 4. Wrap up and reload photo store
      repairMessage.value = `Repair complete! Successfully updated ${successCount} of ${matchedFiles.length} matching photos. No Gemini API calls were used.`
      
      // Force cache-busting to instantly load fresh high-res images in the browser
      store.triggerCacheBuster()

      // Reload photos in the store to update the UI instantly
      await store.loadPhotos()
      
    } catch (err: any) {
      console.error('Error during photo repair process:', err)
      repairMessage.value = `Repair failed: ${err.message || err}`
    } finally {
      isRepairing.value = false
    }
  }

  return {
    isRepairing,
    repairProgress,
    repairMessage,
    repairPhotos
  }
}
