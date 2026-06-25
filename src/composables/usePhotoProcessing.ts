import { ref } from 'vue'
import ExifReader from 'exifreader'
import { getPhotos } from '@/services/supabaseService'
import type { ProcessedFile, ExifData } from '@/types'

export const usePhotoProcessing = () => {
  const processedCount = ref(0)
  const totalCount = ref(0)
  const progressPercentage = ref(0)
  const progressMessage = ref('')

  const extractExif = async (file: File): Promise<ExifData> => {
    try {
      const tags = await ExifReader.load(file)

      let lat: number | null = null
      let lng: number | null = null
      let dateStr: string | null = null

      if (tags.GPSLatitude && tags.GPSLatitudeRef) {
        lat = parseFloat(tags.GPSLatitude.description)
        if (tags.GPSLatitudeRef.value[0] === 'S') lat = -Math.abs(lat)
      }
      if (tags.GPSLongitude && tags.GPSLongitudeRef) {
        lng = parseFloat(tags.GPSLongitude.description)
        if (tags.GPSLongitudeRef.value[0] === 'W') lng = -Math.abs(lng)
      }

      const takenDate = tags.DateTimeOriginal?.description || tags.DateTime?.description
      if (takenDate) {
        const parts = takenDate.split(' ')
        if (parts.length === 2) {
          const ymd = parts[0].replace(/:/g, '-')
          dateStr = `${ymd}T${parts[1]}`
        }
      }

      if (!dateStr) {
        dateStr = file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString()
      }

      return { latitude: lat, longitude: lng, taken_at: dateStr }
    } catch (err) {
      console.warn(`Failed to parse EXIF for ${file.name}, using defaults`, err)
      return {
        latitude: null,
        longitude: null,
        taken_at: new Date().toISOString()
      }
    }
  }

  const compressImage = async (
    file: File,
    maxWidth: number = 1600,
    maxHeight: number = 1600,
    quality: number = 0.8,
    magicEnhance: boolean = false
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target!.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')!
          
          if (magicEnhance) {
            // Apply hardware-accelerated brightness, contrast, and saturation filters first
            ctx.filter = 'brightness(1.02) contrast(1.05) saturate(1.18)'
          }

          ctx.drawImage(img, 0, 0, width, height)

          // Clear filter for any subsequent operations
          if (magicEnhance) {
            ctx.filter = 'none'

            // Fetch image pixel data to perform Auto-Levels and Sharpening
            try {
              const imgData = ctx.getImageData(0, 0, width, height)
              const data = imgData.data

              // 1. Local Auto-Levels / Contrast Stretching
              let minR = 255, maxR = 0
              let minG = 255, maxG = 0
              let minB = 255, maxB = 0

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]
                if (r < minR) minR = r
                if (r > maxR) maxR = r
                if (g < minG) minG = g
                if (g > maxG) maxG = g
                if (b < minB) minB = b
                if (b > maxB) maxB = b
              }

              const rangeR = maxR - minR
              const rangeG = maxG - minG
              const rangeB = maxB - minB

              if (rangeR > 0 && rangeG > 0 && rangeB > 0) {
                for (let i = 0; i < data.length; i += 4) {
                  data[i] = ((data[i] - minR) / rangeR) * 255
                  data[i + 1] = ((data[i + 1] - minG) / rangeG) * 255
                  data[i + 2] = ((data[i + 2] - minB) / rangeB) * 255
                }
              }

              // 2. 3x3 Convolution Sharpening Filter Pass
              // Kernel preserves brightness (sum of weights = 1.0) but sharpens textures
              const sharpenedData = ctx.createImageData(width, height)
              const sData = sharpenedData.data
              const weights = [
                 0,   -0.1,   0,
                -0.1,  1.4,  -0.1,
                 0,   -0.1,   0
              ]
              const side = 3
              const halfSide = 1

              for (let y = 0; y < height; y++) {
                const yOffset = y * width
                for (let x = 0; x < width; x++) {
                  const dstOff = (yOffset + x) * 4
                  
                  let r = 0, g = 0, b = 0
                  for (let cy = 0; cy < side; cy++) {
                    const scy = y + cy - halfSide
                    if (scy >= 0 && scy < height) {
                      const scyOffset = scy * width
                      const cySide = cy * side
                      for (let cx = 0; cx < side; cx++) {
                        const scx = x + cx - halfSide
                        if (scx >= 0 && scx < width) {
                          const srcOff = (scyOffset + scx) * 4
                          const wt = weights[cySide + cx]
                          r += data[srcOff] * wt
                          g += data[srcOff + 1] * wt
                          b += data[srcOff + 2] * wt
                        }
                      }
                    }
                  }

                  sData[dstOff] = Math.min(255, Math.max(0, r))
                  sData[dstOff + 1] = Math.min(255, Math.max(0, g))
                  sData[dstOff + 2] = Math.min(255, Math.max(0, b))
                  sData[dstOff + 3] = data[dstOff + 3] // copy alpha channel
                }
              }

              ctx.putImageData(sharpenedData, 0, 0)
            } catch (e) {
              console.warn('Failed to apply local pixel enhancements, using standard canvas output:', e)
            }
          }

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              }))
            } else {
              reject(new Error('Canvas compression returned null blob'))
            }
          }, 'image/jpeg', quality)
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  const processFiles = async (
    files: File[],
    ignoreRegistry?: boolean,
    skippedRegistry: string[] = []
  ): Promise<ProcessedFile[][]> => {
    totalCount.value = files.length
    processedCount.value = 0
    progressPercentage.value = 0
    progressMessage.value = 'Checking database for existing photos...'
    
    const existingPhotos = await getPhotos()
    const registrySet = new Set(skippedRegistry)

    progressMessage.value = 'Reading EXIF headers and filtering duplicates...'

    const fileDataList: ProcessedFile[] = []
    let skippedCount = 0

    // 1. Extract EXIF data and compress files
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      progressPercentage.value = Math.round((i / files.length) * 30)

      const exif = await extractExif(file)

      // Check if it's in the skipped registry (unless bypass option is checked)
      const registryKey = `${file.name}_${file.size}`
      if (!ignoreRegistry && registrySet.has(registryKey)) {
        console.log(`[Registry Match] Skipping file: ${registryKey}`)
        skippedCount++
        processedCount.value = i + 1
        continue
      }

      // Check if it already exists in the database (duplicate check)
      const isDuplicate = existingPhotos.some(p => {
        const parseAsUtc = (d: string) => {
          const hasOffset = /Z|[+-]\d{2}(:?\d{2})?$/.test(d)
          return new Date(hasOffset ? d : d + 'Z').getTime()
        }
        return p.filename === file.name && parseAsUtc(p.taken_at) === parseAsUtc(exif.taken_at)
      })

      if (isDuplicate) {
        skippedCount++
        processedCount.value = i + 1
        continue
      }

      // Compress immediately to save memory
      const compressedFile = await compressImage(file, 1024, 1024, 0.7)
      const previewUrl = URL.createObjectURL(compressedFile)

      fileDataList.push({
        file: compressedFile,
        originalFile: file,
        taken_at: exif.taken_at,
        latitude: exif.latitude,
        longitude: exif.longitude,
        previewUrl,
        originalSize: file.size
      })

      processedCount.value = i + 1

      // Throttle: Stop parsing once we have exactly 100 NEW photos to analyze
      if (fileDataList.length >= 100) break
    }

    // 2. Sort chronologically
    fileDataList.sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())

    // 3. Cluster by 2-minute interval
    progressMessage.value = 'Clustering duplicate bursts...'
    const clusters: ProcessedFile[][] = []
    let currentCluster: ProcessedFile[] = []

    for (let i = 0; i < fileDataList.length; i++) {
      const item = fileDataList[i]
      if (currentCluster.length === 0) {
        currentCluster.push(item)
      } else {
        const prevItem = currentCluster[currentCluster.length - 1]
        const timeDiff = Math.abs(new Date(item.taken_at).getTime() - new Date(prevItem.taken_at).getTime()) / 1000 / 60

        if (timeDiff <= 2.0) {
          currentCluster.push(item)
        } else {
          clusters.push([...currentCluster])
          currentCluster = [item]
        }
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster)
    }

    return clusters
  }

  const enhanceImageFile = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target!.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const width = img.width
          const height = img.height
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')!
          
          // Apply hardware-accelerated brightness, contrast, and saturation filters first
          ctx.filter = 'brightness(1.02) contrast(1.05) saturate(1.18)'
          ctx.drawImage(img, 0, 0, width, height)
          ctx.filter = 'none'

          // Fetch image pixel data to perform Auto-Levels and Sharpening
          try {
            const imgData = ctx.getImageData(0, 0, width, height)
            const data = imgData.data

            // 1. Local Auto-Levels / Contrast Stretching
            let minR = 255, maxR = 0
            let minG = 255, maxG = 0
            let minB = 255, maxB = 0

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              if (r < minR) minR = r
              if (r > maxR) maxR = r
              if (g < minG) minG = g
              if (g > maxG) maxG = g
              if (b < minB) minB = b
              if (b > maxB) maxB = b
            }

            const rangeR = maxR - minR
            const rangeG = maxG - minG
            const rangeB = maxB - minB

            if (rangeR > 0 && rangeG > 0 && rangeB > 0) {
              for (let i = 0; i < data.length; i += 4) {
                data[i] = ((data[i] - minR) / rangeR) * 255
                data[i + 1] = ((data[i + 1] - minG) / rangeG) * 255
                data[i + 2] = ((data[i + 2] - minB) / rangeB) * 255
              }
            }

            // 2. 3x3 Convolution Sharpening Filter Pass
            // Kernel preserves brightness (sum of weights = 1.0) but sharpens textures
            const sharpenedData = ctx.createImageData(width, height)
            const sData = sharpenedData.data
            const weights = [
               0,   -0.1,   0,
              -0.1,  1.4,  -0.1,
               0,   -0.1,   0
            ]
            const side = 3
            const halfSide = 1

            for (let y = 0; y < height; y++) {
              const yOffset = y * width
              for (let x = 0; x < width; x++) {
                const dstOff = (yOffset + x) * 4
                
                let r = 0, g = 0, b = 0
                for (let cy = 0; cy < side; cy++) {
                  const scy = y + cy - halfSide
                  if (scy >= 0 && scy < height) {
                    const scyOffset = scy * width
                    const cySide = cy * side
                    for (let cx = 0; cx < side; cx++) {
                      const scx = x + cx - halfSide
                      if (scx >= 0 && scx < width) {
                        const srcOff = (scyOffset + scx) * 4
                        const wt = weights[cySide + cx]
                        r += data[srcOff] * wt
                        g += data[srcOff + 1] * wt
                        b += data[srcOff + 2] * wt
                      }
                    }
                  }
                }

                sData[dstOff] = Math.min(255, Math.max(0, r))
                sData[dstOff + 1] = Math.min(255, Math.max(0, g))
                sData[dstOff + 2] = Math.min(255, Math.max(0, b))
                sData[dstOff + 3] = data[dstOff + 3] // copy alpha channel
              }
            }

            ctx.putImageData(sharpenedData, 0, 0)
          } catch (e) {
            console.warn('Failed to apply local pixel enhancements, using standard canvas output:', e)
          }

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              }))
            } else {
              reject(new Error('Canvas enhancement returned null blob'))
            }
          }, 'image/jpeg', 0.8)
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  return {
    processedCount, totalCount, progressPercentage, progressMessage,
    extractExif, compressImage, processFiles, enhanceImageFile
  }
}
