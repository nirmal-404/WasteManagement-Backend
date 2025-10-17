import { NotificationService } from '../services/notification.service'
import Notification from '../models/Notification'

jest.mock('../models/Notification')

const mockNotification = Notification as jest.Mocked<typeof Notification>
const service = new NotificationService()

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMyNotifications', () => {
    it('should throw error if user not authenticated', async () => {
      await expect(service.getMyNotifications('', 20, false)).rejects.toThrow('Not authenticated')
    })

    it('should return notifications and unread count', async () => {
      mockNotification.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([{ _id: 'n1' }])
      } as any)
      mockNotification.countDocuments.mockResolvedValue(5 as any)

      const result = await service.getMyNotifications('user1', 20, false)
      expect(result.notifications.length).toBe(1)
      expect(result.unreadCount).toBe(5)
    })
  })

  describe('markAsRead', () => {
    it('should throw error if user not authenticated', async () => {
      await expect(service.markAsRead('', 'n1')).rejects.toThrow('Not authenticated')
    })

    it('should throw error if notification not found', async () => {
      mockNotification.findOneAndUpdate.mockResolvedValue(null)
      await expect(service.markAsRead('u1', 'nX')).rejects.toThrow('Notification not found')
    })

    it('should mark notification as read', async () => {
      mockNotification.findOneAndUpdate.mockResolvedValue({ _id: 'n1', read: true } as any)
      const result = await service.markAsRead('u1', 'n1')
      expect(result.read).toBe(true)
    })
  })

  describe('markAllAsRead', () => {
    it('should throw error if user not authenticated', async () => {
      await expect(service.markAllAsRead('')).rejects.toThrow('Not authenticated')
    })

    it('should mark all as read successfully', async () => {
      mockNotification.updateMany.mockResolvedValue({} as any)
      const result = await service.markAllAsRead('u1')
      expect(result.message).toBe('All notifications marked as read')
    })
  })

  describe('deleteNotification', () => {
    it('should throw error if user not authenticated', async () => {
      await expect(service.deleteNotification('', 'n1')).rejects.toThrow('Not authenticated')
    })

    it('should throw error if notification not found', async () => {
      mockNotification.findOneAndDelete.mockResolvedValue(null)
      await expect(service.deleteNotification('u1', 'nX')).rejects.toThrow('Notification not found')
    })

    it('should delete notification successfully', async () => {
      mockNotification.findOneAndDelete.mockResolvedValue({ _id: 'n1' } as any)
      const result = await service.deleteNotification('u1', 'n1')
      expect(result.message).toBe('Notification deleted')
    })
  })
})
