export interface Property {
  id: string;
  landlordId: string;
  name: string;
  address: string;
  ward: string;
  district: string;
  city: string;
  description?: string;
  imageUrls: string[];
  electricityRate: number;
  waterRate: number;
  createdAt: string;
  updatedAt: string;
}
