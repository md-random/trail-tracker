import { shallowRef, watch, nextTick, type Ref } from 'vue'
import L from 'leaflet'
import type { Photo, UseMapOptions } from '@/types'

const applyJitter = (photoList: Photo[], zoom: number): Photo[] => {
  if (zoom < 15) return photoList

  // Group photos by exact coordinates
  const groups = new Map<string, Photo[]>()
  photoList.forEach(photo => {
    if (photo.latitude == null || photo.longitude == null) return
    const key = `${photo.latitude.toFixed(6)}_${photo.longitude.toFixed(6)}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(photo)
  })

  const result: Photo[] = []
  photoList.forEach(photo => {
    if (photo.latitude == null || photo.longitude == null) return
    const key = `${photo.latitude.toFixed(6)}_${photo.longitude.toFixed(6)}`
    const group = groups.get(key)!
    if (group.length <= 1) {
      result.push(photo)
    } else {
      const idx = group.indexOf(photo)
      const angle = (2 * Math.PI * idx) / group.length
      // Constant screen pixel distance: 24 pixels scaled by zoom factor
      const radius = 24 / Math.pow(2, zoom)

      result.push({
        ...photo,
        latitude: photo.latitude + radius * Math.cos(angle),
        longitude: photo.longitude + radius * Math.sin(angle)
      })
    }
  })

  return [
    ...result,
    ...photoList.filter(p => p.latitude == null || p.longitude == null)
  ]
}

interface ClusterResult {
  latitude: number
  longitude: number
  count: number
  photo: Photo
}

export const useMap = (
  containerId: string,
  photos: Ref<Photo[]>,
  options: UseMapOptions = {}
) => {
  const map = shallowRef<L.Map | null>(null)
  const markers = shallowRef<L.Marker[]>([])

  const computeClusters = (photoList: Photo[]): ClusterResult[] => {
    const clusters: ClusterResult[] = []
    const zoom = map.value ? map.value.getZoom() : 5
    const thresholdDistance = 15 / Math.pow(2, zoom)

    photoList.forEach(photo => {
      if (!photo.latitude || !photo.longitude) return

      let addedToCluster = false
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i]
        const latDiff = Math.abs(cluster.latitude - photo.latitude)
        const lngDiff = Math.abs(cluster.longitude - photo.longitude)

        if (latDiff < thresholdDistance && lngDiff < thresholdDistance) {
          cluster.latitude = (cluster.latitude * cluster.count + photo.latitude) / (cluster.count + 1)
          cluster.longitude = (cluster.longitude * cluster.count + photo.longitude) / (cluster.count + 1)
          cluster.count++
          addedToCluster = true
          break
        }
      }

      if (!addedToCluster) {
        clusters.push({
          latitude: photo.latitude,
          longitude: photo.longitude,
          count: 1,
          photo
        })
      }
    })

    return clusters
  }

  const drawMarkers = (): void => {
    if (!map.value) return

    // Clear existing markers
    markers.value.forEach(m => map.value!.removeLayer(m))
    markers.value = []

    const zoom = map.value.getZoom()
    const jitteredPhotos = applyJitter(photos.value, zoom)

    const clusteredPoints = computeClusters(jitteredPhotos)

    clusteredPoints.forEach(cluster => {
      if (cluster.count > 1) {
        // Cluster marker
        const clusterIcon = L.divIcon({
          className: 'custom-cluster-marker',
          html: `
            <div class="cluster-badge">
              <span>${cluster.count}</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })

        const marker = L.marker([cluster.latitude, cluster.longitude], { icon: clusterIcon })
          .addTo(map.value!)
          .on('click', () => {
            map.value!.setView([cluster.latitude, cluster.longitude], map.value!.getZoom() + 2)
          })

        markers.value.push(marker)
      } else {
        // Single marker
        const photo = cluster.photo
        if (!photo.latitude || !photo.longitude) return

        const markerIcon = L.divIcon({
          className: 'custom-single-marker',
          html: `
            <div class="tent-pin-wrapper">
              <span class="tent-emoji">⛺</span>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })

        const isAdmin = options.isAdmin?.value ?? false

        const marker = L.marker([photo.latitude, photo.longitude], {
          draggable: isAdmin,
          icon: markerIcon
        }).addTo(map.value!)

        marker.on('click', () => {
          options.onMarkerClick?.(photo)
        })

        marker.on('dragend', () => {
          const position = marker.getLatLng()
          options.onMarkerDrag?.(
            photo,
            parseFloat(position.lat.toFixed(6)),
            parseFloat(position.lng.toFixed(6))
          )
        })

        markers.value.push(marker)
      }
    })
  }

  const init = (): void => {
    const mapEl = document.getElementById(containerId)
    if (!mapEl) return

    if (map.value) {
      map.value.invalidateSize()
      return
    }

    const center = options.center ?? [39.3120, -105.6450] as [number, number]
    const zoom = options.zoom ?? 5

    // Define tile layers
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    })

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    })

    const topoLayer = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      attribution: 'Tiles courtesy of the U.S. Geological Survey'
    })

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    })

    const positronLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    })

    map.value = L.map(containerId, {
      center,
      zoom,
      layers: [streetLayer]
    })

    const hikingTrailsLayer = L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
      attribution: '© Waymarked Trails',
      maxZoom: 18,
      opacity: 0.7
    })

    const topoWithTrails = L.layerGroup([topoLayer, hikingTrailsLayer])

    const baseMaps: Record<string, L.TileLayer | L.LayerGroup> = {
      '🛣️ Streets': streetLayer,
      '☀️ Carto Positron': positronLayer,
      '🏔️ Topographic': topoLayer,
      '🌑 Dark Matter': darkLayer,
      '📡 Satellite': satelliteLayer,
      '🥾 Waymarked Trails': topoWithTrails
    }

    L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map.value)

    // Add scale control showing imperial units (miles/feet)
    L.control.scale({
      position: 'bottomleft',
      imperial: true,
      metric: false // Set to false to prioritize imperial; can be set to true to show both
    }).addTo(map.value)

    map.value.on('zoomend', () => {
      drawMarkers()
    })

    map.value.on('click', (e: L.LeafletMouseEvent) => {
      options.onMapClick?.(
        parseFloat(e.latlng.lat.toFixed(6)),
        parseFloat(e.latlng.lng.toFixed(6))
      )
    })

    drawMarkers()
  }

  const panTo = (lat: number, lng: number): void => {
    map.value?.panTo([lat, lng])
  }

  const destroy = (): void => {
    if (map.value) {
      map.value.remove()
      map.value = null
    }
  }

  // Watch photos → redraw
  watch(photos, () => {
    nextTick(() => drawMarkers())
  }, { deep: true })

  // Watch admin mode → redraw with/without draggable
  if (options.isAdmin) {
    watch(options.isAdmin, () => {
      drawMarkers()
    })
  }

  return { map, markers, init, drawMarkers, panTo, destroy }
}
