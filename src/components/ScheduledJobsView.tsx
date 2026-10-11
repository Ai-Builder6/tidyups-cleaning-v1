import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Car, 
  Navigation, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Search,
  Filter,
  Users,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  ArrowRight,
  Plus,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Zap,
  CalendarDays,
  ListFilter,
  Layers,
  FileCheck,
  CheckCircle,
  Receipt,
  DollarSign,
  Columns3,
  CalendarRange,
  Clock3,
  SplitSquareVertical,
  LayoutGrid,
  FileText,
  TrendingUp,
  SlidersHorizontal,
  Database,
  PhoneCall,
  Copy,
  MessageSquare,
  Maximize2,
  Minimize2,
  Edit2
} from 'lucide-react';
import { Technician } from '../types/dispatch';
import { 
  ScheduledJobItem, 
  UnscheduledJobItem,
  CLEANER_COLOR_MAP, 
  getCleanerColor, 
  getCleanerInitials,
  JOBBER_TEAM_MEMBERS 
} from '../data/jobberCalendarData';
import { JobberQuote, JobberInvoice } from '../services/jobberSyncModules';
import { JobVisitModal } from './JobVisitModal';

export type { ScheduledJobItem, UnscheduledJobItem };

export type JobberCalendarViewMode = 'MONTH' | 'WEEK' | '3DAY' | 'DAY';

interface ScheduledJobsViewProps {
  jobs: ScheduledJobItem[];
  technicians: Technician[];
  unscheduledJobs?: UnscheduledJobItem[];
  quotes?: JobberQuote[];
  invoices?: JobberInvoice[];
  onSelectJobOnMap?: (job: ScheduledJobItem) => void;
  onRefreshJobs?: () => void;
  onUpdateJobDetails?: (jobId: string, updates: Partial<ScheduledJobItem>) => void;
  onUpdateJobAssignment?: (jobId: string, assignedCleaners: string[]) => void;
  onUpdateJobStatus?: (jobId: string, status: 'SCHEDULED' | 'COMPLETED' | 'IN_PROGRESS') => void;
  onApproveUnscheduledJob?: (jobId: string) => void;
  onScheduleUnscheduledJob?: (params: { 
    jobId: string; 
    date: string; 
    time: string; 
    cleaners: string[]; 
    durationHours?: number; 
    notes?: string; 
  }) => void;
  onNavigateToQuotes?: () => void;
  onNavigateToInvoices?: () => void;
  onOpenJobberSync?: () => void;
  initialTab?: 'CALENDAR' | 'LIST' | 'UNSCHEDULED';
}

// Great-circle Haversine distance calculator in KM & estimated drive minutes in Edmonton
function calculateEdmontonTravel(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): { distanceKm: number; driveMinutes: number } {
  const R = 6371; // Earth radius in km
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLng = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;

  const roadKm = Math.round(straightLineKm * 1.35 * 10) / 10;
  const driveMinutes = Math.max(5, Math.round((roadKm / 42) * 60));

  return { distanceKm: roadKm, driveMinutes };
}

// Helper to parse human or standard time string (e.g., "10:00 AM", "01:30 PM", "14:00") into hour number (0-23)
function parseTimeToHour(timeStr?: string, defaultHour: number = 10): number {
  if (!timeStr) return defaultHour;
  const match = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (!match) return defaultHour;
  let h = parseInt(match[1], 10);
  const isPm = match[3] && match[3].toUpperCase() === 'PM';
  const isAm = match[3] && match[3].toUpperCase() === 'AM';
  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  return h;
}

// Available months for navigation covering ~60 days back and ~60 days forward
const AVAILABLE_MONTHS = [
  { year: 2026, month: 7, label: 'August 2026', shortLabel: 'Aug 2026', sub: 'Past 60d' },
  { year: 2026, month: 8, label: 'September 2026', shortLabel: 'Sep 2026', sub: 'Past 30d' },
  { year: 2026, month: 9, label: 'October 2026', shortLabel: 'Oct 2026', sub: 'Current' },
  { year: 2026, month: 10, label: 'November 2026', shortLabel: 'Nov 2026', sub: 'Next 30d' },
  { year: 2026, month: 11, label: 'December 2026', shortLabel: 'Dec 2026', sub: 'Next 60d' },
  { year: 2027, month: 0, label: 'January 2027', shortLabel: 'Jan 2027', sub: 'Next 90d' },
];

const TIME_SLOTS = [
  { hour: 7, label: '7 AM' },
  { hour: 8, label: '8 AM' },
  { hour: 9, label: '9 AM' },
  { hour: 10, label: '10 AM' },
  { hour: 11, label: '11 AM' },
  { hour: 12, label: '12 PM' },
  { hour: 13, label: '1 PM' },
  { hour: 14, label: '2 PM' },
  { hour: 15, label: '3 PM' },
  { hour: 16, label: '4 PM' },
  { hour: 17, label: '5 PM' },
  { hour: 18, label: '6 PM' },
  { hour: 19, label: '7 PM' },
];

export const ScheduledJobsView: React.FC<ScheduledJobsViewProps> = ({
  jobs,
  technicians,
  unscheduledJobs = [],
  quotes = [],
  invoices = [],
  onSelectJobOnMap,
  onRefreshJobs,
  onUpdateJobDetails,
  onUpdateJobAssignment,
  onUpdateJobStatus,
  onApproveUnscheduledJob,
  onScheduleUnscheduledJob,
  onNavigateToQuotes,
  onNavigateToInvoices,
  onOpenJobberSync,
  initialTab = 'CALENDAR',
}) => {
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'LIST' | 'UNSCHEDULED' | 'QUOTES' | 'INVOICES'>(initialTab);
  
  // Jobber calendar view mode: MONTH, 7-Day WEEK, 3-DAY, or DAY
  const [calendarViewMode, setCalendarViewMode] = useState<JobberCalendarViewMode>('MONTH');

  // Calendar density / sizing: 'standard' | 'large' | 'xlarge' (Defaults to 'large' for bigger spacious display)
  const [calendarDensity, setCalendarDensity] = useState<'standard' | 'large' | 'xlarge'>('large');

  // Right inspector detail drawer collapse state
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState<boolean>(true);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  
  // Focused date for schedule navigation (Default: October 2, 2026)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(2026, 9, 2));

  // Day sub-view mode: 'TIMELINE' or 'LANES' (cleaner grid)
  const [daySubView, setDaySubView] = useState<'TIMELINE' | 'LANES'>('TIMELINE');

  // Item type filter on schedule: Defaults strictly to 'JOBS' (Only Approved Scheduled Cleaner Visits)
  const [itemTypeFilter, setItemTypeFilter] = useState<'ALL' | 'JOBS' | 'QUOTES' | 'INVOICES'>('JOBS');
  // Approved-only filter to guarantee only confirmed, approved jobs with assigned cleaners appear on the schedule
  const [approvedOnly, setApprovedOnly] = useState<boolean>(true);
  const showJobs = itemTypeFilter === 'ALL' || itemTypeFilter === 'JOBS';
  const showQuotes = itemTypeFilter === 'ALL' || itemTypeFilter === 'QUOTES';
  const showInvoices = itemTypeFilter === 'ALL' || itemTypeFilter === 'INVOICES';

  // Selected schedule item for inspector: can be a Job, Quote, or Invoice
  const [selectedItem, setSelectedItem] = useState<{
    type: 'JOB' | 'QUOTE' | 'INVOICE';
    id: string;
  } | null>(() => (jobs[0] ? { type: 'JOB', id: jobs[0].id } : null));

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCleanerFilter, setSelectedCleanerFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'CANCELLED'>('ALL');
  const [financialFilter, setFinancialFilter] = useState<'ALL' | 'INVOICED' | 'PAID' | 'QUOTED'>('ALL');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id || null);

  // Cleaner assignment editor modal state
  const [editingJobForCleaners, setEditingJobForCleaners] = useState<ScheduledJobItem | null>(null);
  const [tempAssignedCleaners, setTempAssignedCleaners] = useState<string[]>([]);
  const [assignmentNotice, setAssignmentNotice] = useState<string | null>(null);

  // Jobber visit popup modal state (matching Screenshot 1)
  const [isJobVisitModalOpen, setIsJobVisitModalOpen] = useState<boolean>(false);
  const [activeModalJob, setActiveModalJob] = useState<ScheduledJobItem | null>(null);
  const [copiedSecondaryPhone, setCopiedSecondaryPhone] = useState<boolean>(false);

  // Unscheduled job schedule modal state
  const [schedulingUnscheduledJob, setSchedulingUnscheduledJob] = useState<UnscheduledJobItem | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>('2026-10-05');
  const [scheduleTime, setScheduleTime] = useState<string>('10:00');
  const [scheduleDuration, setScheduleDuration] = useState<number>(2.5);
  const [scheduleCleaners, setScheduleCleaners] = useState<string[]>([]);
  const [scheduleNotes, setScheduleNotes] = useState<string>('');
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);

  // Dynamic cleaners synchronized from staff roster / technicians (15 verified Jobber members)
  const dynamicCleaners = useMemo(() => {
    if (technicians && technicians.length > 0) {
      return technicians.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color || getCleanerColor(t.name),
        phone: t.phone,
        vanUnit: t.vanNumber,
        active: t.active !== false && t.status !== 'OFF_DUTY',
      }));
    }
    return JOBBER_TEAM_MEMBERS.map((t) => ({ ...t, active: true }));
  }, [technicians]);

  // Cleaners actively working and available for new dispatch
  const activeCleaners = useMemo(() => {
    return dynamicCleaners.filter((c) => c.active);
  }, [dynamicCleaners]);

  // Cleaners archived or no longer working
  const archivedCleaners = useMemo(() => {
    return dynamicCleaners.filter((c) => !c.active);
  }, [dynamicCleaners]);

  // Current year & month derived from selectedDate
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  // Navigation handlers for <, >, Today
  const handlePrev = () => {
    const nextD = new Date(selectedDate);
    if (calendarViewMode === 'MONTH') {
      nextD.setMonth(nextD.getMonth() - 1);
    } else if (calendarViewMode === 'WEEK') {
      nextD.setDate(nextD.getDate() - 7);
    } else if (calendarViewMode === '3DAY') {
      nextD.setDate(nextD.getDate() - 3);
    } else {
      nextD.setDate(nextD.getDate() - 1);
    }
    setSelectedDate(nextD);
  };

  const handleNext = () => {
    const nextD = new Date(selectedDate);
    if (calendarViewMode === 'MONTH') {
      nextD.setMonth(nextD.getMonth() + 1);
    } else if (calendarViewMode === 'WEEK') {
      nextD.setDate(nextD.getDate() + 7);
    } else if (calendarViewMode === '3DAY') {
      nextD.setDate(nextD.getDate() + 3);
    } else {
      nextD.setDate(nextD.getDate() + 1);
    }
    setSelectedDate(nextD);
  };

  const handleGoToToday = () => {
    setSelectedDate(new Date(2026, 9, 2)); // Friday, October 2, 2026 (Jobber active date)
  };

  const handleJumpToMonth = (yr: number, mo: number) => {
    const d = new Date(yr, mo, 1);
    setSelectedDate(d);
  };

  // Filter jobs based on search, cleaner, service, and financial status
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.serviceAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.visitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.quoteNumber && job.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (job.invoiceNumber && job.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        job.assignedCleaners.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCleaner =
        selectedCleanerFilter === 'ALL'
          ? true
          : selectedCleanerFilter === 'UNASSIGNED'
          ? job.assignedCleaners.length === 0 || job.assignedCleaners.some((c) => c.toLowerCase().includes('unassigned'))
          : job.assignedCleaners.some((c) => c.toLowerCase().includes(selectedCleanerFilter.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;

      const matchesService = serviceFilter === 'ALL' || job.serviceType === serviceFilter;

      let matchesFinancial = true;
      if (financialFilter === 'INVOICED') {
        matchesFinancial = Boolean(job.invoiceNumber);
      } else if (financialFilter === 'PAID') {
        matchesFinancial = job.invoiceStatus === 'PAID';
      } else if (financialFilter === 'QUOTED') {
        matchesFinancial = Boolean(job.quoteNumber);
      }

      return matchesSearch && matchesCleaner && matchesStatus && matchesService && matchesFinancial;
    });
  }, [jobs, searchQuery, selectedCleanerFilter, statusFilter, serviceFilter, financialFilter]);

  // Filter quotes based on search and financial filter
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesSearch =
        q.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.serviceAddress && q.serviceAddress.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesFinancial = true;
      if (financialFilter === 'QUOTED') matchesFinancial = true;
      else if (financialFilter === 'PAID' || financialFilter === 'INVOICED') matchesFinancial = false;

      return matchesSearch && matchesFinancial;
    });
  }, [quotes, searchQuery, financialFilter]);

  // Filter invoices based on search and financial filter
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.service && inv.service.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inv.serviceAddress && inv.serviceAddress.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesFinancial = true;
      if (financialFilter === 'INVOICED') matchesFinancial = true;
      else if (financialFilter === 'PAID') matchesFinancial = inv.invoiceStatus === 'PAID';
      else if (financialFilter === 'QUOTED') matchesFinancial = false;

      return matchesSearch && matchesFinancial;
    });
  }, [invoices, searchQuery, financialFilter]);

  // Jobs specifically in the active calendar month
  const jobsInCurrentMonth = useMemo(() => {
    return filteredJobs.filter((job) => {
      try {
        const d = new Date(job.startAt);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      } catch {
        return false;
      }
    });
  }, [filteredJobs, currentYear, currentMonth]);

  // Active Job, Quote, or Invoice derived from selectedItem
  const activeJob = useMemo(() => {
    if (selectedItem?.type === 'JOB') {
      return jobs.find((j) => j.id === selectedItem.id) || null;
    }
    return jobs.find((j) => j.id === selectedJobId) || jobsInCurrentMonth[0] || filteredJobs[0] || null;
  }, [selectedItem, selectedJobId, jobs, jobsInCurrentMonth, filteredJobs]);

  const activeQuote = useMemo(() => {
    if (selectedItem?.type === 'QUOTE') {
      return quotes.find((q) => q.id === selectedItem.id) || null;
    }
    return null;
  }, [selectedItem, quotes]);

  const activeInvoice = useMemo(() => {
    if (selectedItem?.type === 'INVOICE') {
      return invoices.find((inv) => inv.id === selectedItem.id) || null;
    }
    return null;
  }, [selectedItem, invoices]);

  // Format date & time nicely
  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        dateStr: d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }),
        timeStr: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        hour: d.getHours(),
        dayOfMonth: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
      };
    } catch {
      return { dateStr: 'Upcoming', timeStr: '9:00 AM', hour: 9, dayOfMonth: 1, month: 9, year: 2026 };
    }
  };

  // Helper to extract items for date string `YYYY-MM-DD`
  const getItemsForDateString = (ds: string) => {
    const jobsOnDate = showJobs
      ? filteredJobs.filter((j) => j.startAt.startsWith(ds))
      : [];
    const quotesOnDate = showQuotes
      ? filteredQuotes.filter((q) => {
          // Converted quotes already turned into jobs; do not duplicate them as appointments on the schedule
          if (q.quoteStatus === 'CONVERTED') return false;
          // If approvedOnly is active, only show quotes that are explicitly approved
          if (approvedOnly && q.quoteStatus !== 'APPROVED') return false;
          return q.scheduledDate ? q.scheduledDate === ds : q.createdAt?.startsWith(ds);
        })
      : [];
    const invoicesOnDate = showInvoices
      ? filteredInvoices.filter((inv) => (inv.issuedDate ? inv.issuedDate === ds : inv.dueDate === ds))
      : [];
    return { jobsOnDate, quotesOnDate, invoicesOnDate };
  };

  // 1. MONTH VIEW CELLS (42 cells: 6 weeks x 7 days)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dateString: string;
      jobsOnDate: ScheduledJobItem[];
      quotesOnDate: JobberQuote[];
      invoicesOnDate: JobberInvoice[];
    }> = [];

    // Previous month filler days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const d = new Date(currentYear, currentMonth - 1, day);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const { jobsOnDate, quotesOnDate, invoicesOnDate } = getItemsForDateString(ds);
      cells.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: false,
        dateString: ds,
        jobsOnDate,
        quotesOnDate,
        invoicesOnDate,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = currentYear === 2026 && currentMonth === 9 && day === 2; // Oct 2, 2026
      const { jobsOnDate, quotesOnDate, invoicesOnDate } = getItemsForDateString(ds);
      cells.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        isToday,
        dateString: ds,
        jobsOnDate,
        quotesOnDate,
        invoicesOnDate,
      });
    }

    // Next month filler days to complete 42 cells
    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(currentYear, currentMonth + 1, day);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const { jobsOnDate, quotesOnDate, invoicesOnDate } = getItemsForDateString(ds);
      cells.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: false,
        dateString: ds,
        jobsOnDate,
        quotesOnDate,
        invoicesOnDate,
      });
    }

    return cells;
  }, [currentYear, currentMonth, filteredJobs, filteredQuotes, filteredInvoices, showJobs, showQuotes, showInvoices]);

  // 2. 7-DAY WEEK VIEW DAYS (Monday through Sunday)
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const dayOfWeek = startOfWeek.getDay(); // 0 is Sun, 1 is Mon...
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
    startOfWeek.setDate(diff);

    return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + offset);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 2;
      const { jobsOnDate, quotesOnDate, invoicesOnDate } = getItemsForDateString(ds);
      return {
        date: d,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        monthLabel: d.toLocaleDateString('en-US', { month: 'short' }),
        dateString: ds,
        isToday,
        jobsOnDate,
        quotesOnDate,
        invoicesOnDate,
      };
    });
  }, [selectedDate, filteredJobs, filteredQuotes, filteredInvoices, showJobs, showQuotes, showInvoices]);

  // 3. 3-DAY VIEW DAYS (Selected date + next 2 days)
  const threeDays = useMemo(() => {
    return [0, 1, 2].map((offset) => {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + offset);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 2;
      const { jobsOnDate, quotesOnDate, invoicesOnDate } = getItemsForDateString(ds);
      return {
        date: d,
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
        dayNumber: d.getDate(),
        monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        dateString: ds,
        isToday,
        jobsOnDate,
        quotesOnDate,
        invoicesOnDate,
      };
    });
  }, [selectedDate, filteredJobs, filteredQuotes, filteredInvoices, showJobs, showQuotes, showInvoices]);

  // 4. SINGLE DAY VIEW (Focused date)
  const singleDayInfo = useMemo(() => {
    const ds = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const { jobsOnDate, quotesOnDate, invoicesOnDate } = getItemsForDateString(ds);
    const isToday = selectedDate.getFullYear() === 2026 && selectedDate.getMonth() === 9 && selectedDate.getDate() === 2;

    // Cleaner lanes: Group jobs by assigned cleaner
    const cleanerLanes: Record<string, ScheduledJobItem[]> = {};
    activeCleaners.forEach((c) => {
      cleanerLanes[c.name] = [];
    });

    jobsOnDate.forEach((j) => {
      j.assignedCleaners.forEach((cleanerName) => {
        if (!cleanerLanes[cleanerName]) cleanerLanes[cleanerName] = [];
        cleanerLanes[cleanerName].push(j);
      });
    });

    return {
      date: selectedDate,
      dateString: ds,
      formattedLabel: selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      isToday,
      jobsOnDate,
      quotesOnDate,
      invoicesOnDate,
      cleanerLanes,
    };
  }, [selectedDate, filteredJobs, filteredQuotes, filteredInvoices, showJobs, showQuotes, showInvoices, activeCleaners]);

  // Period label for top bar based on view mode
  const currentPeriodLabel = useMemo(() => {
    if (calendarViewMode === 'MONTH') {
      return new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (calendarViewMode === 'WEEK') {
      const first = weekDays[0];
      const last = weekDays[6];
      return `${first.monthLabel} ${first.dayNumber} – ${last.monthLabel} ${last.dayNumber}, ${first.date.getFullYear()}`;
    }
    if (calendarViewMode === '3DAY') {
      const first = threeDays[0];
      const last = threeDays[2];
      return `${first.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return singleDayInfo.formattedLabel;
  }, [calendarViewMode, currentYear, currentMonth, weekDays, threeDays, singleDayInfo]);

  // Handler: Open cleaner assignment editor
  const handleOpenCleanerEditor = (job: ScheduledJobItem) => {
    setEditingJobForCleaners(job);
    setTempAssignedCleaners([...job.assignedCleaners]);
    setAssignmentNotice(null);
  };

  const handleToggleCleanerAssignment = (cleanerName: string) => {
    setTempAssignedCleaners((prev) => {
      if (prev.includes(cleanerName)) {
        return prev.filter((c) => c !== cleanerName);
      } else {
        return [...prev, cleanerName];
      }
    });
  };

  const handleSaveCleanerAssignment = async () => {
    if (!editingJobForCleaners) return;
    if (tempAssignedCleaners.length === 0) {
      setAssignmentNotice('Please assign at least 1 cleaner.');
      return;
    }

    if (onUpdateJobAssignment) {
      onUpdateJobAssignment(editingJobForCleaners.id, tempAssignedCleaners);
    }

    try {
      await fetch('/api/jobber/update-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: editingJobForCleaners.id,
          assignedCleaners: tempAssignedCleaners,
        }),
      });
      setAssignmentNotice('Cleaners synced with Jobber schedule!');
      setTimeout(() => {
        setEditingJobForCleaners(null);
        setAssignmentNotice(null);
        if (onRefreshJobs) onRefreshJobs();
      }, 700);
    } catch {
      setAssignmentNotice('Saved locally and queued for Jobber sync.');
      setTimeout(() => {
        setEditingJobForCleaners(null);
        setAssignmentNotice(null);
      }, 700);
    }
  };

  // Handler: Open unscheduled job schedule modal
  const handleOpenScheduleModal = (ujob: UnscheduledJobItem) => {
    setSchedulingUnscheduledJob(ujob);
    setScheduleDate('2026-10-05');
    setScheduleTime('10:00');
    setScheduleDuration(2.5);
    setScheduleCleaners(ujob.preferredCleaners && ujob.preferredCleaners.length > 0 ? ujob.preferredCleaners : ['Melissa Clarke']);
    setScheduleNotes(ujob.notes || '');
    setScheduleNotice(null);
  };

  const handleToggleScheduleCleaner = (cleanerName: string) => {
    setScheduleCleaners((prev) => {
      if (prev.includes(cleanerName)) {
        return prev.filter((c) => c !== cleanerName);
      } else {
        return [...prev, cleanerName];
      }
    });
  };

  const handleConfirmScheduleUnscheduledJob = async () => {
    if (!schedulingUnscheduledJob) return;
    if (scheduleCleaners.length === 0) {
      setScheduleNotice('Please attach at least 1 cleaner to schedule this job.');
      return;
    }

    if (onScheduleUnscheduledJob) {
      onScheduleUnscheduledJob({
        jobId: schedulingUnscheduledJob.id,
        date: scheduleDate,
        time: scheduleTime,
        cleaners: scheduleCleaners,
        durationHours: scheduleDuration,
        notes: scheduleNotes,
      });
    }

    try {
      const res = await fetch('/api/jobber/schedule-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: schedulingUnscheduledJob.id,
          scheduledDate: scheduleDate,
          scheduledTime: scheduleTime,
          durationHours: scheduleDuration,
          assignedCleaners: scheduleCleaners,
          notes: scheduleNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScheduleNotice(`Job ${schedulingUnscheduledJob.jobNumber} scheduled and pushed to Jobber!`);
        setTimeout(() => {
          setSchedulingUnscheduledJob(null);
          setScheduleNotice(null);
          if (onRefreshJobs) onRefreshJobs();
        }, 800);
      }
    } catch {
      setScheduleNotice('Scheduled locally and queued for Jobber push.');
      setTimeout(() => {
        setSchedulingUnscheduledJob(null);
        setScheduleNotice(null);
      }, 800);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-100/90 font-sans">
      {/* ─────────────────────────────────────────────────────────────────────────────
          Top Navigation Bar & Module Tabs: Calendar, All Jobs, Quotes, Invoices, Unscheduled
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Jobber Schedule &amp; Operations</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-100 text-pink-700">
                Live Sync (120-Day Span)
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Browse 60 days past through 60 days forward with Jobber Month, 7-Day Week, 3-Day, and Daily Dispatch views
            </p>
          </div>
        </div>

        {/* Primary View Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 flex-wrap">
          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CALENDAR'
                ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Schedule Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LIST'
                ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>All Jobs ({filteredJobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('UNSCHEDULED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'UNSCHEDULED'
                ? 'bg-white text-amber-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Unscheduled</span>
            {unscheduledJobs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                {unscheduledJobs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigateToQuotes ? onNavigateToQuotes() : setActiveTab('QUOTES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'QUOTES'
                ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Open Jobber Quotes Pipeline"
          >
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>Quotes</span>
            {quotes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-700">
                {quotes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigateToInvoices ? onNavigateToInvoices() : setActiveTab('INVOICES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'INVOICES'
                ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Open Jobber Invoices Pipeline"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Invoices</span>
            {invoices.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700">
                {invoices.length}
              </span>
            )}
          </button>

          {onOpenJobberSync && (
            <button
              onClick={onOpenJobberSync}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0 ml-1"
              title="Open Jobber Integration Hub, live token sync, and CSV Importer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Jobber Sync &amp; CSV Import</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          Calendar Controls: Back 60d / Forward 60d Range Selector, View Switcher (Month, 7-Day, 3-Day, Day)
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'CALENDAR' && (
        <div className="bg-white border-b border-slate-200 px-4 py-2 shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Previous, Today, Next + Date Label */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                title="Previous period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleGoToToday}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                title="Next period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm font-extrabold text-slate-900 px-1">
              {currentPeriodLabel}
            </div>

            {/* Quick 120-Day Range Month Pills */}
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-200">
              {AVAILABLE_MONTHS.map((m) => {
                const isActiveMonth = currentYear === m.year && currentMonth === m.month;
                return (
                  <button
                    key={`${m.year}-${m.month}`}
                    onClick={() => handleJumpToMonth(m.year, m.month)}
                    className={`px-2 py-0.8 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      isActiveMonth
                        ? 'bg-purple-600 text-white shadow-2xs font-extrabold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                    title={`${m.label} (${m.sub})`}
                  >
                    <span>{m.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Item Type Switcher (All, Jobs, Quotes, Invoices) + Jobber View Switcher + Financial Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Item Type Switcher (Jobs, Quotes, Invoices) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setItemTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  itemTypeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Show all scheduled jobs, quotes, and invoices"
              >
                <span>All Items</span>
                <span className="text-[10px] font-mono px-1 rounded bg-slate-200 text-slate-700">
                  {filteredJobs.length + filteredQuotes.length + filteredInvoices.length}
                </span>
              </button>

              <button
                onClick={() => setItemTypeFilter('JOBS')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  itemTypeFilter === 'JOBS'
                    ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Show only scheduled cleaner jobs/visits"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <span>Jobs</span>
                <span className="text-[10px] font-mono px-1 rounded bg-blue-100 text-blue-800">
                  {filteredJobs.length}
                </span>
              </button>

              <button
                onClick={() => setItemTypeFilter('QUOTES')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  itemTypeFilter === 'QUOTES'
                    ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Show only Jobber quotes pipeline"
              >
                <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                <span>Quotes</span>
                <span className="text-[10px] font-mono px-1 rounded bg-purple-100 text-purple-800">
                  {filteredQuotes.length}
                </span>
              </button>

              <button
                onClick={() => setItemTypeFilter('INVOICES')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  itemTypeFilter === 'INVOICES'
                    ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Show only Jobber invoices and payment statuses"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <span>Invoices</span>
                <span className="text-[10px] font-mono px-1 rounded bg-emerald-100 text-emerald-800">
                  {filteredInvoices.length}
                </span>
              </button>
            </div>

            {/* Approved-Only Confirmation Toggle */}
            <button
              onClick={() => setApprovedOnly((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                approvedOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-extrabold'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
              }`}
              title={approvedOnly ? "Only showing approved scheduled jobs with assigned cleaners" : "Click to show all entries including unapproved estimates"}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${approvedOnly ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Approved Only</span>
            </button>

            {/* Visit Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              title="Filter by Jobber visit status"
            >
              <option value="ALL">All Visit Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Financial Filter */}
            <select
              value={financialFilter}
              onChange={(e) => setFinancialFilter(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Financials</option>
              <option value="PAID">Paid Invoices ($)</option>
              <option value="INVOICED">Invoiced Jobs</option>
              <option value="QUOTED">Quoted Jobs</option>
            </select>

            {/* Calendar Size Switcher (Standard, Large, Extra Large) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold" title="Adjust Calendar Size / Scale">
              <span className="text-[10px] font-black uppercase px-2 text-slate-500">Size:</span>
              <button
                type="button"
                onClick={() => setCalendarDensity('standard')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  calendarDensity === 'standard'
                    ? 'bg-white text-purple-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Standard Calendar Size"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setCalendarDensity('large')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  calendarDensity === 'large'
                    ? 'bg-white text-purple-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Large Calendar Size (Spacious - Recommended)"
              >
                Large
              </button>
              <button
                type="button"
                onClick={() => setCalendarDensity('xlarge')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  calendarDensity === 'xlarge'
                    ? 'bg-white text-purple-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Extra Large Calendar Size (Maximum Room)"
              >
                XL
              </button>
            </div>

            {/* Jobber Calendar Modes Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setCalendarViewMode('MONTH')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  calendarViewMode === 'MONTH'
                    ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Jobber Month View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>

              <button
                onClick={() => setCalendarViewMode('WEEK')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  calendarViewMode === 'WEEK'
                    ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Jobber 7-Day Week View"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>7-Day Week</span>
              </button>

              <button
                onClick={() => setCalendarViewMode('3DAY')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  calendarViewMode === '3DAY'
                    ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Jobber 3-Day Window View"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>3-Day</span>
              </button>

              <button
                onClick={() => setCalendarViewMode('DAY')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  calendarViewMode === 'DAY'
                    ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Jobber Single Day Dispatch View"
              >
                <Clock3 className="w-3.5 h-3.5" />
                <span>Day</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          15 Jobber Staff Color Legend & Filter Strip
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'CALENDAR' && (
        <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 shrink-0 overflow-x-auto scrollbar-none flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Active Cleaners ({activeCleaners.length}):</span>
          </span>

          <button
            onClick={() => setSelectedCleanerFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedCleanerFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Cleaners
          </button>

          <button
            onClick={() => setSelectedCleanerFilter(selectedCleanerFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
              selectedCleanerFilter === 'UNASSIGNED'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300'
            }`}
            title="Filter to jobs with no cleaner assigned"
          >
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span>Unassigned</span>
            {jobsInCurrentMonth.filter((j) => j.assignedCleaners.length === 0 || j.assignedCleaners.some(c => c.toLowerCase().includes('unassigned'))).length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                selectedCleanerFilter === 'UNASSIGNED' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {jobsInCurrentMonth.filter((j) => j.assignedCleaners.length === 0 || j.assignedCleaners.some(c => c.toLowerCase().includes('unassigned'))).length}
              </span>
            )}
          </button>

          {dynamicCleaners.map((tm) => {
            const isSelected = selectedCleanerFilter === tm.name;
            const assignedCount = jobsInCurrentMonth.filter((j) =>
              j.assignedCleaners.some((c) => c.toLowerCase().includes(tm.name.toLowerCase()))
            ).length;

            return (
              <button
                key={tm.id}
                onClick={() => setSelectedCleanerFilter(isSelected ? 'ALL' : tm.name)}
                className={`px-2 py-0.8 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-white shadow-xs ring-2 ring-purple-500 border-transparent font-bold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                } ${!tm.active ? 'opacity-60 bg-slate-100' : ''}`}
                title={`${tm.name} (${tm.vanUnit || 'Staff'}) ${!tm.active ? '• Archived' : ''}`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ${!tm.active ? 'grayscale' : ''}`}
                  style={{ backgroundColor: tm.color }}
                />
                <span className={`truncate max-w-[120px] ${!tm.active ? 'line-through text-slate-500' : ''}`}>
                  {tm.name}
                </span>
                {assignedCount > 0 && (
                  <span
                    className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold text-white shrink-0"
                    style={{ backgroundColor: tm.color }}
                  >
                    {assignedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          CALENDAR TAB CONTENT: Switch between Month, 7-Day Week, 3-Day, and Day View
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'CALENDAR' && (
        <div className="flex-1 flex overflow-hidden">
          {/* 1. MONTH VIEW */}
          {calendarViewMode === 'MONTH' && (
            <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1">
                {/* Day of Week Headers (Sunday through Saturday) */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider text-center py-2">
                  <div className="text-rose-600">Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div className="text-indigo-600">Sat</div>
                </div>

                {/* 42 Calendar Cells */}
                <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-slate-100">
                  {calendarCells.map((cell, idx) => {
                    const totalDayItems = cell.jobsOnDate.length + cell.quotesOnDate.length + cell.invoicesOnDate.length;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedDate(cell.date);
                          if (cell.jobsOnDate.length > 0) {
                            setSelectedItem({ type: 'JOB', id: cell.jobsOnDate[0].id });
                            setSelectedJobId(cell.jobsOnDate[0].id);
                            setIsDetailPanelOpen(true);
                          } else if (cell.quotesOnDate.length > 0) {
                            setSelectedItem({ type: 'QUOTE', id: cell.quotesOnDate[0].id });
                            setIsDetailPanelOpen(true);
                          } else if (cell.invoicesOnDate.length > 0) {
                            setSelectedItem({ type: 'INVOICE', id: cell.invoicesOnDate[0].id });
                            setIsDetailPanelOpen(true);
                          }
                        }}
                        className={`p-2 sm:p-2.5 flex flex-col transition-colors cursor-pointer select-none ${
                          calendarDensity === 'xlarge'
                            ? 'min-h-[250px]'
                            : calendarDensity === 'large'
                            ? 'min-h-[195px]'
                            : 'min-h-[160px]'
                        } ${
                          cell.isCurrentMonth ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/80 opacity-60'
                        } ${cell.isToday ? 'bg-amber-50/50 ring-2 ring-inset ring-amber-400' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                              cell.isToday
                                ? 'bg-blue-600 text-white shadow-xs'
                                : cell.isCurrentMonth
                                ? 'text-slate-900 font-extrabold'
                                : 'text-slate-400 font-medium'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>

                          {totalDayItems > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {cell.jobsOnDate.length} visit{cell.jobsOnDate.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Items Badges on this day (Jobs, Quotes, Invoices) */}
                        <div
                          className={`space-y-1.5 overflow-y-auto scrollbar-none pr-0.5 ${
                            calendarDensity === 'xlarge'
                              ? 'max-h-[220px]'
                              : calendarDensity === 'large'
                              ? 'max-h-[170px]'
                              : 'max-h-[135px]'
                          }`}
                        >
                          {/* Jobs on date */}
                          {showJobs && cell.jobsOnDate.map((job) => {
                            const isSelected = selectedItem?.type === 'JOB' && selectedItem.id === job.id;
                            const isDone = job.status === 'COMPLETED';
                            const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                            const cleanerColor = getCleanerColor(primaryCleaner);
                            const initials = getCleanerInitials(primaryCleaner);

                            return (
                              <div
                                key={job.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem({ type: 'JOB', id: job.id });
                                  setSelectedJobId(job.id);
                                  setIsDetailPanelOpen(true);
                                }}
                                className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-between gap-1.5 shadow-2xs ${
                                  isSelected ? 'ring-2 ring-slate-900 ring-offset-1 scale-[1.01]' : 'hover:brightness-95'
                                }`}
                                style={
                                  isDone
                                    ? {
                                        // Completed: lighter pastel shade with dark readable text
                                        backgroundColor: `${cleanerColor}22`,
                                        borderColor: `${cleanerColor}55`,
                                        color: '#0F172A',
                                      }
                                    : {
                                        // Open / Scheduled: vibrant solid cleaner color with crisp white text
                                        backgroundColor: cleanerColor,
                                        borderColor: cleanerColor,
                                        color: '#FFFFFF',
                                      }
                                }
                                title={`${job.title} (${job.assignedCleaners.join(' & ')}) • ${job.serviceAddress} [${isDone ? 'Completed' : 'Scheduled'}]`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {isDone ? (
                                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 stroke-[3]" />
                                  ) : (
                                    <span
                                      className="w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center shrink-0 border border-white/60 bg-black/25 text-white"
                                      title={`Cleaner: ${primaryCleaner}`}
                                    >
                                      {initials}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold opacity-90 shrink-0 font-mono">
                                    {formatDateTime(job.startAt).timeStr}
                                  </span>
                                  <span className="truncate font-bold text-[11px]">{job.clientName}</span>
                                </div>

                                {job.invoiceNumber && (
                                  <span
                                    className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 ${
                                      job.invoiceStatus === 'PAID'
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'bg-white/90 text-slate-900 border border-slate-300'
                                    }`}
                                    title={`Invoice: ${job.invoiceNumber} (${job.invoiceStatus})`}
                                  >
                                    $
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {/* Quotes on date */}
                          {showQuotes && cell.quotesOnDate.map((quote) => {
                            const isSelected = selectedItem?.type === 'QUOTE' && selectedItem.id === quote.id;

                            return (
                              <div
                                key={quote.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem({ type: 'QUOTE', id: quote.id });
                                }}
                                className={`px-1.5 py-1 rounded-md text-[11px] font-semibold border transition-all flex items-center justify-between gap-1 shadow-2xs cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-700 text-white border-purple-800 ring-2 ring-purple-300 font-bold'
                                    : 'bg-purple-50/80 hover:bg-purple-100/90 border-purple-200 text-purple-950'
                                }`}
                                style={{
                                  borderLeftColor: '#9333EA',
                                  borderLeftWidth: '3.5px',
                                }}
                                title={`Quote ${quote.quoteNumber}: ${quote.clientName} ($${quote.total}) • ${quote.quoteStatus}`}
                              >
                                <div className="flex items-center gap-1 truncate">
                                  <FileText className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                  <span className="font-mono text-[9px] font-extrabold opacity-90 shrink-0">
                                    {quote.quoteNumber}
                                  </span>
                                  <span className="truncate font-bold">{quote.clientName}</span>
                                  {quote.quoteStatus !== 'APPROVED' && (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-extrabold uppercase bg-amber-200 text-amber-900 shrink-0">
                                      Estimate
                                    </span>
                                  )}
                                </div>
                                <span className={`px-1 rounded text-[9px] font-mono font-bold shrink-0 ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-purple-200/80 text-purple-900'
                                }`}>
                                  ${quote.total}
                                </span>
                              </div>
                            );
                          })}

                          {/* Invoices on date */}
                          {showInvoices && cell.invoicesOnDate.map((inv) => {
                            const isSelected = selectedItem?.type === 'INVOICE' && selectedItem.id === inv.id;
                            const isPaid = inv.invoiceStatus === 'PAID';

                            return (
                              <div
                                key={inv.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem({ type: 'INVOICE', id: inv.id });
                                }}
                                className={`px-1.5 py-1 rounded-md text-[11px] font-semibold border transition-all flex items-center justify-between gap-1 shadow-2xs cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-300 font-bold'
                                    : isPaid
                                    ? 'bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-200 text-emerald-950'
                                    : 'bg-amber-50/80 hover:bg-amber-100/90 border-amber-200 text-amber-950'
                                }`}
                                style={{
                                  borderLeftColor: isPaid ? '#10B981' : '#F59E0B',
                                  borderLeftWidth: '3.5px',
                                }}
                                title={`Invoice ${inv.invoiceNumber}: ${inv.clientName} ($${inv.total}) • ${inv.invoiceStatus}`}
                              >
                                <div className="flex items-center gap-1 truncate">
                                  <Receipt className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  <span className="font-mono text-[9px] font-extrabold opacity-90 shrink-0">
                                    {inv.invoiceNumber}
                                  </span>
                                  <span className="truncate font-bold">{inv.clientName}</span>
                                </div>
                                <span className={`px-1 rounded text-[9px] font-mono font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : isPaid
                                    ? 'bg-emerald-200/80 text-emerald-900'
                                    : 'bg-amber-200/80 text-amber-900'
                                }`}>
                                  ${inv.total}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. 7-DAY WEEK VIEW (Jobber 7-Day Time Grid) */}
          {calendarViewMode === 'WEEK' && (
            <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1">
                {/* 7 Column Headers */}
                <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-center py-2.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center">
                    Time
                  </div>
                  {weekDays.map((col, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(col.date)}
                      className={`cursor-pointer transition-colors ${col.isToday ? 'font-extrabold text-amber-700' : 'text-slate-700'}`}
                    >
                      <div className="text-[10px] uppercase font-bold text-slate-500">{col.dayName}</div>
                      <div className={`text-sm font-extrabold ${col.isToday ? 'text-amber-600' : 'text-slate-900'}`}>
                        {col.monthLabel} {col.dayNumber}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {col.jobsOnDate.length} job{col.jobsOnDate.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 7-Day Hourly Grid */}
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-260px)]">
                  {TIME_SLOTS.map((slot) => (
                    <div
                      key={slot.hour}
                      className={`grid grid-cols-8 divide-x divide-slate-100 ${
                        calendarDensity === 'xlarge'
                          ? 'min-h-[125px]'
                          : calendarDensity === 'large'
                          ? 'min-h-[100px]'
                          : 'min-h-[76px]'
                      }`}
                    >
                      {/* Time Label */}
                      <div className="p-2 text-right text-[11px] font-bold font-mono text-slate-400 bg-slate-50/50">
                        {slot.label}
                      </div>

                      {/* 7 Day Columns for this hour */}
                      {weekDays.map((col, cIdx) => {
                        const jobsInHour = showJobs
                          ? col.jobsOnDate.filter((j) => {
                              const h = formatDateTime(j.startAt).hour;
                              return h === slot.hour;
                            })
                          : [];

                        const quotesInHour = showQuotes
                          ? col.quotesOnDate.filter((q) => {
                              const h = parseTimeToHour(q.scheduledTime, 10);
                              return h === slot.hour;
                            })
                          : [];

                        const invoicesInHour = showInvoices
                          ? col.invoicesOnDate.filter((inv) => {
                              const h = parseTimeToHour(inv.scheduledTime, 13);
                              return h === slot.hour;
                            })
                          : [];

                        return (
                          <div
                            key={cIdx}
                            className={`p-1 flex flex-col gap-1 transition-colors ${
                              col.isToday ? 'bg-amber-50/20' : 'hover:bg-slate-50/50'
                            }`}
                          >
                            {/* Jobs in this hour */}
                            {jobsInHour.map((job) => {
                              const isSelected = selectedItem?.type === 'JOB' && selectedItem.id === job.id;
                              const isDone = job.status === 'COMPLETED';
                              const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                              const cleanerColor = getCleanerColor(primaryCleaner);
                              const initials = getCleanerInitials(primaryCleaner);

                              return (
                                <div
                                  key={job.id}
                                  onClick={() => {
                                    setSelectedItem({ type: 'JOB', id: job.id });
                                    setSelectedJobId(job.id);
                                  }}
                                  className={`p-2 rounded-xl border text-xs shadow-2xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'ring-2 ring-slate-900 ring-offset-1 shadow-md scale-[1.01]'
                                      : 'hover:brightness-95'
                                  }`}
                                  style={
                                    isDone
                                      ? {
                                          backgroundColor: `${cleanerColor}22`,
                                          borderColor: `${cleanerColor}55`,
                                          color: '#0F172A',
                                        }
                                      : {
                                          backgroundColor: cleanerColor,
                                          borderColor: cleanerColor,
                                          color: '#FFFFFF',
                                        }
                                  }
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      {isDone ? (
                                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 stroke-[3]" />
                                      ) : (
                                        <span
                                          className="w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center shrink-0 border border-white/60 bg-black/25 text-white"
                                          title={`Cleaner: ${primaryCleaner}`}
                                        >
                                          {initials}
                                        </span>
                                      )}
                                      <span className="font-extrabold truncate">{job.clientName}</span>
                                    </div>
                                    {job.invoiceNumber && (
                                      <span className={`text-[9px] font-mono px-1 rounded font-bold shrink-0 ${
                                        isDone ? 'bg-white text-slate-900 border border-slate-300' : 'bg-black/25 text-white'
                                      }`}>
                                        ${job.invoiceTotal || ''}
                                      </span>
                                    )}
                                  </div>

                                  <div className={`text-[10px] truncate flex items-center gap-1 ${
                                    isDone ? 'text-slate-600' : 'text-white/90'
                                  }`}>
                                    <Clock className={`w-2.5 h-2.5 shrink-0 ${isDone ? 'text-slate-500' : 'text-white/80'}`} />
                                    <span>{formatDateTime(job.startAt).timeStr}</span>
                                    <span>•</span>
                                    <span className="truncate">{job.serviceType.replace(' Cleaning', '')}</span>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Quotes in this hour */}
                            {quotesInHour.map((quote) => {
                              const isSelected = selectedItem?.type === 'QUOTE' && selectedItem.id === quote.id;

                              return (
                                <div
                                  key={quote.id}
                                  onClick={() => setSelectedItem({ type: 'QUOTE', id: quote.id })}
                                  className={`p-2 rounded-xl border text-xs shadow-2xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-300'
                                      : 'bg-purple-50/80 hover:bg-purple-100/90 border-purple-200 text-purple-950'
                                  }`}
                                  style={{
                                    borderLeftColor: '#9333EA',
                                    borderLeftWidth: '4px',
                                  }}
                                  title={`Quote ${quote.quoteNumber}: ${quote.clientName}`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <div className="flex items-center gap-1 truncate font-extrabold">
                                      <FileText className="w-3 h-3 text-purple-600 shrink-0" />
                                      <span className="truncate">{quote.clientName}</span>
                                    </div>
                                    <span className={`text-[9px] font-mono px-1 rounded font-bold ${
                                      isSelected ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-900'
                                    }`}>
                                      ${quote.total}
                                    </span>
                                  </div>

                                  <div className="text-[10px] text-purple-700 flex items-center justify-between font-mono">
                                    <span>{quote.quoteNumber}</span>
                                    <span className="px-1 rounded bg-purple-100 text-purple-800 text-[9px] font-sans font-bold">
                                      {quote.quoteStatus}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Invoices in this hour */}
                            {invoicesInHour.map((inv) => {
                              const isSelected = selectedItem?.type === 'INVOICE' && selectedItem.id === inv.id;
                              const isPaid = inv.invoiceStatus === 'PAID';

                              return (
                                <div
                                  key={inv.id}
                                  onClick={() => setSelectedItem({ type: 'INVOICE', id: inv.id })}
                                  className={`p-2 rounded-xl border text-xs shadow-2xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-300'
                                      : isPaid
                                      ? 'bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-200 text-emerald-950'
                                      : 'bg-amber-50/80 hover:bg-amber-100/90 border-amber-200 text-amber-950'
                                  }`}
                                  style={{
                                    borderLeftColor: isPaid ? '#10B981' : '#F59E0B',
                                    borderLeftWidth: '4px',
                                  }}
                                  title={`Invoice ${inv.invoiceNumber}: ${inv.clientName}`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <div className="flex items-center gap-1 truncate font-extrabold">
                                      <Receipt className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span className="truncate">{inv.clientName}</span>
                                    </div>
                                    <span className={`text-[9px] font-mono px-1 rounded font-bold ${
                                      isSelected
                                        ? 'bg-white/20 text-white'
                                        : isPaid
                                        ? 'bg-emerald-200 text-emerald-900'
                                        : 'bg-amber-200 text-amber-900'
                                    }`}>
                                      ${inv.total}
                                    </span>
                                  </div>

                                  <div className="text-[10px] flex items-center justify-between font-mono">
                                    <span className="text-slate-500">{inv.invoiceNumber}</span>
                                    <span className={`px-1 rounded text-[9px] font-sans font-bold ${
                                      isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {inv.invoiceStatus}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. 3-DAY VIEW (Focused 3-Day Window) */}
          {calendarViewMode === '3DAY' && (
            <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1">
                {/* 3 Column Headers */}
                <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 py-3 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center">
                    Timeline
                  </div>
                  {threeDays.map((col, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(col.date)}
                      className={`cursor-pointer ${col.isToday ? 'font-extrabold text-amber-700' : 'text-slate-800'}`}
                    >
                      <div className="text-xs uppercase font-extrabold text-purple-700">{col.dayName}</div>
                      <div className="text-base font-extrabold text-slate-900">
                        {col.monthLabel} {col.dayNumber}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {col.jobsOnDate.length} scheduled visits
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3-Day Hourly Grid */}
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-260px)]">
                  {TIME_SLOTS.map((slot) => (
                    <div
                      key={slot.hour}
                      className={`grid grid-cols-4 divide-x divide-slate-100 ${
                        calendarDensity === 'xlarge'
                          ? 'min-h-[140px]'
                          : calendarDensity === 'large'
                          ? 'min-h-[110px]'
                          : 'min-h-[85px]'
                      }`}
                    >
                      <div className="p-3 text-right text-xs font-bold font-mono text-slate-400 bg-slate-50/50">
                        {slot.label}
                      </div>

                      {threeDays.map((col, cIdx) => {
                        const jobsInHour = showJobs
                          ? col.jobsOnDate.filter((j) => {
                              const h = formatDateTime(j.startAt).hour;
                              return h === slot.hour;
                            })
                          : [];

                        const quotesInHour = showQuotes
                          ? col.quotesOnDate.filter((q) => {
                              const h = parseTimeToHour(q.scheduledTime, 10);
                              return h === slot.hour;
                            })
                          : [];

                        const invoicesInHour = showInvoices
                          ? col.invoicesOnDate.filter((inv) => {
                              const h = parseTimeToHour(inv.scheduledTime, 13);
                              return h === slot.hour;
                            })
                          : [];

                        return (
                          <div
                            key={cIdx}
                            className={`p-2 flex flex-col gap-1.5 ${
                              col.isToday ? 'bg-amber-50/20' : 'hover:bg-slate-50/40'
                            }`}
                          >
                            {/* Jobs in this hour */}
                            {jobsInHour.map((job) => {
                              const cleanerColor = getCleanerColor(job.assignedCleaners[0] || '');
                              const isSelected = selectedItem?.type === 'JOB' && selectedItem.id === job.id;

                              return (
                                <div
                                  key={job.id}
                                  onClick={() => {
                                    setSelectedItem({ type: 'JOB', id: job.id });
                                    setSelectedJobId(job.id);
                                  }}
                                  className={`p-2.5 rounded-xl border text-xs shadow-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300'
                                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900'
                                  }`}
                                  style={{
                                    borderLeftColor: cleanerColor,
                                    borderLeftWidth: '5px',
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-extrabold text-sm truncate">{job.clientName}</span>
                                    <div className="flex items-center gap-1">
                                      {job.invoiceNumber && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                          job.invoiceStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                          {job.invoiceStatus === 'PAID' ? 'Paid' : `$${job.invoiceTotal}`}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-slate-600 flex items-center gap-1 truncate mb-1">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{job.serviceAddress}</span>
                                  </div>

                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-purple-600 shrink-0" />
                                      <span className="font-mono">{formatDateTime(job.startAt).timeStr}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="font-bold">{job.assignedCleaners.join(' & ')}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Quotes in this hour */}
                            {quotesInHour.map((quote) => {
                              const isSelected = selectedItem?.type === 'QUOTE' && selectedItem.id === quote.id;

                              return (
                                <div
                                  key={quote.id}
                                  onClick={() => setSelectedItem({ type: 'QUOTE', id: quote.id })}
                                  className={`p-2.5 rounded-xl border text-xs shadow-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-300'
                                      : 'bg-purple-50/80 hover:bg-purple-100/90 border-purple-200 text-purple-950'
                                  }`}
                                  style={{
                                    borderLeftColor: '#9333EA',
                                    borderLeftWidth: '5px',
                                  }}
                                  title={`Quote ${quote.quoteNumber}: ${quote.clientName}`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1 font-extrabold text-sm truncate">
                                      <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                      <span className="truncate">{quote.clientName}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      isSelected ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-900'
                                    }`}>
                                      ${quote.total}.00
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                                    <span className="font-mono font-bold text-purple-700">{quote.quoteNumber}</span>
                                    <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                      {quote.quoteStatus}
                                    </span>
                                  </div>
                                  {quote.serviceAddress && (
                                    <div className="text-[10px] text-slate-500 truncate mt-1">
                                      {quote.serviceAddress}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Invoices in this hour */}
                            {invoicesInHour.map((inv) => {
                              const isSelected = selectedItem?.type === 'INVOICE' && selectedItem.id === inv.id;
                              const isPaid = inv.invoiceStatus === 'PAID';

                              return (
                                <div
                                  key={inv.id}
                                  onClick={() => setSelectedItem({ type: 'INVOICE', id: inv.id })}
                                  className={`p-2.5 rounded-xl border text-xs shadow-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-300'
                                      : isPaid
                                      ? 'bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-200 text-emerald-950'
                                      : 'bg-amber-50/80 hover:bg-amber-100/90 border-amber-200 text-amber-950'
                                  }`}
                                  style={{
                                    borderLeftColor: isPaid ? '#10B981' : '#F59E0B',
                                    borderLeftWidth: '5px',
                                  }}
                                  title={`Invoice ${inv.invoiceNumber}: ${inv.clientName}`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1 font-extrabold text-sm truncate">
                                      <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span className="truncate">{inv.clientName}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      isSelected
                                        ? 'bg-white/20 text-white'
                                        : isPaid
                                        ? 'bg-emerald-200 text-emerald-900'
                                        : 'bg-amber-200 text-amber-900'
                                    }`}>
                                      ${inv.total}.00
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                                    <span className="font-mono font-bold text-slate-700">{inv.invoiceNumber}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {inv.invoiceStatus}
                                    </span>
                                  </div>
                                  {inv.serviceAddress && (
                                    <div className="text-[10px] text-slate-500 truncate mt-1">
                                      {inv.serviceAddress}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. DAY VIEW (Jobber Daily Dispatch & Cleaner Lanes) */}
          {calendarViewMode === 'DAY' && (
            <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1 p-4">
                {/* Day Header & Sub-view Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>{singleDayInfo.formattedLabel}</span>
                      {singleDayInfo.isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                          Today
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {singleDayInfo.jobsOnDate.length} scheduled visits • {activeCleaners.length} active cleaners available
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                      <button
                        onClick={() => setDaySubView('TIMELINE')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          daySubView === 'TIMELINE' ? 'bg-white text-purple-700 shadow-2xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        Chronological Timeline
                      </button>
                      <button
                        onClick={() => setDaySubView('LANES')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          daySubView === 'LANES' ? 'bg-white text-purple-700 shadow-2xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        Cleaner Lanes Grid
                      </button>
                    </div>
                  </div>
                </div>

                {/* Day Sub-view: Timeline */}
                {daySubView === 'TIMELINE' && (
                  <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
                    {/* Check if no items at all */}
                    {((showJobs ? singleDayInfo.jobsOnDate.length : 0) +
                      (showQuotes ? singleDayInfo.quotesOnDate.length : 0) +
                      (showInvoices ? singleDayInfo.invoicesOnDate.length : 0)) === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        No scheduled jobs, quotes, or invoices for this date.
                      </div>
                    ) : (
                      <>
                        {/* Jobs in timeline */}
                        {showJobs && singleDayInfo.jobsOnDate.map((job) => {
                          const cleanerColor = getCleanerColor(job.assignedCleaners[0] || '');
                          const isSelected = selectedItem?.type === 'JOB' && selectedItem.id === job.id;

                          return (
                            <div
                              key={job.id}
                              onClick={() => {
                                setSelectedItem({ type: 'JOB', id: job.id });
                                setSelectedJobId(job.id);
                              }}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                isSelected
                                  ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-300 shadow-xs'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                              }`}
                              style={{
                                borderLeftColor: cleanerColor,
                                borderLeftWidth: '6px',
                              }}
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-slate-900">{job.clientName}</span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {job.serviceType}
                                  </span>
                                  {job.invoiceNumber && (
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                      job.invoiceStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {job.invoiceNumber} • {job.invoiceStatus}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                                    <span className="font-mono font-bold">{formatDateTime(job.startAt).timeStr} – {formatDateTime(job.endAt).timeStr}</span>
                                  </span>
                                  <span className="flex items-center gap-1 truncate max-w-md">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{job.serviceAddress}</span>
                                  </span>
                                  <span className="flex items-center gap-1 font-mono text-slate-600">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{job.clientPhone}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Cleaners Assigned */}
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1.5">
                                  {job.assignedCleaners.map((cleaner, i) => (
                                    <div
                                      key={i}
                                      className="px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-2xs"
                                      style={{
                                        backgroundColor: `${getCleanerColor(cleaner)}15`,
                                        borderColor: `${getCleanerColor(cleaner)}40`,
                                        color: getCleanerColor(cleaner),
                                      }}
                                    >
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: getCleanerColor(cleaner) }}
                                      />
                                      <span>{cleaner}</span>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCleanerEditor(job);
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                  Edit Team
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Quotes in timeline */}
                        {showQuotes && singleDayInfo.quotesOnDate.map((quote) => {
                          const isSelected = selectedItem?.type === 'QUOTE' && selectedItem.id === quote.id;

                          return (
                            <div
                              key={quote.id}
                              onClick={() => setSelectedItem({ type: 'QUOTE', id: quote.id })}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                isSelected
                                  ? 'bg-purple-100/70 border-purple-500 ring-2 ring-purple-300 shadow-xs'
                                  : 'bg-purple-50/50 hover:bg-purple-50 border-purple-200 shadow-2xs'
                              }`}
                              style={{
                                borderLeftColor: '#9333EA',
                                borderLeftWidth: '6px',
                              }}
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                                  <span className="font-extrabold text-sm text-slate-900">{quote.clientName}</span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-200 text-purple-900">
                                    {quote.quoteNumber}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-purple-800 border border-purple-200">
                                    {quote.quoteStatus}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                                  <span className="flex items-center gap-1 font-semibold text-purple-900">
                                    <span>{quote.service}</span>
                                  </span>
                                  {quote.serviceAddress && (
                                    <span className="flex items-center gap-1 truncate max-w-md">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{quote.serviceAddress}</span>
                                    </span>
                                  )}
                                  {quote.clientPhone && (
                                    <span className="flex items-center gap-1 font-mono text-slate-600">
                                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{quote.clientPhone}</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <div className="text-sm font-extrabold text-purple-900 font-mono">${quote.total}.00</div>
                                  <div className="text-[10px] text-slate-400">Deposit: ${quote.depositRequired}</div>
                                </div>
                                <span className="px-2.5 py-1 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-2xs">
                                  Quote
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Invoices in timeline */}
                        {showInvoices && singleDayInfo.invoicesOnDate.map((inv) => {
                          const isSelected = selectedItem?.type === 'INVOICE' && selectedItem.id === inv.id;
                          const isPaid = inv.invoiceStatus === 'PAID';

                          return (
                            <div
                              key={inv.id}
                              onClick={() => setSelectedItem({ type: 'INVOICE', id: inv.id })}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                isSelected
                                  ? 'bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-300 shadow-xs'
                                  : isPaid
                                  ? 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 shadow-2xs'
                                  : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 shadow-2xs'
                              }`}
                              style={{
                                borderLeftColor: isPaid ? '#10B981' : '#F59E0B',
                                borderLeftWidth: '6px',
                              }}
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <Receipt className={`w-4 h-4 shrink-0 ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`} />
                                  <span className="font-extrabold text-sm text-slate-900">{inv.clientName}</span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                                    {inv.invoiceNumber}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    isPaid ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                                  }`}>
                                    {inv.invoiceStatus}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                                    <span>{inv.service}</span>
                                  </span>
                                  {inv.serviceAddress && (
                                    <span className="flex items-center gap-1 truncate max-w-md">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{inv.serviceAddress}</span>
                                    </span>
                                  )}
                                  {inv.clientPhone && (
                                    <span className="flex items-center gap-1 font-mono text-slate-600">
                                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{inv.clientPhone}</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <div className="text-sm font-extrabold text-slate-900 font-mono">${inv.total}.00</div>
                                  <div className={`text-[10px] font-semibold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Balance: ${inv.balance}.00
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-xl text-white text-xs font-bold shadow-2xs ${
                                  isPaid ? 'bg-emerald-600' : 'bg-amber-600'
                                }`}>
                                  Invoice
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* Day Sub-view: Cleaner Lanes Grid */}
                {daySubView === 'LANES' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 overflow-y-auto max-h-[calc(100vh-300px)]">
                    {activeCleaners.map((cleaner) => {
                      const cleanerJobs = singleDayInfo.cleanerLanes[cleaner.name] || [];

                      return (
                        <div
                          key={cleaner.id}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                                style={{ backgroundColor: cleaner.color }}
                              />
                              <div>
                                <h3 className="font-bold text-xs text-slate-900">{cleaner.name}</h3>
                                <p className="text-[10px] text-slate-500 font-mono">{cleaner.vanUnit}</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                              {cleanerJobs.length} stop{cleanerJobs.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="space-y-2 flex-1 overflow-y-auto">
                            {cleanerJobs.length === 0 ? (
                              <div className="py-6 text-center text-[11px] text-slate-400">
                                No stops assigned today
                              </div>
                            ) : (
                              cleanerJobs.map((j) => (
                                <div
                                  key={j.id}
                                  onClick={() => setSelectedJobId(j.id)}
                                  className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs cursor-pointer hover:border-purple-300 transition-colors"
                                >
                                  <div className="flex items-center justify-between font-bold mb-1">
                                    <span className="truncate">{j.clientName}</span>
                                    <span className="text-[10px] font-mono text-purple-700">{formatDateTime(j.startAt).timeStr}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate">{j.serviceAddress}</p>
                                  {j.invoiceNumber && (
                                    <div className="mt-1 text-[10px] font-mono font-bold text-emerald-700">
                                      {j.invoiceNumber} • ${j.invoiceTotal || ''}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────────────────
              Right Side Inspector: Details of Selected Job, Quotes & Invoices, Cleaners
             ───────────────────────────────────────────────────────────────────────────── */}
          {selectedItem?.type === 'QUOTE' && activeQuote ? (
            <div className="w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{activeQuote.quoteNumber}</h3>
                    <p className="text-[11px] text-purple-700 font-semibold">{activeQuote.service}</p>
                  </div>
                </div>

                <a
                  href={activeQuote.jobberWebUri || 'https://secure.getjobber.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Jobber</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Client Info */}
              <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>{activeQuote.clientName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900">
                    {activeQuote.quoteStatus}
                  </span>
                </div>
                {activeQuote.clientPhone && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`tel:${activeQuote.clientPhone}`} className="hover:text-purple-600 font-mono">
                      {activeQuote.clientPhone}
                    </a>
                  </div>
                )}
                {activeQuote.serviceAddress && (
                  <div className="flex items-start gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{activeQuote.serviceAddress}</span>
                  </div>
                )}
              </div>

              {/* Financials & Deposit */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-700">Quote Estimate</span>
                  <span className="text-base font-extrabold text-purple-900 font-mono">
                    ${activeQuote.total}.00
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  <span>Deposit Required:</span>
                  <span className="font-bold text-slate-800 font-mono">${activeQuote.depositRequired}.00</span>
                </div>
                {activeQuote.scheduledDate && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Target Date:</span>
                    <span className="font-bold text-purple-700 font-mono">
                      {activeQuote.scheduledDate} ({activeQuote.scheduledTime || '10:00 AM'})
                    </span>
                  </div>
                )}
              </div>

              {/* Line items */}
              {activeQuote.lineItems && activeQuote.lineItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Line Items</h4>
                  <div className="space-y-1.5">
                    {activeQuote.lineItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{item.description}</div>
                          {item.quantity && <div className="text-[10px] text-slate-400">Qty: {item.quantity} • ${item.unitPrice || item.total}/ea</div>}
                        </div>
                        <div className="font-mono font-bold text-slate-900">${item.total}.00</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {onNavigateToQuotes && (
                  <button
                    onClick={onNavigateToQuotes}
                    className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View in Quotes Pipeline</span>
                  </button>
                )}
              </div>
            </div>
          ) : selectedItem?.type === 'INVOICE' && activeInvoice ? (
            <div className="w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                    activeInvoice.invoiceStatus === 'PAID' ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}>
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{activeInvoice.invoiceNumber}</h3>
                    <p className="text-[11px] text-slate-500">{activeInvoice.service}</p>
                  </div>
                </div>

                <a
                  href={activeInvoice.jobberWebUri || 'https://secure.getjobber.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Jobber</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Client Info */}
              <div className="p-3 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>{activeInvoice.clientName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeInvoice.invoiceStatus === 'PAID'
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {activeInvoice.invoiceStatus}
                  </span>
                </div>
                {activeInvoice.clientPhone && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`tel:${activeInvoice.clientPhone}`} className="hover:text-emerald-700 font-mono">
                      {activeInvoice.clientPhone}
                    </a>
                  </div>
                )}
                {activeInvoice.serviceAddress && (
                  <div className="flex items-start gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{activeInvoice.serviceAddress}</span>
                  </div>
                )}
              </div>

              {/* Balance & Payment Details */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Total Invoice:</span>
                  <span className="font-mono font-extrabold text-sm text-slate-900">${activeInvoice.total}.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Balance Due:</span>
                  <span className={`font-mono font-extrabold text-sm ${
                    activeInvoice.balance === 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    ${activeInvoice.balance}.00
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Due Date:</span>
                  <span className="font-mono font-bold text-slate-700">{activeInvoice.dueDate}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Issued Date:</span>
                  <span className="font-mono text-slate-600">{activeInvoice.issuedDate}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {onNavigateToInvoices && (
                  <button
                    onClick={onNavigateToInvoices}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>View in Invoices Pipeline</span>
                  </button>
                )}
              </div>
            </div>
          ) : activeJob && isDetailPanelOpen ? (
            <div className="w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: getCleanerColor(activeJob.assignedCleaners[0] || '') }}
                  />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{activeJob.visitNumber}</h3>
                    <p className="text-[11px] text-slate-500">{activeJob.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={activeJob.jobberWebUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Open in Jobber"
                  >
                    <span>Jobber</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsDetailPanelOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close details panel to expand calendar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Client Info with Clickable Phone & Clickable Address */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Client</span>
                  <div className="font-black text-slate-900 text-sm">{activeJob.clientName}</div>
                </div>

                {/* Clickable Phone Action */}
                <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                      Client Phone (Click to Dial)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        Direct Line
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalJob(activeJob);
                          setIsJobVisitModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer underline"
                        title="Edit phone number or fix digits"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                  <a
                    href={`tel:${activeJob.clientPhone}`}
                    className="flex items-center justify-between p-2 bg-white hover:bg-emerald-100/60 rounded-lg border border-emerald-300 text-emerald-950 font-bold transition-all shadow-2xs group cursor-pointer"
                    title="Click to dial client on phone"
                  >
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span>{activeJob.clientPhone}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black flex items-center gap-1 shadow-2xs">
                      <Phone className="w-2.5 h-2.5" />
                      <span>Call</span>
                    </span>
                  </a>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <a
                      href={`sms:${activeJob.clientPhone}`}
                      className="flex-1 py-1 px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-700" />
                      <span>SMS / Text</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(activeJob.clientPhone);
                        setCopiedPhone(true);
                        setTimeout(() => setCopiedPhone(false), 2000);
                      }}
                      className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded border border-emerald-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Secondary / Alternate Phone Number */}
                <div className="bg-slate-100/80 rounded-xl p-2.5 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                      Secondary Phone (Alt Line)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModalJob(activeJob);
                        setIsJobVisitModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                      <span>{activeJob.secondaryPhone ? 'Edit' : '+ Add 2nd Phone'}</span>
                    </button>
                  </div>

                  {activeJob.secondaryPhone ? (
                    <>
                      <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-slate-900 font-bold transition-all shadow-2xs">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{activeJob.secondaryPhone}</span>
                        </div>
                        <a
                          href={`tel:${activeJob.secondaryPhone}`}
                          className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-black flex items-center gap-1 shadow-2xs hover:bg-slate-900"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>Call</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <a
                          href={`sms:${activeJob.secondaryPhone}`}
                          className="flex-1 py-1 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3 text-slate-600" />
                          <span>SMS / Text</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(activeJob.secondaryPhone!);
                            setCopiedSecondaryPhone(true);
                            setTimeout(() => setCopiedSecondaryPhone(false), 2000);
                          }}
                          className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedSecondaryPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                          <span>{copiedSecondaryPhone ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic p-1">
                      No alternate number on file.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalJob(activeJob);
                          setIsJobVisitModalOpen(true);
                        }}
                        className="text-pink-600 hover:underline font-semibold cursor-pointer"
                      >
                        Add secondary phone →
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Client / Numbers Quick Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalJob(activeJob);
                    setIsJobVisitModalOpen(true);
                  }}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                >
                  <Edit2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Edit Client Name, Phones &amp; Address</span>
                </button>

                {/* Clickable Address Action */}
                <div className="bg-purple-50 rounded-xl p-2.5 border border-purple-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-purple-800 tracking-wider">
                      Service Address (Click to Open Map)
                    </span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                      Live Map
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectJobOnMap) {
                        onSelectJobOnMap(activeJob);
                      }
                    }}
                    className="w-full text-left flex items-start justify-between p-2 bg-white hover:bg-purple-100/60 rounded-lg border border-purple-300 text-purple-950 font-bold transition-all shadow-2xs group cursor-pointer"
                    title="Click to locate on Map automatically"
                  >
                    <div className="flex items-start gap-1.5 text-xs leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-extrabold text-purple-950">{activeJob.serviceAddress}</div>
                        <div className="text-[11px] text-purple-700 font-semibold mt-0.5 flex items-center gap-1">
                          <span>Go to Map automatically</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeJob.serviceAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1 px-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                      title="Open external Google Maps"
                    >
                      <ExternalLink className="w-3 h-3 text-purple-700" />
                      <span>Google Maps App</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(activeJob.serviceAddress);
                        setCopiedAddress(true);
                        setTimeout(() => setCopiedAddress(false), 2000);
                      }}
                      className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded border border-purple-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedAddress ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Job Status Shading Toggle */}
                <div className="pt-1">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Job Status (Shading Control)
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 rounded-xl">
                    <button
                      type="button"
                      onClick={() => onUpdateJobStatus?.(activeJob.id, 'SCHEDULED')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeJob.status !== 'COMPLETED'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getCleanerColor(activeJob.assignedCleaners[0] || '') }}
                      />
                      <span>Open (Vibrant)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateJobStatus?.(activeJob.id, 'COMPLETED')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeJob.status === 'COMPLETED'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Done (Shaded)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Linked Jobber Quote & Invoice Status (Clickable) */}
              <div className="p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50/60 rounded-2xl border border-purple-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-purple-950 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-purple-600" />
                    <span>Quote &amp; Invoice Status</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    activeJob.invoiceStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {activeJob.invoiceStatus || 'PENDING'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onNavigateToQuotes?.()}
                    className="p-2 bg-white hover:bg-purple-50 rounded-xl border border-purple-100 text-left transition-colors cursor-pointer group"
                    title="Click to view quote"
                  >
                    <div className="text-slate-400 font-bold uppercase text-[9px] flex items-center justify-between">
                      <span>Linked Quote</span>
                      <ArrowRight className="w-2.5 h-2.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="font-extrabold text-purple-900">{activeJob.quoteNumber || 'QT-2041'}</div>
                    <div className="text-slate-500 font-mono">${activeJob.quoteTotal || 340}.00</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToInvoices?.()}
                    className="p-2 bg-white hover:bg-indigo-50 rounded-xl border border-purple-100 text-left transition-colors cursor-pointer group"
                    title="Click to view invoice"
                  >
                    <div className="text-slate-400 font-bold uppercase text-[9px] flex items-center justify-between">
                      <span>Linked Invoice</span>
                      <ArrowRight className="w-2.5 h-2.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="font-extrabold text-indigo-900">{activeJob.invoiceNumber || 'INV-4028'}</div>
                    <div className="text-slate-500 font-mono">${activeJob.invoiceTotal || 340}.00</div>
                  </button>
                </div>
              </div>

              {/* Assigned Cleaners */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assigned Cleaners ({activeJob.assignedCleaners.length})</span>
                  </span>
                  <button
                    onClick={() => handleOpenCleanerEditor(activeJob)}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                  >
                    Edit Cleaners
                  </button>
                </div>

                <div className="space-y-1.5">
                  {activeJob.assignedCleaners.map((cleaner, i) => {
                    const cleanerColor = getCleanerColor(cleaner);
                    const matchingTech = technicians.find(
                      (t) =>
                        t.name.toLowerCase().includes(cleaner.toLowerCase()) ||
                        cleaner.toLowerCase().includes(t.name.toLowerCase())
                    );

                    return (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cleanerColor }}
                          />
                          <div>
                            <span className="font-bold text-slate-800">{cleaner}</span>
                            <div className="text-[10px] text-slate-400 font-mono">Jobber Team</div>
                          </div>
                        </div>
                        {matchingTech?.phone ? (
                          <a
                            href={`tel:${matchingTech.phone}`}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>Call</span>
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action: Open on Map */}
              {onSelectJobOnMap && (
                <button
                  type="button"
                  onClick={() => onSelectJobOnMap(activeJob)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Inspect Stop on Live Dispatch Map →</span>
                </button>
              )}
            </div>
          ) : activeJob && !isDetailPanelOpen ? (
            <div className="p-2 border-l border-slate-200 bg-slate-50 flex flex-col justify-start">
              <button
                type="button"
                onClick={() => setIsDetailPanelOpen(true)}
                className="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 text-slate-700 shadow-2xs font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Expand Job Details Drawer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Job Details</span>
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          LIST VIEW TAB: All Jobs across 120-Day Range
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'LIST' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs by client, address, quote, or invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 focus:outline-none"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              Showing {filteredJobs.length} jobs spanning August through December 2026
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-3">Visit &amp; Date</th>
                  <th className="p-3">Client &amp; Address</th>
                  <th className="p-3">Cleaners Assigned</th>
                  <th className="p-3">Quote #</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900">{j.visitNumber}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {formatDateTime(j.startAt).dateStr} • {formatDateTime(j.startAt).timeStr}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{j.clientName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{j.serviceAddress}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {j.assignedCleaners.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800"
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCleanerColor(c) }} />
                            <span>{c}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-purple-700">
                      {j.quoteNumber || 'QT-2010'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        j.invoiceStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {j.invoiceNumber || 'INV-4010'} • {j.invoiceStatus || 'PAID'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleOpenCleanerEditor(j)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Edit Team
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          UNSCHEDULED TAB: Jobber Unscheduled Jobs with Approval & Scheduling
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'UNSCHEDULED' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-900">Unscheduled Jobs in Jobber</h3>
                <p className="text-xs text-amber-700">
                  Approved customer quote conversions awaiting date/time slot and cleaner team attachment
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-amber-200 text-amber-900">
              {unscheduledJobs.length} Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unscheduledJobs.map((ujob) => (
              <div
                key={ujob.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold font-mono text-purple-700">{ujob.jobNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {ujob.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900">{ujob.clientName}</h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{ujob.serviceAddress}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{ujob.clientPhone}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1">
                    <div className="font-bold text-slate-900">Window: {ujob.requestedWindow}</div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{ujob.notes}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">${ujob.totalAmount}.00</span>
                  <button
                    onClick={() => handleOpenScheduleModal(ujob)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Schedule &amp; Attach Team</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          QUOTES & INVOICES FALLBACK VIEWS (If opened inside schedule tab)
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'QUOTES' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Jobber Quotes Pipeline</h3>
            {onNavigateToQuotes && (
              <button
                onClick={onNavigateToQuotes}
                className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold"
              >
                Open Full Pipeline
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quotes.map((q) => (
              <div key={q.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex justify-between font-bold text-xs">
                  <span className="text-purple-700">{q.quoteNumber}</span>
                  <span className="text-emerald-700">${q.total}</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{q.clientName}</div>
                <div className="text-xs text-slate-500">{q.service}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'INVOICES' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Jobber Invoices Pipeline</h3>
            {onNavigateToInvoices && (
              <button
                onClick={onNavigateToInvoices}
                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
              >
                Open Full Pipeline
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex justify-between font-bold text-xs">
                  <span className="text-indigo-700">{inv.invoiceNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inv.invoiceStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inv.invoiceStatus}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{inv.clientName}</div>
                <div className="text-xs text-slate-500">${inv.total}.00 total</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: Attach / Reassign Cleaners to Visit
         ───────────────────────────────────────────────────────────────────────────── */}
      {editingJobForCleaners && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Attach Cleaners • {editingJobForCleaners.clientName}
                </h3>
                <p className="text-xs text-slate-500">
                  Select 1, 2, or multiple cleaners to attach together
                </p>
              </div>
              <button
                onClick={() => setEditingJobForCleaners(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Selected: {tempAssignedCleaners.length} Cleaner{tempAssignedCleaners.length !== 1 ? 's' : ''}</span>
                <span className="text-purple-700">{tempAssignedCleaners.join(', ') || 'None'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                {activeCleaners.map((cleaner) => {
                  const isChecked = tempAssignedCleaners.includes(cleaner.name);
                  return (
                    <div
                      key={cleaner.id}
                      onClick={() => handleToggleCleanerAssignment(cleaner.name)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isChecked
                          ? 'bg-purple-50/80 border-purple-400 shadow-2xs ring-1 ring-purple-300'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: cleaner.color }}
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">{cleaner.name}</p>
                          <p className="text-[10px] text-slate-500">{cleaner.vanUnit}</p>
                        </div>
                      </div>
                      {isChecked && <Check className="w-4 h-4 text-purple-600 stroke-[3]" />}
                    </div>
                  );
                })}
              </div>

              {assignmentNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center border border-emerald-200">
                  {assignmentNotice}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingJobForCleaners(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveCleanerAssignment}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <SaveCleanerIcon className="w-3.5 h-3.5" />
                <span>Save &amp; Sync with Jobber</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: Schedule Unscheduled Job (Date, Time, Dual Cleaners)
         ───────────────────────────────────────────────────────────────────────────── */}
      {schedulingUnscheduledJob && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Schedule Job {schedulingUnscheduledJob.jobNumber}
                </h3>
                <p className="text-xs text-slate-500">{schedulingUnscheduledJob.clientName}</p>
              </div>
              <button
                onClick={() => setSchedulingUnscheduledJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Attach Cleaners ({scheduleCleaners.length} selected)
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl">
                  {activeCleaners.map((cleaner) => {
                    const isChecked = scheduleCleaners.includes(cleaner.name);
                    return (
                      <div
                        key={cleaner.id}
                        onClick={() => handleToggleScheduleCleaner(cleaner.name)}
                        className={`p-2 rounded-lg border cursor-pointer text-xs flex items-center justify-between gap-1 transition-all ${
                          isChecked
                            ? 'bg-purple-50 border-purple-400 font-bold'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cleaner.color }}
                          />
                          <span className="truncate">{cleaner.name}</span>
                        </span>
                        {isChecked && <Check className="w-3 h-3 text-purple-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes for Team</label>
                <textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  placeholder="Key instructions or tandem notes..."
                />
              </div>

              {scheduleNotice && (
                <div className="p-2 bg-emerald-50 text-emerald-800 text-xs font-bold text-center border border-emerald-200 rounded-xl">
                  {scheduleNotice}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => setSchedulingUnscheduledJob(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmScheduleUnscheduledJob}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Schedule &amp; Push to Jobber</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Jobber Visit Details & Edit Modal (matching Screenshot 1) */}
      <JobVisitModal
        isOpen={isJobVisitModalOpen}
        onClose={() => {
          setIsJobVisitModalOpen(false);
          setActiveModalJob(null);
        }}
        job={activeModalJob}
        onShowOnMap={(j) => {
          if (onSelectJobOnMap) {
            onSelectJobOnMap(j);
          }
        }}
        onSaveJobDetails={(jobId, updates) => {
          if (onUpdateJobDetails) {
            onUpdateJobDetails(jobId, updates);
          }
        }}
      />
    </div>
  );
};

// Helper icon
const SaveCleanerIcon = ({ className }: { className?: string }) => (
  <CheckCircle2 className={className} />
);
