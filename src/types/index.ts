export interface VehicleLimits {
  twoWheelersPerUnit: number;
  fourWheelersPerUnit: number;
  otherVehiclesPerUnit: number;
}

export interface Society {
  id: string;
  societyName: string;
  address: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  totalWings: number;
  wings: Wing[];
  entryGates: Gate[];
  exitGates: Gate[];
  societyAdmins: SocietyAdmin[];
  engagementStartDate: string;
  engagementEndDate: string;
  maintenanceDueDate?: number;
  rateMonthly?: number;
  rateYearly?: number;
  baseRate: number;
  gst: number;
  rateInclGst: number;
  status: 'Active' | 'Inactive' | 'Trial' | 'Suspended';
  societyPin: string;
  notes?: string;
  vehicleLimits?: VehicleLimits;
  createdBy: string;
  lastUpdatedBy: string;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
}

export interface Wing {
  id: string;
  name: string;
  totalUnits: number;
  units: Unit[];
}

export interface Unit {
  id: string;
  number: string;
}

export interface Gate {
  id: string;
  name: string;
}

export interface SocietyAdmin {
  id: string;
  name: string;
  mobile: string;
  email: string;
  status: 'Active' | 'Inactive';
  societyId: string;
  societyName: string;
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface CountryCityOption {
  countryCode: string;
  countryName: string;
  cities: string[];
}

export interface User {
  id?: string;
  email: string;
  name?: string;
  role: 'super_admin' | 'admin';
  phoneNumber?: string;
}