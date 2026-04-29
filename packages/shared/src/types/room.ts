export type RoomStatus = 'trong' | 'da_thue' | 'dang_sua_chua';

export interface Room {
  id: string;
  propertyId: string;
  roomNumber: string;
  floor?: number;
  area: number;
  baseRent: number;
  maxOccupants: number;
  status: RoomStatus;
  amenities: string[];
  imageUrls: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
