import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Society, SocietyAdmin } from '../types';
import {
  fetchSocieties as fetchSocietiesService,
  createSociety as createSocietyService,
  updateSociety as updateSocietyService,
  toggleSocietyStatus as toggleSocietyStatusService,
  fetchSocietyById as fetchSocietyByIdService,
  fetchSocietyAdmins as fetchSocietyAdminsService,
  createSocietyAdmin as createSocietyAdminService,
  updateSocietyAdmin as updateSocietyAdminService,
  toggleSocietyAdminStatus as toggleSocietyAdminStatusService,
  deleteSocietyAdmin as deleteSocietyAdminService,
} from '../services/societyService';

interface DataContextType {
  societies: Society[];
  isLoadingSocieties: boolean;
  societiesError: string | null;
  refreshSocieties: () => Promise<void>;
  addSociety: (society: Society) => Promise<Society>;
  updateSociety: (id: string, updates: Partial<Society>) => Promise<Society>;
  toggleSocietyStatus: (id: string) => Promise<Society>;
  deleteSociety: (id: string) => void;
  getSocietyById: (id: string) => Society | undefined;
  fetchSocietyById: (id: string) => Promise<Society | undefined>;
  allAdmins: SocietyAdmin[];
  refreshSocietyAdmins: (societyId: string) => Promise<SocietyAdmin[]>;
  createSocietyAdmin: (
    societyId: string,
    admin: Pick<SocietyAdmin, 'name' | 'email' | 'mobile'>
  ) => Promise<SocietyAdmin>;
  updateSocietyAdmin: (
    societyId: string,
    adminId: string,
    updates: Partial<Pick<SocietyAdmin, 'name' | 'email' | 'mobile'>>
  ) => Promise<SocietyAdmin>;
  toggleSocietyAdminStatus: (societyId: string, adminId: string) => Promise<SocietyAdmin>;
  deleteSocietyAdmin: (societyId: string, adminId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [isLoadingSocieties, setIsLoadingSocieties] = useState(false);
  const [societiesError, setSocietiesError] = useState<string | null>(null);

  const refreshSocieties = useCallback(async () => {
    setIsLoadingSocieties(true);
    try {
      const normalized = await fetchSocietiesService();
      setSocieties(normalized);
      setSocietiesError(null);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to load societies');
      setSocietiesError(message);
      console.error(error);
    } finally {
      setIsLoadingSocieties(false);
    }
  }, []);

  useEffect(() => {
    refreshSocieties();
  }, [refreshSocieties]);

  const addSociety = useCallback(async (society: Society): Promise<Society> => {
    try {
      const created = await createSocietyService(society);
      setSocieties((prev) => [...prev, created]);
      setSocietiesError(null);
      return created;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create society');
      throw new Error(message);
    }
  }, []);

  const updateSociety = useCallback(
    async (id: string, updates: Partial<Society>): Promise<Society> => {
      const existing = societies.find((society) => society.id === id);
      if (!existing) {
        throw new Error('Society not found');
      }

      const updatedSociety: Society = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      try {
        const normalized = await updateSocietyService(id, updatedSociety);
        setSocieties((prev) => prev.map((societyItem) => (societyItem.id === id ? normalized : societyItem)));
        setSocietiesError(null);
        return normalized;
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to update society');
        throw new Error(message);
      }
    },
    [societies]
  );

  const toggleSocietyStatus = useCallback(async (id: string): Promise<Society> => {
    try {
      const normalized = await toggleSocietyStatusService(id);
      setSocieties((prev) => prev.map((societyItem) => (societyItem.id === id ? normalized : societyItem)));
      setSocietiesError(null);
      return normalized;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update society status');
      throw new Error(message);
    }
  }, []);

  const deleteSociety = useCallback((id: string) => {
    setSocieties((prev) => prev.filter((society) => society.id !== id));
  }, []);

  const getSocietyById = useCallback(
    (id: string) => societies.find((society) => society.id === id),
    [societies]
  );

  const fetchSocietyById = useCallback(
    async (id: string): Promise<Society | undefined> => {
      try {
        const normalized = await fetchSocietyByIdService(id);
        if (!normalized) {
          return undefined;
        }

        setSocieties((prev) => {
          const exists = prev.some((society) => society.id === id);
          if (exists) {
            return prev.map((societyItem) => (societyItem.id === id ? normalized : societyItem));
          }
          return [...prev, normalized];
        });
        setSocietiesError(null);
        return normalized;
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to fetch society');
        setSocietiesError(message);
        throw new Error(message);
      }
    },
    []
  );

  const allAdmins = useMemo<SocietyAdmin[]>(() => {
    return societies.flatMap((society) => society.societyAdmins);
  }, [societies]);

  const refreshSocietyAdmins = useCallback(
    async (societyId: string): Promise<SocietyAdmin[]> => {
      try {
        const normalizedAdmins = await fetchSocietyAdminsService(societyId);
        setSocieties((prev) =>
          prev.map((society) =>
            society.id === societyId
              ? {
                  ...society,
                  societyAdmins: normalizedAdmins,
                  updatedAt: new Date().toISOString(),
                }
              : society
          )
        );
        return normalizedAdmins;
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to fetch society admins');
        throw new Error(message);
      }
    },
    []
  );

  const createSocietyAdmin = useCallback(
    async (
      societyId: string,
      admin: Pick<SocietyAdmin, 'name' | 'email' | 'mobile'>
    ): Promise<SocietyAdmin> => {
      try {
        const normalized = await createSocietyAdminService(societyId, admin);
        setSocieties((prev) =>
          prev.map((society) =>
            society.id === societyId
              ? {
                  ...society,
                  societyAdmins: [...society.societyAdmins, normalized],
                  updatedAt: new Date().toISOString(),
                }
              : society
          )
        );
        return normalized;
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to create society admin');
        throw new Error(message);
      }
    },
    []
  );

  const updateSocietyAdmin = useCallback(
    async (
      societyId: string,
      adminId: string,
      updates: Partial<Pick<SocietyAdmin, 'name' | 'email' | 'mobile'>>
    ): Promise<SocietyAdmin> => {
      try {
        const normalized = await updateSocietyAdminService(societyId, adminId, updates);
        setSocieties((prev) =>
          prev.map((society) =>
            society.id === societyId
              ? {
                  ...society,
                  societyAdmins: society.societyAdmins.map((adminItem) =>
                    adminItem.id === normalized.id ? normalized : adminItem
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : society
          )
        );
        return normalized;
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to update society admin');
        throw new Error(message);
      }
    },
    []
  );

  const toggleSocietyAdminStatus = useCallback(
    async (societyId: string, adminId: string): Promise<SocietyAdmin> => {
      try {
        const normalized = await toggleSocietyAdminStatusService(societyId, adminId);
        setSocieties((prev) =>
          prev.map((society) =>
            society.id === societyId
              ? {
                  ...society,
                  societyAdmins: society.societyAdmins.map((adminItem) =>
                    adminItem.id === normalized.id ? normalized : adminItem
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : society
          )
        );
        return normalized;
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to update society admin status');
        throw new Error(message);
      }
    },
    []
  );

  const deleteSocietyAdmin = useCallback(
    async (societyId: string, adminId: string): Promise<void> => {
      try {
        await deleteSocietyAdminService(societyId, adminId);
        setSocieties((prev) =>
          prev.map((society) =>
            society.id === societyId
              ? {
                  ...society,
                  societyAdmins: society.societyAdmins.filter((adminItem) => adminItem.id !== adminId),
                  updatedAt: new Date().toISOString(),
                }
              : society
          )
        );
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to delete society admin');
        throw new Error(message);
      }
    },
    []
  );

  return (
    <DataContext.Provider
      value={{
        societies,
        isLoadingSocieties,
        societiesError,
        refreshSocieties,
        addSociety,
        updateSociety,
        toggleSocietyStatus,
        deleteSociety,
        getSocietyById,
        fetchSocietyById,
        allAdmins,
        refreshSocietyAdmins,
        createSocietyAdmin,
        updateSocietyAdmin,
        toggleSocietyAdminStatus,
        deleteSocietyAdmin,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
