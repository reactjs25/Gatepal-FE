import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, MapPin, Save, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Society, Wing, Gate, SocietyAdmin } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

type FormState = {
  societyName: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  status: Society['status'];
  societyPin: string;
  maintenanceDueDate: string;
  engagementStartDate: string;
  engagementEndDate: string;
  baseRate: string;
  gst: string;
  rateInclGst: string;
  notes: string;
};

const tabOrder = ['basic', 'structure', 'gates', 'admins', 'engagement'] as const;
type TabKey = (typeof tabOrder)[number];

export const SocietyForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addSociety, updateSociety, getSocietyById, fetchSocietyById } = useData();
  const { user } = useAuth();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<FormState>({
    societyName: '',
    address: '',
    city: '',
    country: '',
    latitude: '',
    longitude: '',
    status: 'Active' as Society['status'],
    societyPin: '',
    maintenanceDueDate: '',
    engagementStartDate: '',
    engagementEndDate: '',
    baseRate: '',
    gst: '',
    rateInclGst: '',
    notes: '',
  });

  const [wings, setWings] = useState<Wing[]>([]);
  const [expandedWings, setExpandedWings] = useState<Set<string>>(new Set());
  const [entryGates, setEntryGates] = useState<Gate[]>([{ id: 'entry-initial', name: '' }]);
  const [exitGates, setExitGates] = useState<Gate[]>([{ id: 'exit-initial', name: '' }]);
  const [admins, setAdmins] = useState<SocietyAdmin[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingSociety, setIsFetchingSociety] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLocationFetching, setIsLocationFetching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const hasAutoFetchedLocation = useRef(false);
  const formDataRef = useRef(formData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const fetchCurrentLocation = useCallback(
    (options?: { skipIfFilled?: boolean }) => {
      if (options?.skipIfFilled) {
        const { latitude, longitude } = formDataRef.current;
        if (latitude.trim() !== '' && longitude.trim() !== '') {
          return;
        }
      }

      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        setLocationError('Geolocation is not supported by this browser.');
        return;
      }

      setIsLocationFetching(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocationFetching(false);
          const { latitude, longitude } = position.coords;
          setFormData((prev) => ({
            ...prev,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
          }));
          setErrors((prev) => {
            if (!prev['basic.latitude'] && !prev['basic.longitude']) {
              return prev;
            }
            const { ['basic.latitude']: _lat, ['basic.longitude']: _lng, ...rest } = prev;
            return rest;
          });
        },
        (error) => {
          setIsLocationFetching(false);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationError('Location permission denied. Enter coordinates manually.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setLocationError('Location unavailable. Try again or enter manually.');
          } else if (error.code === error.TIMEOUT) {
            setLocationError('Fetching location timed out. Try again.');
          } else {
            setLocationError('Unable to fetch current location.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    },
    [formDataRef]
  );

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!(key in prev)) {
        return prev;
      }
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const clearErrorsByPrefix = (prefix: string) => {
    setErrors((prev) => {
      const entries = Object.entries(prev);
      const filtered = entries.filter(([key]) => !key.startsWith(prefix));
      if (filtered.length === entries.length) {
        return prev;
      }
      return Object.fromEntries(filtered);
    });
  };

  useEffect(() => {
    let isMounted = true;

    const cloneWings = (source: Wing[]): Wing[] =>
      source.map((wing) => ({
        ...wing,
        units: wing.units.map((unit) => ({ ...unit })),
      }));

    const ensureGates = (gates: Gate[], type: 'entry' | 'exit'): Gate[] => {
      if (gates.length === 0) {
        return [{ id: `${type}-${Date.now()}`, name: '' }];
      }
      return gates.map((gate) => ({ ...gate }));
    };

    const cloneAdmins = (source: SocietyAdmin[]): SocietyAdmin[] =>
      source.map((admin) => ({ ...admin }));

    const populateFromSociety = (society: Society) => {
      setFormData({
        societyName: society.societyName,
        address: society.address,
        city: society.city || '',
        country: society.country || '',
        latitude: society.latitude?.toString() || '',
        longitude: society.longitude?.toString() || '',
        status: society.status,
        societyPin: society.societyPin,
        maintenanceDueDate: society.maintenanceDueDate?.toString() || '',
        engagementStartDate: society.engagementStartDate,
        engagementEndDate: society.engagementEndDate,
        baseRate: society.baseRate.toString(),
        gst: society.gst.toString(),
        rateInclGst: society.rateInclGst.toString(),
        notes: society.notes || '',
      });
      setWings(cloneWings(society.wings));
      setEntryGates(ensureGates(society.entryGates, 'entry'));
      setExitGates(ensureGates(society.exitGates, 'exit'));
      setAdmins(cloneAdmins(society.societyAdmins));
    };

    const initialize = async () => {
      if (hasInitialized) {
        return;
      }

      if (isEditMode && id) {
        const existing = getSocietyById(id);
        if (existing) {
          populateFromSociety(existing);
          setHasInitialized(true);
          return;
        }

        setIsFetchingSociety(true);
        try {
          const fetched = await fetchSocietyById(id);
          if (!isMounted) {
            return;
          }

          if (fetched) {
            populateFromSociety(fetched);
            setHasInitialized(true);
          } else {
            toast.error('Society not found');
            navigate('/societies');
          }
        } catch (error) {
          if (!isMounted) {
            return;
          }
          const message =
            error instanceof Error ? error.message : 'Failed to load society details.';
          toast.error(message);
          navigate('/societies');
        } finally {
          if (isMounted) {
            setIsFetchingSociety(false);
          }
        }
      } else if (!isEditMode) {
        const pin = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
        if (isMounted) {
          setFormData((prev) => ({ ...prev, societyPin: pin.toString() }));
          setHasInitialized(true);
        }
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, getSocietyById, fetchSocietyById, navigate, hasInitialized]);

  useEffect(() => {
    if (isEditMode || !hasInitialized || hasAutoFetchedLocation.current) {
      return;
    }

    hasAutoFetchedLocation.current = true;
    fetchCurrentLocation({ skipIfFilled: true });
  }, [isEditMode, hasInitialized, fetchCurrentLocation]);

  const handleInputChange = (field: keyof FormState, value: string, errorKey?: string) => {
    setFormData((prev) => {
      if (field === 'baseRate') {
        const parsed = parseFloat(value);
        const base = Number.isNaN(parsed) ? 0 : parsed;
        const gst = base * 0.18;
        const total = base + gst;
        return {
          ...prev,
          baseRate: value,
          gst: gst.toFixed(2),
          rateInclGst: total.toFixed(2),
        };
      }
      return { ...prev, [field]: value };
    });

    if (errorKey) {
      clearError(errorKey);
    }
  };

  const addWing = () => {
    const newWing: Wing = {
      id: `w${Date.now()}`,
      name: '',
      totalUnits: 0,
      units: [],
    };
    setWings([...wings, newWing]);
    clearError('structure.general');
  };

  const updateWing = (index: number, field: string, value: string | number) => {
    const updatedWings = [...wings];
    if (field === 'name') {
      updatedWings[index].name = value as string;
      clearError(`structure.wings.${updatedWings[index].id}.name`);
    } else if (field === 'totalUnits') {
      const count = parseInt(value as string, 10) || 0;
      const currentUnits = updatedWings[index].units || [];

      // If increasing units, add new ones
      if (count > currentUnits.length) {
        const newUnits = Array.from({ length: count - currentUnits.length }, (_, i) => ({
          id: `${updatedWings[index].id}-u${currentUnits.length + i + 1}`,
          number: `${updatedWings[index].name || 'Unit'}-${currentUnits.length + i + 1}`,
        }));
        updatedWings[index].units = [...currentUnits, ...newUnits];
      } else {
        // If decreasing, trim the array
        const removedUnits = currentUnits.slice(count);
        updatedWings[index].units = currentUnits.slice(0, count);
        removedUnits.forEach((unit) => {
          clearErrorsByPrefix(`structure.wings.${updatedWings[index].id}.units.${unit.id}`);
        });
      }
      updatedWings[index].totalUnits = count;
      clearError(`structure.wings.${updatedWings[index].id}.totalUnits`);
      if (count > 0) {
        clearError('structure.general');
      }
    }
    setWings(updatedWings);
  };

  const updateUnitNumber = (wingIndex: number, unitIndex: number, number: string) => {
    const updatedWings = [...wings];
    updatedWings[wingIndex].units[unitIndex].number = number;
    setWings(updatedWings);
    const wingId = updatedWings[wingIndex].id;
    const unitId = updatedWings[wingIndex].units[unitIndex].id;
    clearError(`structure.wings.${wingId}.units.${unitId}`);
  };

  const removeWing = (index: number) => {
    const wingId = wings[index]?.id;
    setWings(wings.filter((_, i) => i !== index));
    setExpandedWings((prev) => {
      const next = new Set(prev);
      next.delete(wingId);
      return next;
    });
    if (wingId) {
      clearErrorsByPrefix(`structure.wings.${wingId}`);
    }
  };

  const toggleWingExpanded = (wingId: string) => {
    setExpandedWings((prev) => {
      const next = new Set(prev);
      if (next.has(wingId)) {
        next.delete(wingId);
      } else {
        next.add(wingId);
      }
      return next;
    });
  };

  const addGate = (type: 'entry' | 'exit') => {
    const newGate = { id: `${type}${Date.now()}`, name: '' };
    if (type === 'entry') {
      setEntryGates([...entryGates, newGate]);
      clearError('gates.entry.general');
    } else {
      setExitGates([...exitGates, newGate]);
      clearError('gates.exit.general');
    }
  };

  const updateGate = (type: 'entry' | 'exit', index: number, name: string) => {
    if (type === 'entry') {
      const updated = [...entryGates];
      updated[index].name = name;
      setEntryGates(updated);
      clearError(`gates.entry.${updated[index].id}.name`);
      clearError('gates.entry.general');
    } else {
      const updated = [...exitGates];
      updated[index].name = name;
      setExitGates(updated);
      clearError(`gates.exit.${updated[index].id}.name`);
      clearError('gates.exit.general');
    }
  };

  const removeGate = (type: 'entry' | 'exit', index: number) => {
    if (type === 'entry') {
      const gateId = entryGates[index]?.id;
      setEntryGates(entryGates.filter((_, i) => i !== index));
      if (gateId) {
        clearErrorsByPrefix(`gates.entry.${gateId}`);
      }
    } else {
      const gateId = exitGates[index]?.id;
      setExitGates(exitGates.filter((_, i) => i !== index));
      if (gateId) {
        clearErrorsByPrefix(`gates.exit.${gateId}`);
      }
    }
  };

  const addAdmin = () => {
    const newAdmin: SocietyAdmin = {
      id: `admin${Date.now()}`,
      name: '',
      mobile: '',
      email: '',
      status: 'Active',
      societyId: id || '',
      societyName: formData.societyName.trim(),
      createdAt: new Date().toISOString(),
    };
    setAdmins([...admins, newAdmin]);
    clearError('admins.general');
  };

  const updateAdmin = (index: number, field: string, value: string) => {
    const updated = [...admins];
    updated[index] = { ...updated[index], [field]: value };
    setAdmins(updated);
    const adminId = updated[index].id;
    if (field === 'name') {
      clearError(`admins.${adminId}.name`);
    }
    if (field === 'mobile') {
      clearError(`admins.${adminId}.mobile`);
    }
    if (field === 'email') {
      clearError(`admins.${adminId}.email`);
    }
  };

  const removeAdmin = (index: number) => {
    const adminId = admins[index]?.id;
    setAdmins(admins.filter((_, i) => i !== index));
    if (adminId) {
      clearErrorsByPrefix(`admins.${adminId}`);
    }
  };

  const validateTab = (tab: TabKey): boolean => {
    const tabErrors: Record<string, string> = {};

    if (tab === 'basic') {
      if (!formData.societyName.trim()) {
        tabErrors['basic.societyName'] = 'Society name is required.';
      }
      if (!formData.address.trim()) {
        tabErrors['basic.address'] = 'Address is required.';
      }
      if (!formData.city.trim()) {
        tabErrors['basic.city'] = 'City is required.';
      }
      if (!formData.country.trim()) {
        tabErrors['basic.country'] = 'Country is required.';
      }
      if (!formData.status.trim()) {
        tabErrors['basic.status'] = 'Status is required.';
      }
      if (!formData.maintenanceDueDate.trim()) {
        tabErrors['basic.maintenanceDueDate'] = 'Maintenance due date is required.';
      } else {
        const day = Number(formData.maintenanceDueDate);
        if (Number.isNaN(day) || day < 1 || day > 30) {
          tabErrors['basic.maintenanceDueDate'] = 'Select a valid day between 1 and 30.';
        }
      }
      if (formData.latitude.trim()) {
        const latitude = Number(formData.latitude);
        if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
          tabErrors['basic.latitude'] = 'Enter a valid latitude.';
        }
      }
      if (formData.longitude.trim()) {
        const longitude = Number(formData.longitude);
        if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
          tabErrors['basic.longitude'] = 'Enter a valid longitude.';
        }
      }
    }

    if (tab === 'structure') {
      if (wings.length === 0) {
        tabErrors['structure.general'] = 'Add at least one wing.';
      }
      wings.forEach((wing) => {
        const wingKey = `structure.wings.${wing.id}`;
        if (!wing.name.trim()) {
          tabErrors[`${wingKey}.name`] = 'Wing name is required.';
        }
        if (!wing.totalUnits || wing.totalUnits <= 0) {
          tabErrors[`${wingKey}.totalUnits`] = 'Total units must be greater than 0.';
        }
        wing.units.forEach((unit) => {
          if (!unit.number.trim()) {
            tabErrors[`${wingKey}.units.${unit.id}`] = 'Unit number is required.';
          }
        });
      });
    }

    if (tab === 'gates') {
      if (entryGates.length === 0) {
        tabErrors['gates.entry.general'] = 'Add at least one entry gate.';
      }
      entryGates.forEach((gate) => {
        if (!gate.name.trim()) {
          tabErrors[`gates.entry.${gate.id}.name`] = 'Entry gate name is required.';
        }
      });
      if (exitGates.length === 0) {
        tabErrors['gates.exit.general'] = 'Add at least one exit gate.';
      }
      exitGates.forEach((gate) => {
        if (!gate.name.trim()) {
          tabErrors[`gates.exit.${gate.id}.name`] = 'Exit gate name is required.';
        }
      });
    }

    if (tab === 'admins') {
      if (admins.length === 0) {
        tabErrors['admins.general'] = 'Add at least one society admin.';
      }
      const emailRegex = /\S+@\S+\.\S+/;
      admins.forEach((admin) => {
        const adminKey = `admins.${admin.id}`;
        if (!admin.name.trim()) {
          tabErrors[`${adminKey}.name`] = 'Admin name is required.';
        }
        if (!admin.mobile.trim()) {
          tabErrors[`${adminKey}.mobile`] = 'Admin mobile is required.';
        }
        if (!admin.email.trim()) {
          tabErrors[`${adminKey}.email`] = 'Admin email is required.';
        } else if (!emailRegex.test(admin.email.trim())) {
          tabErrors[`${adminKey}.email`] = 'Enter a valid email address.';
        }
      });
    }

    if (tab === 'engagement') {
      if (!formData.engagementStartDate.trim()) {
        tabErrors['engagement.engagementStartDate'] = 'Engagement start date is required.';
      }
      if (!formData.engagementEndDate.trim()) {
        tabErrors['engagement.engagementEndDate'] = 'Engagement end date is required.';
      }
      if (formData.engagementStartDate && formData.engagementEndDate) {
        const start = new Date(formData.engagementStartDate);
        const end = new Date(formData.engagementEndDate);
        if (start > end) {
          tabErrors['engagement.engagementEndDate'] = 'End date must be after start date.';
        }
      }
      if (!formData.baseRate.trim()) {
        tabErrors['engagement.baseRate'] = 'Base rate is required.';
      } else {
        const base = Number(formData.baseRate);
        if (Number.isNaN(base) || base <= 0) {
          tabErrors['engagement.baseRate'] = 'Enter a valid base rate greater than 0.';
        }
      }
    }

    setErrors((prev) => {
      const remaining = Object.entries(prev).filter(([key]) => !key.startsWith(`${tab}.`));
      return { ...Object.fromEntries(remaining), ...tabErrors };
    });

    return Object.keys(tabErrors).length === 0;
  };

  const handleTabChange = (value: string) => {
    const newTab = value as TabKey;
    if (!tabOrder.includes(newTab)) {
      return;
    }
    if (newTab === activeTab) {
      return;
    }
    const currentIndex = tabOrder.indexOf(activeTab);
    const targetIndex = tabOrder.indexOf(newTab);

    if (targetIndex > currentIndex) {
      const isValid = validateTab(activeTab);
      if (!isValid) {
        return;
      }
    }
    setActiveTab(newTab);
  };

  const handleNext = () => {
    const isValid = validateTab(activeTab);
    if (!isValid) {
      return;
    }
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextTab = tabOrder[currentIndex + 1];
    if (nextTab) {
      setActiveTab(nextTab);
    }
  };

  const handlePrevious = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const prevTab = tabOrder[currentIndex - 1];
    if (prevTab) {
      setActiveTab(prevTab);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let firstInvalid: TabKey | null = null;
    tabOrder.forEach((tab) => {
      const isValid = validateTab(tab);
      if (!isValid && firstInvalid === null) {
        firstInvalid = tab;
      }
    });

    if (firstInvalid) {
      setActiveTab(firstInvalid);
      return;
    }

    const latitudeValue = formData.latitude.trim()
      ? Number.parseFloat(formData.latitude.trim())
      : undefined;
    const longitudeValue = formData.longitude.trim()
      ? Number.parseFloat(formData.longitude.trim())
      : undefined;
    const maintenanceDueDateValue = Number.parseInt(formData.maintenanceDueDate, 10);

    const societyIdValue = id ? id : `soc${Date.now()}`;
    const baseRateValue = Number.parseFloat(formData.baseRate.trim());
    const gstValue = Number.isNaN(baseRateValue)
      ? 0
      : Number.parseFloat((baseRateValue * 0.18).toFixed(2));
    const rateInclGstValue = Number.isNaN(baseRateValue)
      ? 0
      : Number.parseFloat((baseRateValue + baseRateValue * 0.18).toFixed(2));
    const notesValue = formData.notes.trim();

    const sanitizedWings = wings.map((wing) => ({
      ...wing,
      name: wing.name.trim(),
      units: wing.units.map((unit) => ({
        ...unit,
        number: unit.number.trim(),
      })),
    }));

    const sanitizedEntryGates = entryGates
      .map((gate) => ({ ...gate, name: gate.name.trim() }))
      .filter((gate) => gate.name);

    const sanitizedExitGates = exitGates
      .map((gate) => ({ ...gate, name: gate.name.trim() }))
      .filter((gate) => gate.name);

    const sanitizedAdmins = admins
      .map((admin) => ({
        ...admin,
        societyId: societyIdValue,
        societyName: formData.societyName.trim(),
        name: admin.name.trim(),
        email: admin.email.trim(),
        mobile: admin.mobile.trim(),
      }))
      .filter((admin) => admin.name && admin.email && admin.mobile);

    const society: Society = {
      id: societyIdValue,
      societyName: formData.societyName.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      country: formData.country.trim(),
      totalWings: sanitizedWings.length,
      wings: sanitizedWings,
      entryGates: sanitizedEntryGates,
      exitGates: sanitizedExitGates,
      societyAdmins: sanitizedAdmins,
      engagementStartDate: formData.engagementStartDate,
      engagementEndDate: formData.engagementEndDate,
      maintenanceDueDate: maintenanceDueDateValue,
      baseRate: baseRateValue,
      gst: gstValue,
      rateInclGst: rateInclGstValue,
      status: formData.status,
      societyPin: formData.societyPin,
      notes: notesValue || undefined,
      createdBy: user?.name || 'Admin',
      lastUpdatedBy: user?.name || 'Admin',
      createdAt: isEditMode ? getSocietyById(id!)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (latitudeValue !== undefined) {
      society.latitude = latitudeValue;
    }
    if (longitudeValue !== undefined) {
      society.longitude = longitudeValue;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        await updateSociety(id, society);
        toast.success('Society updated successfully');
      } else {
        await addSociety(society);
        toast.success('Society created successfully');
      }
      navigate('/societies');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save society. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isEditMode && (!hasInitialized || isFetchingSociety);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/societies')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Societies
        </Button>
        <h1 className="text-gray-900">{isEditMode ? 'Edit Society' : 'Create New Society'}</h1>
        <p className="text-gray-600">
          {isEditMode ? 'Update society details' : 'Fill in the details to register a new society'}
        </p>
      </div>

      {isBusy ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          Loading society details...
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="gates">Gates</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>

          {/* Basic Info */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="societyName">
                      Society Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="societyName"
                      value={formData.societyName}
                      onChange={(e) =>
                        handleInputChange('societyName', e.target.value, 'basic.societyName')
                      }
                      required
                    />
                    {errors['basic.societyName'] && (
                      <p className="text-sm text-red-600">{errors['basic.societyName']}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="societyPin">Society PIN</Label>
                    <Input id="societyPin" value={formData.societyPin} disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value, 'basic.address')}
                    rows={3}
                    required
                  />
                  {errors['basic.address'] && (
                    <p className="text-sm text-red-600">{errors['basic.address']}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value, 'basic.city')}
                      placeholder="e.g., Mumbai"
                      required
                    />
                    {errors['basic.city'] && (
                      <p className="text-sm text-red-600">{errors['basic.city']}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">
                      Country <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => handleInputChange('country', value, 'basic.country')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Singapore">Singapore</SelectItem>
                        <SelectItem value="UAE">UAE</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Japan">Japan</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors['basic.country'] && (
                      <p className="text-sm text-red-600">{errors['basic.country']}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <p className="text-sm text-gray-600">
                      Detect your current location to auto-fill coordinates.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fetchCurrentLocation()}
                      disabled={isLocationFetching}
                    >
                      {isLocationFetching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Detecting...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-1" />
                          Use Current Location
                        </>
                      )}
                    </Button>
                  </div>
                  {locationError && <p className="text-sm text-red-600">{locationError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Latitude
                    </Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange('latitude', e.target.value, 'basic.latitude')}
                      placeholder="19.0760"
                    />
                    {errors['basic.latitude'] && (
                      <p className="text-sm text-red-600">{errors['basic.latitude']}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Longitude
                    </Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) =>
                        handleInputChange('longitude', e.target.value, 'basic.longitude')
                      }
                      placeholder="72.8777"
                    />
                    {errors['basic.longitude'] && (
                      <p className="text-sm text-red-600">{errors['basic.longitude']}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value, 'basic.status')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Trial">Trial</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors['basic.status'] && (
                      <p className="text-sm text-red-600">{errors['basic.status']}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceDueDate">
                      Maintenance Due Date <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.maintenanceDueDate}
                      onValueChange={(value) =>
                        handleInputChange('maintenanceDueDate', value, 'basic.maintenanceDueDate')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day of month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors['basic.maintenanceDueDate'] && (
                      <p className="text-sm text-red-600">
                        {errors['basic.maintenanceDueDate']}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes / Internal Comments</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Structure */}
          <TabsContent value="structure">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Wings & Units</CardTitle>
                  <Button type="button" onClick={addWing}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Wing
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors['structure.general'] && (
                  <p className="text-sm text-red-600">{errors['structure.general']}</p>
                )}
                {wings.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No wings added yet. Click "Add Wing" to get started.
                  </p>
                ) : (
                  wings.map((wing, index) => {
                    const isExpanded = expandedWings.has(wing.id);
                    return (
                      <div key={wing.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>
                                Wing Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={wing.name}
                                onChange={(e) => updateWing(index, 'name', e.target.value)}
                                placeholder="e.g., A Wing, Tower 1"
                                required
                              />
                              {errors[`structure.wings.${wing.id}.name`] && (
                                <p className="text-sm text-red-600">
                                  {errors[`structure.wings.${wing.id}.name`]}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>
                                Total Units <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="number"
                                value={wing.totalUnits}
                                onChange={(e) => updateWing(index, 'totalUnits', e.target.value)}
                                placeholder="20"
                                min={1}
                                required
                              />
                              {errors[`structure.wings.${wing.id}.totalUnits`] && (
                                <p className="text-sm text-red-600">
                                  {errors[`structure.wings.${wing.id}.totalUnits`]}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWing(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {wing.totalUnits > 0 && (
                          <div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleWingExpanded(wing.id)}
                              className="w-full justify-between hover:bg-gray-50"
                            >
                              <span className="text-sm text-gray-600">
                                {wing.totalUnits} unit{wing.totalUnits !== 1 ? 's' : ''} - Click to {isExpanded ? 'hide' : 'edit'} unit numbers
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>

                            {isExpanded && (
                              <div className="mt-3 pl-4 pr-4 pb-2 space-y-2 border-l-2 border-blue-200">
                                <p className="text-xs text-gray-500 mb-2">
                                  Customize unit numbers for this wing:
                                </p>
                                <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                                  {wing.units.map((unit, unitIndex) => (
                                    <div key={unit.id} className="space-y-1">
                                      <Label className="text-xs">
                                        Unit {unitIndex + 1}{' '}
                                        <span className="text-red-500">*</span>
                                      </Label>
                                      <Input
                                        value={unit.number}
                                        onChange={(e) => updateUnitNumber(index, unitIndex, e.target.value)}
                                        placeholder={`Unit ${unitIndex + 1}`}
                                        className="h-8 text-sm"
                                        required
                                      />
                                      {errors[
                                        `structure.wings.${wing.id}.units.${unit.id}`
                                      ] && (
                                        <p className="text-xs text-red-600">
                                          {
                                            errors[
                                              `structure.wings.${wing.id}.units.${unit.id}`
                                            ]
                                          }
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gates */}
          <TabsContent value="gates">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Entry Gates</CardTitle>
                    <Button type="button" size="sm" onClick={() => addGate('entry')}>
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {errors['gates.entry.general'] && (
                    <p className="text-sm text-red-600">{errors['gates.entry.general']}</p>
                  )}
                  {entryGates.map((gate, index) => (
                    <div key={gate.id} className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Label>
                          Entry Gate Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={gate.name}
                          onChange={(e) => updateGate('entry', index, e.target.value)}
                          placeholder="e.g., Main Gate"
                          required
                        />
                        {errors[`gates.entry.${gate.id}.name`] && (
                          <p className="text-sm text-red-600">
                            {errors[`gates.entry.${gate.id}.name`]}
                          </p>
                        )}
                      </div>
                      {entryGates.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGate('entry', index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Exit Gates</CardTitle>
                    <Button type="button" size="sm" onClick={() => addGate('exit')}>
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {errors['gates.exit.general'] && (
                    <p className="text-sm text-red-600">{errors['gates.exit.general']}</p>
                  )}
                  {exitGates.map((gate, index) => (
                    <div key={gate.id} className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Label>
                          Exit Gate Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={gate.name}
                          onChange={(e) => updateGate('exit', index, e.target.value)}
                          placeholder="e.g., Service Gate"
                          required
                        />
                        {errors[`gates.exit.${gate.id}.name`] && (
                          <p className="text-sm text-red-600">
                            {errors[`gates.exit.${gate.id}.name`]}
                          </p>
                        )}
                      </div>
                      {exitGates.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGate('exit', index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admins */}
          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Society Admins</CardTitle>
                  <Button type="button" onClick={addAdmin}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Admin
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors['admins.general'] && (
                  <p className="text-sm text-red-600">{errors['admins.general']}</p>
                )}
                {admins.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No admins added yet. Click "Add Admin" to get started.
                  </p>
                ) : (
                  admins.map((admin, index) => (
                    <div key={admin.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                              <Label>
                                Name <span className="text-red-500">*</span>
                              </Label>
                            <Input
                              value={admin.name}
                              onChange={(e) => updateAdmin(index, 'name', e.target.value)}
                              placeholder="Admin Name"
                                required
                            />
                              {errors[`admins.${admin.id}.name`] && (
                                <p className="text-sm text-red-600">
                                  {errors[`admins.${admin.id}.name`]}
                                </p>
                              )}
                          </div>
                          <div className="space-y-2">
                              <Label>
                                Mobile <span className="text-red-500">*</span>
                              </Label>
                            <Input
                              value={admin.mobile}
                              onChange={(e) => updateAdmin(index, 'mobile', e.target.value)}
                              placeholder="+91-9876543210"
                                required
                            />
                              {errors[`admins.${admin.id}.mobile`] && (
                                <p className="text-sm text-red-600">
                                  {errors[`admins.${admin.id}.mobile`]}
                                </p>
                              )}
                          </div>
                          <div className="space-y-2">
                              <Label>
                                Email <span className="text-red-500">*</span>
                              </Label>
                            <Input
                              type="email"
                              value={admin.email}
                              onChange={(e) => updateAdmin(index, 'email', e.target.value)}
                              placeholder="admin@example.com"
                                required
                            />
                              {errors[`admins.${admin.id}.email`] && (
                                <p className="text-sm text-red-600">
                                  {errors[`admins.${admin.id}.email`]}
                                </p>
                              )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAdmin(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagement */}
          <TabsContent value="engagement">
            <Card>
              <CardHeader>
                <CardTitle>Engagement & Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">
                      Engagement Start Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.engagementStartDate}
                      onChange={(e) =>
                        handleInputChange(
                          'engagementStartDate',
                          e.target.value,
                          'engagement.engagementStartDate',
                        )
                      }
                      required
                    />
                    {errors['engagement.engagementStartDate'] && (
                      <p className="text-sm text-red-600">
                        {errors['engagement.engagementStartDate']}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">
                      Engagement End Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.engagementEndDate}
                      onChange={(e) =>
                        handleInputChange(
                          'engagementEndDate',
                          e.target.value,
                          'engagement.engagementEndDate',
                        )
                      }
                      required
                    />
                    {errors['engagement.engagementEndDate'] && (
                      <p className="text-sm text-red-600">
                        {errors['engagement.engagementEndDate']}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseRate">
                      Base Rate (Excl. GST) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="baseRate"
                      type="number"
                      value={formData.baseRate}
                      onChange={(e) => handleInputChange('baseRate', e.target.value, 'engagement.baseRate')}
                      placeholder="50000"
                      required
                    />
                    {errors['engagement.baseRate'] && (
                      <p className="text-sm text-red-600">{errors['engagement.baseRate']}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst">GST (18%)</Label>
                    <Input id="gst" value={formData.gst} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rateInclGst">Total (Incl. GST)</Label>
                    <Input id="rateInclGst" value={formData.rateInclGst} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-4 mt-8">
          <Button type="button" variant="outline" onClick={() => navigate('/societies')}>
            Cancel
          </Button>
          {activeTab !== 'basic' && (
            <Button type="button" variant="ghost" onClick={handlePrevious}>
              Previous
            </Button>
          )}
          {activeTab === 'engagement' ? (
            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-1.5" />
              {isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                ? 'Update Society'
                : 'Create Society'}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          )}
        </div>
        </form>
      )}
    </div>
  );
};