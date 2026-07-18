import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as supabase from '@/services/supabaseService'
import type { Photo, CategoryId } from '@/types'

export const usePhotoStore = defineStore('photos', () => {
  // ─── State ───
  const photos = ref<Photo[]>([])
  const activeCategory = ref<CategoryId>('all')
  const searchQuery = ref('')
  const selectedPhoto = ref<Photo | null>(null)
  const isEditing = ref(false)
  const photoToFlyTo = ref<Photo | null>(null)
  const cacheBuster = ref<number>(Date.now())

  // Auth State
  const userSession = ref<any>(null)
  const authError = ref<string | null>(null)

  const isAdmin = computed(() => {
    return userSession.value !== null
  })

  // ─── Getters ───
  const filteredPhotos = computed<Photo[]>(() => {
    return photos.value.filter(photo => {
      if (activeCategory.value !== 'all') {
        if (!photo.tags.includes(activeCategory.value)) return false
      }
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        return (
          photo.landmark?.toLowerCase().includes(q) ||
          photo.city?.toLowerCase().includes(q) ||
          photo.state?.toLowerCase().includes(q) ||
          photo.description?.toLowerCase().includes(q) ||
          photo.tags.some(t => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  })

  // ─── Actions ───
  const loadPhotos = async (forceRefetch = false): Promise<void> => {
    try {
      if (!forceRefetch) {
        const cached = sessionStorage.getItem('trailtracker_photos_cache')
        if (cached) {
          photos.value = JSON.parse(cached)
          return
        }
      }
      const data = await supabase.getPhotos()
      photos.value = data
      sessionStorage.setItem('trailtracker_photos_cache', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to load photos:', e)
    }
  }

  const savePhoto = async (id: string, updates: Partial<Photo>): Promise<void> => {
    try {
      const updated = await supabase.updatePhoto(id, updates)
      const idx = photos.value.findIndex(p => p.id === updated.id)
      if (idx !== -1) {
        photos.value[idx] = updated
      }
      if (selectedPhoto.value?.id === updated.id) {
        selectedPhoto.value = updated
      }
      sessionStorage.setItem('trailtracker_photos_cache', JSON.stringify(photos.value))
    } catch (e) {
      console.error('Failed to save photo:', e)
      throw e
    }
  }

  const removePhoto = async (id: string): Promise<void> => {
    try {
      await supabase.softDeletePhoto(id)
      photos.value = photos.value.filter(p => p.id !== id)
      if (selectedPhoto.value?.id === id) {
        selectedPhoto.value = null
        isEditing.value = false
      }
      sessionStorage.setItem('trailtracker_photos_cache', JSON.stringify(photos.value))
    } catch (e) {
      console.error('Failed to delete photo:', e)
      throw e
    }
  }

  const selectPhoto = (photo: Photo | null): void => {
    selectedPhoto.value = photo
    isEditing.value = false
  }

  const login = async (email?: string, password?: string): Promise<boolean> => {
    authError.value = null
    const { data, error } = await supabase.supabaseClient.auth.signInWithPassword({
      email: email || '',
      password: password || ''
    })
    if (error) {
      authError.value = error.message
      return false
    }
    userSession.value = data.session
    return true
  }

  const logout = async (): Promise<void> => {
    await supabase.supabaseClient.auth.signOut()
    userSession.value = null
    isEditing.value = false
  }

  const initAuthListener = (): void => {
    // Load initial session
    supabase.supabaseClient.auth.getSession().then(({ data: { session } }) => {
      userSession.value = session
      if (session) {
        loadPhotos(true)
      }
    })

    // Listen for changes
    supabase.supabaseClient.auth.onAuthStateChange((_event, session) => {
      userSession.value = session
      loadPhotos(true)
    })
  }

  const toggleAdmin = async (): Promise<void> => {
    if (isAdmin.value) {
      await logout()
    }
  }

  const triggerCacheBuster = (): void => {
    cacheBuster.value = Date.now()
  }

  return {
    photos, activeCategory, searchQuery, selectedPhoto, isAdmin, isEditing,
    cacheBuster,
    userSession, authError, filteredPhotos,
    loadPhotos, savePhoto, removePhoto, selectPhoto, toggleAdmin,
    login, logout, initAuthListener, triggerCacheBuster
  }
})
