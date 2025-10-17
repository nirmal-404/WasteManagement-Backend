import { TruckService } from '../services/truck.service'
import Truck from '../models/Truck'
import User from '../models/User'

jest.mock('../models/Truck')
jest.mock('../models/User')

const mockTruck = Truck as jest.Mocked<typeof Truck>
const mockUser = User as jest.Mocked<typeof User>
const service = new TruckService()

describe('TruckService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createTruck', () => {
    it('should throw error if plateNo missing', async () => {
      await expect(service.createTruck({ plateNo: '' } as any)).rejects.toThrow(
        'Plate number is required'
      )
    })

    it('should throw error if plateNo already exists', async () => {
      mockTruck.findOne.mockResolvedValue({ _id: 't1' } as any)
      await expect(service.createTruck({ plateNo: 'ABC123' })).rejects.toThrow(
        'Truck with this plate number already exists'
      )
    })

    it('should throw error if driver ID invalid', async () => {
      mockTruck.findOne.mockResolvedValue(null)
      mockUser.findById.mockResolvedValue(null)
      await expect(service.createTruck({ plateNo: 'ABC123', driverId: 'd1' })).rejects.toThrow(
        'Invalid driver ID'
      )
    })

    it('should create truck successfully', async () => {
      mockTruck.findOne.mockResolvedValue(null)
      mockUser.findById.mockResolvedValue({ _id: 'd1' } as any)
      mockTruck.create.mockResolvedValue({ _id: 't1', plateNo: 'ABC123' } as any)

      const result = await service.createTruck({ plateNo: 'ABC123', driverId: 'd1' })
      expect(result._id).toBe('t1')
    })
  })

  describe('getAllTrucks', () => {
    it('should return list of trucks', async () => {
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([{ _id: 't1' }]),
      }
      mockTruck.find.mockReturnValue(queryMock as any)

      const result = await service.getAllTrucks()
      expect(result[0]._id).toBe('t1')
      expect(queryMock.populate).toHaveBeenCalled()
    })
  })

  describe('getTruckById', () => {
    it('should throw error if not found', async () => {
      const queryMock = { populate: jest.fn().mockResolvedValue(null) }
      mockTruck.findById.mockReturnValue(queryMock as any)

      await expect(service.getTruckById('x')).rejects.toThrow('Truck not found')
    })

    it('should return truck if found', async () => {
      const queryMock = { populate: jest.fn().mockResolvedValue({ _id: 't1' }) }
      mockTruck.findById.mockReturnValue(queryMock as any)

      const result = await service.getTruckById('t1')
      expect(result._id).toBe('t1')
    })
  })

  describe('updateTruck', () => {
    it('should throw error if truck not found', async () => {
      mockTruck.findById.mockResolvedValue(null)
      await expect(service.updateTruck('id', {} as any)).rejects.toThrow('Truck not found')
    })

    it('should throw error if duplicate plate', async () => {
      mockTruck.findById.mockResolvedValue({ plateNo: 'OLD' } as any)
      mockTruck.findOne.mockResolvedValue({ _id: 't2' } as any)

      await expect(service.updateTruck('id', { plateNo: 'NEW' })).rejects.toThrow(
        'Plate number already in use'
      )
    })

    it('should throw error if invalid driver ID', async () => {
      mockTruck.findById.mockResolvedValue({ plateNo: 'OLD' } as any)
      mockTruck.findOne.mockResolvedValue(null)
      mockUser.findById.mockResolvedValue(null)

      await expect(service.updateTruck('id', { driverId: 'invalid' })).rejects.toThrow(
        'Invalid driver ID'
      )
    })

    it('should update truck successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockTruck.findById.mockResolvedValue({
        _id: 't1',
        plateNo: 'OLD',
        save: saveMock,
      } as any)
      mockTruck.findOne.mockResolvedValue(null)
      mockUser.findById.mockResolvedValue({ _id: 'd1' } as any)

      const result = await service.updateTruck('t1', { plateNo: 'NEW', driverId: 'd1' })
      expect(result._id).toBe('t1')
      expect(saveMock).toHaveBeenCalled()
    })
  })

  describe('softDeleteTruck', () => {
    it('should throw error if truck not found', async () => {
      mockTruck.findById.mockResolvedValue(null)
      await expect(service.softDeleteTruck('id')).rejects.toThrow('Truck not found')
    })

    it('should throw error if already deactivated', async () => {
      mockTruck.findById.mockResolvedValue({ active: false } as any)
      await expect(service.softDeleteTruck('id')).rejects.toThrow('Truck already deactivated')
    })

    it('should deactivate truck successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockTruck.findById.mockResolvedValue({ active: true, save: saveMock } as any)

      const result = await service.softDeleteTruck('t1')
      expect(result.active).toBe(false)
      expect(saveMock).toHaveBeenCalled()
    })
  })
})
