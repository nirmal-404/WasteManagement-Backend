import { RouteService } from '../services/route.service'
import Route from '../models/Route'
import Bin from '../models/Bin'

jest.mock('../models/Route')
jest.mock('../models/Bin')

const mockRoute = Route as jest.Mocked<typeof Route>
const mockBin = Bin as jest.Mocked<typeof Bin>
const service = new RouteService()

describe('RouteService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('extractCoordinatesFromUrl', () => {
    it('should extract coordinates correctly', () => {
      const coords = service.extractCoordinatesFromUrl('https://maps.google.com/@6.9,79.8')
      expect(coords).toEqual({ latitude: 6.9, longitude: 79.8 })
    })

    it('should return null for invalid URL', () => {
      const coords = service.extractCoordinatesFromUrl('invalid-url')
      expect(coords).toBeNull()
    })
  })

  describe('getOptimizedPath', () => {
    it('should return shortest path', () => {
      const start = { latitude: 0, longitude: 0 }
      const bins = [{ latitude: 2, longitude: 2 }, { latitude: 1, longitude: 1 }]
      const result = service.getOptimizedPath(start, bins)
      expect(result[0]).toEqual({ latitude: 1, longitude: 1 })
    })
  })

  describe('generateDirectionsUrl', () => {
    it('should return Google Maps directions URL', () => {
      const url = service.generateDirectionsUrl(
        { latitude: 6.9, longitude: 79.8 },
        [{ latitude: 7.0, longitude: 80.0 }]
      )
      expect(url).toContain('https://www.google.com/maps/dir/')
    })
  })

  describe('createRoute', () => {
    it('should throw error if no mapUrl', async () => {
      await expect(service.createRoute('Route 1', '')).rejects.toThrow('mapUrl is required')
    })

    it('should throw error if no bins ready', async () => {
      mockBin.find.mockResolvedValue([])
      await expect(
        service.createRoute('Route 1', 'https://maps.google.com/@6.9,79.8')
      ).rejects.toThrow('No bins ready for collection')
    })

    it('should create route successfully', async () => {
      mockBin.find.mockResolvedValue([
        { _id: 'b1', location: { latitude: 6.9, longitude: 79.8 } },
      ] as any)
      mockRoute.create.mockResolvedValue({
        toObject: () => ({ _id: 'r1', routeName: 'Route 1' }),
      } as any)

      const result = await service.createRoute('Route 1', 'https://maps.google.com/@6.9,79.8')
      expect(result._id).toBe('r1')
      expect(mockRoute.create).toHaveBeenCalled()
    })
  })

  describe('getAllRoutes', () => {
    it('should return routes with directions', async () => {
      const populateMock = jest.fn().mockResolvedValue([
        {
          toObject: () => ({ _id: 'r1', optimizedPath: [{ latitude: 1, longitude: 1 }] }),
          startLocation: { latitude: 0, longitude: 0 },
        },
      ])
      mockRoute.find.mockReturnValue({ populate: populateMock } as any)

      const result = await service.getAllRoutes()
      expect(result[0]._id).toBe('r1')
    })
  })

  describe('getRouteById', () => {
    it('should throw error if not found', async () => {
      const queryMock = { populate: jest.fn().mockResolvedValue(null) }
      mockRoute.findById.mockReturnValue(queryMock as any)

      await expect(service.getRouteById('invalid')).rejects.toThrow('Route not found')
    })
  })

  describe('updateRoute', () => {
    it('should throw if route not found', async () => {
      mockRoute.findById.mockResolvedValue(null)
      await expect(service.updateRoute('id', {})).rejects.toThrow('Route not found')
    })

    it('should update route successfully', async () => {
      mockRoute.findById.mockResolvedValue({
        save: jest.fn().mockResolvedValue({}),
        assignedBins: [],
        toObject: jest.fn().mockReturnValue({ _id: 'id', routeName: 'Updated' }),
      } as any)

      const result = await service.updateRoute('id', { routeName: 'Updated' })
      expect(result.directionsUrl).toBeDefined()
    })
  })

  describe('deleteRoute', () => {
    it('should throw if route not found', async () => {
      mockRoute.findByIdAndDelete.mockResolvedValue(null)
      await expect(service.deleteRoute('invalid')).rejects.toThrow('Route not found')
    })

    it('should delete route successfully', async () => {
      mockRoute.findByIdAndDelete.mockResolvedValue({} as any)
      const result = await service.deleteRoute('id')
      expect(result.message).toBe('Route deleted successfully')
    })
  })
})
