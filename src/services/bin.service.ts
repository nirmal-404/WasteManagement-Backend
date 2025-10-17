import Bin from '../models/Bin'
import { logger } from '../config/logger'

export interface BinPayload {
  wasteType: string
  locationUrl: string
  locationName: string
  userId: string
  fillLevel?: number
  weight?: number
  status?: string
}

/**
 * Extract coordinates from a standard Google Maps URL
 */
export const extractCoordinates = (
  url: string
): { latitude: number; longitude: number } => {
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (!match || match.length < 3) {
    throw new Error(
      'Invalid Google Maps URL format. Please use a standard Google Maps URL with coordinates.'
    )
  }

  const latitude = parseFloat(match[1]!)
  const longitude = parseFloat(match[2]!)
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Invalid coordinates in URL')
  }

  return { latitude, longitude }
}

export class BinService {
  async createBin(data: BinPayload) {
    if (!data.wasteType || !data.locationUrl || !data.userId || !data.locationName) {
      throw new Error('Missing required fields: wasteType, locationUrl, locationName, or userId')
    }

    const location = extractCoordinates(data.locationUrl)

    const bin = new Bin({
      wasteType: data.wasteType,
      location,
      locationName: data.locationName,
      status: 'Pending',
      userId: data.userId
    })

    await bin.save()
    return bin
  }

  async getAllBins() {
    return Bin.find().populate('userId', 'name email')
  }

  async getBinsByUser(userId: string) {
    if (!userId) throw new Error('User ID is required')
    return Bin.find({ userId })
  }

  async updateBin(
    id: string,
    updates: Partial<BinPayload> & { fillLevel?: number; weight?: number }
  ) {
    const updateData: Record<string, any> = {}

    if (updates.wasteType) updateData.wasteType = updates.wasteType
    if (updates.locationUrl) updateData.location = extractCoordinates(updates.locationUrl)
    if (updates.locationName) updateData.locationName = updates.locationName
    if (updates.status) updateData.status = updates.status
    if (updates.fillLevel !== undefined) updateData.fillLevel = updates.fillLevel
    if (updates.weight !== undefined) updateData.weight = updates.weight

    if (updates.fillLevel !== undefined) {
      updateData.status = updates.fillLevel >= 90 ? 'Ready' : 'Pending'
    }

    const updatedBin = await Bin.findByIdAndUpdate(id, updateData, { new: true })
    if (!updatedBin) throw new Error('Bin not found')

    logger.info('Bin updated successfully')
    return updatedBin
  }

  async deleteBin(id: string) {
    const deletedBin = await Bin.findByIdAndDelete(id)
    if (!deletedBin) throw new Error('Bin not found')
    logger.info('Bin deleted successfully')
    return deletedBin
  }

  async collectBin(id: string) {
    const updatedBin = await Bin.findByIdAndUpdate(
      id,
      { status: 'Collected', fillLevel: 0 },
      { new: true }
    )
    if (!updatedBin) throw new Error('Bin not found')
    logger.info('Bin collected successfully')
    return updatedBin
  }

  async cancelBin(id: string) {
    const updatedBin = await Bin.findByIdAndUpdate(
      id,
      { status: 'Canceled' },
      { new: true }
    )
    if (!updatedBin) throw new Error('Bin not found')
    logger.info('Bin canceled successfully')
    return updatedBin
  }
}
