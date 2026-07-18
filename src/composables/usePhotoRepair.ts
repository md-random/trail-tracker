import { ref } from 'vue'
import { supabaseClient, getImageDimensions } from '@/services/supabaseService'
import { usePhotoProcessing } from './usePhotoProcessing'
import { usePhotoStore } from '@/stores/photoStore'

export const usePhotoRepair = () => {
  const isRepairing = ref(false)
  const repairProgress = ref(0)
  const repairMessage = ref('')
  const { compressImage } = usePhotoProcessing()
  const store = usePhotoStore()

  const repairPhotos = async (files: File[]): Promise<void> => {
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
      const unmatchedCount = files.length - matchedFiles.length

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
        
        repairMessage.value = `[${i + 1}/${matchedFiles.length}] Uploading ${file.name}...`
        
        try {
          // Compress the original file to 2048px high quality (no magic filters)
          const processedFile = await compressImage(file, 2048, 2048, 0.85)

          const fileExt = file.name.split('.').pop() || 'jpg'
          const filePath = `${id}.${fileExt}`

          // Upload and overwrite the compressed file to the exact same UUID-based path at the root of the bucket
          const { error: uploadError } = await supabaseClient.storage
            .from('photos')
            .upload(filePath, processedFile, {
              cacheControl: '31536000',
              upsert: true
            })

          if (uploadError) throw uploadError

          // Get dimensions of repaired file
          const { width, height } = await getImageDimensions(processedFile)

          // Update database record to store dimensions
          const { error: dbError } = await supabaseClient
            .from('photos')
            .update({ width, height })
            .eq('id', id)

          if (dbError) throw dbError

          successCount++
        } catch (err: any) {
          console.error(`Failed to repair photo ${file.name}:`, err)
        }

        // Update progress percentage
        repairProgress.value = Math.round(((i + 1) / matchedFiles.length) * 100)
      }

      // 4. Wrap up and reload photo store
      repairMessage.value = `Repair complete! Successfully updated ${successCount} of ${matchedFiles.length} matching photos.${unmatchedCount > 0 ? ` ${unmatchedCount} files were skipped because they do not exist in the database.` : ''}`
      
      // Force cache-busting to instantly load fresh high-res images in the browser
      store.triggerCacheBuster()

      // Reload photos in the store to update the UI instantly
      await store.loadPhotos(true)
      
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
