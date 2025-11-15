import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Eye,
  Power,
  Loader2,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Society } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
};

const normalizeHeaderKey = (header: string) => header.trim().toLowerCase().replace(/[\s_-]+/g, '');

const escapeCsvValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const parseFlexibleDate = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const parts = trimmed.split(/[/-]/);
  if (parts.length === 3) {
    let day: number;
    let month: number;
    let year: number;

    if (parts[0].length === 4) {
      year = Number.parseInt(parts[0], 10);
      month = Number.parseInt(parts[1], 10) - 1;
      day = Number.parseInt(parts[2], 10);
    } else {
      day = Number.parseInt(parts[0], 10);
      month = Number.parseInt(parts[1], 10) - 1;
      year = Number.parseInt(parts[2], 10);
    }

    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      day > 0 &&
      month >= 0 &&
      month < 12
    ) {
      const composed = new Date(Date.UTC(year, month, day));
      if (!Number.isNaN(composed.getTime())) {
        return composed;
      }
    }
  }

  return null;
};

const formatDateForCsv = (value: string | null | undefined) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0];
};

const normalizeStatus = (value: string): 'Active' | 'Inactive' | 'Trial' => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'inactive') {
    return 'Inactive';
  }
  if (normalized === 'trial') {
    return 'Trial';
  }
  return 'Active';
};

const parseOptionalNumber = (value: string | undefined, fallback?: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

export const SocietyList: React.FC = () => {
  const { societies, toggleSocietyStatus, isLoadingSocieties, societiesError, addSociety } =
    useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [togglingSocietyId, setTogglingSocietyId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredSocieties = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return societies.filter((society) => {
      const matchesSearch =
        !query ||
        society.societyName.toLowerCase().includes(query) ||
        society.address.toLowerCase().includes(query) ||
        society.societyPin.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || society.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [societies, searchQuery, statusFilter]);

  const handleExportSocieties = () => {
    if (filteredSocieties.length === 0) {
      toast.error('There are no societies to export.');
      return;
    }

    try {
      const rows: (string | number | null | undefined)[][] = [
        [
          'Society Name',
          'Society PIN',
          'Address',
          'City',
          'Country',
          'Status',
          'Engagement Start',
          'Engagement End',
          'Maintenance Due Date',
          'Base Rate',
          'GST',
          'Rate Incl GST',
          'Latitude',
          'Longitude',
          'Notes',
        ],
        ...filteredSocieties.map((society) => [
          society.societyName,
          society.societyPin,
          society.address,
          society.city ?? '',
          society.country ?? '',
          society.status,
          formatDateForCsv(society.engagementStartDate),
          formatDateForCsv(society.engagementEndDate),
          society.maintenanceDueDate ?? '',
          society.baseRate,
          society.gst,
          society.rateInclGst,
          society.latitude ?? '',
          society.longitude ?? '',
          society.notes ?? '',
        ]),
      ];

      const csvContent = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      if ('msSaveOrOpenBlob' in window.navigator) {
        // @ts-expect-error - msSaveOrOpenBlob exists only in legacy browsers.
        window.navigator.msSaveOrOpenBlob(blob, 'societies.csv');
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.href = url;
        link.setAttribute('download', `societies-${timestamp}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }

      toast.success('Societies exported successfully.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export societies. Please try again.';
      toast.error(message);
    }
  };

  const handleImportButtonClick = () => {
    if (isImporting) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const rawLines = text.split(/\r?\n/);
      if (rawLines.length === 0) {
        toast.error('The selected file is empty.');
        return;
      }

      const headerLine = rawLines[0];
      const headers = parseCsvLine(headerLine).map(normalizeHeaderKey);
      const findHeaderIndex = (...keys: string[]) =>
        headers.findIndex((header) => keys.includes(header));

      const nameIndex = findHeaderIndex('societyname', 'name');
      const pinIndex = findHeaderIndex('societypin', 'pin');
      const addressIndex = findHeaderIndex('address');
      const cityIndex = findHeaderIndex('city');
      const countryIndex = findHeaderIndex('country');
      const statusIndex = findHeaderIndex('status');
      const startDateIndex = findHeaderIndex('engagementstart', 'engagementstartdate', 'startdate');
      const endDateIndex = findHeaderIndex('engagementend', 'engagementenddate', 'enddate');
      const maintenanceIndex = findHeaderIndex('maintenanceduedate', 'maintenanceday');
      const baseRateIndex = findHeaderIndex('baserate');
      const gstIndex = findHeaderIndex('gst');
      const rateInclIndex = findHeaderIndex('rateinclgst', 'totalrate');
      const latitudeIndex = findHeaderIndex('latitude', 'lat');
      const longitudeIndex = findHeaderIndex('longitude', 'lng', 'long');
      const notesIndex = findHeaderIndex('notes', 'remarks');

      if (
        nameIndex === -1 ||
        pinIndex === -1 ||
        addressIndex === -1 ||
        startDateIndex === -1 ||
        endDateIndex === -1 ||
        baseRateIndex === -1
      ) {
        toast.error(
          'CSV must include Society Name, PIN, Address, Engagement Start, Engagement End, and Base Rate columns.'
        );
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;
      const errorDetails: string[] = [];
      const now = new Date();

      for (let lineIndex = 1; lineIndex < rawLines.length; lineIndex += 1) {
        const line = rawLines[lineIndex];
        if (!line || !line.trim()) {
          continue;
        }

        const values = parseCsvLine(line).map((value) => value.trim());
        if (values.every((value) => value.length === 0)) {
          continue;
        }

        const societyName = values[nameIndex] ?? '';
        const societyPin = values[pinIndex] ?? '';
        const address = values[addressIndex] ?? '';
        const engagementStartValue = values[startDateIndex] ?? '';
        const engagementEndValue = values[endDateIndex] ?? '';
        const baseRateValue = values[baseRateIndex] ?? '';

        if (!societyName || !societyPin || !address || !engagementStartValue || !engagementEndValue || !baseRateValue) {
          skippedCount += 1;
          errorDetails.push(`Row ${lineIndex + 1}: Missing required fields.`);
          continue;
        }

        const existingSociety = societies.find(
          (society) =>
            society.societyPin.toLowerCase() === societyPin.toLowerCase() ||
            society.societyName.toLowerCase() === societyName.toLowerCase()
        );
        if (existingSociety) {
          skippedCount += 1;
          errorDetails.push(`Row ${lineIndex + 1}: Society "${societyName}" already exists.`);
          continue;
        }

        const engagementStartDate = parseFlexibleDate(engagementStartValue);
        const engagementEndDate = parseFlexibleDate(engagementEndValue);

        if (!engagementStartDate || !engagementEndDate) {
          skippedCount += 1;
          errorDetails.push(`Row ${lineIndex + 1}: Invalid engagement dates.`);
          continue;
        }

        const baseRate = parseOptionalNumber(baseRateValue);
        if (baseRate === undefined || Number.isNaN(baseRate) || baseRate <= 0) {
          skippedCount += 1;
          errorDetails.push(`Row ${lineIndex + 1}: Invalid base rate.`);
          continue;
        }

        const gstValue = parseOptionalNumber(
          gstIndex >= 0 ? values[gstIndex] : undefined,
          Number.parseFloat((baseRate * 0.18).toFixed(2))
        );
        const normalizedGst =
          gstValue !== undefined ? Number.parseFloat(gstValue.toFixed(2)) : Number.parseFloat((baseRate * 0.18).toFixed(2));
        const rateInclGstValue = parseOptionalNumber(
          rateInclIndex >= 0 ? values[rateInclIndex] : undefined
        );
        const normalizedRateIncl =
          rateInclGstValue !== undefined
            ? Number.parseFloat(rateInclGstValue.toFixed(2))
            : Number.parseFloat((baseRate + normalizedGst).toFixed(2));
        const maintenanceDueDateValue =
          parseOptionalNumber(maintenanceIndex >= 0 ? values[maintenanceIndex] : undefined) ?? 1;
        const latitudeValue = parseOptionalNumber(latitudeIndex >= 0 ? values[latitudeIndex] : undefined);
        const longitudeValue = parseOptionalNumber(longitudeIndex >= 0 ? values[longitudeIndex] : undefined);

        const statusValue =
          statusIndex >= 0 ? normalizeStatus(values[statusIndex] ?? '') : ('Active' as const);

        const societyPayload: Society = {
          id: `soc${Date.now()}-${lineIndex}-${Math.random().toString(36).slice(2, 8)}`,
          societyName,
          address,
          city: cityIndex >= 0 ? values[cityIndex] ?? '' : '',
          country: countryIndex >= 0 ? values[countryIndex] ?? '' : '',
          latitude: latitudeValue ?? undefined,
          longitude: longitudeValue ?? undefined,
          totalWings: 0,
          wings: [],
          entryGates: [],
          exitGates: [],
          societyAdmins: [],
          engagementStartDate: engagementStartDate.toISOString(),
          engagementEndDate: engagementEndDate.toISOString(),
          maintenanceDueDate:
            Number.isFinite(maintenanceDueDateValue)
              ? Math.min(Math.max(Math.round(maintenanceDueDateValue), 1), 30)
              : 1,
          baseRate,
          gst: normalizedGst,
          rateInclGst: normalizedRateIncl,
          status: statusValue,
          societyPin,
          notes: notesIndex >= 0 ? values[notesIndex] || undefined : undefined,
          createdBy: user?.name || 'Admin',
          lastUpdatedBy: user?.name || 'Admin',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        try {
          await addSociety(societyPayload);
          importedCount += 1;
        } catch (error) {
          skippedCount += 1;
          const message =
            error instanceof Error ? error.message : 'Failed to create society due to server error.';
          errorDetails.push(`Row ${lineIndex + 1}: ${message}`);
        }
      }

      if (importedCount > 0) {
        toast.success(`Imported ${importedCount} societ${importedCount === 1 ? 'y' : 'ies'} successfully.`);
      }
      if (skippedCount > 0) {
        const preview = errorDetails.slice(0, 3).join(' ');
        const more = errorDetails.length > 3 ? ' Additional errors omitted.' : '';
        toast.error(
          `Skipped ${skippedCount} row${skippedCount === 1 ? '' : 's'} during import. ${preview}${more}`
        );
      }
      if (importedCount === 0 && skippedCount === 0) {
        toast.error('No valid society entries found in the selected file.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to import societies. Please try again.';
      toast.error(message);
    } finally {
      setIsImporting(false);
      event.target.value = '';
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleStatusToggle = async (societyId: string) => {
    try {
      setTogglingSocietyId(societyId);
      const updated = await toggleSocietyStatus(societyId);
      const isActive = updated.status === 'Active';
      toast.success(`Society ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update society status. Please try again.';
      toast.error(message);
    } finally {
      setTogglingSocietyId(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={handleImportFileChange}
      />
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-gray-900 mb-2">Societies</h1>
            <p className="text-gray-600">Manage all registered societies</p>
          </div>
          <Button onClick={() => navigate('/societies/new')}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Society
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by name, location, or PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-1.5" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Trial">Trial</SelectItem>

            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleImportButtonClick} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1.5" />
                Import
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleExportSocieties}>
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Societies Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Society Name</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Wings</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Admins</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingSocieties ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  Loading societies...
                </TableCell>
              </TableRow>
            ) : filteredSocieties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No societies found
                </TableCell>
              </TableRow>
            ) : (
              filteredSocieties.map((society) => (
                <TableRow 
                  key={society.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/societies/${society.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-gray-900">{society.societyName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {society.societyPin}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-gray-600 truncate">{society.address}</p>
                  </TableCell>
                  <TableCell>{society.totalWings}</TableCell>
                  <TableCell>
                    {society.wings.reduce((sum, wing) => sum + wing.totalUnits, 0)}
                  </TableCell>
                  <TableCell>{society.societyAdmins.length}</TableCell>
                  <TableCell>
                    <Badge
                      variant={society.status === 'Active' ? 'default' : 'secondary'}
                      className={
                        society.status === 'Active'
                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                          : society.status === 'Inactive'
                          ? 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          : society.status === 'Trial'
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                          : 'bg-red-100 text-red-800 hover:bg-red-100'
                      }
                    >
                      {society.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="text-gray-600">
                        {new Date(society.engagementStartDate).toLocaleDateString()} -
                      </p>
                      <p className="text-gray-600">
                        {new Date(society.engagementEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/societies/${society.id}`)}>
                          <Eye className="w-4 h-4 mr-1.5" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/societies/${society.id}/edit`)}
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            if (togglingSocietyId === society.id) return;
                            await handleStatusToggle(society.id);
                          }}
                          disabled={togglingSocietyId === society.id}
                        >
                          <Power className="w-4 h-4 mr-1.5" />
                          {society.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Societies Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {isLoadingSocieties ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            Loading societies...
          </div>
        ) : filteredSocieties.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No societies found
          </div>
        ) : (
          filteredSocieties.map((society) => (
            <div
              key={society.id}
              className="bg-white rounded-lg border border-gray-200 p-4 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 truncate">{society.societyName}</p>
                    <code className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {society.societyPin}
                    </code>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/societies/${society.id}`)}>
                      <Eye className="w-4 h-4 mr-1.5" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/societies/${society.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-1.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (togglingSocietyId === society.id) return;
                        await handleStatusToggle(society.id);
                      }}
                      disabled={togglingSocietyId === society.id}
                    >
                      <Power className="w-4 h-4 mr-1.5" />
                      {society.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Location</p>
                <p className="text-sm text-gray-900">{society.address}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500 mb-1">Wings</p>
                  <p className="text-gray-900">{society.totalWings}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500 mb-1">Units</p>
                  <p className="text-gray-900">
                    {society.wings.reduce((sum, wing) => sum + wing.totalUnits, 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500 mb-1">Admins</p>
                  <p className="text-gray-900">{society.societyAdmins.length}</p>
                </div>
              </div>

              {/* Status & Engagement */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <Badge
                    variant={society.status === 'Active' ? 'default' : 'secondary'}
                    className={
                      society.status === 'Active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : society.status === 'Inactive'
                        ? 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                        : society.status === 'Trial'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                        : 'bg-red-100 text-red-800 hover:bg-red-100'
                    }
                  >
                    {society.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Engagement</p>
                  <p className="text-xs text-gray-600">
                    {new Date(society.engagementStartDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    -{' '}
                    {new Date(society.engagementEndDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredSocieties.length} of {societies.length} societies
      </div>
      {societiesError && (
        <div className="mt-2 text-sm text-red-600" role="alert">
          {societiesError}
        </div>
      )}
    </div>
  );
};
