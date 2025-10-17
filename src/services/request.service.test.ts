import { RequestService } from '../services/request.service';
import {
  FeeCalculatorService,
  RequestValidator,
  NotificationService,
  RequestType,
  RequestUrgency,
  RequestStatus,
  ValidationException,
  NotFoundException,
  InvalidStateException
} from '../services/request.service';

// ===== MOCK DEPENDENCIES =====
const mockRequestRepository = {
  save: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  countByQuery: jest.fn(),
  findByQuery: jest.fn()
};

const mockUserService = {
  findById: jest.fn(),
  isDriver: jest.fn()
};

const mockNotificationService = {
  sendApprovalNotification: jest.fn(),
  sendRejectionNotification: jest.fn(),
  sendScheduleConfirmation: jest.fn(),
  sendStatusUpdate: jest.fn()
};

const feeCalculator = new FeeCalculatorService();
const validator = new RequestValidator();

// ===== SYSTEM UNDER TEST =====
const service = new RequestService(
  feeCalculator,
  validator,
  mockNotificationService,
  mockRequestRepository,
  mockUserService
);

beforeEach(() => {
  jest.clearAllMocks();
});

// ===== TEST SUITE =====
describe('RequestService', () => {

  // === CREATE REQUEST ===
  it('should create a valid request with calculated fee', async () => {
    const requestData = {
      type: RequestType.NORMAL,
      description: 'Garbage collection request',
      address: '123 Main Street',
      urgency: RequestUrgency.MEDIUM,
      estimatedWeight: 10
    };

    const userId = 'user123';

    mockRequestRepository.save.mockResolvedValue({
      ...requestData,
      userId,
      status: RequestStatus.PENDING
    });

    const result = await service.createRequest(userId, requestData);

    expect(result.status).toBe(RequestStatus.PENDING);
    expect(mockRequestRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw ValidationException for invalid data', async () => {
    const invalidData = { type: 'INVALID' };

    await expect(service.createRequest('user123', invalidData))
      .rejects
      .toThrow(ValidationException);
  });

  // === APPROVE REQUEST ===
  it('should approve a pending request and send notification', async () => {
    const fakeRequest = { _id: 'r1', requestId: 'REQ-001', userId: 'u1', status: RequestStatus.PENDING };

    mockRequestRepository.findById.mockResolvedValue(fakeRequest);
    mockRequestRepository.save.mockResolvedValue({ ...fakeRequest, status: RequestStatus.APPROVED });

    const result = await service.approveRequest('r1');

    expect(result.status).toBe(RequestStatus.APPROVED);
    expect(mockNotificationService.sendApprovalNotification).toHaveBeenCalledWith('u1', 'r1', 'REQ-001');
  });

  it('should throw NotFoundException when approving nonexistent request', async () => {
    mockRequestRepository.findById.mockResolvedValue(null);
    await expect(service.approveRequest('invalid')).rejects.toThrow(NotFoundException);
  });

  it('should throw InvalidStateException if request not pending', async () => {
    mockRequestRepository.findById.mockResolvedValue({ status: RequestStatus.APPROVED });
    await expect(service.approveRequest('r1')).rejects.toThrow(InvalidStateException);
  });

  // === REJECT REQUEST ===
  it('should reject a pending request with reason', async () => {
    const fakeRequest = { _id: 'r1', requestId: 'REQ-001', userId: 'u1', status: RequestStatus.PENDING };

    mockRequestRepository.findById.mockResolvedValue(fakeRequest);
    mockRequestRepository.save.mockResolvedValue({ ...fakeRequest, status: RequestStatus.REJECTED });

    const result = await service.rejectRequest('r1', 'Invalid address');

    expect(result.status).toBe(RequestStatus.REJECTED);
    expect(mockNotificationService.sendRejectionNotification).toHaveBeenCalledWith('u1', 'r1', 'REQ-001', 'Invalid address');
  });

  // === SCHEDULE REQUEST ===
  it('should schedule an approved request and send confirmation', async () => {
    const fakeRequest = {
      _id: 'r1',
      requestId: 'REQ-001',
      userId: 'u1',
      status: RequestStatus.APPROVED
    };

    const driver = { _id: 'd1', name: 'Driver John' };

    mockRequestRepository.findById.mockResolvedValue(fakeRequest);
    mockRequestRepository.save.mockResolvedValue({ ...fakeRequest, status: RequestStatus.SCHEDULED });
    mockUserService.findById.mockResolvedValue(driver);
    mockUserService.isDriver.mockResolvedValue(true);

    const result = await service.scheduleRequest('r1', new Date(), 'd1', 'v1');

    expect(result.status).toBe(RequestStatus.SCHEDULED);
    expect(mockNotificationService.sendScheduleConfirmation).toHaveBeenCalledWith(
      'u1',
      'r1',
      'REQ-001',
      expect.any(String),
      'Driver John'
    );
  });

  it('should throw error if driver is invalid', async () => {
    mockRequestRepository.findById.mockResolvedValue({
      _id: 'r1',
      requestId: 'REQ-001',
      userId: 'u1',
      status: RequestStatus.APPROVED
    });
    mockUserService.findById.mockResolvedValue(null);

    await expect(service.scheduleRequest('r1', new Date(), 'invalid', 'v1')).rejects.toThrow('Invalid driver selected');
  });

  // === UPDATE STATUS ===
  it('should update status to COMPLETED and set completedAt', async () => {
    const fakeRequest = { _id: 'r1', status: RequestStatus.SCHEDULED };
    mockRequestRepository.findById.mockResolvedValue(fakeRequest);
    mockRequestRepository.save.mockResolvedValue({ ...fakeRequest, status: RequestStatus.COMPLETED });

    const result = await service.updateStatus('r1', RequestStatus.COMPLETED);

    expect(result.status).toBe(RequestStatus.COMPLETED);
    expect(mockRequestRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw error for invalid status transition', async () => {
    await expect(service.updateStatus('r1', RequestStatus.APPROVED)).rejects.toThrow('Invalid status');
  });

  it('should throw NotFoundException if request not found on update', async () => {
    mockRequestRepository.findById.mockResolvedValue(null);
    await expect(service.updateStatus('r1', RequestStatus.COMPLETED)).rejects.toThrow(NotFoundException);
  });
});
