import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import connectDB from '../src/config/db.js'
import User from '../src/models/User.js'

dotenv.config()

const users = [
  {
    name: 'System Administrator',
    email: 'admin@wastemanagement.com',
    password: 'admin123',
    role: 'ADMIN',
    phone: '+1234567890',
    address: 'System Admin Address',
    zone: 'ADMIN_ZONE'
  },
  {
    name: 'John Resident',
    email: 'resident@wastemanagement.com',
    password: 'resident123',
    role: 'RESIDENT',
    phone: '+1111111111',
    address: 'Resident Address',
    zone: 'ZONE A - Central'
  },
  {
    name: 'Jane Collector',
    email: 'collector@wastemanagement.com',
    password: 'collector123',
    role: 'COLLECTOR',
    phone: '+2222222222',
    address: 'Collector Address',
    zone: 'ZONE B - North'
  },

  {
    name: 'User 101',
    email: 'user101@example.com',
    password: 'user101',
    role: 'COLLECTOR',
    phone: '+11000000001',
    address: 'Collector Address 101',
    zone: 'ZONE B - North'
  },
  {
    name: 'User 102',
    email: 'user102@example.com',
    password: 'user102',
    role: 'RESIDENT',
    phone: '+11000000002',
    address: 'Resident Address 102',
    zone: 'ZONE A - East'
  },
  {
    name: 'User 103',
    email: 'user103@example.com',
    password: 'user103',
    role: 'COLLECTOR',
    phone: '+11000000003',
    address: 'Collector Address 103',
    zone: 'ZONE B - North'
  },
  {
    name: 'User 104',
    email: 'user104@example.com',
    password: 'user104',
    role: 'RESIDENT',
    phone: '+11000000004',
    address: 'Resident Address 104',
    zone: 'ZONE A - East'
  },
  {
    name: 'User 105',
    email: 'user105@example.com',
    password: 'user105',
    role: 'COLLECTOR',
    phone: '+11000000005',
    address: 'Collector Address 105',
    zone: 'ZONE B - North'
  },
  {
    name: 'User 106',
    email: 'user106@example.com',
    password: 'user106',
    role: 'RESIDENT',
    phone: '+11000000006',
    address: 'Resident Address 106',
    zone: 'ZONE A - East'
  },
  {
    name: 'User 107',
    email: 'user107@example.com',
    password: 'user107',
    role: 'COLLECTOR',
    phone: '+11000000007',
    address: 'Collector Address 107',
    zone: 'ZONE B - North'
  },
  {
    name: 'User 108',
    email: 'user108@example.com',
    password: 'user108',
    role: 'RESIDENT',
    phone: '+11000000008',
    address: 'Resident Address 108',
    zone: 'ZONE A - East'
  },
  {
    name: 'User 109',
    email: 'user109@example.com',
    password: 'user109',
    role: 'COLLECTOR',
    phone: '+11000000009',
    address: 'Collector Address 109',
    zone: 'ZONE B - North'
  },
  {
    name: 'User 110',
    email: 'user110@example.com',
    password: 'user110',
    role: 'RESIDENT',
    phone: '+11000000010',
    address: 'Resident Address 110',
    zone: 'ZONE A - East'
  },
  {
    name: 'User 111',
    email: 'user111@example.com',
    password: 'user111',
    role: 'COLLECTOR',
    phone: '+11000000011',
    address: 'Collector Address 111',
    zone: 'ZONE B - North'
  },
  {
    name: 'User 112',
    email: 'user112@example.com',
    password: 'user112',
    role: 'RESIDENT',
    phone: '+11000000012',
    address: 'Resident Address 112',
    zone: 'ZONE A - East'
  }
]

const run = async () => {
  try {
    await connectDB()

    for (const userData of users) {
      const exists = await User.findOne({ email: userData.email })

      if (exists) {
        console.log(`✅ User already exists: ${userData.email}`)
      } else {
        const hashedPassword = await bcrypt.hash(userData.password, 12)
        const newUser = await User.create({
          ...userData,
          password: hashedPassword
        })

        console.log(`✅ User created: ${newUser.email}`)
        console.log(`📧 Email: ${userData.email}`)
        console.log(`🔑 Password: ${userData.password}`)
      }
    }

    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding users:', error)
    process.exit(1)
  }
}

run()
