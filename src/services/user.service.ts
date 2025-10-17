import User from '../models/User'

export interface UserQueryParams {
  role?: string
  status?: 'active' | 'inactive'
  zone?: string
  search?: string
  page?: number
  limit?: number
}

export class UserService {
  async getAllUsers(params: UserQueryParams) {
    const {
      role,
      status,
      zone,
      search,
      page = 1,
      limit = 20
    } = params
    const skip = (page - 1) * limit

    const query: any = {}
    if (role) query.role = role
    if (status) query.isActive = status === 'active'
    if (zone) query.zone = zone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await User.countDocuments(query)

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  async getUserById(id: string) {
    const user = await User.findById(id).select('-password')
    if (!user) throw new Error('User not found')
    return user
  }

  async changeRole(targetUserId: string, newRole: string, actingUserId: string) {
    const user = await User.findById(targetUserId)
    if (!user) throw new Error('User not found')
    if (user._id.toString() === actingUserId) throw new Error('Cannot change your own role')

    const oldRole = user.role
    user.role = newRole
    await user.save()

    return {
      message: 'User role updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        oldRole
      }
    }
  }

  async disableUser(targetUserId: string, actingUserId: string) {
    const user = await User.findById(targetUserId)
    if (!user) throw new Error('User not found')
    if (user._id.toString() === actingUserId) throw new Error('Cannot disable your own account')

    user.isActive = false
    await user.save()
    return user
  }

  async activateUser(targetUserId: string) {
    const user = await User.findById(targetUserId)
    if (!user) throw new Error('User not found')

    user.isActive = true
    await user.save()
    return user
  }

  async removeUser(targetUserId: string, actingUserId: string) {
    const user = await User.findById(targetUserId)
    if (!user) throw new Error('User not found')
    if (user._id.toString() === actingUserId) throw new Error('Cannot delete your own account')

    await User.findByIdAndDelete(targetUserId)
    return { message: 'User removed successfully' }
  }

  async getUserStats() {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } }
        }
      }
    ])
    const totalUsers = await User.countDocuments()
    const activeUsers = await User.countDocuments({ isActive: true })
    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      roleStats: stats
    }
  }
}
