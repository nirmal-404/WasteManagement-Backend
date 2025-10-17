import Notification from '../models/Notification'

export class NotificationService {
  async getMyNotifications(userId: string, limit = 20, unreadOnly = false) {
    if (!userId) throw new Error('Not authenticated')

    const query: any = { userId }
    if (unreadOnly) query.read = false

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('requestId', 'requestId status')

    const unreadCount = await Notification.countDocuments({
      userId,
      read: false
    })

    return { notifications, unreadCount }
  }

  async markAsRead(userId: string, notificationId: string) {
    if (!userId) throw new Error('Not authenticated')

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    )

    if (!notification) throw new Error('Notification not found')
    return notification
  }

  async markAllAsRead(userId: string) {
    if (!userId) throw new Error('Not authenticated')

    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    )

    return { message: 'All notifications marked as read' }
  }

  async deleteNotification(userId: string, notificationId: string) {
    if (!userId) throw new Error('Not authenticated')

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    })

    if (!notification) throw new Error('Notification not found')

    return { message: 'Notification deleted' }
  }
}
