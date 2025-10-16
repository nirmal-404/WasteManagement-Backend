import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Validation middleware
export const changeRoleValidation = [
  body('role').isIn(['ADMIN', 'RESIDENT', 'BUSINESS', 'COLLECTOR', 'DRIVER']).withMessage('Invalid role')
];

export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      role, 
      status, 
      zone, 
      page = 1, 
      limit = 20,
      search 
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = {};
    
    // Filter by role
    if (role) {
      query.role = role;
    }
    
    // Filter by status
    if (status) {
      query.isActive = status === 'active';
    }
    
    // Filter by zone
    if (zone) {
      query.zone = zone;
    }
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get users" 
    });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ user });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get user" 
    });
  }
};

export const changeRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: errors.array() 
      });
    }

    const { role } = req.body;
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Prevent changing own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }
    
    const oldRole = user.role;
    user.role = role;
    await user.save();
    
    res.json({
      message: "User role updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        oldRole
      }
    });
  } catch (error: any) {
    console.error('Change role error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to change user role" 
    });
  }
};

export const disableUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Prevent disabling own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot disable your own account" });
    }
    
    user.isActive = false;
    await user.save();
    
    res.json({
      message: "User disabled successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error: any) {
    console.error('Disable user error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to disable user" 
    });
  }
};

export const activateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    user.isActive = true;
    await user.save();
    
    res.json({
      message: "User activated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error: any) {
    console.error('Activate user error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to activate user" 
    });
  }
};

export const removeUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Prevent deleting own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    
    // Check if user has any active requests or payments
    // In a real app, you might want to handle this more gracefully
    await User.findByIdAndDelete(req.params.userId);
    
    res.json({
      message: "User removed successfully"
    });
  } catch (error: any) {
    console.error('Remove user error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to remove user" 
    });
  }
};

export const getUserStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      roleStats: stats
    });
  } catch (error: any) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get user statistics" 
    });
  }
};