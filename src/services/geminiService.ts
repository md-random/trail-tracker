import { GoogleGenerativeAI } from '@google/generative-ai'
import { ref } from 'vue'
import type { GeminiAnalysis, ApiCallRecord } from '@/types'

// ─── API Key management ───

export const getGeminiApiKey = (): string => {
  return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || ''
}

export const saveGeminiApiKey = (key: string): void => {
  if (key) {
    localStorage.setItem('gemini_api_key', key)
  } else {
    localStorage.removeItem('gemini_api_key')
  }
}

// ─── API Call Tracking & Rate Limiting ───

export const rateLimitStatus = ref({
  isWaiting: false,
  waitTime: 0
})

class GeminiRateLimiter {
  private queue: (() => void)[] = []
  private isProcessing = false
  private callHistory: number[] = []
  private totalCalls = 0
  private dailyCalls = 0
  private dailyResetAt = Date.now() + 86400000

  // Token tracking
  private tokenHistory: { timestamp: number; tokens: number }[] = []
  private totalTokens = 0

  private getLimits(): { maxRpm: number; maxRpd: number; windowMs: number; bufferMs: number } {
    const apiKey = getGeminiApiKey()
    const defaultKey = import.meta.env.VITE_DEFAULT_GEMINI_API_KEY || ''
    const isDefault = (defaultKey && apiKey === defaultKey) || !apiKey
    
    return {
      maxRpm: isDefault ? 4 : 60,
      maxRpd: isDefault ? 249 : 100000,
      windowMs: isDefault ? 63000 : 60000,
      bufferMs: isDefault ? 2000 : 500
    }
  }

  recordTokens(tokens: number) {
    const now = Date.now()
    const { maxRpm, maxRpd, windowMs } = this.getLimits()
    this.totalTokens += tokens
    this.tokenHistory.push({ timestamp: now, tokens })
    this.tokenHistory = this.tokenHistory.filter(t => now - t.timestamp < windowMs)
    const tpmNow = this.tokenHistory.reduce((s, t) => s + t.tokens, 0)
    const rpmNow = this.callHistory.filter(t => now - t < windowMs).length
    console.log(
      `[Gemini #${this.totalCalls}] ` +
      `RPM: ${rpmNow}/${maxRpm} | ` +
      `RPD: ${this.dailyCalls}/${maxRpd} | ` +
      `TPM: ${tpmNow.toLocaleString()} | ` +
      `Tokens this call: ${tokens.toLocaleString()} | ` +
      `Total tokens: ${this.totalTokens.toLocaleString()}`
    )
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch(e) {
          reject(e)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const { maxRpm, maxRpd, windowMs, bufferMs } = this.getLimits()

      if (now >= this.dailyResetAt) {
        this.dailyCalls = 0
        this.dailyResetAt = now + 86400000
      }

      if (this.dailyCalls >= maxRpd) {
        throw new Error(`Daily request limit reached (${maxRpd}/day). Try again tomorrow.`)
      }

      this.callHistory = this.callHistory.filter(timestamp => now - timestamp < windowMs)

      if (this.callHistory.length >= maxRpm) {
        const oldestCall = this.callHistory[0]
        const waitTime = windowMs - (now - oldestCall) + bufferMs
        console.warn(`[Gemini Queue] RPM limit reached. Pausing for ${Math.round(waitTime / 1000)}s...`)
        
        rateLimitStatus.value = {
          isWaiting: true,
          waitTime: Math.round(waitTime / 1000)
        }

        const interval = setInterval(() => {
          rateLimitStatus.value.waitTime = Math.max(0, rateLimitStatus.value.waitTime - 1)
        }, 1000)

        await new Promise(resolve => setTimeout(resolve, waitTime))
        
        clearInterval(interval)
        rateLimitStatus.value = {
          isWaiting: false,
          waitTime: 0
        }
        
        continue
      }

      const task = this.queue.shift()
      if (task) {
        this.totalCalls++
        this.dailyCalls++
        this.callHistory.push(Date.now())
        await task()
      }
    }

    this.isProcessing = false
  }
}

export const rateLimiter = new GeminiRateLimiter()

// ─── File conversion ───

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1]
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        },
      })
    }
    reader.onerror = () => reject(new Error(`FileReader failed for ${file.name}`))
    reader.readAsDataURL(file)
  })
}

// ─── Mock analysis for demo mode ───

const generateMockAnalysis = (filename: string, _fileCount: number = 1): GeminiAnalysis => {
  const isBasenji = filename.toLowerCase().includes('dog') || filename.toLowerCase().includes('basenji') || Math.random() > 0.6
  const isSign = filename.toLowerCase().includes('sign') || filename.toLowerCase().includes('trailhead') || Math.random() > 0.7
  const isIndoor = filename.toLowerCase().includes('indoor') || filename.toLowerCase().includes('room') || filename.toLowerCase().includes('house')

  if (isIndoor) {
    return {
      is_adventure_photo: false,
      selected_keeper: 0,
      confidence: 'NONE',
      reasoning: 'Filtered out because the image appears to be an indoor setting.',
      location: null,
      city: null,
      state: null,
      description: null,
      tags: []
    }
  }

  const locations = [
    { landmark: 'El Capitan Meadow', city: 'Yosemite Valley', state: 'California', lat: 37.7240, lng: -119.6280, tags: ['scenic', 'mountains'] },
    { landmark: 'Mesa Arch Trail', city: 'Moab', state: 'Utah', lat: 38.3892, lng: -109.8681, tags: ['scenic', 'desert', 'arch'] },
    { landmark: 'Highline Trail', city: 'Glacier National Park', state: 'Montana', lat: 48.7490, lng: -113.7380, tags: ['scenic', 'mountains', 'forest'] },
    { landmark: 'Longs Peak Peak Trail', city: 'Estes Park', state: 'Colorado', lat: 40.2549, lng: -105.6160, tags: ['scenic', 'mountains'] }
  ]

  const chosenLoc = locations[Math.floor(Math.random() * locations.length)]
  const tags = [...chosenLoc.tags]
  if (isBasenji) tags.push('basenji')
  if (isSign) tags.push('sign')

  let desc = `A beautiful outdoor adventure shot taken at ${chosenLoc.landmark}.`
  if (isBasenji) desc += ` Features a curly-tailed Basenji exploring the rugged wilderness.`
  if (isSign) desc += ` Includes a wooden trail sign clear enough to read details.`

  return {
    is_adventure_photo: true,
    selected_keeper: 0,
    confidence: Math.random() > 0.5 ? 'HIGH' : 'MEDIUM',
    reasoning: `Matched visual elements with typical local landscapes of ${chosenLoc.state} (mountains, trees, or desert sandstone).`,
    location: chosenLoc.landmark,
    city: chosenLoc.city,
    state: chosenLoc.state,
    latitude: chosenLoc.lat + (Math.random() - 0.5) * 0.01,
    longitude: chosenLoc.lng + (Math.random() - 0.5) * 0.01,
    description: desc,
    tags
  }
}

// ─── Main analysis function ───

export const analyzePhotos = async (
  files: File[],
  metadataList: { filename: string; taken_at: string; latitude: number | null; longitude: number | null }[]
): Promise<GeminiAnalysis> => {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    await new Promise(r => setTimeout(r, 1500))
    return generateMockAnalysis(files[0].name, files.length)
  }

  return rateLimiter.schedule(async () => {
    try {
      const ai = new GoogleGenerativeAI(apiKey)
      const model = ai.getGenerativeModel({
        model: 'gemini-3.5-flash',
        generationConfig: {
          temperature: 0
        }
      })

      const imageParts = await Promise.all(files.map(f => fileToGenerativePart(f)))

      const systemInstruction = `
        You are an AI location and photo analysis engine for outdoor hiking, camping, and wilderness adventures.

        You will be given one or more photos from a single location (taken within a short timeframe).
        Your job is to:
        1. Classify if this is an "outdoor adventure" image. Exclude: indoor spaces, parking lots, shopping areas, city streets, highways, subways, backyards.
        2. If multiple images are provided, evaluate them and choose the SINGLE best "keeper" image (index starting at 0).
           - Criteria for dogs (Basenjis): Select the shot where the dogs are most in-focus, centered, and fully visible.
           - Criteria for signs: Select the shot where the sign text is cleanest, sharpest, and fully readable.
           - Criteria for landscapes: Select the shot with the best exposure, composition, and lighting.
        3. Identify the location of the selected keeper (estimate the US landmark, state park, national park, forest, or mountain if possible based on geological features, signs, or vegetation).
        4. Provide interesting description, a list of tags (e.g. "basenji", "sign", "scenic", "camping", "lake", "desert"), and a location confidence level (HIGH, MEDIUM, LOW, NONE).
           - Dog Identification Guide: Identify the Basenjis by name if they appear in the photo:
             - "Frida" is the brindle girl (dark tiger-like stripes on a brown/tan coat).
             - "Zuzu" is the red-and-white girl.
             - When they are visible, refer to them by name in the description and include their names as tags (e.g., "frida", "zuzu").

        You must respond ONLY with a valid JSON object matching this schema:
        {
          "is_adventure_photo": boolean,
          "selected_keeper": number (index of the chosen keeper photo, 0 if only one photo is supplied),
          "location": string or null (landmark/trail/park name),
          "city": string or null,
          "state": string or null,
          "latitude": number or null (estimated decimal latitude if exact location is identified, otherwise null),
          "longitude": number or null (estimated decimal longitude if exact location is identified, otherwise null),
          "description": string or null,
          "tags": string[],
          "confidence": "HIGH" | "MEDIUM" | "LOW" | "NONE",
          "reasoning": string (brief explanation of what you identified in the photo and why you chose the keeper/location)
        }
      `

      const prompt = `Analyze these ${files.length} photos. Metadata extracted from EXIF: ${JSON.stringify(metadataList)}`

      let lastError: Error | null = null
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const result = await model.generateContent([
            systemInstruction,
            ...imageParts,
            prompt
          ])
          const responseText = result.response.text()
          const tokens = result.response.usageMetadata?.totalTokenCount ?? 0
          rateLimiter.recordTokens(tokens)
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
          return JSON.parse(cleanJson) as GeminiAnalysis
        } catch (e: unknown) {
          lastError = e as Error
          const is503 = lastError.message?.includes('503')
          const is429 = lastError.message?.includes('429')
          if (!is503 && !is429) throw new Error(`Gemini API Error: ${lastError.message}`)
          
          let wait = 0
          if (is429) {
            // Google strictly punishes 429s. Sit in the penalty box for 61 seconds to clear the rolling window.
            wait = 61000
          } else {
            const retryMatch = lastError.message?.match(/retry[^"]*"(\d+)s"/i)
            wait = retryMatch ? parseInt(retryMatch[1]) * 1000 + 500 : Math.pow(2, attempt + 1) * 1000
          }

          console.warn(`[Gemini] ${is429 ? '429 quota (penalty box)' : '503 overload'}, retry ${attempt + 1}/5 in ${wait / 1000}s...`)
          await new Promise(r => setTimeout(r, wait))
        }
      }
      throw new Error(`Gemini API Error: ${lastError?.message}`)
    } catch (e: unknown) {
      const error = e as Error
      console.error('Gemini API execution failed:', e)
      throw new Error(`Gemini API Error: ${error.message}`)
    }
  })
}

// ─── Batch analysis (all clusters in one API call) ───

export type PhotoCluster = {
  files: File[]
  metadata: { filename: string; taken_at: string; latitude: number | null; longitude: number | null }[]
}

export const analyzePhotosBatch = async (
  clusters: PhotoCluster[]
): Promise<GeminiAnalysis[]> => {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    await new Promise(r => setTimeout(r, 1500))
    return clusters.map(c => generateMockAnalysis(c.files[0].name, c.files.length))
  }

  // Convert all images to base64 BEFORE entering the rate limiter queue
  const allImageParts: { inlineData: { data: string; mimeType: string } }[] = []
  const clusterCounts: number[] = []
  for (const cluster of clusters) {
    const parts = await Promise.all(cluster.files.map(f => fileToGenerativePart(f)))
    allImageParts.push(...parts)
    clusterCounts.push(parts.length)
  }

  return rateLimiter.schedule(async () => {
    try {
      const ai = new GoogleGenerativeAI(apiKey)
      const model = ai.getGenerativeModel({
        model: 'gemini-3.5-flash',
        generationConfig: {
          temperature: 0
        }
      })

      const systemInstruction = `
        You are an AI location and photo analysis engine for outdoor hiking, camping, and wilderness adventures.

        You will receive images from MULTIPLE clusters in a single payload. Each cluster is described in the prompt below.
        For EACH cluster independently:
        1. Classify if this is an "outdoor adventure" image. Exclude: indoor spaces, parking lots, shopping areas, city streets, highways, subways, backyards.
        2. If a cluster has multiple images, choose the SINGLE best "keeper" (0-indexed within that cluster).
           - Dogs (Basenjis): most in-focus, centered, fully visible.
           - Signs: cleanest, sharpest, fully readable text.
           - Landscapes: best exposure, composition, and lighting.
        3. Identify the location of the selected keeper.
        4. Provide description, tags, and confidence.
           - Dog Identification Guide: Identify the Basenjis by name if they appear in the photo:
             - "Frida" is the brindle girl (dark tiger-like stripes on a brown/tan coat).
             - "Zuzu" is the red-and-white girl.
             - When they are visible, refer to them by name in the description and include their names as tags (e.g., "frida", "zuzu").

        Respond ONLY with a valid JSON array — one object per cluster, in the same order as the clusters:
        [
          {
            "is_adventure_photo": boolean,
            "selected_keeper": number,
            "location": string | null,
            "city": string | null,
            "state": string | null,
            "latitude": number | null,
            "longitude": number | null,
            "description": string | null,
            "tags": string[],
            "confidence": "HIGH" | "MEDIUM" | "LOW" | "NONE",
            "reasoning": string
          }
        ]
      `

      // Interleave: label → images → label → images for clear cluster boundaries
      const content: (string | { inlineData: { data: string; mimeType: string } })[] = [systemInstruction]

      let imgOffset = 0
      for (let i = 0; i < clusters.length; i++) {
        content.push(`--- CLUSTER ${i} | Metadata: ${JSON.stringify(clusters[i].metadata)} ---`)
        content.push(...allImageParts.slice(imgOffset, imgOffset + clusterCounts[i]))
        imgOffset += clusterCounts[i]
      }

      content.push(`Analyze all ${clusters.length} cluster(s) above. Return a JSON array with one result per cluster, in order.`)

      let lastError: Error | null = null
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const result = await model.generateContent(content)
          const responseText = result.response.text()
          const tokens = result.response.usageMetadata?.totalTokenCount ?? 0
          rateLimiter.recordTokens(tokens)
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
          return JSON.parse(cleanJson) as GeminiAnalysis[]
        } catch (e: unknown) {
          lastError = e as Error
          const is503 = lastError.message?.includes('503')
          const is429 = lastError.message?.includes('429')
          if (!is503 && !is429) throw new Error(`Gemini API Error: ${lastError.message}`)
          const retryMatch = lastError.message?.match(/retry[^"]*"(\d+)s"/i)
          const wait = retryMatch ? parseInt(retryMatch[1]) * 1000 + 500 : Math.pow(2, attempt + 1) * 1000
          console.warn(`[Gemini Batch] ${is429 ? '429 quota' : '503 overload'}, retry ${attempt + 1}/5 in ${wait / 1000}s...`)
          await new Promise(r => setTimeout(r, wait))
        }
      }
      throw new Error(`Gemini API Error: ${lastError?.message}`)
    } catch (e: unknown) {
      const error = e as Error
      console.error('Gemini batch API execution failed:', e)
      throw new Error(`Gemini API Error: ${error.message}`)
    }
  })
}
