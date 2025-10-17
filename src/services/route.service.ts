import Route from '../models/Route'
import Bin from '../models/Bin'
import mongoose from 'mongoose'

export interface Coordinates {
  latitude: number
  longitude: number
}

export class RouteService {
  // === Utility Methods ===

  distance(a: Coordinates, b: Coordinates) {
    const dx = a.latitude - b.latitude
    const dy = a.longitude - b.longitude
    return Math.sqrt(dx * dx + dy * dy)
  }

  getOptimizedPath(start: Coordinates, bins: Coordinates[]): Coordinates[] {
    const path: Coordinates[] = []
    let current = start
    const remaining = [...bins]

    while (remaining.length > 0) {
      remaining.sort(
        (a, b) => this.distance(current, a) - this.distance(current, b)
      )
      const next = remaining.shift()!
      path.push(next)
      current = next
    }

    return path
  }

  extractCoordinatesFromUrl(url: string): Coordinates | null {
    const regex =
      /@(-?\d+\.\d+),(-?\d+\.\d+)|q=(-?\d+\.\d+),(-?\d+\.\d+)|place\/(-?\d+\.\d+),(-?\d+\.\d+)/
    const match = url.match(regex)

    if (!match) return null

    const latStr = match[1] ?? match[3] ?? match[5]
    const lngStr = match[2] ?? match[4] ?? match[6]

    if (typeof latStr === 'undefined' || typeof lngStr === 'undefined') return null

    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)

    if (isNaN(lat) || isNaN(lng)) return null

    return { latitude: lat, longitude: lng }
  }

  generateDirectionsUrl(startLocation?: Coordinates, optimizedPath?: Coordinates[]): string {
    if (!startLocation || !optimizedPath || optimizedPath.length === 0) return ''
    const waypoints = [startLocation, ...optimizedPath]
    const coordinates = waypoints.map((p) => `${p.latitude},${p.longitude}`).join('/')
    return `https://www.google.com/maps/dir/${coordinates}`
  }

  // === Core Business Logic ===

  async createRoute(routeName: string | undefined, mapUrl: string) {
    if (!mapUrl) throw new Error('mapUrl is required')

    const startLocation = this.extractCoordinatesFromUrl(mapUrl)
    if (!startLocation) throw new Error('Invalid Google Maps URL')

    const bins = await Bin.find({ fillLevel: { $gte: 90 }, status: 'Ready' })
    if (!bins.length) throw new Error('No bins ready for collection')

    const binCoords = bins.map((bin) => bin.location)
    const optimizedPath = this.getOptimizedPath(startLocation, binCoords)

    const route = await Route.create({
      routeName,
      assignedBins: bins.map((bin) => bin._id),
      optimizedPath,
      status: 'Pending',
      startLocation,
    })

    const directionsUrl = this.generateDirectionsUrl(startLocation, optimizedPath)
    return { ...route.toObject(), directionsUrl }
  }

  async getAllRoutes() {
    const routes = await Route.find().populate('assignedBins')
    return routes.map((route: any) => {
      const start = route.startLocation || route.optimizedPath?.[0]
      const directionsUrl =
        start && route.optimizedPath
          ? this.generateDirectionsUrl(start, route.optimizedPath)
          : ''
      return { ...route.toObject(), directionsUrl }
    })
  }

  async getRouteById(id: string) {
    const route = await Route.findById(id).populate('assignedBins')
    if (!route) throw new Error('Route not found')

    const start = (route as any).startLocation || route.optimizedPath?.[0]
    const directionsUrl =
      start && route.optimizedPath
        ? this.generateDirectionsUrl(start, route.optimizedPath)
        : ''

    return { ...route.toObject(), directionsUrl }
  }

  async updateRoute(
    id: string,
    data: {
      routeName?: string
      assignedBins?: string[]
      status?: string
      mapUrl?: string
    }
  ) {
    const route = await Route.findById(id)
    if (!route) throw new Error('Route not found')

    if (data.routeName) route.routeName = data.routeName
    if (data.status) route.status = data.status as any

    if (data.assignedBins) {
      route.assignedBins = data.assignedBins.map(
        (id) => new mongoose.Types.ObjectId(id)
      )
    }

    let startLocation = (route as any).startLocation

    if (data.mapUrl) {
      const extracted = this.extractCoordinatesFromUrl(data.mapUrl)
      if (!extracted) throw new Error('Invalid mapUrl')
      startLocation = extracted
      ;(route as any).startLocation = startLocation
    }

    if ((data.mapUrl || data.assignedBins) && route.assignedBins.length > 0) {
      const binsData = await Bin.find({ _id: { $in: route.assignedBins } })
      const binCoords = binsData.map((bin) => bin.location)
      route.optimizedPath = this.getOptimizedPath(startLocation, binCoords)
    }

    await route.save()

    const directionsUrl = this.generateDirectionsUrl(startLocation, route.optimizedPath)
    return { ...route.toObject(), directionsUrl }
  }

  async deleteRoute(id: string) {
    const deleted = await Route.findByIdAndDelete(id)
    if (!deleted) throw new Error('Route not found')
    return { message: 'Route deleted successfully' }
  }
}
