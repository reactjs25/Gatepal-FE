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
  Ban,
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
import ExcelJS from 'exceljs';

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

const splitDelimitedValues = (value: string): string[] =>
  value
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

type IndexedColumns<T extends string> = Record<number, Partial<Record<T, number>>>;

const collectIndexedColumns = <T extends string>(
  headers: string[],
  prefix: string,
  fieldMappings: Record<T, string[]>
): IndexedColumns<T> => {
  const groups: IndexedColumns<T> = {};

  headers.forEach((header, index) => {
    if (!header.startsWith(prefix)) {
      return;
    }

    const suffix = header.slice(prefix.length);
    const match = suffix.match(/^(\d+)([a-z0-9]+)$/);
    if (!match) {
      return;
    }

    const groupNumber = Number.parseInt(match[1], 10);
    const fieldKeyRaw = match[2];
    const normalizedField = (Object.entries(fieldMappings) as [T, string[]][]).find(([, variants]) =>
      variants.includes(fieldKeyRaw)
    )?.[0];

    if (!normalizedField) {
      return;
    }

    if (!groups[groupNumber]) {
      groups[groupNumber] = {};
    }

    groups[groupNumber][normalizedField] = index;
  });

  return groups;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SAMPLE_IMPORT_ROWS: (string | number | null)[][] = [
  [
    'Society Name',
    'Society PIN',
    'Address',
    'City',
    'Country',
    'Status',
    'Maintenance Due Date',
    'Engagement Start',
    'Engagement End',
    'Base Rate',
    'GST',
    'Rate Incl GST',
    'Latitude',
    'Longitude',
    'Notes',
    'Wing 1 Name',
    'Wing 1 Total Units',
    'Wing 1 Units',
    'Wing 2 Name',
    'Wing 2 Total Units',
    'Wing 2 Units',
    'Entry Gate 1 Name',
    'Entry Gate 2 Name',
    'Exit Gate 1 Name',
    'Exit Gate 2 Name',
    'Admin 1 Name',
    'Admin 1 Mobile',
    'Admin 1 Email',
    'Admin 2 Name',
    'Admin 2 Mobile',
    'Admin 2 Email',
  ],
  [
    'Sunshine Residency',
    '',
    '123 Palm Street, Andheri East',
    'Mumbai',
    'India',
    'Active',
    1,
    '2025-01-01',
    '2025-12-31',
    5000,
    900,
    5900,
    '19.1197',
    '72.8468',
    'Primary society account',
    'Tower A',
    4,
    'A101;A102;A201;A202',
    'Tower B',
    3,
    'B101;B102;B201',
    'Main Gate',
    'Service Gate',
    'North Exit',
    'South Exit',
    'Riya Sharma',
    '9876543210',
    'riya.sharma@example.com',
    'Arjun Patel',
    '9123456780',
    'arjun.patel@example.com',
  ],
  [
    'Lakeside Towers',
    '',
    '45 Lakeview Road, Kondapur',
    'Hyderabad',
    'India',
    'Trial',
    5,
    '2025-02-15',
    '2025-11-30',
    4200,
    756,
    4956,
    '17.4581',
    '78.3816',
    'Trial onboarding batch',
    'Block 1',
    2,
    'L1-101;L1-102',
    'Block 2',
    2,
    'L2-201;L2-202',
    'Lake View Entry',
    'Club House Entry',
    'East Exit',
    'West Exit',
    'Anya Menon',
    '9012345678',
    'anya.menon@example.com',
    'Karan Oberoi',
    '9345678901',
    'karan.oberoi@example.com',
  ],
];

const downloadBlob = (blob: Blob, filename: string) => {
  if ('msSaveOrOpenBlob' in window.navigator) {
    
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
  const { societies, toggleSocietyStatus, suspendSociety, isLoadingSocieties, societiesError, addSociety } =
    useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expirationFilter, setExpirationFilter] = useState<string>('all');
  const [togglingSocietyId, setTogglingSocietyId] = useState<string | null>(null);
  const [suspendingSocietyId, setSuspendingSocietyId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
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

      const matchesExpiration = (() => {
        if (expirationFilter === 'all') return true;
        const now = new Date();
        const endDate = new Date(society.engagementEndDate);
        const monthsUntilExpiry = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        switch (expirationFilter) {
          case '1month':
            return monthsUntilExpiry <= 1 && monthsUntilExpiry >= 0;
          case '2months':
            return monthsUntilExpiry <= 2 && monthsUntilExpiry >= 0;
          case '3months':
            return monthsUntilExpiry <= 3 && monthsUntilExpiry >= 0;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesExpiration;
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
  }, [societies, searchQuery, statusFilter, expirationFilter, sortField, sortDirection]);

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

    
    const wingColumns = collectIndexedColumns<'name' | 'totalUnits' | 'units'>(
      headers,
      'wing',
      {
        name: ['name'],
        totalUnits: ['totalunits'],
        units: ['units'],
      }
    );

    const entryGateColumns = collectIndexedColumns<'name'>(
      headers,
      'entrygate',
      { name: ['name'] }
    );

    const exitGateColumns = collectIndexedColumns<'name'>(
      headers,
      'exitgate',
      { name: ['name'] }
    );

    const adminColumns = collectIndexedColumns<'name' | 'mobile' | 'email'>(
      headers,
      'admin',
      {
        name: ['name'],
        mobile: ['mobile', 'phone'],
        email: ['email'],
      }
    );

    const missingColumns: string[] = [];
    if (nameIndex === -1) missingColumns.push('Society Name');
    if (addressIndex === -1) missingColumns.push('Address');
    if (cityIndex === -1) missingColumns.push('City');
    if (countryIndex === -1) missingColumns.push('Country');
    if (statusIndex === -1) missingColumns.push('Status');
    if (maintenanceIndex === -1) missingColumns.push('Maintenance Due Date');
    if (startDateIndex === -1) missingColumns.push('Engagement Start');
    if (endDateIndex === -1) missingColumns.push('Engagement End');
    if (baseRateIndex === -1) missingColumns.push('Base Rate');

    if (missingColumns.length > 0) {
      toast.error(
        `CSV/XLSX must include the following columns: ${missingColumns.join(', ')}.`
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
      const address = values[addressIndex] ?? '';
      const engagementStartValue = values[startDateIndex] ?? '';
      const engagementEndValue = values[endDateIndex] ?? '';
      const baseRateValue = values[baseRateIndex] ?? '';
      const cityValue = cityIndex >= 0 ? values[cityIndex] ?? '' : '';
      const countryValue = countryIndex >= 0 ? values[countryIndex] ?? '' : '';
      const statusRaw = statusIndex >= 0 ? values[statusIndex] ?? '' : '';
      const maintenanceDueDateRaw = maintenanceIndex >= 0 ? values[maintenanceIndex] ?? '' : '';
      const societyPinValue = pinIndex >= 0 ? values[pinIndex] ?? '' : '';

      const missingFields = [
        ['Society Name', societyName],
        ['Address', address],
        ['City', cityValue],
        ['Country', countryValue],
        ['Status', statusRaw],
        ['Maintenance Due Date', maintenanceDueDateRaw],
        ['Engagement Start', engagementStartValue],
        ['Engagement End', engagementEndValue],
        ['Base Rate', baseRateValue],
      ]
        .filter(([, value]) => !value)
        .map(([label]) => label);

      if (missingFields.length > 0) {
        skippedCount += 1;
        errorDetails.push(
          `Row ${rowNumber}: Missing required fields (${missingFields.join(', ')}).`
        );
        continue;
      }

      const validStatusValues = ['active', 'inactive', 'trial'];
      if (!validStatusValues.includes(statusRaw.toLowerCase())) {
        skippedCount += 1;
        errorDetails.push(
          `Row ${rowNumber}: Status must be one of Active, Inactive, or Trial.`
        );
        continue;
      }

      const existingSociety = societies.find((society) => {
        if (
          societyPinValue &&
          society.societyPin.toLowerCase() === societyPinValue.toLowerCase()
        ) {
          return true;
        }
        return society.societyName.toLowerCase() === societyName.toLowerCase();
      });
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

      const maintenanceDueDate = Number.parseInt(maintenanceDueDateRaw, 10);
      if (
        Number.isNaN(maintenanceDueDate) ||
        maintenanceDueDate < 1 ||
        maintenanceDueDate > 30
      ) {
        skippedCount += 1;
        errorDetails.push(
          `Row ${rowNumber}: Maintenance Due Date must be a number between 1 and 30.`
        );
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
      const latitudeRaw = latitudeIndex >= 0 ? values[latitudeIndex] ?? '' : '';
      const longitudeRaw = longitudeIndex >= 0 ? values[longitudeIndex] ?? '' : '';
      const latitudeValue = latitudeRaw ? parseOptionalNumber(latitudeRaw) : undefined;
      const longitudeValue = longitudeRaw ? parseOptionalNumber(longitudeRaw) : undefined;

      if (
        (latitudeRaw && latitudeValue === undefined) ||
        (longitudeRaw && longitudeValue === undefined)
      ) {
        skippedCount += 1;
        errorDetails.push(
          `Row ${rowNumber}: Latitude and Longitude must be valid numbers when provided.`
        );
        continue;
      }

      const statusValue =
        statusIndex >= 0 ? normalizeStatus(statusRaw) : ('Active' as const);

      
      const placeholderSocietyPin = societyPinValue.trim().length > 0 ? societyPinValue : '';

      // Parse wings from indexed columns
      const parsedWings: Society['wings'] = [];
      for (const wingNum of Object.keys(wingColumns).map(Number).sort((a, b) => a - b)) {
        const wingCols = wingColumns[wingNum];
        if (!wingCols) continue;
        
        const wingName = wingCols.name !== undefined ? (values[wingCols.name] ?? '').trim() : '';
        if (!wingName) continue;
        
        const totalUnitsRaw = wingCols.totalUnits !== undefined ? (values[wingCols.totalUnits] ?? '') : '';
        const unitsRaw = wingCols.units !== undefined ? (values[wingCols.units] ?? '') : '';
        
        const unitNames = splitDelimitedValues(unitsRaw);
        const totalUnits = parseOptionalNumber(totalUnitsRaw) ?? unitNames.length;
        
        const units = unitNames.map((unitNumber, idx) => ({
          id: `unit-${Date.now()}-${lineIndex}-${wingNum}-${idx}`,
          number: unitNumber,
        }));
        
        parsedWings.push({
          id: `wing-${Date.now()}-${lineIndex}-${wingNum}`,
          name: wingName,
          totalUnits,
          units,
        });
      }

      // Parse entry gates from indexed columns
      const parsedEntryGates: Society['entryGates'] = [];
      for (const gateNum of Object.keys(entryGateColumns).map(Number).sort((a, b) => a - b)) {
        const gateCols = entryGateColumns[gateNum];
        if (!gateCols) continue;
        
        const gateName = gateCols.name !== undefined ? (values[gateCols.name] ?? '').trim() : '';
        if (!gateName) continue;
        
        parsedEntryGates.push({
          id: `entry-gate-${Date.now()}-${lineIndex}-${gateNum}`,
          name: gateName,
        });
      }

      // Parse exit gates from indexed columns
      const parsedExitGates: Society['exitGates'] = [];
      for (const gateNum of Object.keys(exitGateColumns).map(Number).sort((a, b) => a - b)) {
        const gateCols = exitGateColumns[gateNum];
        if (!gateCols) continue;
        
        const gateName = gateCols.name !== undefined ? (values[gateCols.name] ?? '').trim() : '';
        if (!gateName) continue;
        
        parsedExitGates.push({
          id: `exit-gate-${Date.now()}-${lineIndex}-${gateNum}`,
          name: gateName,
        });
      }

      // Parse admins from indexed columns
      const parsedAdmins: Society['societyAdmins'] = [];
      for (const adminNum of Object.keys(adminColumns).map(Number).sort((a, b) => a - b)) {
        const adminCols = adminColumns[adminNum];
        if (!adminCols) continue;
        
        const adminName = adminCols.name !== undefined ? (values[adminCols.name] ?? '').trim() : '';
        const adminMobile = adminCols.mobile !== undefined ? (values[adminCols.mobile] ?? '').trim() : '';
        const adminEmail = adminCols.email !== undefined ? (values[adminCols.email] ?? '').trim() : '';
        
        // Skip if no name provided
        if (!adminName) continue;
        
        // Validate email if provided
        if (adminEmail && !EMAIL_REGEX.test(adminEmail)) {
          continue;
        }
        
        parsedAdmins.push({
          id: `admin-${Date.now()}-${lineIndex}-${adminNum}`,
          name: adminName,
          mobile: adminMobile,
          email: adminEmail,
          status: 'Active',
          societyId: '',
          societyName,
          createdAt: now.toISOString(),
        });
      }

      const societyPayload: Society = {
        id: `soc${Date.now()}-${lineIndex}-${Math.random().toString(36).slice(2, 8)}`,
        societyName,
        address,
        city: cityValue,
        country: countryValue,
        latitude: latitudeValue ?? undefined,
        longitude: longitudeValue ?? undefined,
        totalWings: parsedWings.length,
        wings: parsedWings,
        entryGates: parsedEntryGates,
        exitGates: parsedExitGates,
        societyAdmins: parsedAdmins,
        engagementStartDate: engagementStartDate.toISOString(),
        engagementEndDate: engagementEndDate.toISOString(),
        maintenanceDueDate,
        baseRate,
        gst: normalizedGst,
        rateInclGst: normalizedRateIncl,
        status: statusValue,
        societyPin: placeholderSocietyPin,
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

    if (importedCount > 0 && skippedCount === 0) {
      toast.success(
        `Imported ${importedCount} societ${importedCount === 1 ? 'y' : 'ies'} successfully. Unique PINs were generated automatically.`
      );
    } else if (importedCount > 0 && skippedCount > 0) {
      const preview = errorDetails.slice(0, 3).join(' ');
      const more = errorDetails.length > 3 ? ' Additional errors omitted.' : '';
      toast.warning(
        `Import completed with partial success. Created ${importedCount} societ${
          importedCount === 1 ? 'y' : 'ies'
        }, but ${skippedCount} row${skippedCount === 1 ? '' : 's'} had issues. ${preview}${more}`
      );
    } else if (skippedCount > 0) {
      const preview = errorDetails.slice(0, 3).join(' ');
      const more = errorDetails.length > 3 ? ' Additional errors omitted.' : '';
      toast.error(
        `No societies were imported. ${skippedCount} row${skippedCount === 1 ? '' : 's'} had errors. ${preview}${more}`
      );
    } else {
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

  const handleExportSocieties = async () => {
    if (filteredAndSortedSocieties.length === 0) {
      toast.error('There are no societies to export.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GatePal';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Societies', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      // Calculate max counts for dynamic columns
      let maxWings = 0;
      let maxEntryGates = 0;
      let maxExitGates = 0;
      let maxAdmins = 0;

      filteredAndSortedSocieties.forEach((society) => {
        maxWings = Math.max(maxWings, society.wings?.length ?? 0);
        maxEntryGates = Math.max(maxEntryGates, society.entryGates?.length ?? 0);
        maxExitGates = Math.max(maxExitGates, society.exitGates?.length ?? 0);
        maxAdmins = Math.max(maxAdmins, society.societyAdmins?.length ?? 0);
      });

      // Build headers
      const headers: string[] = [
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
        'Total Wings',
        'Total Units',
      ];

      // Add wing columns
      for (let i = 1; i <= maxWings; i++) {
        headers.push(`Wing ${i} Name`, `Wing ${i} Units`);
      }

      
      for (let i = 1; i <= maxEntryGates; i++) {
        headers.push(`Entry Gate ${i}`);
      }

      
      for (let i = 1; i <= maxExitGates; i++) {
        headers.push(`Exit Gate ${i}`);
      }

      
      for (let i = 1; i <= maxAdmins; i++) {
        headers.push(`Admin ${i} Name`, `Admin ${i} Mobile`, `Admin ${i} Email`, `Admin ${i} Status`);
      }

      
      const headerRow = worksheet.addRow(headers);

      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2563EB' },
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFF' },
          size: 11,
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: '1E40AF' } },
          bottom: { style: 'thin', color: { argb: '1E40AF' } },
          left: { style: 'thin', color: { argb: '1E40AF' } },
          right: { style: 'thin', color: { argb: '1E40AF' } },
        };
      });
      headerRow.height = 25;

      
      filteredAndSortedSocieties.forEach((society, rowIndex) => {
        const totalUnits = society.wings?.reduce((sum, wing) => sum + (wing.units?.length ?? wing.totalUnits ?? 0), 0) ?? 0;

        const rowData: (string | number | null | undefined)[] = [
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
          society.wings?.length ?? 0,
          totalUnits,
        ];

        // Add wing data
        for (let i = 0; i < maxWings; i++) {
          const wing = society.wings?.[i];
          if (wing) {
            rowData.push(wing.name);
            rowData.push(wing.units?.map((u) => u.number).join('; ') ?? '');
          } else {
            rowData.push('', '');
          }
        }

        // Add entry gate data
        for (let i = 0; i < maxEntryGates; i++) {
          const gate = society.entryGates?.[i];
          rowData.push(gate?.name ?? '');
        }

        // Add exit gate data
        for (let i = 0; i < maxExitGates; i++) {
          const gate = society.exitGates?.[i];
          rowData.push(gate?.name ?? '');
        }

        // Add admin data
        for (let i = 0; i < maxAdmins; i++) {
          const admin = society.societyAdmins?.[i];
          if (admin) {
            rowData.push(admin.name, admin.mobile, admin.email, admin.status);
          } else {
            rowData.push('', '', '', '');
          }
        }

        const dataRow = worksheet.addRow(rowData);

        // Style data rows with alternating colors
        const isEvenRow = rowIndex % 2 === 0;
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEvenRow ? 'F8FAFC' : 'FFFFFF' },
          };
          cell.font = { size: 10 };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
          };
        });

        
        const statusCell = dataRow.getCell(6);
        if (society.status === 'Active') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
          statusCell.font = { size: 10, color: { argb: '166534' }, bold: true };
        } else if (society.status === 'Inactive') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
          statusCell.font = { size: 10, color: { argb: '4B5563' }, bold: true };
        } else if (society.status === 'Trial') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
          statusCell.font = { size: 10, color: { argb: '1E40AF' }, bold: true };
        } else if (society.status === 'Suspended') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
          statusCell.font = { size: 10, color: { argb: 'DC2626' }, bold: true };
        }
      });

      
      worksheet.columns.forEach((column, colIndex) => {
        let maxLength = 10;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value?.toString() ?? '';
          maxLength = Math.max(maxLength, Math.min(cellValue.length + 2, 50));
        });
        column.width = Math.max(12, maxLength);
      });

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const timestamp = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `societies-${timestamp}.xlsx`);

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

  const handleSuspend = async (societyId: string) => {
    try {
      setSuspendingSocietyId(societyId);
      await suspendSociety(societyId);
      toast.success('Society suspended successfully');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to suspend society. Please try again.';
      toast.error(message);
    } finally {
      setSuspendingSocietyId(null);
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
            <p className="text-xs text-gray-600 leading-relaxed">
              Required columns: <span className="font-medium">Society Name</span>,{' '}
              <span className="font-medium">Address</span>, <span className="font-medium">City</span>,{' '}
              <span className="font-medium">Country</span>, <span className="font-medium">Status</span>,{' '}
              <span className="font-medium">Maintenance Due Date</span>,{' '}
              <span className="font-medium">Engagement Start</span>,{' '}
              <span className="font-medium">Engagement End</span>, <span className="font-medium">Base Rate</span>,{' '}
              <span className="font-medium">Wing 1 Name</span>, <span className="font-medium">Wing 1 Total Units</span>,{' '}
              <span className="font-medium">Wing 1 Units</span>, <span className="font-medium">Entry Gate 1 Name</span>,{' '}
              <span className="font-medium">Exit Gate 1 Name</span>, and{' '}
              <span className="font-medium">Admin 1 Name/Mobile/Email</span>. Duplicate these columns with higher
              numbers (Wing 2, Admin 2, etc.) whenever you need to capture more data. Leave the{' '}
              <span className="font-medium">Society PIN</span> column blank—the system will generate a unique PIN
              automatically. Latitude and Longitude are optional; include them only if you have reliable coordinates.
              For unit lists, separate values with commas, semicolons, or pipes (e.g. <code>A101;A102;A201</code>).
            </p>
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

        {}
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
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={expirationFilter} onValueChange={setExpirationFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-1.5" />
                  <SelectValue placeholder="Filter by expiration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Expiring: All Time</SelectItem>
                  <SelectItem value="1month">Expiring: in 1 month</SelectItem>
                  <SelectItem value="2months">Expiring: in 2 months</SelectItem>
                  <SelectItem value="3months">Expiring: in 3 months</SelectItem>
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

      {}
      <div className="hidden md:block">
        <TableContainer component={Paper} className="rounded-lg border border-gray-200 shadow-sm">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 280 }}>
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
                    active={sortField === 'units'}
                    direction={sortField === 'units' ? sortDirection : 'asc'}
                    onClick={() => handleSort('units')}
                  >
                    Units
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
                  <TableCell colSpan={7} align="center" className="py-8 text-gray-500">
                    Loading societies...
                  </TableCell>
                </TableRow>
              ) : paginatedSocieties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" className="py-8 text-gray-500">
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
                    <TableCell sx={{ minWidth: 280 }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 min-w-[40px] min-h-[40px] bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
                    <TableCell>{society.wings.reduce((sum, wing) => sum + wing.totalUnits, 0)}</TableCell>
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
                            : society.status === 'Suspended'
                            ? 'bg-red-100 text-red-800 hover:bg-red-100'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
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
                            disabled={togglingSocietyId === society.id || society.status === 'Suspended'}
                          >
                            <Power className="w-4 h-4 mr-1.5" />
                            {society.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          {society.status === 'Inactive' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                if (suspendingSocietyId === society.id) return;
                                await handleSuspend(society.id);
                              }}
                              disabled={suspendingSocietyId === society.id}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Ban className="w-4 h-4 mr-1.5" />
                              Suspend
                            </DropdownMenuItem>
                          )}
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

      {}
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
              {}
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
                      disabled={togglingSocietyId === society.id || society.status === 'Suspended'}
                    >
                      <Power className="w-4 h-4 mr-1.5" />
                      {society.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                    {society.status === 'Inactive' && (
                      <DropdownMenuItem
                        onClick={async () => {
                          if (suspendingSocietyId === society.id) return;
                          await handleSuspend(society.id);
                        }}
                        disabled={suspendingSocietyId === society.id}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Ban className="w-4 h-4 mr-1.5" />
                        Suspend
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {}
              <div>
                <p className="text-xs text-gray-500 mb-1">Location</p>
                <p className="text-sm text-gray-900">{society.address}</p>
              </div>

              {}
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

              {}
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
                        : society.status === 'Suspended'
                        ? 'bg-red-100 text-red-800 hover:bg-red-100'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
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

      {}
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
