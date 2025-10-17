import { AuthService } from '../services/auth.service'
import User from '../models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

jest.mock('../models/User')
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

const mockUser = User as jest.Mocked<typeof User>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockJwt = jwt as jest.Mocked<typeof jwt>

const service = new AuthService()

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'secret'
  })

  describe('register', () => {
    it('should throw if user already exists', async () => {
      mockUser.findOne.mockResolvedValue({ _id: '1' } as any)
      await expect(
        service.register({
          name: 'Test',
          email: 'test@example.com',
          password: 'password',
          phone: '123',
          address: 'addr',
          zone: 'A'
        })
      ).rejects.toThrow('User already exists')
    })

    it('should register new user', async () => {
      mockUser.findOne.mockResolvedValue(null)
      mockBcrypt.hash.mockResolvedValue('hashed' as any)
      mockUser.create.mockResolvedValue({
        _id: '1',
        name: 'Test',
        email: 'test@example.com',
        role: 'RESIDENT'
      } as any)

      const result = await service.register({
        name: 'Test',
        email: 'test@example.com',
        password: 'password',
        phone: '123',
        address: 'addr',
        zone: 'A'
      })
      expect(result.user.email).toBe('test@example.com')
      expect(mockUser.create).toHaveBeenCalled()
    })
  })

  describe('login', () => {
    it('should throw if user not found', async () => {
      mockUser.findOne.mockResolvedValue(null)
      await expect(
        service.login({ email: 'x@test.com', password: 'pass' })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should throw if user deactivated', async () => {
      mockUser.findOne.mockResolvedValue({ isActive: false } as any)
      await expect(
        service.login({ email: 'x@test.com', password: 'pass' })
      ).rejects.toThrow('Account is deactivated')
    })

    it('should throw if password invalid', async () => {
      mockUser.findOne.mockResolvedValue({ isActive: true, password: 'hashed' } as any)
      mockBcrypt.compare.mockResolvedValue(false)
      await expect(
        service.login({ email: 'x@test.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should login successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockUser.findOne.mockResolvedValue({
        _id: '1',
        name: 'Test',
        email: 'test@example.com',
        password: 'hashed',
        role: 'RESIDENT',
        isActive: true,
        save: saveMock
      } as any)
      mockBcrypt.compare.mockResolvedValue(true)
      mockJwt.sign.mockReturnValue('jwt-token' as any)

      const result = await service.login({
        email: 'test@example.com',
        password: 'password'
      })

      expect(result.token).toBe('jwt-token')
      expect(saveMock).toHaveBeenCalled()
    })
  })

  describe('me', () => {
    it('should throw if not authenticated', async () => {
      await expect(service.me(null)).rejects.toThrow('Not authenticated')
    })

    it('should return user profile', async () => {
      const authUser = { _id: '1', name: 'A', email: 'a@test.com' }
      const result = await service.me(authUser)
      expect(result.user.email).toBe('a@test.com')
    })
  })

  describe('logout', () => {
    it('should return message', async () => {
      const result = await service.logout()
      expect(result.message).toBe('Logged out successfully')
    })
  })

  describe('changePassword', () => {
    it('should throw if user not found', async () => {
      mockUser.findById.mockResolvedValue(null)
      await expect(
        service.changePassword('1', 'old', 'new')
      ).rejects.toThrow('User not found')
    })

    it('should throw if current password incorrect', async () => {
      mockUser.findById.mockResolvedValue({ password: 'hashed' } as any)
      mockBcrypt.compare.mockResolvedValue(false)
      await expect(
        service.changePassword('1', 'wrong', 'new')
      ).rejects.toThrow('Current password is incorrect')
    })

    it('should change password successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue({})
      mockUser.findById.mockResolvedValue({ password: 'hashed', save: saveMock } as any)
      mockBcrypt.compare.mockResolvedValue(true)
      mockBcrypt.hash.mockResolvedValue('newhashed' as any)

      const result = await service.changePassword('1', 'old', 'new')
      expect(result.message).toBe('Password changed successfully')
      expect(saveMock).toHaveBeenCalled()
    })
  })
})
