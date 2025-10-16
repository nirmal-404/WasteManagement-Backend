import Notification from "../models/Notification.js";

/**
 * Helper function to create a notification for a user
 * Can be imported and used in any controller
 */
export const createNotification = async (
  userId: string,
  message: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'info',
  requestId?: string,
  metadata?: any
) => {
  try {
    const notification = await Notification.create({
      userId,
      message,
      type,
      requestId,
      metadata
    });
    console.log('✅ Notification created:', notification._id);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
};

/**
 * Helper function to create multiple notifications at once
 */
export const createBulkNotifications = async (
  notifications: Array<{
    userId: string;
    message: string;
    type?: 'success' | 'info' | 'warning' | 'error';
    requestId?: string;
    metadata?: any;
  }>
) => {
  try {
    const created = await Notification.insertMany(notifications);
    console.log(`✅ Created ${created.length} notifications`);
    return created;
  } catch (error) {
    console.error('❌ Error creating bulk notifications:', error);
    return [];
  }
};

/**
 * Helper function to send notification to user about request approval
 */
export const notifyRequestApproved = async (userId: string, requestId: string, requestIdString: string) => {
  return createNotification(
    userId,
    `Great news! Your waste collection request (${requestIdString}) has been approved. We will schedule a collection time soon.`,
    'success',
    requestId,
    { action: 'approved' }
  );
};

/**
 * Helper function to send notification to user about request rejection
 */
export const notifyRequestRejected = async (
  userId: string, 
  requestId: string, 
  requestIdString: string, 
  reason: string
) => {
  return createNotification(
    userId,
    `Your waste collection request (${requestIdString}) has been rejected. Reason: ${reason}`,
    'warning',
    requestId,
    { action: 'rejected', reason }
  );
};

/**
 * Helper function to send notification to user about request scheduling
 */
export const notifyRequestScheduled = async (
  userId: string,
  requestId: string,
  requestIdString: string,
  scheduledDate: string,
  driverName?: string
) => {
  const message = driverName
    ? `Your waste collection (${requestIdString}) has been scheduled for ${scheduledDate}. Driver: ${driverName}.`
    : `Your waste collection (${requestIdString}) has been scheduled for ${scheduledDate}.`;
    
  return createNotification(
    userId,
    message,
    'success',
    requestId,
    { action: 'scheduled', scheduledAt: scheduledDate, driverName }
  );
};

/**
 * Helper function to send notification about collection status
 */
export const notifyStatusUpdate = async (
  userId: string,
  requestId: string,
  requestIdString: string,
  status: string
) => {
  let message = '';
  let type: 'success' | 'info' | 'warning' = 'info';

  switch (status) {
    case 'IN_PROGRESS':
      message = `Your waste collection (${requestIdString}) is now in progress. Our team is on the way!`;
      type = 'info';
      break;
    case 'COMPLETED':
      message = `Your waste collection (${requestIdString}) has been completed successfully. Thank you for using our service!`;
      type = 'success';
      break;
    case 'CANCELLED':
      message = `Your waste collection (${requestIdString}) has been cancelled. Please contact us for more information.`;
      type = 'warning';
      break;
    default:
      message = `Your waste collection (${requestIdString}) status has been updated to ${status}.`;
  }

  return createNotification(
    userId,
    message,
    type,
    requestId,
    { action: 'status_update', newStatus: status }
  );
};