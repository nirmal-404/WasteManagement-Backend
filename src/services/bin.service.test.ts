import { BinService, extractCoordinates } from '../services/bin.service'
import Bin from '../models/Bin'

jest.mock('../models/Bin')

const mockBinModel = Bin as jest.Mocked<typeof Bin>
const service = new BinService()

describe('BinService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('extractCoordinates', () => {
    it('should extract coordinates from valid URL', () => {
      const url = 'https://www.google.com/maps/place/@6.9271,79.8612'
      const result = extractCoordinates(url)
      expect(result).toEqual({ latitude: 6.9271, longitude: 79.8612 })
    })

    it('should throw error for invalid URL', () => {
      expect(() => extractCoordinates('invalid-url')).toThrow('Invalid Google Maps URL')
    })
  })

  describe('createBin', () => {
    it('should create a bin successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue({
        _id: 'bin1',
        wasteType: 'Plastic'
      })

      mockBinModel.mockImplementationOnce(() => ({
        save: saveMock
      }) as any)

      const bin = await service.createBin({
        wasteType: 'Plastic',
        locationUrl: 'https://maps.google.com/@6.9,79.8',
        locationName: 'Main St',
        userId: 'user1'
      })

      expect(bin).toBeDefined()
      expect(saveMock).toHaveBeenCalled()
    })

    it('should throw error for missing fields', async () => {
      await expect(
        service.createBin({
          wasteType: '',
          locationUrl: '',
          locationName: '',
          userId: ''
        } as any)
      ).rejects.toThrow('Missing required fields')
    })
  })

  describe('getAllBins', () => {
    it('should return all bins', async () => {
      mockBinModel.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) } as any)
      const bins = await service.getAllBins()
      expect(bins).toEqual([])
    })
  })

  describe('getBinsByUser', () => {
    it('should throw if userId missing', async () => {
      await expect(service.getBinsByUser('')).rejects.toThrow('User ID is required')
    })

    it('should return bins by user', async () => {
      mockBinModel.find.mockResolvedValue([{ _id: 'bin1' }] as any)
      const bins = await service.getBinsByUser('user1')
      expect(bins).toHaveLength(1)
    })
  })

  describe('updateBin', () => {
    it('should update and return bin', async () => {
      mockBinModel.findByIdAndUpdate.mockResolvedValue({ _id: 'bin1', fillLevel: 50 } as any)
      const updated = await service.updateBin('bin1', { fillLevel: 50 })
      expect(updated).toBeDefined()
      expect(mockBinModel.findByIdAndUpdate).toHaveBeenCalled()
    })

    it('should throw if bin not found', async () => {
      mockBinModel.findByIdAndUpdate.mockResolvedValue(null)
      await expect(service.updateBin('bin1', { fillLevel: 10 })).rejects.toThrow('Bin not found')
    })
  })

  describe('deleteBin', () => {
    it('should delete bin', async () => {
      mockBinModel.findByIdAndDelete.mockResolvedValue({ _id: 'bin1' } as any)
      const result = await service.deleteBin('bin1')
      expect(result._id).toBe('bin1')
    })

    it('should throw if not found', async () => {
      mockBinModel.findByIdAndDelete.mockResolvedValue(null)
      await expect(service.deleteBin('x')).rejects.toThrow('Bin not found')
    })
  })

  describe('collectBin', () => {
    it('should update bin to collected', async () => {
      mockBinModel.findByIdAndUpdate.mockResolvedValue({ _id: 'bin1', status: 'Collected' } as any)
      const result = await service.collectBin('bin1')
      expect(result.status).toBe('Collected')
    })
  })

  describe('cancelBin', () => {
    it('should cancel bin', async () => {
      mockBinModel.findByIdAndUpdate.mockResolvedValue({ _id: 'bin1', status: 'Canceled' } as any)
      const result = await service.cancelBin('bin1')
      expect(result.status).toBe('Canceled')
    })
  })
})
