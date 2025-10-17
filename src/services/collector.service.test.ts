import { CollectorService } from '../services/collector.service'
import Route from '../models/Route'
import Bin from '../models/Bin'
import RequestModel from '../models/Request'

jest.mock('../models/Route')
jest.mock('../models/Bin')
jest.mock('../models/Request')

const mockRoute = Route as jest.Mocked<typeof Route>
const mockBin = Bin as jest.Mocked<typeof Bin>
const mockRequestModel = RequestModel as jest.Mocked<typeof RequestModel>

const service = new CollectorService()

describe('CollectorService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getTodaysAssignments', () => {
    it('should return routes for collector', async () => {
      mockRoute.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([{ _id: 'route1' }])
      } as any)

      const routes = await service.getTodaysAssignments({ role: 'COLLECTOR', _id: 'u1' })
      expect(routes).toHaveLength(1)
    })
  })

  describe('getTodaysCollectorRequests', () => {
    it('should throw if user missing', async () => {
      await expect(service.getTodaysCollectorRequests(null as any)).rejects.toThrow('Unauthorized')
    })

    it('should return requests for today', async () => {
      mockRequestModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([{ _id: 'req1' }])
      } as any)

      const requests = await service.getTodaysCollectorRequests({ _id: 'u1' })
      expect(requests[0]._id).toBe('req1')
    })
  })

  describe('scanBin', () => {
    it('should update bin status to Collected', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockBin.findById.mockResolvedValue({
        _id: 'bin1',
        status: 'Ready',
        fillLevel: 100,
        save: saveMock
      } as any)

      const result = await service.scanBin('bin1', 'manual reason')
      expect(result.manual).toBe(true)
      expect(saveMock).toHaveBeenCalled()
    })

    it('should throw if bin not found', async () => {
      mockBin.findById.mockResolvedValue(null)
      await expect(service.scanBin('binX')).rejects.toThrow('Bin not found')
    })
  })

  describe('syncBatch', () => {
    it('should process multiple items successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockBin.findById.mockResolvedValue({
        _id: 'bin1',
        status: 'Ready',
        fillLevel: 100,
        save: saveMock
      } as any)

      const result = await service.syncBatch([{ binId: 'bin1' }])
      expect(result.results[0].success).toBe(true)
    })

    it('should handle not found bins gracefully', async () => {
      mockBin.findById.mockResolvedValue(null)
      const result = await service.syncBatch([{ binId: 'binX' }])
      expect(result.results[0].success).toBe(false)
      expect(result.results[0].reason).toBe('Bin not found')
    })
  })

  describe('updateRouteStatus', () => {
    it('should update route status', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockRoute.findById.mockResolvedValue({ _id: 'r1', save: saveMock } as any)

      const result = await service.updateRouteStatus('r1', 'IN_PROGRESS')
      expect(result._id).toBe('r1')
      expect(saveMock).toHaveBeenCalled()
    })

    it('should throw if route not found', async () => {
      mockRoute.findById.mockResolvedValue(null)
      await expect(service.updateRouteStatus('rX', 'IN_PROGRESS')).rejects.toThrow('Route not found')
    })
  })
})
