import { UserService } from '../services/user.service'
import User from '../models/User'

jest.mock('../models/User')
const mockUser = User as jest.Mocked<typeof User>
const service = new UserService()

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: 'u1' }])
      }
      mockUser.find.mockReturnValue(queryMock as any)
      mockUser.countDocuments.mockResolvedValue(1)

      const result = await service.getAllUsers({ page: 1, limit: 10 })
      expect(result.users[0]._id).toBe('u1')
      expect(result.pagination.total).toBe(1)
    })
  })

  describe('getUserById', () => {
    it('should throw if user not found', async () => {
      const queryMock = { select: jest.fn().mockResolvedValue(null) }
      mockUser.findById.mockReturnValue(queryMock as any)
      await expect(service.getUserById('invalid')).rejects.toThrow('User not found')
    })

    it('should return user if found', async () => {
      const queryMock = { select: jest.fn().mockResolvedValue({ _id: 'u1' }) }
      mockUser.findById.mockReturnValue(queryMock as any)
      const result = await service.getUserById('u1')
      expect(result._id).toBe('u1')
    })
  })

  describe('changeRole', () => {
    it('should throw if user not found', async () => {
      mockUser.findById.mockResolvedValue(null)
      await expect(service.changeRole('id', 'ADMIN', 'x')).rejects.toThrow('User not found')
    })

    it('should throw if acting on own account', async () => {
      mockUser.findById.mockResolvedValue({ _id: 'me' } as any)
      await expect(service.changeRole('me', 'ADMIN', 'me')).rejects.toThrow('Cannot change your own role')
    })

    it('should change role successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockUser.findById.mockResolvedValue({
        _id: 'u1',
        role: 'RESIDENT',
        name: 'John',
        email: 'john@example.com',
        save: saveMock
      } as any)

      const result = await service.changeRole('u1', 'ADMIN', 'admin')
      expect(result.user.role).toBe('ADMIN')
      expect(saveMock).toHaveBeenCalled()
    })
  })

  describe('disableUser', () => {
    it('should throw if not found', async () => {
      mockUser.findById.mockResolvedValue(null)
      await expect(service.disableUser('id', 'me')).rejects.toThrow('User not found')
    })

    it('should throw if trying to disable own account', async () => {
      mockUser.findById.mockResolvedValue({ _id: 'me' } as any)
      await expect(service.disableUser('me', 'me')).rejects.toThrow('Cannot disable your own account')
    })

    it('should disable user successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockUser.findById.mockResolvedValue({ _id: 'u1', save: saveMock } as any)
      const result = await service.disableUser('u1', 'admin')
      expect(result.isActive).toBe(false)
      expect(saveMock).toHaveBeenCalled()
    })
  })

  describe('activateUser', () => {
    it('should throw if not found', async () => {
      mockUser.findById.mockResolvedValue(null)
      await expect(service.activateUser('id')).rejects.toThrow('User not found')
    })

    it('should activate user', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockUser.findById.mockResolvedValue({ _id: 'u1', save: saveMock } as any)
      const result = await service.activateUser('u1')
      expect(result.isActive).toBe(true)
    })
  })

  describe('removeUser', () => {
    it('should throw if not found', async () => {
      mockUser.findById.mockResolvedValue(null)
      await expect(service.removeUser('id', 'me')).rejects.toThrow('User not found')
    })

    it('should throw if trying to delete own account', async () => {
      mockUser.findById.mockResolvedValue({ _id: 'me' } as any)
      await expect(service.removeUser('me', 'me')).rejects.toThrow('Cannot delete your own account')
    })

    it('should remove user successfully', async () => {
      mockUser.findById.mockResolvedValue({ _id: 'u1' } as any)
      mockUser.findByIdAndDelete.mockResolvedValue({} as any)
      const result = await service.removeUser('u1', 'admin')
      expect(result.message).toBe('User removed successfully')
    })
  })

  describe('getUserStats', () => {
    it('should return stats', async () => {
      mockUser.aggregate.mockResolvedValue([{ _id: 'ADMIN', count: 2, active: 2 }] as any)
      mockUser.countDocuments.mockResolvedValueOnce(10)
      mockUser.countDocuments.mockResolvedValueOnce(8)
      const result = await service.getUserStats()
      expect(result.totalUsers).toBe(10)
      expect(result.activeUsers).toBe(8)
      expect(result.inactiveUsers).toBe(2)
    })
  })
})
