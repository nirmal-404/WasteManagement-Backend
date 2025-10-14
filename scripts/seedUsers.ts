import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";

dotenv.config();

const users = [
  {
    name: "System Administrator",
    email: "admin@wastemanagement.com",
    password: "admin123",
    role: "ADMIN",
    phone: "+1234567890",
    address: "System Admin Address",
    zone: "ADMIN_ZONE",
  },
  {
    name: "John Resident",
    email: "resident@wastemanagement.com",
    password: "resident123",
    role: "RESIDENT",
    phone: "+1111111111",
    address: "Resident Address",
    zone: "ZONE_A",
  },
  {
    name: "Jane Collector",
    email: "collector@wastemanagement.com",
    password: "collector123",
    role: "COLLECTOR",
    phone: "+2222222222",
    address: "Collector Address",
    zone: "ZONE_B",
  },
];

const run = async () => {
  try {
    await connectDB();

    for (const userData of users) {
      const exists = await User.findOne({ email: userData.email });

      if (exists) {
        console.log(`✅ User already exists: ${userData.email}`);
      } else {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        const newUser = await User.create({
          ...userData,
          password: hashedPassword,
        });

        console.log(`✅ User created: ${newUser.email}`);
        console.log(`📧 Email: ${userData.email}`);
        console.log(`🔑 Password: ${userData.password}`);
      }
    }

    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
};

run();
