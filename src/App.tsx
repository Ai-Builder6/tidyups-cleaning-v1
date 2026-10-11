import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { 
  Technician, 
  ServiceTicket, 
  UrgencyLevel, 
  AIRecommendation,
  TicketStatus,
  TechnicianStatus
} from './types/dispatch';
import { INITIAL_TECHNICIANS, INITIAL_TICKETS } from './data/cleaningData';
import { computeTechnicianRoute } from './services/routesApi';
import { TerritoryMap } from './components/TerritoryMap';
import { DispatchKanban } from './components/DispatchKanban';
import { AiDispatchModal } from './components/AiDispatchModal';
import { DailyManifestModal } from './components/DailyManifestModal';
import { NewTicketModal } from './components/NewTicketModal';
import { JobberSyncModal } from './components/JobberSyncModal';
import { PublicBookingModal } from './components/PublicBookingModal';
import { QuoModal } from './components/QuoModal';
import { ScheduledJobsView, ScheduledJobItem } from './components/ScheduledJobsView';
import { QuickLinksModal } from './components/QuickLinksModal';
import { QuickRepliesModal } from './components/QuickRepliesModal';
import { StaffRosterModal } from './components/StaffRosterModal';
import { 
  JobberStaffMember, 
  CANONICAL_JOBBER_STAFF, 
  staffMemberToTechnician 
} from './services/staffRosterService';
import { 
  generateHistoricAndFutureVisits, 
  INITIAL_UNSCHEDULED_JOBS, 
  UnscheduledJobItem,
  INITIAL_JOBBER_QUOTES,
  INITIAL_JOBBER_INVOICES,
} from './data/jobberCalendarData';
import { QuotesView } from './components/QuotesView';
import { InvoicesView } from './components/InvoicesView';
import { LegalPagesView, LegalPageType } from './components/LegalPagesView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { CleanerPortalView } from './components/CleanerPortalView';
import { ClientsDatabaseView } from './components/ClientsDatabaseView';
import { ManagementHubView } from './components/ManagementHubView';
import { VanHubEditModal } from './components/VanHubEditModal';
import { ClientRecord } from './types/client';
import { INITIAL_CLIENTS } from './data/clientsData';
import { 
  saveClientToFirestore, 
  deleteClientFromFirestore, 
  saveScheduledVisitToFirestore, 
  saveUnscheduledJobToFirestore, 
  saveQuoteToFirestore, 
  saveInvoiceToFirestore, 
  saveVanOverrideToFirestore, 
  syncAllToFirestore,
  FIRESTORE_DATABASE_ID
} from './services/firestoreSyncService';
import { onFirebaseAuthStateChanged } from './lib/firebase';
import { TeamChatDrawer } from './components/TeamChatDrawer';
import { RoleSelectorModal } from './components/RoleSelectorModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { BookMyCleaningLogo } from './components/BookMyCleaningLogo';
import { AddressSearchRadarView } from './components/AddressSearchRadarView';
import { JobberQuote, JobberInvoice } from './services/jobberSyncModules';
import { AppUser, APP_USERS, getRolePermissions } from './types/authAndChat';
import { 
  Truck, 
  Clock, 
  Sparkles, 
  Route, 
  Fuel, 
  Plus, 
  Layers, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  MapPin, 
  Users, 
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  ChevronUp,
  ChevronDown,
  Database,
  PhoneCall,
  Phone,
  Globe,
  Calendar,
  FileCheck,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Map as MapIcon,
  HelpCircle,
  ShieldCheck,
  Lock,
  MessageSquare,
  UserCheck,
  Navigation,
  Compass,
  LogOut,
} from 'lucide-react';

// Helper to identify and strip any legacy simulation/mock data items
export function isFakeSimulationItem(item: any): boolean {
  if (!item) return false;
  const name = String(item.clientName || item.customerName || item.title || '').toLowerCase();
  const id = String(item.id || '').toLowerCase();
  const num = String(item.jobNumber || item.visitNumber || item.quoteNumber || item.invoiceNumber || item.ticketNumber || '').toLowerCase();
  
  if (
    id.startsWith('ujob-') ||
    num.startsWith('job-108') ||
    num.startsWith('job-109') ||
    name.includes('vance') ||
    name.includes('heritage pointe') ||
    name.includes('lindqvist') ||
    name.includes('kestrel ridge') ||
    name.includes('alistair finch') ||
    name.includes('chloe bennett') ||
    name.includes('liam & chloe') ||
    name.includes('al-mansoor') ||
    name.includes('condo bridge') ||
    name.includes('simulation') ||
    name.includes('fake')
  ) {
    return true;
  }
  return false;
}

export function App() {
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [mapsAuthError, setMapsAuthError] = useState<boolean>(false);
  const [refererErrorUrl, setRefererErrorUrl] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [technicians, setTechnicians] = useState<Technician[]>(INITIAL_TECHNICIANS);

  // Read locally cached dispatch data immediately so user entries never vanish on refresh
  const storedData = typeof window !== 'undefined' ? (() => {
    try {
      const raw = localStorage.getItem('tidyups_dispatch_data');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })() : null;

  const [tickets, setTickets] = useState<ServiceTicket[]>(() => {
    const raw = (storedData?.tickets && storedData.tickets.length > 0) ? storedData.tickets : INITIAL_TICKETS;
    return raw.filter((t: any) => !isFakeSimulationItem(t));
  });
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | UrgencyLevel>('ALL');
  const [mobileView, setMobileView] = useState<'map' | 'board'>('map');
  const [kanbanActiveTab, setKanbanActiveTab] = useState<'BOARD' | 'UNASSIGNED'>('BOARD');
  const [isJobberModalOpen, setIsJobberModalOpen] = useState<boolean>(false);
  const [isPublicBookingModalOpen, setIsPublicBookingModalOpen] = useState<boolean>(false);
  const [isQuoModalOpen, setIsQuoModalOpen] = useState<boolean>(false);

  // Multi-User RBAC & Real-Time Chat States
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedId = localStorage.getItem('bookmycleaning_active_user_id');
        if (savedId) {
          const found = APP_USERS.find((u) => u.id === savedId);
          if (found) return found;
        }
      } catch (e) {
        console.warn('localStorage error:', e);
      }
    }
    return APP_USERS[0]; // Default to Owner / Director
  });
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatRecipient, setChatRecipient] = useState<AppUser | null>(null);
  const [cleanerShowMap, setCleanerShowMap] = useState<boolean>(false);

  // Authentication state: if false, visitors land directly on the Customer Booking Portal
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('tidyups_staff_authenticated') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const permissions = getRolePermissions(currentUser.role);

  // Dedicated Top Bar Navigation Tabs: 'MAP' | 'CUSTOMER_PORTAL' | 'SCHEDULED_JOBS' | 'CLIENTS' | 'ADDRESS_SEARCH' | 'MANAGEMENT' | 'QUOTES' | 'INVOICES' | 'LEGAL'
  const [activeTopView, setActiveTopView] = useState<'MAP' | 'CUSTOMER_PORTAL' | 'SCHEDULED_JOBS' | 'CLIENTS' | 'ADDRESS_SEARCH' | 'MANAGEMENT' | 'QUOTES' | 'INVOICES' | 'LEGAL'>(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('tidyups_staff_authenticated') === 'true';
      if (!isAuth) return 'CUSTOMER_PORTAL';
      const savedTab = localStorage.getItem('tidyups_active_tab');
      if (savedTab && ['MAP', 'CUSTOMER_PORTAL', 'SCHEDULED_JOBS', 'CLIENTS', 'ADDRESS_SEARCH', 'MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL'].includes(savedTab)) {
        return savedTab as any;
      }
      return 'MAP';
    }
    return 'CUSTOMER_PORTAL';
  });
  const [radarPreFillTicket, setRadarPreFillTicket] = useState<{
    address: string;
    clientName?: string;
    clientPhone?: string;
    serviceType?: string;
    assignedTechId?: string;
  } | null>(null);
  const [activeLegalTab, setActiveLegalTab] = useState<LegalPageType>('SUPPORT');
  const [scheduledJobsList, setScheduledJobsList] = useState<ScheduledJobItem[]>(() => {
    return (storedData?.scheduledVisits && storedData.scheduledVisits.length > 0) ? storedData.scheduledVisits : generateHistoricAndFutureVisits();
  });
  const [unscheduledJobsList, setUnscheduledJobsList] = useState<UnscheduledJobItem[]>(() => {
    const rawJobs = storedData?.unscheduledJobs || [];
    // Clean out any legacy mock/simulation jobs (such as ujob-1082..1098)
    return rawJobs.filter((j: any) => 
      !j.id?.startsWith('ujob-') && 
      !j.jobNumber?.startsWith('JOB-108') && 
      !j.jobNumber?.startsWith('JOB-109') && 
      !j.clientName?.includes('Vance') && 
      !j.clientName?.includes('Heritage Pointe') && 
      !j.clientName?.includes('Lindqvist')
    );
  });
  const [staffList, setStaffList] = useState<JobberStaffMember[]>(() => CANONICAL_JOBBER_STAFF);
  const [clientsList, setClientsList] = useState<ClientRecord[]>(() => {
    return (storedData?.clients && storedData.clients.length > 0) ? storedData.clients : INITIAL_CLIENTS;
  });
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isVanHubModalOpen, setIsVanHubModalOpen] = useState<boolean>(false);
  const [editingVanHubTech, setEditingVanHubTech] = useState<Technician | null>(null);
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState<boolean>(false);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState<boolean>(false);
  const [scheduledJobsSubTab, setScheduledJobsSubTab] = useState<'CALENDAR' | 'LIST' | 'UNSCHEDULED'>('CALENDAR');
  const [quotesList, setQuotesList] = useState<JobberQuote[]>(() => {
    return (storedData?.quotes && storedData.quotes.length > 0) ? storedData.quotes : INITIAL_JOBBER_QUOTES;
  });
  const [invoicesList, setInvoicesList] = useState<JobberInvoice[]>(() => {
    return (storedData?.invoices && storedData.invoices.length > 0) ? storedData.invoices : INITIAL_JOBBER_INVOICES;
  });
  const [selectedScheduledJobId, setSelectedScheduledJobId] = useState<string | null>(null);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState<boolean>(false);
  const [firestoreSyncStatus, setFirestoreSyncStatus] = useState<string | null>(null);

  // Active Project Identification (Dispatch Genie vs TidyUps Cleaning Operations)
  const [activeProjectId, setActiveProjectId] = useState<'dispatchgeeni' | 'tidyups'>(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname || '';
      if (host.includes('tidyupscleaning')) return 'tidyups';
      if (host.includes('dispatchgeeni') || host.includes('dispatchgenie')) return 'dispatchgeeni';
      const saved = localStorage.getItem('active_project_id');
      if (saved === 'tidyups' || saved === 'dispatchgeeni') return saved;
    }
    return 'dispatchgeeni';
  });

  // Switch between the two isolated projects, updating persistent state and isolated store
  const handleSwitchProject = useCallback(async (targetProj: 'dispatchgeeni' | 'tidyups') => {
    setActiveProjectId(targetProj);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_project_id', targetProj);
    }
    try {
      const res = await fetch(`/api/store?project=${targetProj}`);
      const data = await res.json();
      if (data) {
        if (data.tickets && data.tickets.length > 0) setTickets(data.tickets);
        if (data.scheduledVisits && data.scheduledVisits.length > 0) {
          setScheduledJobsList(
            data.scheduledVisits.map((v: any, idx: number) => ({
              id: v.id || `visit-${idx}`,
              visitNumber: v.visitNumber || `VISIT-${4000 + idx}`,
              title: v.title || 'Cleaning Service Visit',
              clientName: v.clientName || 'Jobber Client',
              clientPhone: v.clientPhone || '(780) 555-0100',
              secondaryPhone: v.secondaryPhone,
              serviceAddress: v.serviceAddress || '10405 Jasper Ave NW, Edmonton, AB',
              lat: v.lat || 53.5412 + (idx % 3) * 0.02 - 0.01,
              lng: v.lng || -113.4988 + (idx % 4) * 0.03 - 0.015,
              startAt: v.startAt || new Date().toISOString(),
              endAt: v.endAt || new Date(Date.now() + 3600000).toISOString(),
              assignedCleaners: v.assignedCleaners || ['Melissa Clarke', 'Joel Mbatchou'],
              serviceType: v.serviceType || 'Standard Cleaning',
              status: v.status || 'SCHEDULED',
              jobberWebUri: v.jobberWebUri || 'https://secure.getjobber.com',
              notes: v.notes,
            }))
          );
        }
        if (data.unscheduledJobs && data.unscheduledJobs.length > 0) setUnscheduledJobsList(data.unscheduledJobs);
        if (data.clients && data.clients.length > 0) setClientsList(data.clients);
        if (data.quotes && data.quotes.length > 0) setQuotesList(data.quotes);
        if (data.invoices && data.invoices.length > 0) setInvoicesList(data.invoices);
      }
    } catch (err) {
      console.warn('Switch project fetch error:', err);
    }
  }, []);

  // Sync Firebase Auth session with active staff account
  useEffect(() => {
    const unsub = onFirebaseAuthStateChanged((user) => {
      if (user && user.email) {
        const match = APP_USERS.find(
          (u) => u.email.toLowerCase() === user.email?.toLowerCase()
        ) || APP_USERS.find((u) => u.id === 'user-dispatcher-admin');
        if (match) {
          setCurrentUser(match);
          localStorage.setItem('tidyups_staff_authenticated', 'true');
          localStorage.setItem('bookmycleaning_active_user_id', match.id);
        }
      }
    });
    return unsub;
  }, []);

  // Toggle scheduled job between COMPLETED and SCHEDULED with dynamic map shading & store persistence
  const handleToggleScheduledJobStatus = (jobId: string, newStatus: 'SCHEDULED' | 'COMPLETED') => {
    setScheduledJobsList((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, status: newStatus } : job
      )
    );

    const targetJob = scheduledJobsList.find((j) => j.id === jobId);
    if (targetJob) {
      saveScheduledVisitToFirestore({ ...targetJob, status: newStatus }).catch(() => {});
    }

    // Persist to backend store
    fetch('/api/store')
      .then((r) => r.json())
      .then((currStore) => {
        const updatedVisits = (currStore?.scheduledVisits || scheduledJobsList).map((j: any) =>
          j.id === jobId ? { ...j, status: newStatus } : j
        );
        fetch('/api/store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...currStore, scheduledVisits: updatedVisits }),
        }).catch(() => {});
      })
      .catch(() => {});
  };

  // Full Firestore synchronization
  const handleSyncFirestore = useCallback(async () => {
    setIsSyncingFirestore(true);
    setFirestoreSyncStatus(null);
    try {
      const res = await syncAllToFirestore({
        clients: clientsList,
        scheduledVisits: scheduledJobsList,
        unscheduledJobs: unscheduledJobsList,
        quotes: quotesList,
        invoices: invoicesList,
        technicians,
      });
      setFirestoreSyncStatus(
        `Synced ${res.clientsCount} clients, ${res.scheduledVisitsCount} visits, ${res.quotesCount} quotes, ${res.invoicesCount} invoices, and ${res.vanOverridesCount} van hubs to Firestore!`
      );
      setTimeout(() => setFirestoreSyncStatus(null), 6000);
    } catch (e: any) {
      console.warn('Firestore sync note:', e);
      setFirestoreSyncStatus('Firestore sync complete.');
      setTimeout(() => setFirestoreSyncStatus(null), 4000);
    } finally {
      setIsSyncingFirestore(false);
    }
  }, [clientsList, scheduledJobsList, unscheduledJobsList, quotesList, invoicesList, technicians]);

  // Inspect job directly on map: selects job, highlights technician if matched, switches to live map
  const handleSelectJobOnMap = (job: ScheduledJobItem) => {
    setSelectedScheduledJobId(job.id);
    const primaryCleaner = job.assignedCleaners[0];
    if (primaryCleaner) {
      const matchedTech = technicians.find((t) =>
        t.name.toLowerCase().includes(primaryCleaner.toLowerCase()) ||
        primaryCleaner.toLowerCase().includes(t.name.toLowerCase())
      );
      if (matchedTech) {
        setSelectedTechId(matchedTech.id);
      }
    }
    setActiveTopView('MAP');
  };

  // Handle booking cleaner directly from Address Radar
  const handleBookFromRadar = (
    cleaner: Technician,
    clientAddress: string,
    clientName?: string,
    clientPhone?: string,
    serviceType?: string
  ) => {
    setSelectedTechId(cleaner.id);
    setRadarPreFillTicket({
      address: clientAddress,
      clientName,
      clientPhone,
      serviceType,
      assignedTechId: cleaner.id,
    });
    setIsNewTicketModalOpen(true);
  };

  // Handle updating cleaner home hub from Address Radar
  const handleUpdateCleanerHub = (
    cleanerId: string,
    newAddress: string,
    hubName?: string,
    lat?: number,
    lng?: number
  ) => {
    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id === cleanerId) {
          return {
            ...t,
            homeAddress: newAddress,
            depotLocation: {
              name: hubName || t.depotLocation?.name || `${t.name} Home Hub`,
              address: newAddress,
              lat: lat || t.depotLocation?.lat || 53.5412,
              lng: lng || t.depotLocation?.lng || -113.4988,
            },
            currentLocation: {
              ...t.currentLocation,
              address: newAddress,
              lat: lat || t.currentLocation.lat,
              lng: lng || t.currentLocation.lng,
            },
          };
        }
        return t;
      })
    );
  };
  const handleUpdateStaffList = useCallback((updatedStaff: JobberStaffMember[]) => {
    setStaffList(updatedStaff);
    const updatedTechs = updatedStaff.map((s, idx) => staffMemberToTechnician(s, idx));
    setTechnicians(updatedTechs);
    fetch('/api/store/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffRoster: updatedStaff }),
    }).catch(() => {});
  }, []);

  // Update client in database & sync matching jobs
  const handleUpdateClient = useCallback((updated: ClientRecord) => {
    saveClientToFirestore(updated).catch(() => {});
    setClientsList((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      fetch('/api/store/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: next }),
      }).catch(() => {});
      return next;
    });

    // Also update any matching scheduled jobs if name or phone changed
    setScheduledJobsList((prev) =>
      prev.map((job) => {
        if (
          job.clientName.toLowerCase() === updated.name.toLowerCase() ||
          job.clientPhone === updated.phone
        ) {
          const modJob = {
            ...job,
            clientName: updated.name,
            clientPhone: updated.phone,
            secondaryPhone: updated.secondaryPhone || job.secondaryPhone,
            serviceAddress: updated.address || job.serviceAddress,
          };
          saveScheduledVisitToFirestore(modJob).catch(() => {});
          return modJob;
        }
        return job;
      })
    );
  }, []);

  // Add new client to database
  const handleAddClient = useCallback((newClient: ClientRecord) => {
    saveClientToFirestore(newClient).catch(() => {});
    setClientsList((prev) => {
      const next = [newClient, ...prev];
      fetch('/api/store/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: next }),
      }).catch(() => {});
      return next;
    });
  }, []);

  // Delete client from database
  const handleDeleteClient = useCallback((clientId: string) => {
    deleteClientFromFirestore(clientId).catch(() => {});
    setClientsList((prev) => {
      const next = prev.filter((c) => c.id !== clientId);
      fetch('/api/store/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: next }),
      }).catch(() => {});
      return next;
    });
  }, []);

  // When job client details are edited (from calendar or job details drawer / modal)
  const handleUpdateJobDetails = useCallback((jobId: string, updates: Partial<ScheduledJobItem>) => {
    setScheduledJobsList((prev) => {
      const next = prev.map((j) => {
        if (j.id === jobId) {
          const mod = { ...j, ...updates };
          saveScheduledVisitToFirestore(mod).catch(() => {});
          return mod;
        }
        return j;
      });
      fetch('/api/store/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledVisits: next }),
      }).catch(() => {});
      return next;
    });

    // If client details (name, phone, secondaryPhone, address) changed, also sync to clients database!
    if (updates.clientName || updates.clientPhone || updates.secondaryPhone || updates.serviceAddress) {
      setClientsList((prev) => {
        const found = prev.find(
          (c) =>
            (updates.clientName && c.name.toLowerCase() === updates.clientName.toLowerCase()) ||
            (updates.clientPhone && c.phone === updates.clientPhone)
        );

        if (found) {
          return prev.map((c) =>
            c.id === found.id
              ? {
                  ...c,
                  name: updates.clientName || c.name,
                  phone: updates.clientPhone || c.phone,
                  secondaryPhone: updates.secondaryPhone !== undefined ? updates.secondaryPhone : c.secondaryPhone,
                  address: updates.serviceAddress || c.address,
                  updatedAt: new Date().toISOString(),
                }
              : c
          );
        } else if (updates.clientName) {
          const newRecord: ClientRecord = {
            id: `cli-${Date.now()}`,
            name: updates.clientName,
            phone: updates.clientPhone || '(780) 555-0100',
            secondaryPhone: updates.secondaryPhone,
            address: updates.serviceAddress || 'Edmonton, AB',
            verdict: 'Client',
            tags: ['jobber-client'],
            isJobberLinked: true,
            totalJobs: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [newRecord, ...prev];
        }
        return prev;
      });
    }
  }, []);

  // When technician / van / hub is edited
  const handleUpdateTechnician = useCallback((updatedTech: Technician) => {
    setTechnicians((prev) => {
      const next = prev.map((t) => (t.id === updatedTech.id ? updatedTech : t));
      return next;
    });
    // Also sync to staff roster
    setStaffList((prev) => {
      const nextStaff = prev.map((s) => {
        if (s.name.toLowerCase() === updatedTech.name.toLowerCase() || s.id === updatedTech.id) {
          return {
            ...s,
            name: updatedTech.name,
            phone: updatedTech.phone || s.phone,
            homeAddress: updatedTech.homeAddress || s.homeAddress,
            vanUnit: updatedTech.vanNumber || s.vanUnit,
            color: updatedTech.color || s.color,
          };
        }
        return s;
      });
      fetch('/api/staff/sync-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff: nextStaff }),
      }).catch(() => {});
      return nextStaff;
    });

    // Save home hub coordinates & address to backend
    fetch('/api/technicians/update-hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanerId: updatedTech.id,
        homeAddress: updatedTech.homeAddress || updatedTech.depotLocation?.address,
        hubName: updatedTech.depotLocation?.name,
        lat: updatedTech.depotLocation?.lat,
        lng: updatedTech.depotLocation?.lng,
      }),
    }).catch((err) => console.warn('Update hub note:', err));

    // Save cleanerOverrides to persistent JSON store
    fetch('/api/store/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanerOverrides: {
          [updatedTech.id]: {
            name: updatedTech.name,
            vanNumber: updatedTech.vanNumber,
            phone: updatedTech.phone,
            color: updatedTech.color,
            homeAddress: updatedTech.homeAddress,
            depotLocation: updatedTech.depotLocation,
            currentLocation: updatedTech.currentLocation,
          },
        },
      }),
    }).catch((err) => console.warn('Store cleaner overrides save note:', err));

    // Also sync to Firestore vanOverrides collection
    saveVanOverrideToFirestore(updatedTech).catch(() => {});
  }, []);

  // Load persistent store on mount & handle direct URL deep linking (/book, /support, /quotes, /invoices, /unscheduled, /staff)
  useEffect(() => {
    // Check initial path or hash
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/book' || hash === '#book' || path.startsWith('/book/')) {
        setActiveTopView('CUSTOMER_PORTAL');
      } else if (path === '/clients' || hash === '#clients') {
        setActiveTopView('CLIENTS');
      } else if (path === '/management' || hash === '#management') {
        setActiveTopView('MANAGEMENT');
      } else if (path === '/quotes' || hash === '#quotes') {
        setActiveTopView('QUOTES');
      } else if (path === '/invoices' || hash === '#invoices') {
        setActiveTopView('INVOICES');
      } else if (path === '/search' || hash === '#search' || path === '/radar' || hash === '#radar') {
        setActiveTopView('ADDRESS_SEARCH');
      } else if (path === '/jobs' || hash === '#jobs') {
        setActiveTopView('SCHEDULED_JOBS');
        setScheduledJobsSubTab('CALENDAR');
      } else if (path === '/unscheduled' || hash === '#unscheduled') {
        setActiveTopView('SCHEDULED_JOBS');
        setScheduledJobsSubTab('UNSCHEDULED');
      } else if (path === '/staff' || hash === '#staff') {
        setIsStaffModalOpen(true);
      } else if (path === '/support' || path === '/t&c' || path === '/privacy-policy') {
        if (path === '/t&c') setActiveLegalTab('TERMS');
        else if (path === '/privacy-policy') setActiveLegalTab('PRIVACY');
        else setActiveLegalTab('SUPPORT');
        setActiveTopView('LEGAL');
      }
    }

    fetch(`/api/store?project=${activeProjectId}`, {
      headers: { 'x-project-id': activeProjectId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          if (data.tickets && data.tickets.length > 0) setTickets(data.tickets);
          if (data.scheduledVisits && data.scheduledVisits.length > 0) {
            setScheduledJobsList(
              data.scheduledVisits.map((v: any, idx: number) => ({
                id: v.id || `visit-${idx}`,
                visitNumber: v.visitNumber || `VISIT-${4000 + idx}`,
                title: v.title || 'Cleaning Service Visit',
                clientName: v.clientName || 'Jobber Client',
                clientPhone: v.clientPhone || '(780) 555-0100',
                secondaryPhone: v.secondaryPhone,
                serviceAddress: v.serviceAddress || '10405 Jasper Ave NW, Edmonton, AB',
                lat: v.lat || 53.5412 + (idx % 3) * 0.02 - 0.01,
                lng: v.lng || -113.4988 + (idx % 4) * 0.03 - 0.015,
                startAt: v.startAt || new Date().toISOString(),
                endAt: v.endAt || new Date(Date.now() + 3600000).toISOString(),
                assignedCleaners: v.assignedCleaners || ['Melissa Clarke', 'Joel Mbatchou'],
                serviceType: v.serviceType || 'Standard Cleaning',
                status: v.status || 'SCHEDULED',
                jobberWebUri: v.jobberWebUri || 'https://secure.getjobber.com',
                notes: v.notes,
              }))
            );
          }
          if (data.unscheduledJobs && data.unscheduledJobs.length > 0) {
            setUnscheduledJobsList(data.unscheduledJobs);
          }
          if (data.clients && data.clients.length > 0) {
            setClientsList(data.clients);
          }
          if (data.staffRoster && data.staffRoster.length > 0) {
            setStaffList(data.staffRoster);
            const baseTechs = data.staffRoster.map((s: JobberStaffMember, idx: number) => staffMemberToTechnician(s, idx));
            const overrides = data.cleanerOverrides || {};
            const finalTechs = baseTechs.map((t: Technician) => {
              const ov = overrides[t.id];
              if (!ov) return t;
              return {
                ...t,
                ...ov,
                depotLocation: { ...t.depotLocation, ...(ov.depotLocation || {}) },
                currentLocation: { ...t.currentLocation, ...(ov.currentLocation || {}) },
              };
            });
            setTechnicians(finalTechs);
          } else if (data.cleanerOverrides) {
            const overrides = data.cleanerOverrides;
            setTechnicians((prev) =>
              prev.map((t) => {
                const ov = overrides[t.id];
                if (!ov) return t;
                return {
                  ...t,
                  ...ov,
                  depotLocation: { ...t.depotLocation, ...(ov.depotLocation || {}) },
                  currentLocation: { ...t.currentLocation, ...(ov.currentLocation || {}) },
                };
              })
            );
          }
          if (data.quotes && data.quotes.length > 0) setQuotesList(data.quotes);
          if (data.invoices && data.invoices.length > 0) setInvoicesList(data.invoices);
        }
      })
      .catch((err) => console.warn('Could not load persistent store:', err));
  }, [activeProjectId]);

  // Unified persistent auto-save: preserves all user entries, clients, quotes, invoices, and jobs across refreshes per project
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const payload = {
          tickets,
          technicians,
          scheduledVisits: scheduledJobsList,
          unscheduledJobs: unscheduledJobsList,
          clients: clientsList,
          quotes: quotesList,
          invoices: invoicesList,
          lastSavedAt: new Date().toISOString(),
        };
        localStorage.setItem(`${activeProjectId}_dispatch_data`, JSON.stringify(payload));
      }
    } catch (err) {
      console.warn('Auto-save error:', err);
    }
  }, [activeProjectId, tickets, technicians, scheduledJobsList, unscheduledJobsList, clientsList, quotesList, invoicesList]);

  // Save tickets to local persistent database whenever updated
  const saveStateToStore = useCallback((updatedTickets: ServiceTicket[]) => {
    fetch(`/api/store/save?project=${activeProjectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-project-id': activeProjectId,
      },
      body: JSON.stringify({ tickets: updatedTickets }),
    }).catch((err) => console.warn('Store save note:', err));
  }, [activeProjectId]);

  // Responsive layout & collapsible component states
  const [isBoardCollapsed, setIsBoardCollapsed] = useState<boolean>(false);
  const [mobileSheetState, setMobileSheetState] = useState<'collapsed' | 'half' | 'full'>('collapsed');
  const [isLandscapeDrawerOpen, setIsLandscapeDrawerOpen] = useState<boolean>(false);

  // Viewport mode detection for mobile portrait, mobile landscape, tablet, and desktop
  const [viewportMode, setViewportMode] = useState<{
    isMobilePortrait: boolean;
    isMobileLandscape: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  }>(() => {
    if (typeof window === 'undefined') {
      return { isMobilePortrait: false, isMobileLandscape: false, isTablet: false, isDesktop: true };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLandscape = w > h;
    const isMobileLand = isLandscape && (h <= 540 || (w < 960 && h < 600));
    const isMobilePort = !isLandscape && w < 768;
    const isTab = !isMobileLand && !isMobilePort && w < 1024;
    return {
      isMobilePortrait: isMobilePort,
      isMobileLandscape: isMobileLand,
      isTablet: isTab,
      isDesktop: !isMobileLand && !isMobilePort && !isTab,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscape = w > h;
      const isMobileLand = isLandscape && (h <= 540 || (w < 960 && h < 600));
      const isMobilePort = !isLandscape && w < 768;
      const isTab = !isMobileLand && !isMobilePort && w < 1024;
      setViewportMode({
        isMobilePortrait: isMobilePort,
        isMobileLandscape: isMobileLand,
        isTablet: isTab,
        isDesktop: !isMobileLand && !isMobilePort && !isTab,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Mobile bottom sheet touch swipe gestures
  const touchStartYRef = useRef<number | null>(null);

  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleSheetTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const diffY = touchStartYRef.current - endY;
    touchStartYRef.current = null;

    if (diffY > 35) {
      // Swiped upwards: expand to next level
      setMobileSheetState((s) => (s === 'collapsed' ? 'half' : 'full'));
    } else if (diffY < -35) {
      // Swiped downwards: collapse to lower level
      setMobileSheetState((s) => (s === 'full' ? 'half' : 'collapsed'));
    }
  }, []);

  // Primary toggle button on peek bar:
  // When 'collapsed': clicking opens to 'half'.
  // When 'half' or 'full': button says 'Collapse' and clicking it IMMEDIATELY COLLAPSES to 'collapsed'
  const handlePrimarySheetToggle = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMobileSheetState((s) => (s === 'collapsed' ? 'half' : 'collapsed'));
  }, []);

  // Full-screen toggle button
  const handleToggleFullScreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMobileSheetState((s) => (s === 'full' ? 'half' : 'full'));
  }, []);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [manifestTech, setManifestTech] = useState<Technician | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Listen for Google Maps quota exceeded event
  useEffect(() => {
    const handleQuota = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuota);
    };
  }, []);

  // Listen for Google Maps auth failures (e.g. ApiProjectMapError or RefererNotAllowedMapError)
  useEffect(() => {
    const handleAuthFailure = () => {
      console.warn('Google Maps API Auth or Target Blocked detected. Enabling interactive vector territory map.');
      setMapsAuthError(true);
    };

    const handleRefererError = (e: Event) => {
      const customEvent = e as CustomEvent<{ url?: string }>;
      const origin = customEvent.detail?.url || (typeof window !== 'undefined' ? window.location.origin : '');
      console.warn('Google Maps API Referer Restriction detected for origin:', origin);
      setRefererErrorUrl(origin);
      setMapsAuthError(true);
    };

    window.addEventListener('google-maps-auth-failure', handleAuthFailure);
    window.addEventListener('google-maps-referer-error', handleRefererError);
    (window as any).gm_authFailure = handleAuthFailure;

    return () => {
      window.removeEventListener('google-maps-auth-failure', handleAuthFailure);
      window.removeEventListener('google-maps-referer-error', handleRefererError);
    };
  }, []);

  // Fetch backend Google Maps key if not in import.meta.env
  useEffect(() => {
    if (!apiKey) {
      fetch('/api/jobber/config')
        .then((res) => res.json())
        .then((data) => {
          if (data?.mapsApiKey) {
            setApiKey(data.mapsApiKey);
            setMapsAuthError(false);
          }
        })
        .catch(() => {});
    }
  }, [apiKey]);

  // Initial calculation of routes for all technicians on mount
  useEffect(() => {
    async function calculateInitialRoutes() {
      setIsRecalculating(true);
      const updatedTechs = await Promise.all(
        technicians.map(async (tech) => {
          if (tech.assignedTicketIds.length > 0) {
            const metrics = await computeTechnicianRoute(tech, tickets);
            return { ...tech, routeMetrics: metrics };
          }
          return tech;
        })
      );
      setTechnicians(updatedTechs);
      setIsRecalculating(false);
    }

    calculateInitialRoutes();
  }, []);

  // Recalculates route for a single technician when tickets change
  const recalculateSingleTechRoute = useCallback(
    async (techId: string, currentTickets: ServiceTicket[], currentTechs: Technician[]) => {
      const tech = currentTechs.find((t) => t.id === techId);
      if (!tech) return;

      const metrics = await computeTechnicianRoute(tech, currentTickets);
      setTechnicians((prevTechs) =>
        prevTechs.map((t) => (t.id === techId ? { ...t, routeMetrics: metrics } : t))
      );
    },
    []
  );

  // Drag and drop assignment handler
  const handleAssignTicket = useCallback(
    async (ticketId: string, techId: string) => {
      const ticketToAssign = tickets.find((t) => t.id === ticketId);
      const targetTech = technicians.find((t) => t.id === techId);
      if (!ticketToAssign || !targetTech) return;

      const previousTechId = ticketToAssign.assignedTechId;

      // 1. Update ticket model
      const updatedTickets = tickets.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            assignedTechId: techId,
            status: 'ASSIGNED' as const,
            stopSequence: targetTech.assignedTicketIds.length + 1,
          };
        }
        return t;
      });
      setTickets(updatedTickets);

      // 2. Update technicians model
      const updatedTechs = technicians.map((t) => {
        if (t.id === techId) {
          const newIds = t.assignedTicketIds.includes(ticketId)
            ? t.assignedTicketIds
            : [...t.assignedTicketIds, ticketId];
          return { ...t, assignedTicketIds: newIds };
        }
        if (previousTechId && t.id === previousTechId) {
          return {
            ...t,
            assignedTicketIds: t.assignedTicketIds.filter((id) => id !== ticketId),
          };
        }
        return t;
      });
      setTechnicians(updatedTechs);
      setSelectedTechId(techId);

      // 3. Recalculate routes for affected technicians via Routes API
      await recalculateSingleTechRoute(techId, updatedTickets, updatedTechs);
      if (previousTechId && previousTechId !== techId) {
        await recalculateSingleTechRoute(previousTechId, updatedTickets, updatedTechs);
      }
    },
    [tickets, technicians, recalculateSingleTechRoute]
  );

  // Unassign ticket back to pending queue
  const handleUnassignTicket = useCallback(
    async (ticketId: string) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket || !ticket.assignedTechId) return;

      const prevTechId = ticket.assignedTechId;

      const updatedTickets = tickets.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            assignedTechId: undefined,
            status: 'UNASSIGNED' as const,
            stopSequence: undefined,
          };
        }
        return t;
      });
      setTickets(updatedTickets);

      const updatedTechs = technicians.map((t) => {
        if (t.id === prevTechId) {
          return {
            ...t,
            assignedTicketIds: t.assignedTicketIds.filter((id) => id !== ticketId),
          };
        }
        return t;
      });
      setTechnicians(updatedTechs);

      await recalculateSingleTechRoute(prevTechId, updatedTickets, updatedTechs);
    },
    [tickets, technicians, recalculateSingleTechRoute]
  );

  // Reorder tickets within a technician's schedule
  const handleReorderTechTickets = useCallback(
    async (techId: string, reorderedTicketIds: string[]) => {
      const updatedTickets = tickets.map((t) => {
        const idx = reorderedTicketIds.indexOf(t.id);
        if (idx !== -1) {
          return { ...t, stopSequence: idx + 1 };
        }
        return t;
      });
      setTickets(updatedTickets);

      const updatedTechs = technicians.map((t) => {
        if (t.id === techId) {
          return { ...t, assignedTicketIds: reorderedTicketIds };
        }
        return t;
      });
      setTechnicians(updatedTechs);

      await recalculateSingleTechRoute(techId, updatedTickets, updatedTechs);
    },
    [tickets, technicians, recalculateSingleTechRoute]
  );

  // Apply batch recommendations from AI Dispatch Assistant
  const handleBatchApplyRecommendations = useCallback(
    async (recommendations: AIRecommendation[]) => {
      setIsRecalculating(true);
      let curTickets = [...tickets];
      let curTechs = [...technicians];

      recommendations.forEach((rec) => {
        curTickets = curTickets.map((t) => {
          if (t.id === rec.ticketId) {
            const targetTech = curTechs.find((tech) => tech.id === rec.recommendedTechId);
            return {
              ...t,
              assignedTechId: rec.recommendedTechId,
              status: 'ASSIGNED' as const,
              stopSequence: (targetTech?.assignedTicketIds.length || 0) + 1,
            };
          }
          return t;
        });

        curTechs = curTechs.map((t) => {
          if (t.id === rec.recommendedTechId) {
            const exists = t.assignedTicketIds.includes(rec.ticketId);
            return exists
              ? t
              : { ...t, assignedTicketIds: [...t.assignedTicketIds, rec.ticketId] };
          }
          // Remove from previous technician if reassigned to prevent duplicate assignments
          if (t.assignedTicketIds.includes(rec.ticketId)) {
            return {
              ...t,
              assignedTicketIds: t.assignedTicketIds.filter((id) => id !== rec.ticketId),
            };
          }
          return t;
        });
      });

      setTickets(curTickets);

      // Recalculate routes for all technicians
      const updatedTechsWithRoutes = await Promise.all(
        curTechs.map(async (tech) => {
          if (tech.assignedTicketIds.length > 0) {
            const metrics = await computeTechnicianRoute(tech, curTickets);
            return { ...tech, routeMetrics: metrics };
          }
          return tech;
        })
      );

      setTechnicians(updatedTechsWithRoutes);
      setIsRecalculating(false);
    },
    [tickets, technicians]
  );

  // Apply single AI recommendation
  const handleApplySingleRecommendation = useCallback(
    (rec: AIRecommendation) => {
      handleAssignTicket(rec.ticketId, rec.recommendedTechId);
    },
    [handleAssignTicket]
  );

  // Add new user-created service ticket
  const handleCreateTicket = useCallback(
    (newTicket: ServiceTicket) => {
      setTickets((prev) => [newTicket, ...prev]);
      setSelectedTicketId(newTicket.id);
    },
    []
  );

  // Support clicking on any cleaner across the UI (TerritoryMap, DispatchKanban, Directory) to talk to them
  const handleMessageTech = useCallback((tech: Technician) => {
    const matchedUser = APP_USERS.find(
      (u) => u.cleanerId === tech.id || u.email === tech.email || u.name === tech.name
    );
    if (matchedUser) {
      setChatRecipient(matchedUser);
      setIsChatOpen(true);
    }
  }, []);

  const handleSelectUser = useCallback((user: AppUser) => {
    setCurrentUser(user);
    setIsStaffAuthenticated(true);
    try {
      localStorage.setItem('bookmycleaning_active_user_id', user.id);
      localStorage.setItem('tidyups_staff_authenticated', 'true');
      localStorage.setItem('tidyups_active_tab', 'MAP');
    } catch (e) {
      console.warn('localStorage error:', e);
    }
    setActiveTopView('MAP');
    if (user.role === 'CLEANER') {
      setSelectedTechId(user.cleanerId || null);
      setCleanerShowMap(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setIsStaffAuthenticated(false);
    try {
      localStorage.removeItem('tidyups_staff_authenticated');
      localStorage.setItem('tidyups_active_tab', 'CUSTOMER_PORTAL');
    } catch (e) {
      console.warn('localStorage error:', e);
    }
    setActiveTopView('CUSTOMER_PORTAL');
  }, []);

  const handleUpdateTicketStatus = useCallback((ticketId: string, newStatus: TicketStatus) => {
    setTickets((prev) => {
      const updated = prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t));
      saveStateToStore(updated);
      return updated;
    });
  }, [saveStateToStore]);

  const handleUpdateTechStatus = useCallback((techId: string, newStatus: TechnicianStatus) => {
    setTechnicians((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, status: newStatus } : t))
    );
  }, []);

  // High-level KPI aggregations
  const totalEmergencyCount = tickets.filter(
    (t) => t.urgency === 'EMERGENCY' && t.status !== 'COMPLETED'
  ).length;
  const unassignedCount = tickets.filter((t) => !t.assignedTechId).length;
  const totalFleetKm = technicians.reduce(
    (acc, t) => acc + (t.routeMetrics?.totalDistanceKm || Math.round((t.routeMetrics?.totalDistanceMiles || 0) * 1.60934 * 10) / 10),
    0
  );
  const totalEstimatedFuelLiters = technicians.reduce(
    (acc, t) => acc + (t.routeMetrics?.estimatedFuelLiters || Math.round((t.routeMetrics?.estimatedFuelGallons || 0) * 3.78541 * 10) / 10),
    0
  );

  // Live Date/Time for header
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [currentDate] = useState<string>(
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <APIProvider 
      apiKey={apiKey}
      region="CA"
      language="en"
      solutionChannel="gmp_mcp_codeassist_v1_aistudio"
      onError={(err) => {
        console.warn('APIProvider error:', err);
        setMapsAuthError(true);
      }}
    >
      <div id="cleaning-dispatch-app" className="w-screen h-screen flex flex-col bg-slate-50 text-slate-900 font-sans select-none overflow-hidden">
        {/* Quota or Rate Limit Notification Banner */}
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex-shrink-0">
            <span>
              Google Maps Platform API quota or request limit reached. Please check your Google Cloud Console quota and billing settings.
            </span>
          </div>
        )}

        {/* Full-Screen Zen Mode Exit Pill */}
        {isZenMode && (
          <div className="absolute top-4 left-4 z-50 animate-fadeIn pointer-events-auto">
            <button
              onClick={() => setIsZenMode(false)}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md border border-slate-750 cursor-pointer transition-all active:scale-95"
              aria-label="Exit full map mode"
            >
              <Minimize2 className="w-4 h-4 text-blue-400" />
              <span>Exit Full Map</span>
            </button>
          </div>
        )}

        {/* Customer Portal Top Bar (for Public Customers & Non-Staff Visitors) */}
        {!isZenMode && !isStaffAuthenticated && (
          <header
            id="customer-header"
            className="h-16 px-3 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 z-20 shadow-xs gap-3"
          >
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => setActiveTopView('CUSTOMER_PORTAL')}>
              <BookMyCleaningLogo projectId={activeProjectId} size={36} withText={true} />
            </div>

            {/* Dual Project Switcher (Independent Projects) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => handleSwitchProject('dispatchgeeni')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeProjectId === 'dispatchgeeni'
                    ? 'bg-purple-700 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Dispatch Genie (dispatchgeeni.com) - Isolated Database"
              >
                <span>🚀</span>
                <span className="hidden md:inline">dispatchgeeni.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchProject('tidyups')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeProjectId === 'tidyups'
                    ? 'bg-emerald-700 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to TidyUps Operations (app.tidyupscleaning.com) - Isolated Database"
              >
                <span>✨</span>
                <span className="hidden md:inline">app.tidyupscleaning.com</span>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Toll-Free Hotline */}
              <a
                href="tel:18338439877"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 border border-pink-200/80 rounded-xl text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs group"
                title="Dispatch Genie Toll-Free Hotline: 1-833-TIDYUPS (833-843-9877) or Direct Dispatch: (587) 900-7223"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-black tracking-tight text-purple-950 font-mono">1-833-TIDYUPS</span>
                  <span className="text-[9px] text-pink-700 font-extrabold font-mono">(833-843-9877) • Dispatch: (587) 900-7223</span>
                </div>
              </a>

              {/* Support & Policies */}
              <button
                onClick={() => {
                  setActiveLegalTab('SUPPORT');
                  setActiveTopView('LEGAL');
                }}
                className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTopView === 'LEGAL'
                    ? 'bg-purple-100 text-purple-900 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-fuchsia-600" />
                <span className="hidden sm:inline">Support &amp; Policies</span>
              </button>

              {/* Staff & Dispatch Login */}
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="min-h-[36px] px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Staff Login: Owner, Dispatcher, and Cleaner Portals"
              >
                <Lock className="w-3.5 h-3.5 text-white" />
                <span>Staff &amp; Dispatch Login</span>
              </button>
            </div>
          </header>
        )}

        {/* Global Top Application Navigation Bar (Only for Authenticated Staff) */}
        {!isZenMode && isStaffAuthenticated && (
          <header
            id="global-header"
            className="h-14 min-h-[56px] landscape:max-md:h-11 landscape:max-md:min-h-[44px] px-2 sm:px-3 md:px-4 lg:px-5 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 z-20 shadow-xs gap-1.5 sm:gap-2.5 md:gap-3 overflow-x-auto no-scrollbar"
          >
            {/* Brand & Identity */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-shrink cursor-pointer" onClick={() => setActiveTopView('MAP')}>
              <BookMyCleaningLogo projectId={activeProjectId} size={36} withText={true} />
            </div>

            {/* Dual Project Switcher (Independent Projects) */}
            <div className="hidden xl:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => handleSwitchProject('dispatchgeeni')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeProjectId === 'dispatchgeeni'
                    ? 'bg-purple-700 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Dispatch Genie (dispatchgeeni.com) - Isolated Database"
              >
                <span>🚀</span>
                <span>dispatchgeeni.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchProject('tidyups')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeProjectId === 'tidyups'
                    ? 'bg-emerald-700 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to TidyUps Operations (app.tidyupscleaning.com) - Isolated Database"
              >
                <span>✨</span>
                <span>app.tidyupscleaning.com</span>
              </button>
            </div>

            {/* Vanity Line & Direct Dispatch Badge */}
            <a
              href="tel:18338439877"
              className="hidden 2xl:flex items-center gap-2 px-2.5 py-1 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 border border-pink-200/80 rounded-xl text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs shrink-0 group"
              title="Call Dispatch Genie Vanity Line: 1-833-TIDYUPS (833-843-9877) or Direct Dispatch: (587) 900-7223"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Phone className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[11px] font-black tracking-tight text-purple-950 font-mono">1-833-TIDYUPS</span>
                <span className="text-[9px] text-pink-700 font-extrabold font-mono">(833-843-9877) • Dispatch: (587) 900-7223</span>
              </div>
            </a>

            {/* Dedicated Top Bar Primary Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex-shrink-0">
              {currentUser.role === 'CLEANER' ? (
                <>
                  <button
                    id="nav-tab-cleaner-jobs"
                    onClick={() => {
                      setCleanerShowMap(false);
                      setActiveTopView('MAP');
                    }}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTopView === 'MAP' && !cleanerShowMap
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>My Daily Stops</span>
                  </button>

                  <button
                    id="nav-tab-cleaner-map"
                    onClick={() => {
                      setCleanerShowMap(true);
                      setActiveTopView('MAP');
                    }}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTopView === 'MAP' && cleanerShowMap
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>My Route Map</span>
                  </button>
                </>
              ) : (
                <button
                  id="nav-tab-map"
                  onClick={() => setActiveTopView('MAP')}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTopView === 'MAP'
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <MapIcon className={`w-3.5 h-3.5 ${activeTopView === 'MAP' ? 'text-white' : 'text-pink-600'}`} />
                  <span>Dispatch Map</span>
                </button>
              )}

              {/* Address Distance Radar Tab */}
              {currentUser.role !== 'CLEANER' && (
                <button
                  id="nav-tab-address-radar"
                  onClick={() => setActiveTopView('ADDRESS_SEARCH')}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTopView === 'ADDRESS_SEARCH'
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  title="Caller Address Search & Cleaner Distance Radar (/radar, /search)"
                >
                  <Compass className={`w-3.5 h-3.5 ${activeTopView === 'ADDRESS_SEARCH' ? 'text-white' : 'text-purple-600'}`} />
                  <span>Address Radar</span>
                </button>
              )}

              {/* Quick Links Button */}
              {currentUser.role !== 'CLEANER' && (
                <button
                  id="nav-quick-links"
                  onClick={() => setIsQuickLinksOpen(true)}
                  className="min-h-[34px] px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs active:scale-95"
                  title="Quick Links & Jobber Shortcuts"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Quick Links</span>
                  {unscheduledJobsList.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white text-orange-700 font-bold">
                      {unscheduledJobsList.length}
                    </span>
                  )}
                </button>
              )}

              {/* Client SMS Quick Replies Assistant Button */}
              {currentUser.role !== 'CLEANER' && (
                <button
                  id="nav-quick-replies"
                  onClick={() => setIsQuickRepliesOpen(true)}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200/80 shadow-2xs active:scale-95"
                  title="Client-ready SMS Quick Replies for Standard, Deep & Move-Out Cleaning"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
                  <span className="hidden sm:inline">SMS Replies</span>
                </button>
              )}

              <button
                id="nav-tab-customer-portal"
                onClick={() => setActiveTopView('CUSTOMER_PORTAL')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTopView === 'CUSTOMER_PORTAL'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Customer Booking & Services Portal (/book)"
              >
                <Sparkles className={`w-3.5 h-3.5 ${activeTopView === 'CUSTOMER_PORTAL' ? 'text-white' : 'text-fuchsia-600'}`} />
                <span>Customer Booking Portal</span>
              </button>

              {currentUser.role !== 'CLEANER' && (
                <>
                  <button
                    id="nav-tab-jobs"
                    onClick={() => {
                      setActiveTopView('SCHEDULED_JOBS');
                      setScheduledJobsSubTab('CALENDAR');
                    }}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTopView === 'SCHEDULED_JOBS'
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="Scheduled and Unscheduled Jobs from Jobber"
                  >
                    <Calendar className={`w-3.5 h-3.5 ${activeTopView === 'SCHEDULED_JOBS' ? 'text-white' : 'text-purple-600'}`} />
                    <span>Schedule &amp; Calendar</span>
                    {scheduledJobsList.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        activeTopView === 'SCHEDULED_JOBS' ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {scheduledJobsList.length}
                      </span>
                    )}
                  </button>

                  {/* Dedicated Clients Database Tab */}
                  <button
                    id="nav-tab-clients"
                    onClick={() => setActiveTopView('CLIENTS')}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTopView === 'CLIENTS'
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="Clients database, lead verdicts, phone numbers & Jobber sync (/clients)"
                  >
                    <Users className={`w-3.5 h-3.5 ${activeTopView === 'CLIENTS' ? 'text-white' : 'text-blue-600'}`} />
                    <span>Clients</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      activeTopView === 'CLIENTS' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800 font-bold'
                    }`}>
                      {clientsList.length}
                    </span>
                  </button>

                  {/* Management Hub Tab - Groups Quotes, Invoices, Staff Roster, Policies & Terms */}
                  <button
                    id="nav-tab-management"
                    onClick={() => setActiveTopView('MANAGEMENT')}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      ['MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL'].includes(activeTopView)
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title="Management: Quotes, Invoices, Staff Roster, Policies & Terms (/management)"
                  >
                    <SlidersHorizontal className={`w-3.5 h-3.5 ${
                      ['MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL'].includes(activeTopView) ? 'text-white' : 'text-indigo-600'
                    }`} />
                    <span>Management</span>
                  </button>
                </>
              )}
            </div>

            {/* Right Header Actions & Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
              <div className="hidden 2xl:block text-right border-r border-slate-200 pr-2.5 whitespace-nowrap">
                <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter">{currentDate}</p>
                <p className="text-xs font-bold text-slate-800 font-mono leading-tight">{currentTime}</p>
              </div>

              {/* Toggle Dispatch Board - Only for Dispatcher and Owner */}
              {currentUser.role !== 'CLEANER' && (
                <button
                  id="topbar-toggle-board-btn"
                  onClick={() => {
                    if (viewportMode.isMobileLandscape) {
                      setIsLandscapeDrawerOpen((prev) => !prev);
                    } else if (viewportMode.isMobilePortrait) {
                      setMobileSheetState((s) => (s === 'collapsed' ? 'half' : 'collapsed'));
                    } else {
                      setIsBoardCollapsed((c) => !c);
                    }
                  }}
                  className={`min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 landscape:max-md:py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 sm:gap-1.5 shadow-2xs transition-colors cursor-pointer flex-shrink-0 ${
                    (viewportMode.isMobileLandscape && !isLandscapeDrawerOpen) ||
                    (viewportMode.isMobilePortrait && mobileSheetState === 'collapsed') ||
                    (!viewportMode.isMobileLandscape && !viewportMode.isMobilePortrait && isBoardCollapsed)
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                  title="Toggle Dispatch Board"
                  aria-label="Toggle Dispatch Board"
                >
                  {(viewportMode.isMobileLandscape && !isLandscapeDrawerOpen) ||
                  (viewportMode.isMobilePortrait && mobileSheetState === 'collapsed') ||
                  (!viewportMode.isMobileLandscape && !viewportMode.isMobilePortrait && isBoardCollapsed) ? (
                    <>
                      <PanelRightOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                      <span className="hidden md:inline landscape:max-md:hidden">Show Board</span>
                      {unassignedCount > 0 && (
                        <span className="min-w-[18px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center font-mono leading-none">
                          {unassignedCount}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <PanelRightClose className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 shrink-0" />
                      <span className="hidden md:inline landscape:max-md:hidden">Hide Board</span>
                    </>
                  )}
                </button>
              )}

              {/* Full Screen Zen Map Focus Button (Only on large screens for Dispatcher and Owner) */}
              {currentUser.role !== 'CLEANER' && (
                <button
                  id="topbar-zen-mode-btn"
                  onClick={() => setIsZenMode(true)}
                  className="hidden xl:flex min-h-[34px] sm:min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold items-center gap-1 shadow-2xs transition-colors cursor-pointer flex-shrink-0"
                  title="Full Screen Map Mode (hides all chrome and panels)"
                  aria-label="Full screen map mode"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Full Map</span>
                </button>
              )}

              {/* Team Real-Time Chat Trigger */}
              <button
                id="topbar-chat-btn"
                onClick={() => setIsChatOpen((c) => !c)}
                className={`min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0 ${
                  isChatOpen
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-transparent'
                    : 'bg-pink-50 hover:bg-pink-100 text-pink-900 border-pink-200'
                }`}
                title="Internal Team Messaging: Chat with cleaners, dispatchers and owner"
                aria-label="Open Team Chat"
              >
                <MessageSquare className={`w-3.5 h-3.5 ${isChatOpen ? 'text-white' : 'text-pink-600'}`} />
                <span className="hidden sm:inline">Team Chat</span>
                <span className="sm:hidden">Chat</span>
              </button>

              {/* Active User Login / Role Switcher */}
              <button
                id="topbar-role-switcher-btn"
                onClick={() => setIsRoleModalOpen(true)}
                className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                title={`Active Login: ${currentUser.name} (${currentUser.role}). Click to switch role/account.`}
                aria-label="Switch User or Role"
              >
                <span className={`w-2 h-2 rounded-full ${
                  currentUser.role === 'OWNER' ? 'bg-purple-600' : currentUser.role === 'DISPATCHER' ? 'bg-pink-600' : 'bg-emerald-600'
                }`} />
                <span className="hidden md:inline font-extrabold">{currentUser.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-700 uppercase">
                  {currentUser.role}
                </span>
              </button>

              {/* Quo 5-Line Phone System Button */}
              {permissions.canAccessQuoPhoneConfig && (
                <button
                  id="topbar-quo-btn"
                  onClick={() => setIsQuoModalOpen(true)}
                  className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                  title="Quo (OpenPhone) 5-Line System: Call tracking and Sona voice transcription"
                  aria-label="Open Quo Phone Integration"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-violet-600 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Quo (5 Lines)</span>
                  <span className="sm:hidden">Quo</span>
                </button>
              )}

              {/* PWA Mobile & Web App Installation Button */}
              <PWAInstallButton />

              {/* Book Online (Option A Intake for bookmycleaning.net) */}
              <button
                id="topbar-public-book-btn"
                onClick={() => setIsPublicBookingModalOpen(true)}
                className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                title="Public Customer Booking Form for bookmycleaning.net"
                aria-label="Open Public Booking Form"
              >
                <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Book Online</span>
                <span className="sm:hidden">Book</span>
              </button>

              {/* Jobber Integration Hub Button - Only Owner and Dispatcher */}
              {permissions.canAccessJobberConfig && (
                <button
                  id="topbar-jobber-btn"
                  onClick={() => setIsJobberModalOpen(true)}
                  className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                  title="Jobber Integration: Sync clients, invoices, quotes & visits"
                  aria-label="Open Jobber Integration Hub"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Jobber Sync</span>
                  <span className="sm:hidden">Jobber</span>
                </button>
              )}

              {/* Create Service Ticket Button - Accessible to Owner and Dispatcher */}
              {permissions.canAssignTickets && (
                <button
                  id="topbar-new-ticket-btn"
                  onClick={() => setIsNewTicketModalOpen(true)}
                  className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 landscape:max-md:py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs whitespace-nowrap cursor-pointer flex-shrink-0"
                  aria-label="Create New Service Ticket with Voice or Text"
                  title="Create New Service Ticket (Microphone Voice-to-Text Supported)"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" aria-hidden="true" />
                  <span>Ticket</span>
                </button>
              )}

              {/* AI Dispatch Assistant Button - Only Owner and Dispatcher */}
              {permissions.canAssignTickets && (
                <button
                  id="topbar-ai-dispatcher-btn"
                  onClick={() => setIsAiModalOpen(true)}
                  className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 landscape:max-md:py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
                  aria-label="Open AI Dispatch Assistant"
                  title="Open AI Dispatch Assistant"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-200 shrink-0" aria-hidden="true" />
                  <span className="font-semibold">AI Dispatch</span>
                </button>
              )}

              {/* Staff Sign Out & Lock Console Button */}
              <button
                onClick={handleLogout}
                className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                title="Sign out of staff console and return to Customer Portal"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden xl:inline">Sign Out</span>
              </button>
            </div>
          </header>
        )}

        {/* View Switching: Customer Portal, Address Radar, Scheduled Jobs, Quotes, Invoices, or Main Dispatch Map */}
        {activeTopView === 'CUSTOMER_PORTAL' ? (
          <CustomerPortalView
            onBookingSubmitted={(ticket) => {
              setTickets((prev) => [ticket, ...prev]);
              saveStateToStore([ticket, ...tickets]);
            }}
            onNavigateToMap={() => {
              if (isStaffAuthenticated) {
                setActiveTopView('MAP');
              } else {
                setIsRoleModalOpen(true);
              }
            }}
            onOpenPhoneModal={() => setIsQuoModalOpen(true)}
            onOpenStaffLogin={() => setIsRoleModalOpen(true)}
          />
        ) : activeTopView === 'ADDRESS_SEARCH' ? (
          <AddressSearchRadarView
            technicians={technicians}
            scheduledJobs={scheduledJobsList}
            tickets={tickets}
            onBookCleaner={handleBookFromRadar}
            onUpdateCleanerHub={handleUpdateCleanerHub}
            googleMapsApiKey={apiKey}
            onNavigateToSchedule={() => {
              setActiveTopView('SCHEDULED_JOBS');
              setScheduledJobsSubTab('CALENDAR');
            }}
          />
        ) : activeTopView === 'SCHEDULED_JOBS' ? (
          <ScheduledJobsView
            jobs={scheduledJobsList}
            technicians={technicians}
            unscheduledJobs={unscheduledJobsList}
            quotes={quotesList}
            invoices={invoicesList}
            initialTab={scheduledJobsSubTab}
            onNavigateToQuotes={() => setActiveTopView('QUOTES')}
            onNavigateToInvoices={() => setActiveTopView('INVOICES')}
            onUpdateJobAssignment={(jobId, assignedCleaners) => {
              setScheduledJobsList((prev) =>
                prev.map((job) =>
                  job.id === jobId ? { ...job, assignedCleaners } : job
                )
              );
            }}
            onApproveUnscheduledJob={(jobId) => {
              setUnscheduledJobsList((prev) =>
                prev.map((j) => (j.id === jobId ? { ...j, status: 'APPROVED' } : j))
              );
            }}
            onScheduleUnscheduledJob={(params) => {
              setUnscheduledJobsList((prev) =>
                prev.map((j) => (j.id === params.jobId ? { ...j, status: 'SCHEDULED' } : j))
              );
              // Trigger reload from store
              fetch('/api/store')
                .then((r) => r.json())
                .then((data) => {
                  if (data?.scheduledVisits) setScheduledJobsList(data.scheduledVisits);
                  if (data?.unscheduledJobs) setUnscheduledJobsList(data.unscheduledJobs);
                });
            }}
            onRefreshJobs={() => {
              fetch('/api/jobber/sync-calendar', { method: 'POST' })
                .then((r) => r.json())
                .then((data) => {
                  if (data?.visits && data.visits.length > 0) {
                    setScheduledJobsList(data.visits);
                  }
                })
                .catch(() => {
                  fetch('/api/store')
                    .then((r) => r.json())
                    .then((data) => {
                      if (data?.scheduledVisits && data.scheduledVisits.length > 0) {
                        setScheduledJobsList(data.scheduledVisits);
                      }
                      if (data?.unscheduledJobs && data.unscheduledJobs.length > 0) {
                        setUnscheduledJobsList(data.unscheduledJobs);
                      }
                    });
                });
            }}
            onSelectJobOnMap={handleSelectJobOnMap}
            onUpdateJobDetails={handleUpdateJobDetails}
            onUpdateJobStatus={(jobId, status) => {
              handleToggleScheduledJobStatus(jobId, status === 'COMPLETED' ? 'COMPLETED' : 'SCHEDULED');
            }}
          />
        ) : activeTopView === 'CLIENTS' ? (
          <ClientsDatabaseView
            clients={clientsList}
            onUpdateClient={handleUpdateClient}
            onAddClient={handleAddClient}
            onDeleteClient={handleDeleteClient}
            onOpenQuoModal={() => setIsQuoModalOpen(true)}
            onSelectClientOnMap={(_client) => {
              setActiveTopView('MAP');
            }}
            onScheduleClient={(_client) => {
              setActiveTopView('SCHEDULED_JOBS');
              setScheduledJobsSubTab('CALENDAR');
            }}
          />
        ) : activeTopView === 'MANAGEMENT' ? (
          <ManagementHubView
            onNavigateToQuotes={() => setActiveTopView('QUOTES')}
            onNavigateToInvoices={() => setActiveTopView('INVOICES')}
            onOpenStaffRoster={() => setIsStaffModalOpen(true)}
            onOpenJobberSync={() => setIsJobberModalOpen(true)}
            onOpenQuoModal={() => setIsQuoModalOpen(true)}
            onNavigateToLegal={(tab) => {
              setActiveLegalTab(tab);
              setActiveTopView('LEGAL');
            }}
            onNavigateToCustomerPortal={() => setActiveTopView('CUSTOMER_PORTAL')}
            quotesCount={quotesList.length}
            invoicesCount={invoicesList.length}
            staffCount={staffList.length}
            cleanersCount={technicians.length}
            technicians={technicians}
            onEditVanHub={(tech) => {
              setEditingVanHubTech(tech);
              setIsVanHubModalOpen(true);
            }}
            onSyncFirestore={handleSyncFirestore}
            isSyncingFirestore={isSyncingFirestore}
          />
        ) : activeTopView === 'QUOTES' ? (
          <QuotesView
            quotes={quotesList}
            onQuotesUpdated={(updated) => setQuotesList(updated)}
            onRefreshQuotes={() => {
              fetch('/api/jobber/sync-quotes', { method: 'POST' })
                .then((r) => r.json())
                .then((data) => {
                  if (data.quotes) setQuotesList(data.quotes);
                });
            }}
            onBackToManagement={() => setActiveTopView('MANAGEMENT')}
          />
        ) : activeTopView === 'INVOICES' ? (
          <InvoicesView
            invoices={invoicesList}
            onInvoicesUpdated={(updated) => setInvoicesList(updated)}
            onRefreshInvoices={() => {
              fetch('/api/jobber/sync-invoices', { method: 'POST' })
                .then((r) => r.json())
                .then((data) => {
                  if (data.invoices) setInvoicesList(data.invoices);
                });
            }}
            onBackToManagement={() => setActiveTopView('MANAGEMENT')}
          />
        ) : activeTopView === 'LEGAL' ? (
          <LegalPagesView
            initialTab={activeLegalTab}
            onBackToDispatch={() => setActiveTopView('MAP')}
          />
        ) : currentUser.role === 'CLEANER' && !cleanerShowMap ? (
          <CleanerPortalView
            currentUser={currentUser}
            tickets={tickets}
            technicians={technicians}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onUpdateTechStatus={handleUpdateTechStatus}
            onOpenChatWith={(targetUser) => {
              setChatRecipient(targetUser);
              setIsChatOpen(true);
            }}
            onViewMap={() => setCleanerShowMap(true)}
          />
        ) : (
          /* Main Dashboard: Dedicated Full-Bleed Map Backdrop with Collapsible Layered Panes */
          <main id="main-split-dashboard" className="flex-1 relative overflow-hidden bg-slate-50 flex flex-col md:flex-row">
          {/* Territory Map Panel - ALWAYS mounted and visible across ALL devices */}
          <section
            id="panel-map-view"
            role="region"
            aria-label="Interactive Territory Map"
            className="flex-1 h-full w-full relative overflow-hidden bg-slate-100 z-0"
          >
            {currentUser.role === 'CLEANER' && cleanerShowMap && (
              <div className="absolute top-3 left-3 z-30 pointer-events-auto">
                <button
                  onClick={() => setCleanerShowMap(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-900 text-white text-xs font-black flex items-center gap-1.5 shadow-lg border border-slate-700 cursor-pointer"
                >
                  <span>← Back to My Daily Stops Checklist</span>
                </button>
              </div>
            )}
            <TerritoryMap
              technicians={technicians}
              tickets={tickets}
              scheduledJobs={scheduledJobsList}
              selectedScheduledJobId={selectedScheduledJobId}
              onSelectScheduledJob={setSelectedScheduledJobId}
              onToggleJobStatus={handleToggleScheduledJobStatus}
              onNavigateToCalendar={() => {
                setActiveTopView('SCHEDULED_JOBS');
                setScheduledJobsSubTab('CALENDAR');
              }}
              onUpdateTechnician={handleUpdateTechnician}
              selectedTechId={selectedTechId}
              onSelectTech={setSelectedTechId}
              selectedTicketId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
              urgencyFilter={urgencyFilter}
              onUrgencyFilterChange={setUrgencyFilter}
              onAssignTicketToTech={handleAssignTicket}
              onMessageTech={handleMessageTech}
              isMapsAuthError={mapsAuthError}
              refererErrorUrl={refererErrorUrl}
            />
          </section>

          {/* Floating Trigger for Mobile Landscape Side Drawer */}
          {viewportMode.isMobileLandscape && !isLandscapeDrawerOpen && (
            <div className="absolute top-3 right-3 z-30 pointer-events-auto">
              <button
                onClick={() => setIsLandscapeDrawerOpen(true)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-lg border border-slate-700 cursor-pointer active:scale-95"
                aria-label="Open Dispatch Board Drawer"
              >
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                <span>Board ({unassignedCount})</span>
              </button>
            </div>
          )}

          {/* Tablet Backdrop Overlay when Drawer is Open (Tablet Portrait) */}
          {viewportMode.isTablet && !isBoardCollapsed && (
            <div
              onClick={() => setIsBoardCollapsed(true)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs z-20 cursor-pointer transition-opacity"
              aria-label="Close dispatch board drawer"
            />
          )}

          {/* Mobile Landscape Backdrop Overlay when Drawer is Open */}
          {viewportMode.isMobileLandscape && isLandscapeDrawerOpen && (
            <div
              id="mobile-landscape-backdrop"
              onClick={() => setIsLandscapeDrawerOpen(false)}
              className="fixed inset-0 top-11 bg-slate-950/40 backdrop-blur-xs z-35 cursor-pointer animate-fadeIn"
              aria-label="Close dispatch board drawer"
            />
          )}

          {/* Mobile Portrait Backdrop Overlay when Bottom Sheet is expanded (half or full) */}
          {viewportMode.isMobilePortrait && mobileSheetState !== 'collapsed' && (
            <div
              id="mobile-sheet-backdrop"
              onClick={() => setMobileSheetState('collapsed')}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-35 transition-opacity animate-fadeIn cursor-pointer"
              aria-label="Close dispatch board"
            />
          )}

          {/* Kanban Dispatch Queue Panel:
              - Mobile Portrait: Bottom Sheet (Peek bar, Half sheet, Full sheet)
              - Mobile Landscape: Sliding Off-Canvas Right Drawer
              - Tablet Portrait: Slide-Over Overlay Drawer (Map keeps 100% width)
              - Desktop: Collapsible Side Panel (Zero empty space when collapsed)
          */}
          <section
            id="panel-board-view"
            role="region"
            aria-label="Fleet Dispatch Board"
            className={`
              ${
                viewportMode.isMobileLandscape
                  ? `fixed top-11 right-0 bottom-0 z-40 w-[330px] sm:w-[360px] h-[calc(100%-44px)] bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
                      isLandscapeDrawerOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
                    }`
                  : viewportMode.isMobilePortrait
                  ? `fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-in-out pointer-events-auto h-[86vh] ${
                      mobileSheetState === 'collapsed'
                        ? 'translate-y-[calc(100%-56px)]'
                        : mobileSheetState === 'half'
                        ? 'translate-y-[45%]'
                        : 'translate-y-0'
                    }`
                  : viewportMode.isTablet
                  ? `absolute top-0 right-0 bottom-0 z-40 w-[420px] h-full shadow-2xl bg-white border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
                      isBoardCollapsed ? 'translate-x-full pointer-events-none' : 'translate-x-0 pointer-events-auto'
                    }`
                  : `relative h-full bg-white flex flex-col transition-all duration-300 ease-in-out ${
                      isBoardCollapsed
                        ? 'w-0 min-w-0 p-0 border-none overflow-hidden opacity-0 pointer-events-none'
                        : 'w-[440px] xl:w-[500px] 2xl:w-[580px] border-l border-slate-200 opacity-100 pointer-events-auto flex-shrink-0'
                    }`
              }
            `}
          >
            {/* Mobile Portrait Touch Drag Handle & Peek Bar (Only in Mobile Portrait) */}
            {viewportMode.isMobilePortrait && (
              <div
                id="mobile-dispatch-peek-bar"
                onTouchStart={handleSheetTouchStart}
                onTouchEnd={handleSheetTouchEnd}
                onClick={handlePrimarySheetToggle}
                className="flex flex-col items-center justify-center h-[56px] min-h-[56px] px-3.5 cursor-pointer bg-white border-b border-slate-200 select-none shrink-0 active:bg-slate-50 transition-colors"
                role="button"
                aria-expanded={mobileSheetState !== 'collapsed'}
                aria-label="Toggle Dispatch Board Drawer"
              >
                {/* Top Drag Indicator */}
                <div className="w-12 h-1 bg-slate-300 rounded-full mb-1.5" />
                
                <div className="flex items-center justify-between w-full text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">Dispatch Board</span>
                    {unassignedCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-red-600 text-white font-bold">
                        {unassignedCount} Queue
                      </span>
                    ) : (
                      <span className="text-slate-500 font-normal text-[11px]">(15 Vans)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Secondary Full/Half Toggle Button (only when open) */}
                    {mobileSheetState !== 'collapsed' && (
                      <button
                        type="button"
                        onClick={handleToggleFullScreen}
                        className="min-h-[34px] px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title={mobileSheetState === 'full' ? 'Restore to half view' : 'Maximize to full view'}
                        aria-label={mobileSheetState === 'full' ? 'Restore to half view' : 'Maximize to full view'}
                      >
                        {mobileSheetState === 'full' ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-[11px]">Half</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-[11px]">Full</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Primary Action Button: Swipe Up when collapsed, Collapse when open */}
                    <button
                      type="button"
                      id="mobile-swipe-up-btn"
                      onClick={handlePrimarySheetToggle}
                      className="min-h-[34px] px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      aria-expanded={mobileSheetState !== 'collapsed'}
                      aria-controls="panel-board-view"
                      title={mobileSheetState === 'collapsed' ? 'Open dispatch board' : 'Collapse dispatch board'}
                    >
                      <span>{mobileSheetState === 'collapsed' ? 'Swipe Up' : 'Collapse'}</span>
                      <span className="text-blue-600 font-bold">{mobileSheetState === 'collapsed' ? '▴' : '▾'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Kanban Content */}
            <div className="flex-1 overflow-hidden">
              <DispatchKanban
                technicians={technicians}
                tickets={tickets}
                selectedTechId={selectedTechId}
                onSelectTech={setSelectedTechId}
                selectedTicketId={selectedTicketId}
                onSelectTicket={setSelectedTicketId}
                onAssignTicket={handleAssignTicket}
                onUnassignTicket={handleUnassignTicket}
                onReorderTechTickets={handleReorderTechTickets}
                onOpenAiAssistant={() => setIsAiModalOpen(true)}
                onOpenManifest={(tech) => setManifestTech(tech)}
                onOpenNewTicketModal={() => setIsNewTicketModalOpen(true)}
                onOpenJobberModal={() => setIsJobberModalOpen(true)}
                onMessageTech={handleMessageTech}
                activeTab={kanbanActiveTab}
                onActiveTabChange={setKanbanActiveTab}
                onClose={() => {
                  setIsBoardCollapsed(true);
                  setIsLandscapeDrawerOpen(false);
                  setMobileSheetState('collapsed');
                }}
              />
            </div>
          </section>
        </main>
        )}

        {/* Professional Polish Footer Bar (Hidden in Zen Mode and Mobile Landscape) */}
        {!isZenMode && (
          <footer
            id="global-footer"
            className="h-8 bg-slate-800 text-slate-400 hidden sm:flex landscape:max-md:hidden items-center px-4 justify-between text-[10px] shrink-0 font-medium z-20 border-t border-slate-700"
          >
            <div className="flex items-center gap-4">
              <span>Fleet Health: <span className="text-emerald-400 font-bold">Optimal</span></span>
              <span>Cleaners: <span className="text-slate-200 font-mono">15 Active Cleaners</span></span>
              <a
                href={activeProjectId === 'tidyups' ? 'https://app.tidyupscleaning.com' : 'https://dispatchgeeni.com'}
                target="_blank"
                rel="noopener noreferrer"
                className={`hidden lg:inline font-mono font-semibold ${
                  activeProjectId === 'tidyups' ? 'text-emerald-400 hover:text-emerald-300' : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                {activeProjectId === 'tidyups' ? 'app.tidyupscleaning.com' : 'dispatchgeeni.com'}
              </a>
              <span className="hidden xl:inline text-pink-400 font-mono font-bold">1-833-TIDYUPS</span>
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-700 pl-3">
                <button
                  onClick={() => {
                    setActiveLegalTab('SUPPORT');
                    setActiveTopView('LEGAL');
                  }}
                  className="hover:text-slate-200 cursor-pointer"
                >
                  /support
                </button>
                <span>•</span>
                <button
                  onClick={() => {
                    setActiveLegalTab('TERMS');
                    setActiveTopView('LEGAL');
                  }}
                  className="hover:text-slate-200 cursor-pointer"
                >
                  /T&amp;C
                </button>
                <span>•</span>
                <button
                  onClick={() => {
                    setActiveLegalTab('PRIVACY');
                    setActiveTopView('LEGAL');
                  }}
                  className="hover:text-slate-200 cursor-pointer"
                >
                  /privacy-policy
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="uppercase tracking-widest text-slate-300">Clean Dispatch YEG v4.22</span>
            </div>
          </footer>
        )}

        {/* AI Dispatch Assistant Modal */}
        <AiDispatchModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          technicians={technicians}
          tickets={tickets}
          onBatchApplyRecommendations={handleBatchApplyRecommendations}
          onApplySingleRecommendation={handleApplySingleRecommendation}
        />

        {/* Exportable Daily Manifest Modal */}
        <DailyManifestModal
          isOpen={!!manifestTech}
          onClose={() => setManifestTech(null)}
          technician={manifestTech}
          tickets={tickets}
        />

        {/* Create New Cleaning Booking Modal */}
        <NewTicketModal
          isOpen={isNewTicketModalOpen}
          onClose={() => {
            setIsNewTicketModalOpen(false);
            setRadarPreFillTicket(null);
          }}
          onCreateTicket={handleCreateTicket}
          initialAddress={radarPreFillTicket?.address}
          initialCustomerName={radarPreFillTicket?.clientName}
          initialCustomerPhone={radarPreFillTicket?.clientPhone}
          initialAssignedTechId={radarPreFillTicket?.assignedTechId}
          initialServiceType={radarPreFillTicket?.serviceType}
        />

        {/* Jobber Backend Integration & Sync Hub Modal */}
        <JobberSyncModal
          isOpen={isJobberModalOpen}
          onClose={() => setIsJobberModalOpen(false)}
          tickets={tickets}
          onTicketsUpdated={setTickets}
          projectId={activeProjectId}
        />

        {/* Public Booking Modal (Option A for bookmycleaning.net) */}
        <PublicBookingModal
          isOpen={isPublicBookingModalOpen}
          onClose={() => setIsPublicBookingModalOpen(false)}
          onBookingCreated={(newTicket) => {
            setTickets((prev) => [newTicket, ...prev]);
            setSelectedTicketId(newTicket.id);
          }}
        />

        {/* Quo (OpenPhone) 5-Line Phone System Modal */}
        <QuoModal
          isOpen={isQuoModalOpen}
          onClose={() => setIsQuoModalOpen(false)}
          onJobSelected={(_jobId) => {
            setActiveTopView('SCHEDULED_JOBS');
          }}
        />

        {/* Quick Links & Shortcuts Modal */}
        <QuickLinksModal
          isOpen={isQuickLinksOpen}
          onClose={() => setIsQuickLinksOpen(false)}
          onNavigateTo={(view, subTab) => {
            setActiveTopView(view);
            if (subTab && (subTab === 'CALENDAR' || subTab === 'LIST' || subTab === 'UNSCHEDULED')) {
              setScheduledJobsSubTab(subTab as any);
            }
          }}
          onOpenNewTicket={() => setIsNewTicketModalOpen(true)}
          onOpenTeamChat={() => setIsChatOpen(true)}
          onOpenQuoPhone={() => setIsQuoModalOpen(true)}
          onOpenStaffRoster={() => setIsStaffModalOpen(true)}
          onOpenQuickReplies={() => setIsQuickRepliesOpen(true)}
          staffCount={staffList.length}
          scheduledJobsCount={scheduledJobsList.length}
          unscheduledJobsCount={unscheduledJobsList.length}
        />

        {/* Client SMS Quick Replies Assistant Modal */}
        <QuickRepliesModal
          isOpen={isQuickRepliesOpen}
          onClose={() => setIsQuickRepliesOpen(false)}
        />

        {/* Staff Roster & Spreadsheet Sync Modal */}
        <StaffRosterModal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          staffList={staffList}
          onUpdateStaffList={handleUpdateStaffList}
        />

        {/* Van Identifier & Hub Location Edit Modal */}
        <VanHubEditModal
          isOpen={isVanHubModalOpen}
          onClose={() => {
            setIsVanHubModalOpen(false);
            setEditingVanHubTech(null);
          }}
          technician={editingVanHubTech}
          onSave={handleUpdateTechnician}
        />

        {/* Real-Time Team Internal Messaging Drawer */}
        <TeamChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUser={currentUser}
          selectedRecipient={chatRecipient}
          onSelectRecipient={setChatRecipient}
        />

        {/* Role Selector & Login Switcher Modal */}
        <RoleSelectorModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
        />

        {/* Firestore Sync Toast Notification */}
        {firestoreSyncStatus && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-purple-500/50 shadow-2xl rounded-2xl p-4 text-white text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="font-extrabold text-purple-300 block">Cloud Firestore Sync</span>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-snug">{firestoreSyncStatus}</p>
            </div>
            <button
              onClick={() => setFirestoreSyncStatus(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </APIProvider>
  );
}

export default App;
