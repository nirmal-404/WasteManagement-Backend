// ===== TYPES & ENUMS =====
export enum RequestType {
  NORMAL = 'NORMAL',
  SPECIAL_EQUIPPED = 'SPECIAL_EQUIPPED'
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum RequestUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface IFeeBreakdown {
  baseFee: number;
  weightFee: number;
  urgencyFee: number;
  total: number;
}

export interface IRequest {
  _id?: string;
  requestId: string;
  userId: string;
  type: RequestType;
  description: string;
  address: string;
  urgency: RequestUrgency;
  status: RequestStatus;
  fee: number;
  feeBreakdown: IFeeBreakdown;
  estimatedWeight?: number;
  scheduledAt?: Date;
}

// ===== CUSTOM EXCEPTIONS =====
export class ValidationException extends Error {
  constructor(public errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationException';
  }
}

export class NotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundException';
  }
}

export class InvalidStateException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateException';
  }
}

// ===== FEE CALCULATOR SERVICE (Single Responsibility) =====
export class FeeCalculatorService {
  private readonly FEE_CONFIG = {
    [RequestType.NORMAL]: 800,
    [RequestType.SPECIAL_EQUIPPED]: 1300
  };

  private readonly URGENCY_FEE = {
    [RequestUrgency.LOW]: 0,
    [RequestUrgency.MEDIUM]: 200,
    [RequestUrgency.HIGH]: 500
  };

  private readonly WEIGHT_FEE_PER_KG = 50;

  calculateFee(requestData: {
    type: RequestType;
    urgency: RequestUrgency;
    estimatedWeight?: number;
  }): IFeeBreakdown {
    const baseFee = this.FEE_CONFIG[requestData.type] ?? this.FEE_CONFIG[RequestType.NORMAL];
    const urgencyFee = this.URGENCY_FEE[requestData.urgency] ?? 0;
    const weightFee = this.calculateWeightFee(requestData.estimatedWeight);

    return {
      baseFee,
      weightFee,
      urgencyFee,
      total: baseFee + weightFee + urgencyFee
    };
  }

  private calculateWeightFee(weight?: number): number {
    if (!weight || weight <= 0) return 0;
    return weight * this.WEIGHT_FEE_PER_KG;
  }
}

// ===== VALIDATOR SERVICE (Single Responsibility) =====
export interface IValidator {
  validate(data: any): Promise<{ isValid: boolean; errors: string[] }>;
}

export class RequestValidator implements IValidator {
  async validate(request: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!request.type || !Object.values(RequestType).includes(request.type)) {
      errors.push('Invalid request type');
    }

    if (!request.description || request.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (!request.address || request.address.trim().length === 0) {
      errors.push('Address is required');
    }

    if (!request.urgency || !Object.values(RequestUrgency).includes(request.urgency)) {
      errors.push('Invalid urgency level');
    }

    if (request.estimatedWeight !== undefined && request.estimatedWeight < 0) {
      errors.push('Estimated weight cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// ===== NOTIFICATION SERVICE (Dependency Inversion) =====
export interface INotificationService {
  sendApprovalNotification(userId: string, requestId: string, requestRef: string): Promise<void>;
  sendRejectionNotification(userId: string, requestId: string, requestRef: string, reason: string): Promise<void>;
  sendScheduleConfirmation(userId: string, requestId: string, requestRef: string, date: string, driverName: string): Promise<void>;
  sendStatusUpdate(userId: string, requestId: string, requestRef: string, status: RequestStatus): Promise<void>;
}

export class NotificationService implements INotificationService {
  async sendApprovalNotification(userId: string, requestId: string, requestRef: string): Promise<void> {
    // Implementation: call notificationUtils or external service
    console.log(`Notification sent: Request ${requestRef} approved`);
  }

  async sendRejectionNotification(userId: string, requestId: string, requestRef: string, reason: string): Promise<void> {
    console.log(`Notification sent: Request ${requestRef} rejected - ${reason}`);
  }

  async sendScheduleConfirmation(userId: string, requestId: string, requestRef: string, date: string, driverName: string): Promise<void> {
    console.log(`Notification sent: Request ${requestRef} scheduled for ${date} with driver ${driverName}`);
  }

  async sendStatusUpdate(userId: string, requestId: string, requestRef: string, status: RequestStatus): Promise<void> {
    console.log(`Notification sent: Request ${requestRef} status updated to ${status}`);
  }
}

// ===== USER SERVICE ABSTRACTION (Dependency Inversion) =====
export interface IUserService {
  findById(id: string): Promise<any>;
  isDriver(userId: string): Promise<boolean>;
}

// ===== REQUEST REPOSITORY ABSTRACTION (Dependency Inversion) =====
export interface IRequestRepository {
  save(request: any): Promise<any>;
  findById(id: string): Promise<any>;
  findByUserId(userId: string, query: any): Promise<any[]>;
  countByQuery(query: any): Promise<number>;
  findByQuery(query: any): Promise<any[]>;
}

// ===== MAIN SERVICE (Orchestration) =====
export class RequestService {
  constructor(
    private feeCalculator: FeeCalculatorService,
    private validator: IValidator,
    private notificationService: INotificationService,
    private requestRepository: IRequestRepository,
    private userService: IUserService
  ) {}

  async createRequest(userId: string, requestData: any): Promise<any> {
    // Validate input
    const validation = await this.validator.validate(requestData);
    if (!validation.isValid) {
      throw new ValidationException(validation.errors);
    }

    // Calculate fee
    const feeBreakdown = this.feeCalculator.calculateFee({
      type: requestData.type,
      urgency: requestData.urgency,
      estimatedWeight: requestData.estimatedWeight
    });

    // Create request
    const request = {
      requestId: this.generateRequestId(),
      userId,
      type: requestData.type,
      description: requestData.description,
      remarks: requestData.remarks,
      address: requestData.address,
      preferredDate: requestData.preferredDate ? new Date(requestData.preferredDate) : null,
      preferredTimeSlot: requestData.preferredTimeSlot || 'MORNING',
      urgency: requestData.urgency,
      estimatedWeight: requestData.estimatedWeight,
      estimatedVolume: requestData.estimatedVolume,
      fee: feeBreakdown.total,
      feeBreakdown,
      status: RequestStatus.PENDING
    };

    return this.requestRepository.save(request);
  }

  async approveRequest(requestId: string, adminNotes?: string, sendNotification: boolean = true): Promise<any> {
    const request = await this.requestRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new InvalidStateException('Only pending requests can be approved');
    }

    request.status = RequestStatus.APPROVED;
    if (adminNotes) request.adminNotes = adminNotes;

    const saved = await this.requestRepository.save(request);

    if (sendNotification) {
      await this.notificationService.sendApprovalNotification(
        request.userId,
        request._id,
        request.requestId
      );
    }

    return saved;
  }

  async rejectRequest(requestId: string, rejectionReason: string, adminNotes?: string, sendNotification: boolean = true): Promise<any> {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    const request = await this.requestRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.PENDING && request.status !== RequestStatus.APPROVED) {
      throw new InvalidStateException('Only pending or approved requests can be rejected');
    }

    request.status = RequestStatus.REJECTED;
    request.rejectionReason = rejectionReason;
    if (adminNotes) request.adminNotes = adminNotes;

    const saved = await this.requestRepository.save(request);

    if (sendNotification) {
      await this.notificationService.sendRejectionNotification(
        request.userId,
        request._id,
        request.requestId,
        rejectionReason
      );
    }

    return saved;
  }

  async scheduleRequest(
    requestId: string,
    scheduledAt: Date,
    driverId: string,
    vehicleId: string,
    collectors: string[] = [],
    equipment: string[] = [],
    adminNotes?: string,
    sendNotification: boolean = true
  ): Promise<any> {
    const request = await this.requestRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.APPROVED) {
      throw new InvalidStateException('Only approved requests can be scheduled');
    }

    const driver = await this.userService.findById(driverId);
    if (!driver || !(await this.userService.isDriver(driverId))) {
      throw new Error('Invalid driver selected');
    }

    request.status = RequestStatus.SCHEDULED;
    request.scheduledAt = new Date(scheduledAt);
    request.assigned = {
      driverId,
      vehicleId,
      collectors,
      equipment
    };
    if (adminNotes) request.adminNotes = adminNotes;

    const saved = await this.requestRepository.save(request);

    if (sendNotification) {
      await this.notificationService.sendScheduleConfirmation(
        request.userId,
        request._id,
        request.requestId,
        new Date(scheduledAt).toLocaleString(),
        driver.name
      );
    }

    return saved;
  }

  async updateStatus(requestId: string, newStatus: RequestStatus): Promise<any> {
    const validStatuses = [RequestStatus.IN_PROGRESS, RequestStatus.COMPLETED, RequestStatus.CANCELLED];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status. Allowed: ${validStatuses.join(', ')}`);
    }

    const request = await this.requestRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    request.status = newStatus;
    if (newStatus === RequestStatus.COMPLETED) {
      request.completedAt = new Date();
    }

    return this.requestRepository.save(request);
  }

  private generateRequestId(): string {
    return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }
}