import dayjs from 'dayjs';

// ─── Shared IDs ───────────────────────────────────────────────────────────────
const LANDLORD_ID = 'mock-001';
const TENANT1_ID = 'mock-t01';
const TENANT2_ID = 'mock-t02';
const PROP1_ID = 'mock-p01';
const PROP2_ID = 'mock-p02';
const ROOM1_ID = 'mock-r01';
const ROOM2_ID = 'mock-r02';
const ROOM3_ID = 'mock-r03';
const ROOM4_ID = 'mock-r04';
const CONTRACT1_ID = 'mock-c01';
const CONTRACT2_ID = 'mock-c02';
const INVOICE1_ID = 'mock-i01';
const INVOICE2_ID = 'mock-i02';
const INVOICE3_ID = 'mock-i03';
const MAINT1_ID = 'mock-m01';
const MAINT2_ID = 'mock-m02';
const CONV1_ID = 'mock-conv01';

// ─── Entities ─────────────────────────────────────────────────────────────────

const LANDLORD_USER = {
  id: LANDLORD_ID,
  email: 'demo@rentapp.vn',
  fullName: 'Chủ nhà Demo',
  phone: '0901234567',
  role: 'chu_nha',
  isVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const TENANT1 = {
  id: TENANT1_ID,
  email: 'tenant1@gmail.com',
  fullName: 'Nguyễn Văn An',
  phone: '0912345678',
  role: 'nguoi_thue',
  isVerified: true,
  createdAt: '2024-03-01T00:00:00.000Z',
};

const TENANT2 = {
  id: TENANT2_ID,
  email: 'tenant2@gmail.com',
  fullName: 'Trần Thị Bích',
  phone: '0923456789',
  role: 'nguoi_thue',
  isVerified: true,
  createdAt: '2024-04-01T00:00:00.000Z',
};

const ROOM1 = {
  id: ROOM1_ID,
  propertyId: PROP1_ID,
  name: 'Phòng 101',
  floor: 1,
  area: 30,
  monthlyRent: 4500000,
  depositMonths: 2,
  status: 'occupied',
  amenities: ['wifi', 'dieu_hoa', 'nong_lanh'],
  imageUrls: ['https://placehold.co/400x300/1B4F72/white?text=Phong+101'],
  _count: { contracts: 1 },
};

const ROOM2 = {
  id: ROOM2_ID,
  propertyId: PROP1_ID,
  name: 'Phòng 102',
  floor: 1,
  area: 28,
  monthlyRent: 4200000,
  depositMonths: 2,
  status: 'occupied',
  amenities: ['wifi', 'dieu_hoa'],
  imageUrls: ['https://placehold.co/400x300/1B4F72/white?text=Phong+102'],
  _count: { contracts: 1 },
};

const ROOM3 = {
  id: ROOM3_ID,
  propertyId: PROP1_ID,
  name: 'Phòng 201',
  floor: 2,
  area: 35,
  monthlyRent: 5000000,
  depositMonths: 2,
  status: 'vacant',
  amenities: ['wifi', 'dieu_hoa', 'nong_lanh', 'ban_cong'],
  imageUrls: ['https://placehold.co/400x300/1B4F72/white?text=Phong+201'],
  _count: { contracts: 0 },
};

const ROOM4 = {
  id: ROOM4_ID,
  propertyId: PROP2_ID,
  name: 'Phòng A1',
  floor: 1,
  area: 25,
  monthlyRent: 3500000,
  depositMonths: 2,
  status: 'occupied',
  amenities: ['wifi', 'nong_lanh'],
  imageUrls: ['https://placehold.co/400x300/E67E22/white?text=Phong+A1'],
  _count: { contracts: 1 },
};

const PROP1 = {
  id: PROP1_ID,
  ownerId: LANDLORD_ID,
  name: 'Chung Cư Sunrise Q.7',
  address: '123 Nguyễn Thị Thập, Quận 7, TP.HCM',
  type: 'chung_cu',
  totalFloors: 5,
  description: 'Chung cư cao cấp, đầy đủ tiện nghi, gần trung tâm',
  imageUrls: ['https://placehold.co/600x400/1B4F72/white?text=Sunrise+Q7'],
  createdAt: '2024-01-15T00:00:00.000Z',
  rooms: [ROOM1, ROOM2, ROOM3],
  _count: { rooms: 3, occupiedRooms: 2 },
};

const PROP2 = {
  id: PROP2_ID,
  ownerId: LANDLORD_ID,
  name: 'Nhà Trọ Bình Thạnh',
  address: '45 Phan Văn Trị, Bình Thạnh, TP.HCM',
  type: 'nha_tro',
  totalFloors: 2,
  description: 'Nhà trọ sạch sẽ, an ninh tốt, gần chợ',
  imageUrls: ['https://placehold.co/600x400/E67E22/white?text=Nha+Tro+BT'],
  createdAt: '2024-02-01T00:00:00.000Z',
  rooms: [ROOM4],
  _count: { rooms: 1, occupiedRooms: 1 },
};

const thisMonth = dayjs().format('YYYY-MM');

const CONTRACT1 = {
  id: CONTRACT1_ID,
  roomId: ROOM1_ID,
  tenantId: TENANT1_ID,
  landlordId: LANDLORD_ID,
  startDate: '2024-03-01T00:00:00.000Z',
  endDate: '2025-03-01T00:00:00.000Z',
  monthlyRent: 4500000,
  depositAmount: 9000000,
  paymentDueDay: 5,
  electricityStartReading: 1200,
  waterStartReading: 45,
  status: 'active',
  terms: 'Thanh toán trước ngày 5 hàng tháng. Không nuôi thú cưng.',
  landlordSignedAt: '2024-03-01T09:00:00.000Z',
  tenantSignedAt: '2024-03-01T10:00:00.000Z',
  createdAt: '2024-02-28T00:00:00.000Z',
  room: { ...ROOM1, property: PROP1 },
  tenant: TENANT1,
};

const CONTRACT2 = {
  id: CONTRACT2_ID,
  roomId: ROOM4_ID,
  tenantId: TENANT2_ID,
  landlordId: LANDLORD_ID,
  startDate: '2024-04-01T00:00:00.000Z',
  endDate: '2025-04-01T00:00:00.000Z',
  monthlyRent: 3500000,
  depositAmount: 7000000,
  paymentDueDay: 10,
  electricityStartReading: 800,
  waterStartReading: 30,
  status: 'active',
  terms: 'Thanh toán trước ngày 10 hàng tháng.',
  landlordSignedAt: '2024-04-01T09:00:00.000Z',
  tenantSignedAt: '2024-04-01T11:00:00.000Z',
  createdAt: '2024-03-28T00:00:00.000Z',
  room: { ...ROOM4, property: PROP2 },
  tenant: TENANT2,
};

const INVOICE1 = {
  id: INVOICE1_ID,
  contractId: CONTRACT1_ID,
  billingMonth: `${thisMonth}-01`,
  monthlyRent: 4500000,
  electricityFee: 320000,
  waterFee: 85000,
  otherFees: 50000,
  totalAmount: 4955000,
  status: 'da_thanh_toan',
  dueDate: dayjs().date(5).toISOString(),
  paidAt: dayjs().subtract(2, 'day').toISOString(),
  createdAt: dayjs().startOf('month').toISOString(),
  contract: CONTRACT1,
};

const INVOICE2 = {
  id: INVOICE2_ID,
  contractId: CONTRACT2_ID,
  billingMonth: `${thisMonth}-01`,
  monthlyRent: 3500000,
  electricityFee: 240000,
  waterFee: 65000,
  otherFees: 0,
  totalAmount: 3805000,
  status: 'chua_thanh_toan',
  dueDate: dayjs().add(3, 'day').toISOString(),
  paidAt: null,
  createdAt: dayjs().startOf('month').toISOString(),
  contract: CONTRACT2,
};

const INVOICE3 = {
  id: INVOICE3_ID,
  contractId: CONTRACT1_ID,
  billingMonth: dayjs().subtract(1, 'month').format('YYYY-MM') + '-01',
  monthlyRent: 4500000,
  electricityFee: 290000,
  waterFee: 80000,
  otherFees: 50000,
  totalAmount: 4920000,
  status: 'da_thanh_toan',
  dueDate: dayjs().subtract(1, 'month').date(5).toISOString(),
  paidAt: dayjs().subtract(1, 'month').date(4).toISOString(),
  createdAt: dayjs().subtract(1, 'month').startOf('month').toISOString(),
  contract: CONTRACT1,
};

const MAINT1 = {
  id: MAINT1_ID,
  contractId: CONTRACT1_ID,
  reportedById: TENANT1_ID,
  title: 'Vòi nước bị rỉ',
  description: 'Vòi nước trong phòng tắm bị rỉ nước, cần sửa gấp',
  category: 'plumbing',
  priority: 'high',
  status: 'in_progress',
  imageUrls: ['https://placehold.co/400x300/E74C3C/white?text=Maintenance'],
  assignedTo: 'Thợ sửa chữa Minh',
  estimatedCost: 350000,
  scheduledAt: dayjs().add(1, 'day').toISOString(),
  createdAt: dayjs().subtract(2, 'day').toISOString(),
  reportedBy: TENANT1,
  contract: CONTRACT1,
  responses: [
    {
      id: 'mock-mr01',
      maintenanceId: MAINT1_ID,
      responderId: LANDLORD_ID,
      message: 'Đã ghi nhận. Sẽ cử thợ đến kiểm tra vào ngày mai.',
      createdAt: dayjs().subtract(1, 'day').toISOString(),
      responder: LANDLORD_USER,
    },
  ],
};

const MAINT2 = {
  id: MAINT2_ID,
  contractId: CONTRACT2_ID,
  reportedById: TENANT2_ID,
  title: 'Điều hòa không mát',
  description: 'Điều hòa bật nhưng không ra hơi lạnh',
  category: 'electrical',
  priority: 'medium',
  status: 'pending',
  imageUrls: [],
  assignedTo: null,
  estimatedCost: null,
  scheduledAt: null,
  createdAt: dayjs().subtract(5, 'hour').toISOString(),
  reportedBy: TENANT2,
  contract: CONTRACT2,
  responses: [],
};

const NOTIFICATIONS = [
  {
    id: 'mock-n01',
    userId: LANDLORD_ID,
    title: 'Hóa đơn tháng này đã tạo',
    body: 'Hóa đơn tháng ' + dayjs().format('M/YYYY') + ' cho phòng 101 đã được tạo',
    type: 'invoice_created',
    relatedEntityId: INVOICE2_ID,
    isRead: false,
    createdAt: dayjs().subtract(1, 'hour').toISOString(),
  },
  {
    id: 'mock-n02',
    userId: LANDLORD_ID,
    title: 'Yêu cầu bảo trì mới',
    body: 'Nguyễn Văn An gửi yêu cầu: Vòi nước bị rỉ',
    type: 'maintenance_update',
    relatedEntityId: MAINT1_ID,
    isRead: false,
    createdAt: dayjs().subtract(2, 'day').toISOString(),
  },
  {
    id: 'mock-n03',
    userId: LANDLORD_ID,
    title: 'Thanh toán thành công',
    body: 'Hóa đơn tháng trước đã được thanh toán: 4.920.000 ₫',
    type: 'invoice_created',
    relatedEntityId: INVOICE3_ID,
    isRead: true,
    createdAt: dayjs().subtract(1, 'month').toISOString(),
  },
];

const CONV1 = {
  id: CONV1_ID,
  contractId: CONTRACT1_ID,
  landlordId: LANDLORD_ID,
  tenantId: TENANT1_ID,
  lastMessageAt: dayjs().subtract(3, 'hour').toISOString(),
  tenant: TENANT1,
  landlord: LANDLORD_USER,
  lastMessage: { content: 'Cảm ơn anh/chị đã thông báo!' },
};

const MESSAGES = [
  {
    id: 'mock-msg01',
    conversationId: CONV1_ID,
    senderId: TENANT1_ID,
    content: 'Chào anh/chị, vòi nước phòng em bị hỏng rồi ạ',
    createdAt: dayjs().subtract(1, 'day').toISOString(),
    sender: TENANT1,
  },
  {
    id: 'mock-msg02',
    conversationId: CONV1_ID,
    senderId: LANDLORD_ID,
    content: 'Dạ em gửi yêu cầu bảo trì nhé, anh sẽ xử lý sớm',
    createdAt: dayjs().subtract(23, 'hour').toISOString(),
    sender: LANDLORD_USER,
  },
  {
    id: 'mock-msg03',
    conversationId: CONV1_ID,
    senderId: TENANT1_ID,
    content: 'Cảm ơn anh/chị đã thông báo!',
    createdAt: dayjs().subtract(3, 'hour').toISOString(),
    sender: TENANT1,
  },
];

const DEPOSIT1 = {
  id: 'mock-dep01',
  contractId: CONTRACT1_ID,
  amount: 9000000,
  status: 'held',
  collectedAt: '2024-03-01T00:00:00.000Z',
  refundedAt: null,
  deductions: [],
  contract: CONTRACT1,
};

const CHECKLIST1 = {
  id: 'mock-chk01',
  contractId: CONTRACT1_ID,
  phase: 'ban_giao',
  confirmedByLandlordAt: '2024-03-01T09:00:00.000Z',
  confirmedByTenantAt: '2024-03-01T10:00:00.000Z',
  items: [
    { id: 'mock-chki01', checklistId: 'mock-chk01', label: 'Chìa khóa phòng', checked: true, photoUrls: [] },
    { id: 'mock-chki02', checklistId: 'mock-chk01', label: 'Điều hòa', checked: true, photoUrls: [] },
    { id: 'mock-chki03', checklistId: 'mock-chk01', label: 'Bình nóng lạnh', checked: true, photoUrls: [] },
    { id: 'mock-chki04', checklistId: 'mock-chk01', label: 'Tủ lạnh', checked: false, photoUrls: [] },
  ],
};

const FINANCIAL_REPORT = {
  totalRevenue: 9875000,
  collected: 9875000,
  pending: 3805000,
  byMonth: [
    { month: dayjs().subtract(5, 'month').format('MM/YYYY'), amount: 4920000 },
    { month: dayjs().subtract(4, 'month').format('MM/YYYY'), amount: 4920000 },
    { month: dayjs().subtract(3, 'month').format('MM/YYYY'), amount: 8725000 },
    { month: dayjs().subtract(2, 'month').format('MM/YYYY'), amount: 8725000 },
    { month: dayjs().subtract(1, 'month').format('MM/YYYY'), amount: 9875000 },
    { month: dayjs().format('MM/YYYY'), amount: 4955000 },
  ],
  occupancyRate: 80,
  invoices: [INVOICE1, INVOICE2, INVOICE3],
};

// ─── Router ───────────────────────────────────────────────────────────────────

export function getMockResponse(url: string, method: string = 'get'): unknown {
  const m = method.toLowerCase();
  const u = url ?? '';

  // Auth
  if (u.endsWith('/auth/me')) return LANDLORD_USER;
  if (u.endsWith('/auth/fcm-token')) return {};

  // Properties
  if (u.match(/\/properties\/mock-p01\/rooms/) || (u.match(/\/properties\/mock-p01/) && m === 'get'))
    return PROP1;
  if (u.match(/\/properties\/mock-p02/) && m === 'get') return PROP2;
  if (u.endsWith('/properties') && m === 'get')
    return { items: [PROP1, PROP2], total: 2 };

  // Rooms
  if (u.includes('/rooms/mock-r01')) return ROOM1;
  if (u.includes('/rooms/mock-r02')) return ROOM2;
  if (u.includes('/rooms/mock-r03')) return ROOM3;
  if (u.includes('/rooms/mock-r04')) return ROOM4;

  // Contracts
  if (u.endsWith('/contracts/my')) return [CONTRACT1, CONTRACT2];
  if (u.includes('/contracts/mock-c01')) return CONTRACT1;
  if (u.includes('/contracts/mock-c02')) return CONTRACT2;
  if (u.endsWith('/contracts')) return [CONTRACT1, CONTRACT2];

  // Invoices
  if (u.includes('/invoices/mock-i01')) return INVOICE1;
  if (u.includes('/invoices/mock-i02')) return INVOICE2;
  if (u.includes('/invoices/mock-i03')) return INVOICE3;
  if (u.endsWith('/invoices') || u.includes('/invoices?'))
    return [INVOICE1, INVOICE2, INVOICE3];

  // Maintenance
  if (u.includes('/maintenance/mock-m01')) return MAINT1;
  if (u.includes('/maintenance/mock-m02')) return MAINT2;
  if (u.endsWith('/maintenance') || u.includes('/maintenance?'))
    return [MAINT1, MAINT2];

  // Notifications
  if (u.endsWith('/notifications')) return NOTIFICATIONS;

  // Chat
  if (u.includes('/messages')) return MESSAGES;
  if (u.endsWith('/conversations') || u.includes('/chat/conversations'))
    return [CONV1];

  // Checklists
  if (u.includes('/checklists/by-contract')) return CHECKLIST1;

  // Deposits
  if (u.includes('/deposits/by-contract')) return DEPOSIT1;

  // Reports
  if (u.includes('/reports/financial')) return FINANCIAL_REPORT;

  // Users (tenant search for create contract)
  if (u.includes('/users')) return [TENANT1, TENANT2];

  // Mutations — return empty success for all POST/PATCH/DELETE
  return {};
}
