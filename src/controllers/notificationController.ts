import { Request, Response } from "express";
import Notification from "../models/Notification.js";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Get user's notifications
export const getMyNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { limit = '20', unreadOnly = 'false' } = req.query;

    const query: any = { userId: req.user._id };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .populate('requestId', 'requestId status');

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false
    });

    res.json({ 
      notifications,
      unreadCount
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get notifications" 
    });
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ 
      message: "Notification marked as read",
      notification 
    });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to mark notification as read" 
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to mark all notifications as read" 
    });
  }
};

// Delete notification
export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to delete notification" 
    });
  }
};