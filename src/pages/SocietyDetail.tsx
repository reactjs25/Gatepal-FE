import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Key,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { formatDateDDMMYYYY } from '../lib/utils';

export const SocietyDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSocietyById, fetchSocietyById, isLoadingSocieties, societiesError } = useData();
  const [isFetchingSociety, setIsFetchingSociety] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const society = id ? getSocietyById(id) : undefined;

  useEffect(() => {
    let isMounted = true;

    if (!id || society) {
      return () => {
        isMounted = false;
      };
    }

    const loadSociety = async () => {
      setIsFetchingSociety(true);
      try {
        const fetched = await fetchSocietyById(id);
        if (!isMounted) {
          return;
        }
        if (!fetched) {
          setLoadError('Society not found');
        } else {
          setLoadError(null);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Failed to load society';
        setLoadError(message);
      } finally {
        if (isMounted) {
          setIsFetchingSociety(false);
        }
      }
    };

    void loadSociety();

    return () => {
      isMounted = false;
    };
  }, [id, society, fetchSocietyById]);

  if (!society) {
    if (isLoadingSocieties || isFetchingSociety) {
      return (
        <div className="p-8">
          <p className="text-gray-600">Loading society details...</p>
        </div>
      );
    }

    const message = loadError ?? societiesError ?? 'Society not found';

    return (
      <div className="p-8">
        <p className={loadError ? 'validation-message' : 'text-gray-600'}>{message}</p>
      </div>
    );
  }

  const totalUnits = society.wings.reduce((sum, wing) => sum + wing.totalUnits, 0);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/societies')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Societies
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-gray-900">{society.societyName}</h1>
              <Badge
                variant={society.status === 'Active' ? 'default' : 'secondary'}
                className={
                  society.status === 'Active'
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : ''
                }
              >
                {society.status}
              </Badge>
            </div>
            <p className="text-gray-600">{society.address}</p>
          </div>
          <Button onClick={() => navigate(`/societies/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-1.5" />
            Edit Society
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Wings</p>
                <p className="text-gray-900">{society.totalWings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Units</p>
                <p className="text-gray-900">{totalUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Society Admins</p>
                <p className="text-gray-900">{society.societyAdmins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Society PIN</p>
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {society.societyPin}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Society Name</p>
                <p className="text-gray-900">{society.societyName}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-gray-600 mb-1">Address</p>
                <p className="text-gray-900">{society.address}</p>
              </div>
              {(society.city || society.country) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    {society.city && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">City</p>
                        <p className="text-gray-900">{society.city}</p>
                      </div>
                    )}
                    {society.country && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Country</p>
                        <p className="text-gray-900">{society.country}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              {(society.latitude || society.longitude) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Latitude
                      </p>
                      <p className="text-gray-900">{society.latitude}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Longitude
                      </p>
                      <p className="text-gray-900">{society.longitude}</p>
                    </div>
                  </div>
                </>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge
                    variant={society.status === 'Active' ? 'default' : 'secondary'}
                    className={
                      society.status === 'Active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : ''
                    }
                  >
                    {society.status}
                  </Badge>
                </div>
                {society.maintenanceDueDate && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Maintenance Due Date</p>
                    <p className="text-gray-900">Date {society.maintenanceDueDate} of every month</p>
                  </div>
                )}
              </div>
              {society.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Notes</p>
                    <p className="text-gray-900">{society.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Entry Gates</CardTitle>
              </CardHeader>
              <CardContent>
                {society.entryGates.length === 0 ? (
                  <p className="text-sm text-gray-500">No entry gates defined</p>
                ) : (
                  <ul className="space-y-2">
                    {society.entryGates.map((gate) => (
                      <li key={gate.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        <span className="text-gray-900">{gate.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exit Gates</CardTitle>
              </CardHeader>
              <CardContent>
                {society.exitGates.length === 0 ? (
                  <p className="text-sm text-gray-500">No exit gates defined</p>
                ) : (
                  <ul className="space-y-2">
                    {society.exitGates.map((gate) => (
                      <li key={gate.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-600 rounded-full" />
                        <span className="text-gray-900">{gate.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="structure" className="mt-6">
          <div className="space-y-4">
            {society.wings.map((wing) => (
              <Card key={wing.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{wing.name}</span>
                    <Badge variant="secondary">{wing.totalUnits} Units</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-8 gap-2">
                    {wing.units.map((unit) => (
                      <div
                        key={unit.id}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-center text-sm"
                      >
                        {unit.number}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="admins" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {society.societyAdmins.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No admins assigned</p>
              ) : (
                <div className="space-y-4">
                  {society.societyAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-gray-900">{admin.name}</p>
                          <p className="text-sm text-gray-600">{admin.email}</p>
                          <p className="text-sm text-gray-600">{admin.mobile}</p>
                        </div>
                      </div>
                      <Badge
                        variant={admin.status === 'Active' ? 'default' : 'secondary'}
                        className={
                          admin.status === 'Active'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : ''
                        }
                      >
                        {admin.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Start Date
                    </p>
                    <p className="text-gray-900">
                      {formatDateDDMMYYYY(society.engagementStartDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      End Date
                    </p>
                    <p className="text-gray-900">
                      {formatDateDDMMYYYY(society.engagementEndDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <DollarSign className="w-5 h-5 inline mr-2" />
                  Pricing Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Base Rate (Excl. GST)</span>
                    <span className="text-gray-900">
                      ₹{society.baseRate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-gray-600">GST (18%)</span>
                    <span className="text-gray-900">₹{society.gst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900">Total (Incl. GST)</span>
                    <span className="text-gray-900">
                      ₹{society.rateInclGst.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};