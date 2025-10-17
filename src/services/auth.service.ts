import User from '../models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export interface RegisterInput {
  name: string
  email: string
  password: string
  phone: string
  address: string
  zone: string
  role?: string
}

export interface LoginInput {
  email: string
  password: string
}

export class AuthService {
  async register(data: RegisterInput) {
    const { name, email, password, phone, address, zone, role = 'RESIDENT' } = data

    const existing = await User.findOne({ email })
    if (existing) throw new Error('User already exists')

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      phone,
      address,
      zone
    })

    return {
      message: 'Registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  }

  async login(data: LoginInput) {
    const { email, password } = data

    const user = await User.findOne({ email })
    if (!user) throw new Error('Invalid credentials')
    if (!user.isActive) throw new Error('Account is deactivated')

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('Invalid credentials')

    user.lastLoginAt = new Date()
    await user.save()

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return {
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        zone: user.zone
      },
      token
    }
  }

  async me(authUser: any) {
    if (!authUser) throw new Error('Not authenticated')

    return {
      user: {
        id: authUser._id,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        phone: authUser.phone,
        address: authUser.address,
        zone: authUser.zone,
        rewardsBalance: authUser.rewardsBalance,
        lastLoginAt: authUser.lastLoginAt
      }
    }
  }

  async logout() {
    return { message: 'Logged out successfully' }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) throw new Error('Current password is incorrect')

    const hashedNewPassword = await bcrypt.hash(newPassword, 12)
    user.password = hashedNewPassword
    await user.save()

    return { message: 'Password changed successfully' }
  }
}
