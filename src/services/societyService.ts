import axios from 'axios';
import { Society, SocietyAdmin } from '../types';
import { apiClient } from '../lib/api';

interface ApiUnit {
  _id?: string;
  unitNumber: string;
}

interface ApiWing {
  _id?: string;
  wingName: string;
  totalUnits?: number;
  units?: ApiUnit[];
}

interface ApiGate {
  _id?: string;
  name: string;
}

interface ApiSocietyAdmin {
  _id?: string;
  name: string;
  mobile: string;
  email: string;
  status?: SocietyAdmin['status'];
  createdAt?: string;
  updatedAt?: string;
}

interface ApiEngagement {
  startDate?: string;
  endDate?: string;
  baseRate?: number;
  gst?: number;
  total?: number;
}

interface ApiVehicleLimits {
  twoWheelersPerUnit?: number;
  fourWheelersPerUnit?: number;
  otherVehiclesPerUnit?: number;
}

interface ApiSociety {
  _id: string;
  societyName: string;
  societyPin: string;
  address: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  maintenanceDueDate?: number;
  notes?: string;
  structure?: ApiWing[];
  entryGates?: ApiGate[];
  exitGates?: ApiGate[];
  societyAdmins?: ApiSocietyAdmin[];
  engagement?: ApiEngagement;
  vehicleLimits?: ApiVehicleLimits;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  lastUpdatedBy?: string;
  documents?: Society['documents'];
}

const formatDateInput = (value?: string | Date): string => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
};

const mapStatus = (status?: string): Society['status'] => {
  const normalized = status?.toLowerCase();

  if (normalized === 'inactive') {
    return 'Inactive';
  }

  if (normalized === 'trial') {
    return 'Trial';
  }

  if (normalized === 'suspended') {
    return 'Suspended';
  }

  if (normalized === 'active') {
    return 'Active';
  }

  return 'Active';
};

const normalizeSociety = (society: ApiSociety): Society => {
  const wings = (society.structure ?? []).map((wing) => {
    const units = (wing.units ?? []).map((unit) => ({
      id: unit._id ?? `${society._id}-unit-${unit.unitNumber}`,
      number: unit.unitNumber,
    }));

    const totalUnits = wing.totalUnits ?? units.length;

    return {
      id: wing._id ?? `${society._id}-wing-${wing.wingName}`,
      name: wing.wingName,
      totalUnits,
      units,
    };
  });

  const entryGates = (society.entryGates ?? []).map((gate) => ({
    id: gate._id ?? `${society._id}-entry-${gate.name}`,
    name: gate.name,
  }));

  const exitGates = (society.exitGates ?? []).map((gate) => ({
    id: gate._id ?? `${society._id}-exit-${gate.name}`,
    name: gate.name,
  }));

  const engagement = society.engagement ?? {};
  const baseRate = engagement.baseRate ?? 0;
  const gst = engagement.gst ?? baseRate * 0.18;
  const total = engagement.total ?? baseRate + gst;

  const admins = (society.societyAdmins ?? []).map((admin) => ({
    id: admin._id ?? `${society._id}-admin-${admin.email ?? admin.name}`,
    name: admin.name,
    mobile: admin.mobile,
    email: admin.email,
    status: admin.status ?? 'Active',
    societyId: society._id,
    societyName: society.societyName,
    createdAt: admin.createdAt ?? society.createdAt ?? new Date().toISOString(),
  }));

  const vehicleLimits = society.vehicleLimits
    ? {
        twoWheelersPerUnit: society.vehicleLimits.twoWheelersPerUnit ?? 0,
        fourWheelersPerUnit: society.vehicleLimits.fourWheelersPerUnit ?? 0,
        otherVehiclesPerUnit: society.vehicleLimits.otherVehiclesPerUnit ?? 0,
      }
    : undefined;

  return {
    id: society._id,
    societyName: society.societyName,
    address: society.address,
    city: society.city,
    country: society.country,
    latitude: typeof society.latitude === 'number' ? society.latitude : undefined,
    longitude: typeof society.longitude === 'number' ? society.longitude : undefined,
    totalWings: wings.length,
    wings,
    entryGates,
    exitGates,
    societyAdmins: admins,
    engagementStartDate: formatDateInput(engagement.startDate),
    engagementEndDate: formatDateInput(engagement.endDate),
    maintenanceDueDate: society.maintenanceDueDate,
    baseRate,
    gst,
    rateInclGst: total,
    status: mapStatus(society.status),
    societyPin: society.societyPin,
    notes: society.notes,
    vehicleLimits,
    createdBy: society.createdBy ?? 'System',
    lastUpdatedBy: society.lastUpdatedBy ?? 'System',
    createdAt: society.createdAt ?? new Date().toISOString(),
    updatedAt: society.updatedAt ?? new Date().toISOString(),
    documents: society.documents,
  };
};

const normalizeSocietyAdmin = (
  societyId: string,
  societyName: string,
  admin: ApiSocietyAdmin
): SocietyAdmin => ({
  id: admin._id ?? `${societyId}-admin-${admin.email ?? admin.name}`,
  name: admin.name,
  mobile: admin.mobile,
  email: admin.email,
  status: admin.status ?? 'Active',
  societyId,
  societyName,
  createdAt: admin.createdAt ?? new Date().toISOString(),
});

const buildSocietyPayload = (society: Society) => ({
  societyName: society.societyName,
  societyPin: society.societyPin,
  address: society.address,
  city: society.city ?? '',
  country: society.country ?? '',
  latitude: society.latitude,
  longitude: society.longitude,
  status: society.status,
  maintenanceDueDate: society.maintenanceDueDate ?? 1,
  notes: society.notes,
  structure: society.wings.map((wing) => ({
    wingName: wing.name,
    totalUnits: wing.totalUnits ?? wing.units.length,
    units: wing.units.map((unit) => ({
      unitNumber: unit.number,
    })),
  })),
  entryGates: society.entryGates.filter((gate) => gate.name).map((gate) => ({ name: gate.name })),
  exitGates: society.exitGates.filter((gate) => gate.name).map((gate) => ({ name: gate.name })),
  societyAdmins: society.societyAdmins
    .filter((admin) => admin.name && admin.email && admin.mobile)
    .map((admin) => ({
      name: admin.name,
      mobile: admin.mobile,
      email: admin.email,
    })),
  engagement: {
    startDate: society.engagementStartDate,
    endDate: society.engagementEndDate,
    baseRate: society.baseRate,
    gst: society.gst,
    total: society.rateInclGst,
  },
  vehicleLimits: society.vehicleLimits
    ? {
        twoWheelersPerUnit: society.vehicleLimits.twoWheelersPerUnit ?? 0,
        fourWheelersPerUnit: society.vehicleLimits.fourWheelersPerUnit ?? 0,
        otherVehiclesPerUnit: society.vehicleLimits.otherVehiclesPerUnit ?? 0,
      }
    : undefined,
});

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string };
    return data?.message ?? fallback;
  }

  return fallback;
};

const withErrorHandling = async <T>(callback: () => Promise<T>, fallback: string): Promise<T> => {
  try {
    return await callback();
  } catch (error) {
    throw new Error(extractErrorMessage(error, fallback));
  }
};

export const fetchSocieties = async (): Promise<Society[]> => {
  return withErrorHandling(async () => {
    const response = await apiClient.get('/society/get-all-societies');
    const apiSocieties: ApiSociety[] = response.data?.data ?? [];
    return apiSocieties.map(normalizeSociety);
  }, 'Failed to load societies');
};

export const createSociety = async (society: Society): Promise<Society> => {
  return withErrorHandling(async () => {
    const payload = buildSocietyPayload(society);
    const response = await apiClient.post('/society/create-society', payload);
    const created: ApiSociety | undefined = response.data?.data;

    if (!created) {
      throw new Error('Invalid response from server while creating society');
    }

    return normalizeSociety(created);
  }, 'Failed to create society');
};

export const updateSociety = async (id: string, society: Society): Promise<Society> => {
  return withErrorHandling(async () => {
    const payload = buildSocietyPayload(society);
    const response = await apiClient.put(`/society/${id}`, payload);
    const updated: ApiSociety | undefined = response.data?.data;

    if (!updated) {
      throw new Error('Invalid response from server while updating society');
    }

    return normalizeSociety(updated);
  }, 'Failed to update society');
};

export const toggleSocietyStatus = async (id: string): Promise<Society> => {
  return withErrorHandling(async () => {
    const response = await apiClient.patch(`/society/${id}/toggle-status`);
    const updated: ApiSociety | undefined = response.data?.data;

    if (!updated) {
      throw new Error('Invalid response from server while toggling society status');
    }

    return normalizeSociety(updated);
  }, 'Failed to update society status');
};

export const suspendSociety = async (id: string): Promise<Society> => {
  return withErrorHandling(async () => {
    const response = await apiClient.patch(`/society/${id}/suspend`);
    const updated: ApiSociety | undefined = response.data?.data;

    if (!updated) {
      throw new Error('Invalid response from server while suspending society');
    }

    return normalizeSociety(updated);
  }, 'Failed to suspend society');
};

export const fetchSocietyById = async (id: string): Promise<Society | undefined> => {
  return withErrorHandling(async () => {
    const response = await apiClient.get(`/society/${id}`);
    const fetched: ApiSociety | undefined = response.data?.data;
    return fetched ? normalizeSociety(fetched) : undefined;
  }, 'Failed to fetch society');
};

const handleAdminPayload = (
  payload: { societyId: string; societyName: string; admin: ApiSocietyAdmin } | undefined,
  errorMessage: string
): SocietyAdmin => {
  if (!payload) {
    throw new Error(errorMessage);
  }

  return normalizeSocietyAdmin(payload.societyId, payload.societyName, payload.admin);
};

export const fetchSocietyAdmins = async (societyId: string): Promise<SocietyAdmin[]> => {
  return withErrorHandling(async () => {
    const response = await apiClient.get(`/society-admin/${societyId}`);
    const payload = response.data?.data as
      | { societyId: string; societyName: string; admins: ApiSocietyAdmin[] }
      | undefined;

    if (!payload) {
      throw new Error('Invalid response from server while fetching society admins');
    }

    return (
      payload.admins?.map((admin) =>
        normalizeSocietyAdmin(payload.societyId, payload.societyName, admin)
      ) ?? []
    );
  }, 'Failed to fetch society admins');
};

export const createSocietyAdmin = async (
  societyId: string,
  admin: Pick<SocietyAdmin, 'name' | 'email' | 'mobile'>
): Promise<SocietyAdmin> => {
  return withErrorHandling(async () => {
    const response = await apiClient.post(`/society-admin/${societyId}`, admin);
    const payload = response.data?.data as
      | { societyId: string; societyName: string; admin: ApiSocietyAdmin }
      | undefined;

    return handleAdminPayload(payload, 'Invalid response from server while creating society admin');
  }, 'Failed to create society admin');
};

export const updateSocietyAdmin = async (
  societyId: string,
  adminId: string,
  updates: Partial<Pick<SocietyAdmin, 'name' | 'email' | 'mobile'>>
): Promise<SocietyAdmin> => {
  return withErrorHandling(async () => {
    const response = await apiClient.put(`/society-admin/${societyId}/${adminId}`, updates);
    const payload = response.data?.data as
      | { societyId: string; societyName: string; admin: ApiSocietyAdmin }
      | undefined;

    return handleAdminPayload(payload, 'Invalid response from server while updating society admin');
  }, 'Failed to update society admin');
};

export const toggleSocietyAdminStatus = async (
  societyId: string,
  adminId: string
): Promise<SocietyAdmin> => {
  return withErrorHandling(async () => {
    const response = await apiClient.patch(
      `/society-admin/${societyId}/${adminId}/toggle-status`
    );
    const payload = response.data?.data as
      | { societyId: string; societyName: string; admin: ApiSocietyAdmin }
      | undefined;

    return handleAdminPayload(
      payload,
      'Invalid response from server while toggling society admin status'
    );
  }, 'Failed to update society admin status');
};

export const deleteSocietyAdmin = async (societyId: string, adminId: string): Promise<void> => {
  return withErrorHandling(async () => {
    await apiClient.delete(`/society-admin/${societyId}/${adminId}`);
  }, 'Failed to delete society admin');
};

export const sendSocietyAdminPasswordReset = async (
  societyId: string,
  adminId: string
): Promise<string> => {
  return withErrorHandling(async () => {
    const response = await apiClient.post(
      `/society-admin/${societyId}/${adminId}/send-reset-link`
    );
    const { message } = response.data ?? {};
    return message ?? 'Password reset link sent successfully';
  }, 'Failed to send password reset email');
};

export const completeSocietyAdminPasswordReset = async (payload: {
  token: string;
  email: string;
  password: string;
}): Promise<string> => {
  return withErrorHandling(async () => {
    const response = await apiClient.post('/society-admin/reset-password', payload);
    const { message } = response.data ?? {};
    return message ?? 'Password reset successful';
  }, 'Failed to reset password');
};

export const normalizationUtils = {
  normalizeSociety,
  normalizeSocietyAdmin,
};

