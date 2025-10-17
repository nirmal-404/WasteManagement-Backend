import Route from '../models/Route'
import Bin from '../models/Bin'
import RequestModel from '../models/Request'

export class CollectorService {
  async getTodaysAssignments(user: any) {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const end = new Date(start)
    end.setDate(start.getDate() + 1)

    const query: any = {
      status: { $in: ['PLANNED', 'IN_PROGRESS'] },
      scheduledDate: { $gte: start, $lt: end }
    }

    // Filter based on role
    if (user.role === 'COLLECTOR') {
      query.assignedCollectors = user._id
    } else if (user.role === 'DRIVER') {
      query.assignedDriverId = user._id
    }

    const routes = await Route.find(query)
      .populate('assignedDriverId', 'name phone')
      .populate('assignedTruckId', 'plateNo capacityKg')
      .populate('assignedCollectors', 'name phone')
      .sort({ scheduledDate: 1 })

    return routes
  }

  async getTodaysCollectorRequests(user: any) {
    if (!user) throw new Error('Unauthorized')

    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const end = new Date(start)
    end.setDate(start.getDate() + 1)

    const query = {
      'assigned.collectors': user._id,
      scheduledAt: { $gte: start, $lt: end },
      status: { $in: ['SCHEDULED', 'IN_PROGRESS'] }
    }

    return RequestModel.find(query)
      .populate('userId', 'name email phone address')
      .populate('assigned.driverId', 'name phone')
      .populate('assigned.vehicleId', 'plateNo capacityKg')
      .populate('assigned.collectors', 'name phone')
      .populate('assigned.routeId', 'routeName scheduledDate')
      .sort({ scheduledAt: 1 })
  }

  async scanBin(binId: string, manualReason?: string, weightKg?: number, notes?: string) {
    const bin = await Bin.findById(binId)
    if (!bin) throw new Error('Bin not found')

    bin.status = 'Collected'
    bin.fillLevel = 0
    await bin.save()

    return {
      message: 'Bin collected successfully',
      manual: Boolean(manualReason),
      binId: bin._id,
      collectedAt: new Date()
    }
  }

  async syncBatch(items: Array<{ binId: string }>) {
    if (!Array.isArray(items)) throw new Error('Items must be an array')

    const results: Array<{ binId: string; success: boolean; reason?: string }> = []

    for (const item of items) {
      try {
        const bin = await Bin.findById(item.binId)
        if (!bin) {
          results.push({ binId: item.binId, success: false, reason: 'Bin not found' })
          continue
        }

        bin.status = 'Collected'
        bin.fillLevel = 0
        await bin.save()

        results.push({ binId: bin._id.toString(), success: true })
      } catch (e) {
        results.push({ binId: item.binId, success: false, reason: 'Processing error' })
      }
    }

    return {
      message: `Processed ${results.length} items`,
      count: results.length,
      results
    }
  }

  async updateRouteStatus(routeId: string, status: string, actualStartTime?: Date, actualEndTime?: Date) {
    const route = await Route.findById(routeId)
    if (!route) throw new Error('Route not found')

    route.status = status
    if (actualStartTime) (route as any).actualStartTime = actualStartTime
    if (actualEndTime) (route as any).actualEndTime = actualEndTime

    await route.save()
    return route
  }
}
