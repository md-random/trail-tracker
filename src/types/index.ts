// ─── Core domain types ───

export interface Photo {
  id: string
  filename: string
  storage_path: string
  taken_at: string
  latitude: number | null
  longitude: number | null
  state: string | null
  city: string | null
  landmark: string | null
  description: string
  confidence: ConfidenceLevel
  reasoning: string | { details: string }
  tags: string[]
  is_deleted: boolean
  created_at: string
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export interface GeminiAnalysis {
  is_adventure_photo: boolean
  selected_keeper: number
  location: string | null
  city: string | null
  state: string | null
  description: string | null
  tags: string[]
  confidence: ConfidenceLevel
  reasoning: string
  latitude?: number
  longitude?: number
}

// ─── Intake pipeline types ───

export interface ExifData {
  latitude: number | null
  longitude: number | null
  taken_at: string
}

export interface ProcessedFile {
  file: File
  originalFile?: File
  taken_at: string
  latitude: number | null
  longitude: number | null
  previewUrl: string
  originalSize: number
}

export interface IntakeItem {
  id: string
  isCluster: boolean
  filename?: string
  file?: File
  originalFile?: File
  originalSize?: number
  photos?: ProcessedFile[]
  keeperIndex?: number
  keeperIndices?: number[]
  previewUrl?: string
  thumbnailUrl: string
  latitude: number | null
  longitude: number | null
  taken_at: string
  location: string
  city: string
  state: string
  description: string
  tags: string[]
  confidence: ConfidenceLevel
  reasoning: string
  skipped: boolean
  approved: boolean
}

export type IntakeState = 'idle' | 'processing' | 'review' | 'uploading'

export type ViewMode = 'dashboard' | 'intake' | 'repair'
export type DashboardTab = 'map' | 'album'
export type CategoryId = 'all' | 'basenji' | 'sign' | 'scenic'
export type IntakeTabId = 'duplicates' | 'unverified' | 'verified' | 'approved' | 'skipped'

export interface Category {
  id: CategoryId
  name: string
}

export interface EditForm {
  landmark: string
  city: string
  state: string
  description: string
  tagsString: string
  latitude: number | null
  longitude: number | null
}

// ─── Gemini API call tracking ───

export interface ApiCallRecord {
  timestamp: number
  tokens: number
}

// ─── Map composable options ───

export interface UseMapOptions {
  isAdmin?: import('vue').Ref<boolean>
  onMarkerClick?: (photo: Photo) => void
  onMarkerDrag?: (photo: Photo, lat: number, lng: number) => void
  onMapClick?: (lat: number, lng: number) => void
  draggable?: boolean
  center?: [number, number]
  zoom?: number
}
