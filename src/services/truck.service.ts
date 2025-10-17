import Truck from '../models/Truck'
import User from '../models/User'

export interface TruckData {
  plateNo: string
  capacityKg?: number
  driverId?: string
  active?: boolean
}

export class TruckService {
  /**
   * Create a new truck
   */
  async createTruck(data: TruckData) {
    const { plateNo, capacityKg, driverId } = data

    if (!plateNo) {
      throw new Error('Plate number is required')
    }

    // Ensure unique plate number
    const existing = await Truck.findOne({ plateNo })
    if (existing) {
      throw new Error('Truck with this plate number already exists')
    }

    // Validate driver if provided
    if (driverId) {
      const driver = await User.findById(driverId)
      if (!driver) {
        throw new Error('Invalid driver ID')
      }
    }

    const newTruck = await Truck.create({ plateNo, capacityKg, driverId })
    return newTruck
  }

  /**
   * Get all trucks
   */
  async getAllTrucks() {
    const trucks = await Truck.find()
      .populate('driverId', 'name email phone')
      .sort({ createdAt: -1 })
    return trucks
  }

  /**
   * Get single truck by ID
   */
  async getTruckById(id: string) {
    const truck = await Truck.findById(id).populate('driverId', 'name email phone')
    if (!truck) throw new Error('Truck not found')
    return truck
  }

  /**
   * Update truck details
   */
  async updateTruck(id: string, updates: TruckData) {
    const truck = await Truck.findById(id)
    if (!truck) throw new Error('Truck not found')

    // Handle plate number conflict
    if (updates.plateNo && updates.plateNo !== truck.plateNo) {
      const duplicate = await Truck.findOne({ plateNo: updates.plateNo })
      if (duplicate) throw new Error('Plate number already in use')
    }

    // Validate driver if updated
    if (updates.driverId) {
      const driver = await User.findById(updates.driverId)
      if (!driver) throw new Error('Invalid driver ID')
    }

    truck.plateNo = updates.plateNo ?? truck.plateNo
    truck.capacityKg = updates.capacityKg ?? truck.capacityKg
    truck.driverId = updates.driverId ?? truck.driverId
    if (updates.active !== undefined) truck.active = updates.active

    await truck.save()
    return truck
  }

  /**
   * Soft delete truck (deactivate)
   */
  async softDeleteTruck(id: string) {
    const truck = await Truck.findById(id)
    if (!truck) throw new Error('Truck not found')

    if (!truck.active) throw new Error('Truck already deactivated')

    truck.active = false
    await truck.save()
    return truck
  }
}
