import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, MapPin, Save, ChevronDown, ChevronUp } from 'lucide-react';
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

export const SocietyForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addSociety, updateSociety, getSocietyById, fetchSocietyById } = useData();
  const { user } = useAuth();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
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
  const [entryGates, setEntryGates] = useState<Gate[]>([{ id: '1', name: '' }]);
  const [exitGates, setExitGates] = useState<Gate[]>([{ id: '1', name: '' }]);
  const [admins, setAdmins] = useState<SocietyAdmin[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingSociety, setIsFetchingSociety] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-calculate GST and total
    if (field === 'baseRate') {
      const base = parseFloat(value) || 0;
      const gst = base * 0.18;
      const total = base + gst;
      setFormData((prev) => ({
        ...prev,
        baseRate: value,
        gst: gst.toFixed(2),
        rateInclGst: total.toFixed(2),
      }));
    }
  };

  const addWing = () => {
    setWings([
      ...wings,
      {
        id: `w${Date.now()}`,
        name: '',
        totalUnits: 0,
        units: [],
      },
    ]);
  };

  const updateWing = (index: number, field: string, value: string | number) => {
    const updatedWings = [...wings];
    if (field === 'name') {
      updatedWings[index].name = value as string;
    } else if (field === 'totalUnits') {
      const count = parseInt(value as string) || 0;
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
        updatedWings[index].units = currentUnits.slice(0, count);
      }
      updatedWings[index].totalUnits = count;
    }
    setWings(updatedWings);
  };

  const updateUnitNumber = (wingIndex: number, unitIndex: number, number: string) => {
    const updatedWings = [...wings];
    updatedWings[wingIndex].units[unitIndex].number = number;
    setWings(updatedWings);
  };

  const removeWing = (index: number) => {
    const wingId = wings[index].id;
    setWings(wings.filter((_, i) => i !== index));
    setExpandedWings((prev) => {
      const next = new Set(prev);
      next.delete(wingId);
      return next;
    });
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
    } else {
      setExitGates([...exitGates, newGate]);
    }
  };

  const updateGate = (type: 'entry' | 'exit', index: number, name: string) => {
    if (type === 'entry') {
      const updated = [...entryGates];
      updated[index].name = name;
      setEntryGates(updated);
    } else {
      const updated = [...exitGates];
      updated[index].name = name;
      setExitGates(updated);
    }
  };

  const removeGate = (type: 'entry' | 'exit', index: number) => {
    if (type === 'entry') {
      setEntryGates(entryGates.filter((_, i) => i !== index));
    } else {
      setExitGates(exitGates.filter((_, i) => i !== index));
    }
  };

  const addAdmin = () => {
    setAdmins([
      ...admins,
      {
        id: `admin${Date.now()}`,
        name: '',
        mobile: '',
        email: '',
        status: 'Active',
        societyId: id || '',
        societyName: formData.societyName,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const updateAdmin = (index: number, field: string, value: string) => {
    const updated = [...admins];
    updated[index] = { ...updated[index], [field]: value };
    setAdmins(updated);
  };

  const removeAdmin = (index: number) => {
    setAdmins(admins.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.city || !formData.country) {
      toast.error('City and country are required.');
      return;
    }

    if (!formData.maintenanceDueDate) {
      toast.error('Maintenance due date is required.');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error('Latitude and longitude are required.');
      return;
    }

    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      toast.error('Latitude and longitude must be valid numbers.');
      return;
    }

    if (!formData.engagementStartDate || !formData.engagementEndDate) {
      toast.error('Engagement start and end dates are required.');
      return;
    }

    const maintenanceDueDateValue = parseInt(formData.maintenanceDueDate, 10);
    if (Number.isNaN(maintenanceDueDateValue)) {
      toast.error('Maintenance due date must be a valid number.');
      return;
    }

    const society: Society = {
      id: id || `soc${Date.now()}`,
      societyName: formData.societyName,
      address: formData.address,
      city: formData.city,
      country: formData.country,
      latitude,
      longitude,
      totalWings: wings.length,
      wings,
      entryGates: entryGates.filter((g) => g.name),
      exitGates: exitGates.filter((g) => g.name),
      societyAdmins: admins.filter((a) => a.name && a.email && a.mobile),
      engagementStartDate: formData.engagementStartDate,
      engagementEndDate: formData.engagementEndDate,
      maintenanceDueDate: maintenanceDueDateValue,
      baseRate: parseFloat(formData.baseRate) || 0,
      gst: parseFloat(formData.gst) || 0,
      rateInclGst: parseFloat(formData.rateInclGst) || 0,
      status: formData.status,
      societyPin: formData.societyPin,
      notes: formData.notes,
      createdBy: user?.name || 'Admin',
      lastUpdatedBy: user?.name || 'Admin',
      createdAt: isEditMode ? getSocietyById(id!)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

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
          <Tabs defaultValue="basic" className="space-y-6">
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
                    <Label htmlFor="societyName">Society Name *</Label>
                    <Input
                      id="societyName"
                      value={formData.societyName}
                      onChange={(e) => handleInputChange('societyName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="societyPin">Society PIN</Label>
                    <Input id="societyPin" value={formData.societyPin} disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="e.g., Mumbai"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => handleInputChange('country', value)}
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
                  </div>
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
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      placeholder="19.0760"
                    />
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
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      placeholder="72.8777"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value)}
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceDueDate">Maintenance Due Date</Label>
                    <Select
                      value={formData.maintenanceDueDate}
                      onValueChange={(value) => handleInputChange('maintenanceDueDate', value)}
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
                              <Label>Wing Name</Label>
                              <Input
                                value={wing.name}
                                onChange={(e) => updateWing(index, 'name', e.target.value)}
                                placeholder="e.g., A Wing, Tower 1"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Total Units</Label>
                              <Input
                                type="number"
                                value={wing.totalUnits}
                                onChange={(e) => updateWing(index, 'totalUnits', e.target.value)}
                                placeholder="20"
                              />
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
                                      <Label className="text-xs">Unit {unitIndex + 1}</Label>
                                      <Input
                                        value={unit.number}
                                        onChange={(e) => updateUnitNumber(index, unitIndex, e.target.value)}
                                        placeholder={`Unit ${unitIndex + 1}`}
                                        className="h-8 text-sm"
                                      />
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
                  {entryGates.map((gate, index) => (
                    <div key={gate.id} className="flex gap-2">
                      <Input
                        value={gate.name}
                        onChange={(e) => updateGate('entry', index, e.target.value)}
                        placeholder="e.g., Main Gate"
                      />
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
                  {exitGates.map((gate, index) => (
                    <div key={gate.id} className="flex gap-2">
                      <Input
                        value={gate.name}
                        onChange={(e) => updateGate('exit', index, e.target.value)}
                        placeholder="e.g., Service Gate"
                      />
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
                            <Label>Name</Label>
                            <Input
                              value={admin.name}
                              onChange={(e) => updateAdmin(index, 'name', e.target.value)}
                              placeholder="Admin Name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Mobile</Label>
                            <Input
                              value={admin.mobile}
                              onChange={(e) => updateAdmin(index, 'mobile', e.target.value)}
                              placeholder="+91-9876543210"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={admin.email}
                              onChange={(e) => updateAdmin(index, 'email', e.target.value)}
                              placeholder="admin@example.com"
                            />
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
                    <Label htmlFor="startDate">Engagement Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.engagementStartDate}
                      onChange={(e) => handleInputChange('engagementStartDate', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Engagement End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.engagementEndDate}
                      onChange={(e) => handleInputChange('engagementEndDate', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseRate">Base Rate (Excl. GST) *</Label>
                    <Input
                      id="baseRate"
                      type="number"
                      value={formData.baseRate}
                      onChange={(e) => handleInputChange('baseRate', e.target.value)}
                      placeholder="50000"
                      required
                    />
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
        </div>
        </form>
      )}
    </div>
  );
};