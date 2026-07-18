import { createClient } from '@supabase/supabase-js'
import type { Photo } from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing from environment variables.')
}

// Cache client on window during development to prevent HMR duplicate instance warnings
let client: ReturnType<typeof createClient>
if (import.meta.env.DEV) {
  if (!(window as any).__supabaseClient) {
    (window as any).__supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  client = (window as any).__supabaseClient
} else {
  client = createClient(supabaseUrl, supabaseAnonKey)
}

export const supabaseClient = client

const stateMap: Record<string, string> = {
  'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas', 'ca': 'California',
  'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware', 'fl': 'Florida', 'ga': 'Georgia',
  'hi': 'Hawaii', 'id': 'Idaho', 'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa',
  'ks': 'Kansas', 'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland',
  'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi', 'mo': 'Missouri',
  'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada', 'nh': 'New Hampshire', 'nj': 'New Jersey',
  'nm': 'New Mexico', 'ny': 'New York', 'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio',
  'ok': 'Oklahoma', 'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina',
  'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah', 'vt': 'Vermont',
  'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia', 'wi': 'Wisconsin', 'wy': 'Wyoming'
}

export const normalizeStateName = (stateStr: string | null | undefined): string | null => {
  if (!stateStr) return null
  const cleaned = stateStr.trim().toLowerCase()
  if (stateMap[cleaned]) {
    return stateMap[cleaned]
  }
  // Title case fallback
  return stateStr.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export const getPhotos = async (): Promise<Photo[]> => {
  const { data, error } = await supabaseClient
    .from('photos')
    .select('*')
    .eq('is_deleted', false)
    .order('taken_at', { ascending: false })

  if (error) throw error
  
  // Normalize states dynamically on read
  const photos = (data as Photo[]).map(photo => ({
    ...photo,
    state: normalizeStateName(photo.state)
  }))
  
  return photos
}

export const getImageDimensions = (source: File | string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image()
    let url: string
    if (typeof source === 'string') {
      url = source
      img.crossOrigin = 'anonymous'
    } else {
      url = URL.createObjectURL(source)
    }

    img.onload = () => {
      const dimensions = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height }
      if (typeof source !== 'string') {
        URL.revokeObjectURL(url)
      }
      resolve(dimensions)
    }

    img.onerror = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(url)
      }
      resolve({ width: 0, height: 0 })
    }

    img.src = url
  })
}

export const uploadPhoto = async (metadata: Partial<Photo>, imageFile: File): Promise<Photo> => {
  const id = crypto.randomUUID()
  const fileExt = imageFile.name.split('.').pop() || 'jpg'
  const filePath = `${id}.${fileExt}`

  const { error: uploadError } = await supabaseClient.storage
    .from('photos')
    .upload(filePath, imageFile, {
      cacheControl: '31536000',
      upsert: true
    })

  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabaseClient.storage
    .from('photos')
    .getPublicUrl(filePath)

  const storagePath = publicUrlData.publicUrl

  const rawLat = metadata.latitude !== undefined && metadata.latitude !== null ? Number(metadata.latitude) : null
  const rawLng = metadata.longitude !== undefined && metadata.longitude !== null ? Number(metadata.longitude) : null

  // Capture image dimensions in background
  const dims = await getImageDimensions(imageFile)

  const newPhoto = {
    id,
    filename: imageFile.name,
    storage_path: storagePath,
    taken_at: metadata.taken_at || new Date().toISOString(),
    latitude: rawLat !== null && !isNaN(rawLat) ? rawLat : null,
    longitude: rawLng !== null && !isNaN(rawLng) ? rawLng : null,
    state: normalizeStateName(metadata.state),
    city: metadata.city || null,
    landmark: metadata.landmark || (metadata as any).location || null,
    description: metadata.description || '',
    confidence: metadata.confidence || 'NONE',
    reasoning: typeof metadata.reasoning === 'string' ? { details: metadata.reasoning } : metadata.reasoning || { details: 'Uploaded via Supabase client.' },
    tags: metadata.tags || [],
    is_deleted: false,
    created_at: new Date().toISOString(),
    width: dims.width || null,
    height: dims.height || null
  }

  const { data, error } = await supabaseClient
    .from('photos')
    .insert([newPhoto])
    .select()

  if (error) throw error
  if (!data || data.length === 0) throw new Error('Failed to create photo record')
  return data[0] as Photo
}

export const updatePhoto = async (id: string, updates: Partial<Photo>): Promise<Photo> => {
  if (updates.state !== undefined) {
    updates.state = normalizeStateName(updates.state)
  }

  const { data, error } = await supabaseClient
    .from('photos')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw error
  if (!data || data.length === 0) throw new Error('Photo not found')
  
  const photo = data[0] as Photo
  photo.state = normalizeStateName(photo.state)
  return photo
}


export const softDeletePhoto = async (id: string): Promise<void> => {
  const { error } = await supabaseClient
    .from('photos')
    .update({ is_deleted: true })
    .eq('id', id)

  if (error) throw error
}

export const getProcessedRegistry = async (): Promise<string[]> => {
  try {
    const data = localStorage.getItem('trailtracker_skipped_photos')
    return data ? JSON.parse(data) : []
  } catch (e) {
    console.warn('Failed to fetch processed registry from localStorage, returning empty:', e)
    return []
  }
}

export const saveProcessedRegistry = async (keys: string[]): Promise<void> => {
  try {
    localStorage.setItem('trailtracker_skipped_photos', JSON.stringify(keys))
  } catch (e) {
    console.error('Failed to save processed registry to localStorage:', e)
    throw e
  }
}
