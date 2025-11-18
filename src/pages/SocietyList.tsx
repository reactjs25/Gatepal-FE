import React, { useMemo, useRef, useState, useEffect } from 'react';
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Society } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
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
import { formatDateDDMMYYYY } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import * as XLSX from 'xlsx';

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

const SAMPLE_IMPORT_ROWS: (string | number | null)[][] = [
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
  [
    'Sunshine Residency',
    'SR-1001',
    '123 Palm Street, Andheri East',
    'Mumbai',
    'India',
    'Active',
    '2025-01-01',
    '2025-12-31',
    1,
    5000,
    900,
    5900,
    '19.1197',
    '72.8468',
    'Primary society account',
  ],
  [
    'Lakeside Towers',
    'LT-2045',
    '45 Lakeview Road, Kondapur',
    'Hyderabad',
    'India',
    'Trial',
    '2025-02-15',
    '2025-11-30',
    5,
    4200,
    756,
    4956,
    '17.4581',
    '78.3816',
    'Trial onboarding batch',
  ],
];

const downloadBlob = (blob: Blob, filename: string) => {
  if ('msSaveOrOpenBlob' in window.navigator) {
    // @ts-expect-error - available only in legacy browsers.
    window.navigator.msSaveOrOpenBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

type SortField = 'societyName' | 'societyPin' | 'address' | 'totalWings' | 'units' | 'admins' | 'status' | 'engagement';
type SortDirection = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [fileTypeError, setFileTypeError] = useState('');

  
  useEffect(() => {
    document.title = 'Societies - GatePal';
  }, []);

  const filteredAndSortedSocieties = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = societies.filter((society) => {
      const matchesSearch =
        !query ||
        society.societyName.toLowerCase().includes(query) ||
        society.address.toLowerCase().includes(query) ||
        society.societyPin.toLowerCase().includes(query) ||
        (() => {
          const statusValue = society.status.toLowerCase();
          const statusTerms = ['active', 'inactive', 'trial'];
          return statusTerms.includes(query) ? statusValue === query : statusValue.includes(query);
        })();

      const matchesStatus = statusFilter === 'all' || society.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

   
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case 'societyName':
            aValue = a.societyName.toLowerCase();
            bValue = b.societyName.toLowerCase();
            break;
          case 'societyPin':
            aValue = a.societyPin.toLowerCase();
            bValue = b.societyPin.toLowerCase();
            break;
          case 'address':
            aValue = a.address.toLowerCase();
            bValue = b.address.toLowerCase();
            break;
          case 'totalWings':
            aValue = a.totalWings;
            bValue = b.totalWings;
            break;
          case 'units':
            aValue = a.wings.reduce((sum, wing) => sum + wing.totalUnits, 0);
            bValue = b.wings.reduce((sum, wing) => sum + wing.totalUnits, 0);
            break;
          case 'admins':
            aValue = a.societyAdmins.length;
            bValue = b.societyAdmins.length;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'engagement':
            aValue = new Date(a.engagementStartDate).getTime();
            bValue = new Date(b.engagementStartDate).getTime();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [societies, searchQuery, statusFilter, sortField, sortDirection]);

  const paginatedSocieties = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedSocieties.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedSocieties, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedSocieties.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      setItemsPerPage(parsed);
      setCurrentPage(1);
    }
  };

  const resetFileSelection = () => {
    setSelectedImportFile(null);
    setSelectedFileName('');
    setFileTypeError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
      resetFileSelection();
    }
    setIsImportDialogOpen(open);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['csv', 'xlsx', 'xls'];
      
      if (extension && validExtensions.includes(extension)) {
        setSelectedImportFile(file);
        setSelectedFileName(file.name);
        setFileTypeError('');
      } else {
        setSelectedImportFile(null);
        setSelectedFileName('');
        setFileTypeError('This file type is not accepted. Please upload a .csv, .xlsx, or .xls file.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } else {
      resetFileSelection();
    }
  };

  const handleDownloadSample = async (format: 'csv' | 'excel') => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      if (format === 'csv') {
        const csvContent = SAMPLE_IMPORT_ROWS.map((row) =>
          row.map(escapeCsvValue).join(',')
        ).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `society-import-sample-${timestamp}.csv`);
        return;
      }

      const worksheet = XLSX.utils.aoa_to_sheet(SAMPLE_IMPORT_ROWS);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, `society-import-sample-${timestamp}.xlsx`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to download sample file.';
      toast.error(message);
    }
  };

  const extractRowsFromFile = async (file: File): Promise<string[][]> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'xlsx' || extension === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        return [];
      }
      const worksheet = workbook.Sheets[firstSheet];
      const sheetRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
        header: 1,
        raw: false,
      }) as (string | number | null)[][];
      return sheetRows.map((row) => row.map((cell) => (cell ?? '').toString()));
    }

    const text = await file.text();
    const rawLines = text.split(/\r?\n/);
    return rawLines.map((line) => parseCsvLine(line));
  };

  const processImportRows = async (rows: string[][]): Promise<boolean> => {
    if (!rows.length) {
      toast.error('The selected file is empty.');
      return false;
    }

    const headerRow = rows[0];
    if (!headerRow || headerRow.every((cell) => cell.trim().length === 0)) {
      toast.error('The selected file is missing a header row.');
      return false;
    }

    const headers = headerRow.map((header) => normalizeHeaderKey(header));
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
        'CSV/XLSX must include Society Name, PIN, Address, Engagement Start, Engagement End, and Base Rate columns.'
      );
      return false;
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errorDetails: string[] = [];
    const now = new Date();

    for (let lineIndex = 1; lineIndex < rows.length; lineIndex += 1) {
      const row = rows[lineIndex] ?? [];
      const values = row.map((value) => value.trim());
      if (values.every((value) => value.length === 0)) {
        continue;
      }

      const rowNumber = lineIndex + 1;
      const societyName = values[nameIndex] ?? '';
      const societyPin = values[pinIndex] ?? '';
      const address = values[addressIndex] ?? '';
      const engagementStartValue = values[startDateIndex] ?? '';
      const engagementEndValue = values[endDateIndex] ?? '';
      const baseRateValue = values[baseRateIndex] ?? '';

      if (
        !societyName ||
        !societyPin ||
        !address ||
        !engagementStartValue ||
        !engagementEndValue ||
        !baseRateValue
      ) {
        skippedCount += 1;
        errorDetails.push(`Row ${rowNumber}: Missing required fields.`);
        continue;
      }

      const existingSociety = societies.find(
        (society) =>
          society.societyPin.toLowerCase() === societyPin.toLowerCase() ||
          society.societyName.toLowerCase() === societyName.toLowerCase()
      );
      if (existingSociety) {
        skippedCount += 1;
        errorDetails.push(`Row ${rowNumber}: Society "${societyName}" already exists.`);
        continue;
      }

      const engagementStartDate = parseFlexibleDate(engagementStartValue);
      const engagementEndDate = parseFlexibleDate(engagementEndValue);

      if (!engagementStartDate || !engagementEndDate) {
        skippedCount += 1;
        errorDetails.push(`Row ${rowNumber}: Invalid engagement dates.`);
        continue;
      }

      const baseRate = parseOptionalNumber(baseRateValue);
      if (baseRate === undefined || Number.isNaN(baseRate) || baseRate <= 0) {
        skippedCount += 1;
        errorDetails.push(`Row ${rowNumber}: Invalid base rate.`);
        continue;
      }

      const gstValue = parseOptionalNumber(
        gstIndex >= 0 ? values[gstIndex] : undefined,
        Number.parseFloat((baseRate * 0.18).toFixed(2))
      );
      const normalizedGst =
        gstValue !== undefined
          ? Number.parseFloat(gstValue.toFixed(2))
          : Number.parseFloat((baseRate * 0.18).toFixed(2));
      const rateInclGstValue = parseOptionalNumber(
        rateInclIndex >= 0 ? values[rateInclIndex] : undefined
      );
      const normalizedRateIncl =
        rateInclGstValue !== undefined
          ? Number.parseFloat(rateInclGstValue.toFixed(2))
          : Number.parseFloat((baseRate + normalizedGst).toFixed(2));
      const maintenanceDueDateValue =
        parseOptionalNumber(maintenanceIndex >= 0 ? values[maintenanceIndex] : undefined) ?? 1;
      const latitudeValue = parseOptionalNumber(
        latitudeIndex >= 0 ? values[latitudeIndex] : undefined
      );
      const longitudeValue = parseOptionalNumber(
        longitudeIndex >= 0 ? values[longitudeIndex] : undefined
      );

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
        errorDetails.push(`Row ${rowNumber}: ${message}`);
      }
    }

    if (importedCount > 0) {
      toast.success(`Imported ${importedCount} societ${importedCount === 1 ? 'y' : 'ies'} successfully.`);
    }
    if (skippedCount > 0) {
      const preview = errorDetails.slice(0, 3).join(' ');
      const more = errorDetails.length > 3 ? ' Additional errors omitted.' : '';
      toast.error(`Skipped ${skippedCount} row${skippedCount === 1 ? '' : 's'} during import. ${preview}${more}`);
    }
    if (importedCount === 0 && skippedCount === 0) {
      toast.error('No valid society entries found in the selected file.');
    }

    return importedCount > 0;
  };

  const handleImportSubmit = async () => {
    if (!selectedImportFile) {
      toast.error('Please choose a file to import.');
      return;
    }
    setIsImporting(true);
    try {
      const rows = await extractRowsFromFile(selectedImportFile);
      const imported = await processImportRows(rows);
      if (imported) {
        handleDialogStateChange(false);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to import societies. Please try again.';
      toast.error(message);
    } finally {
      setIsImporting(false);
      resetFileSelection();
    }
  };

  const totalSocieties = filteredAndSortedSocieties.length;
  const pageStart = totalSocieties === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const pageEnd = totalSocieties === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalSocieties);

  const handleExportSocieties = () => {
    if (filteredAndSortedSocieties.length === 0) {
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
        ...filteredAndSortedSocieties.map((society) => [
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
      const timestamp = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `societies-${timestamp}.csv`);

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
    setIsImportDialogOpen(true);
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
      <Dialog open={isImportDialogOpen} onOpenChange={handleDialogStateChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload Societies</DialogTitle>
            <DialogDescription>
              Import societies in bulk using our CSV or Excel template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex flex items-center gap-x-2 gap-y-1 text-sm text-gray-700">
              <span className="font-medium text-gray-900">Excel:</span>
              <Button
                variant="link"
                className="h-auto px-0 py-0 font-medium"
                onClick={() => handleDownloadSample('excel')}
                disabled={isImporting}
              >
                Download our sample file
              </Button>
              <span className="text-gray-300 ml-2 mr-2">|</span>
              <span className="font-medium text-gray-900">CSV:</span>
              <Button
                variant="link"
                className="h-auto px-0 py-0 font-medium"
                onClick={() => handleDownloadSample('csv')}
                disabled={isImporting}
              >
                Download our sample file
              </Button>
            </div>
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Select file to import</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  Choose File
                </Button>
                <span className="text-sm text-gray-600 truncate max-w-full">
                  {selectedFileName || 'No file chosen'}
                </span>
              </div>
              {fileTypeError ? (
                <p className="mt-2 text-xs text-red-500">{fileTypeError}</p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Allowed file types: .xlsx, .xls, or .csv</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogStateChange(false)} disabled={isImporting}>
              Close
            </Button>
            <Button onClick={handleImportSubmit} disabled={!selectedImportFile || isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[250px] lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by name, location, or PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-3 lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
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
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span>Items per page</span>
              <Input
                type="number"
                min={1}
                className="w-20"
                value={itemsPerPage.toString()}
                onChange={(event) => handleItemsPerPageChange(event.target.value)}
              />
              <span>
                {totalSocieties === 0
                  ? '0 of 0 items'
                  : `${pageStart}-${pageEnd} of ${totalSocieties} items`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Societies Table - Desktop */}
      <div className="hidden md:block">
        <TableContainer component={Paper} className="rounded-lg border border-gray-200 shadow-sm">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'societyName'}
                    direction={sortField === 'societyName' ? sortDirection : 'asc'}
                    onClick={() => handleSort('societyName')}
                  >
                    Society Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'societyPin'}
                    direction={sortField === 'societyPin' ? sortDirection : 'asc'}
                    onClick={() => handleSort('societyPin')}
                  >
                    PIN
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'address'}
                    direction={sortField === 'address' ? sortDirection : 'asc'}
                    onClick={() => handleSort('address')}
                  >
                    Location
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'totalWings'}
                    direction={sortField === 'totalWings' ? sortDirection : 'asc'}
                    onClick={() => handleSort('totalWings')}
                  >
                    Wings
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'units'}
                    direction={sortField === 'units' ? sortDirection : 'asc'}
                    onClick={() => handleSort('units')}
                  >
                    Units
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'admins'}
                    direction={sortField === 'admins' ? sortDirection : 'asc'}
                    onClick={() => handleSort('admins')}
                  >
                    Admins
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDirection : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'engagement'}
                    direction={sortField === 'engagement' ? sortDirection : 'asc'}
                    onClick={() => handleSort('engagement')}
                  >
                    Engagement
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingSocieties ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" className="py-8 text-gray-500">
                    Loading societies...
                  </TableCell>
                </TableRow>
              ) : paginatedSocieties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" className="py-8 text-gray-500">
                    No societies found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSocieties.map((society) => (
                  <TableRow
                    key={society.id}
                    hover
                    sx={{ cursor: 'pointer' }}
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
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm">{society.societyPin}</code>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-gray-600 truncate">{society.address}</p>
                    </TableCell>
                    <TableCell>{society.totalWings}</TableCell>
                    <TableCell>{society.wings.reduce((sum, wing) => sum + wing.totalUnits, 0)}</TableCell>
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
                      {formatDateDDMMYYYY(society.engagementStartDate)} -
                    </p>
                    <p className="text-gray-600">
                      {formatDateDDMMYYYY(society.engagementEndDate)}
                    </p>
                      </div>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
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
                          <DropdownMenuItem onClick={() => navigate(`/societies/${society.id}/edit`)}>
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
        </TableContainer>
      </div>

      {/* Societies Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {isLoadingSocieties ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            Loading societies...
          </div>
        ) : paginatedSocieties.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No societies found
          </div>
        ) : (
          paginatedSocieties.map((society) => (
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
                    {formatDateDDMMYYYY(society.engagementStartDate)} -{' '}
                    {formatDateDDMMYYYY(society.engagementEndDate)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
      {societiesError && (
        <div className="mt-2 text-sm validation-message" role="alert">
          {societiesError}
        </div>
      )}
    </div>
  );
};
