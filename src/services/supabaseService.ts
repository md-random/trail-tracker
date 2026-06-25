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

export const getPhotos = async (): Promise<Photo[]> => {
  const { data, error } = await supabaseClient
    .from('photos')
    .select('*')
    .eq('is_deleted', false)
    .order('taken_at', { ascending: false })

  if (error) throw error
  return data as Photo[]
}

export const uploadPhoto = async (metadata: Partial<Photo>, imageFile: File): Promise<Photo> => {
  const id = crypto.randomUUID()
  const fileExt = imageFile.name.split('.').pop() || 'jpg'
  const filePath = `${id}.${fileExt}`

  const { error: uploadError } = await supabaseClient.storage
    .from('photos')
    .upload(filePath, imageFile, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabaseClient.storage
    .from('photos')
    .getPublicUrl(filePath)

  const storagePath = publicUrlData.publicUrl

  const rawLat = metadata.latitude !== undefined && metadata.latitude !== null ? Number(metadata.latitude) : null
  const rawLng = metadata.longitude !== undefined && metadata.longitude !== null ? Number(metadata.longitude) : null

  const newPhoto = {
    id,
    filename: imageFile.name,
    storage_path: storagePath,
    taken_at: metadata.taken_at || new Date().toISOString(),
    latitude: rawLat !== null && !isNaN(rawLat) ? rawLat : null,
    longitude: rawLng !== null && !isNaN(rawLng) ? rawLng : null,
    state: metadata.state || null,
    city: metadata.city || null,
    landmark: metadata.landmark || (metadata as any).location || null,
    description: metadata.description || '',
    confidence: metadata.confidence || 'NONE',
    reasoning: typeof metadata.reasoning === 'string' ? { details: metadata.reasoning } : metadata.reasoning || { details: 'Uploaded via Supabase client.' },
    tags: metadata.tags || [],
    is_deleted: false,
    created_at: new Date().toISOString()
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
  const { data, error } = await supabaseClient
    .from('photos')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw error
  if (!data || data.length === 0) throw new Error('Photo not found')
  return data[0] as Photo
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
