import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { ClientRecord } from '../types/client';
import { ScheduledJobItem, UnscheduledJobItem } from '../data/jobberCalendarData';
import { JobberQuote, JobberInvoice } from './jobberSyncModules';
import { Technician } from '../types/dispatch';
import { JobberStaffMember } from './staffRosterService';

// Target Firestore Database ID
export const FIRESTORE_DATABASE_ID = 'ai-studio-cleaningserviced-8a2493ab-cb9d-4c28-a60b-c28e7d08d30e';

/**
 * Sanitizes an ID to conform to Firestore security rules regex: ^[a-zA-Z0-9_\-]+$
 */
export function sanitizeDocId(id: string, fallbackPrefix = 'id'): string {
  if (!id) return `${fallbackPrefix}-${Date.now()}`;
  const cleaned = id.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 120);
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS SYNC
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreClient(client: ClientRecord): Record<string, unknown> {
  const cleanId = sanitizeDocId(client.id, 'cli');
  const validStatus = ['Client', 'Good lead', 'Bad lead', 'Spam', 'Lead', 'Archived'].includes(client.verdict || '') 
    ? (client.verdict as string) 
    : 'Client';

  return {
    id: cleanId,
    name: (client.name || 'Anonymous Client').substring(0, 150),
    phone: (client.phone || '(780) 555-0100').substring(0, 30),
    email: (client.email || '').substring(0, 200) || undefined,
    secondaryPhone: (client.secondaryPhone || '').substring(0, 30) || undefined,
    address: (client.address || 'Edmonton, AB').substring(0, 300),
    status: validStatus,
    tags: Array.isArray(client.tags) ? client.tags.slice(0, 20).map((t) => String(t).substring(0, 50)) : [],
    notes: (client.notes || '').substring(0, 1000) || undefined,
    createdAt: client.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function saveClientToFirestore(client: ClientRecord): Promise<void> {
  const docId = sanitizeDocId(client.id, 'cli');
  const payload = toFirestoreClient(client);
  const path = `clients/${docId}`;
  try {
    const docRef = doc(db, 'clients', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on ${path}:`, error);
  }
}

export async function deleteClientFromFirestore(clientId: string): Promise<void> {
  const docId = sanitizeDocId(clientId, 'cli');
  const path = `clients/${docId}`;
  try {
    const docRef = doc(db, 'clients', docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`Firestore delete error on ${path}:`, error);
  }
}

export async function fetchClientsFromFirestore(): Promise<ClientRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'clients'));
    const list: ClientRecord[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      const verdict = (['Client', 'Good lead', 'Bad lead', 'Spam'].includes(data.status) ? data.status : 'Client') as any;
      list.push({
        id: data.id || d.id,
        name: data.name || '',
        email: data.email,
        phone: data.phone || '',
        secondaryPhone: data.secondaryPhone,
        address: data.address || '',
        verdict,
        tags: data.tags || [],
        isJobberLinked: data.tags?.includes('jobber-client') || false,
        notes: data.notes,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return list;
  } catch (err) {
    console.warn('Could not read clients from Firestore:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED VISITS SYNC
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreScheduledVisit(visit: ScheduledJobItem): Record<string, unknown> {
  const cleanId = sanitizeDocId(visit.id, 'visit');
  const cleaner = (visit.assignedCleaners && visit.assignedCleaners[0]) || 'Team Van';
  const rawStatus = visit.status || 'SCHEDULED';
  const statusMap: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
  };
  const status = statusMap[rawStatus] || 'Scheduled';

  return {
    id: cleanId,
    clientName: (visit.clientName || 'Jobber Client').substring(0, 150),
    phone: (visit.clientPhone || '(780) 555-0100').substring(0, 30),
    secondaryPhone: (visit.secondaryPhone || '').substring(0, 30) || undefined,
    address: (visit.serviceAddress || 'Edmonton, AB').substring(0, 300),
    vanId: sanitizeDocId(cleaner, 'van'),
    cleanerName: cleaner.substring(0, 100),
    scheduledTime: (visit.startAt || new Date().toISOString()).substring(0, 100),
    durationMinutes: 120,
    status,
    serviceType: (visit.serviceType || 'Standard Cleaning').substring(0, 100),
    notes: (visit.notes || '').substring(0, 1000) || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function saveScheduledVisitToFirestore(visit: ScheduledJobItem): Promise<void> {
  const docId = sanitizeDocId(visit.id, 'visit');
  const payload = toFirestoreScheduledVisit(visit);
  try {
    const docRef = doc(db, 'scheduledVisits', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on scheduledVisits/${docId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNSCHEDULED JOBS SYNC
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreUnscheduledJob(job: UnscheduledJobItem): Record<string, unknown> {
  const cleanId = sanitizeDocId(job.id, 'ujob');
  return {
    id: cleanId,
    clientName: (job.clientName || 'Jobber Client').substring(0, 150),
    phone: (job.clientPhone || '(780) 555-0100').substring(0, 30),
    address: (job.serviceAddress || 'Edmonton, AB').substring(0, 300),
    serviceType: (job.serviceType || 'Standard Cleaning').substring(0, 100),
    priority: 'Normal',
    estimatedHours: 2,
    createdAt: job.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function saveUnscheduledJobToFirestore(job: UnscheduledJobItem): Promise<void> {
  const docId = sanitizeDocId(job.id, 'ujob');
  const payload = toFirestoreUnscheduledJob(job);
  try {
    const docRef = doc(db, 'unscheduledJobs', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on unscheduledJobs/${docId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTES & INVOICES SYNC
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreQuote(quote: JobberQuote): Record<string, unknown> {
  const cleanId = sanitizeDocId(quote.id, 'quote');
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    AWAITING_RESPONSE: 'Sent',
    APPROVED: 'Approved',
    CONVERTED: 'Converted',
    CHANGES_REQUESTED: 'Declined',
  };
  const status = statusMap[quote.quoteStatus] || 'Sent';

  return {
    id: cleanId,
    quoteNumber: (quote.quoteNumber || 'Q-100').substring(0, 50),
    clientName: (quote.clientName || 'Client').substring(0, 150),
    totalAmount: typeof quote.total === 'number' ? quote.total : 0,
    status,
    issueDate: quote.createdAt || new Date().toISOString(),
    createdAt: quote.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function saveQuoteToFirestore(quote: JobberQuote): Promise<void> {
  const docId = sanitizeDocId(quote.id, 'quote');
  const payload = toFirestoreQuote(quote);
  try {
    const docRef = doc(db, 'quotes', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on quotes/${docId}:`, error);
  }
}

export function toFirestoreInvoice(invoice: JobberInvoice): Record<string, unknown> {
  const cleanId = sanitizeDocId(invoice.id, 'inv');
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    AWAITING_PAYMENT: 'Awaiting Payment',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    BAD_DEBT: 'Bad Debt',
    PAST_DUE: 'Overdue',
  };
  const status = statusMap[invoice.invoiceStatus] || 'Awaiting Payment';

  return {
    id: cleanId,
    invoiceNumber: (invoice.invoiceNumber || 'INV-100').substring(0, 50),
    clientName: (invoice.clientName || 'Client').substring(0, 150),
    totalAmount: typeof invoice.total === 'number' ? invoice.total : 0,
    status,
    issueDate: invoice.issuedDate || new Date().toISOString(),
    dueDate: invoice.dueDate || new Date().toISOString(),
    createdAt: invoice.issuedDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function saveInvoiceToFirestore(invoice: JobberInvoice): Promise<void> {
  const docId = sanitizeDocId(invoice.id, 'inv');
  const payload = toFirestoreInvoice(invoice);
  try {
    const docRef = doc(db, 'invoices', docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on invoices/${docId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VAN & HUB OVERRIDES SYNC
// ─────────────────────────────────────────────────────────────────────────────

export function toFirestoreVanOverride(tech: Technician): Record<string, unknown> {
  const vanId = sanitizeDocId(tech.id, 'van');
  return {
    vanId,
    customVanName: (tech.vanNumber || tech.name).substring(0, 100),
    cleanerName: (tech.name || '').substring(0, 100),
    phone: (tech.phone || '').substring(0, 30),
    hubId: sanitizeDocId(tech.depotLocation?.name || 'hub_default', 'hub'),
    customHubName: (tech.depotLocation?.name || `${tech.name} Hub`).substring(0, 100),
    color: (tech.color || '#2563EB').substring(0, 20),
    updatedAt: new Date().toISOString(),
  };
}

export async function saveVanOverrideToFirestore(tech: Technician): Promise<void> {
  const vanId = sanitizeDocId(tech.id, 'van');
  const payload = toFirestoreVanOverride(tech);
  try {
    const docRef = doc(db, 'vanOverrides', vanId);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Firestore save error on vanOverrides/${vanId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH FULL SYNC
// ─────────────────────────────────────────────────────────────────────────────

export interface FullSyncResult {
  clientsCount: number;
  scheduledVisitsCount: number;
  unscheduledJobsCount: number;
  quotesCount: number;
  invoicesCount: number;
  vanOverridesCount: number;
  errors: string[];
}

/**
 * Syncs the entire current in-memory operational state to Firestore
 */
export async function syncAllToFirestore({
  clients,
  scheduledVisits,
  unscheduledJobs,
  quotes,
  invoices,
  technicians,
}: {
  clients: ClientRecord[];
  scheduledVisits: ScheduledJobItem[];
  unscheduledJobs: UnscheduledJobItem[];
  quotes: JobberQuote[];
  invoices: JobberInvoice[];
  technicians: Technician[];
}): Promise<FullSyncResult> {
  const result: FullSyncResult = {
    clientsCount: 0,
    scheduledVisitsCount: 0,
    unscheduledJobsCount: 0,
    quotesCount: 0,
    invoicesCount: 0,
    vanOverridesCount: 0,
    errors: [],
  };

  for (const client of clients) {
    try {
      await saveClientToFirestore(client);
      result.clientsCount++;
    } catch (e: any) {
      result.errors.push(`Client ${client.id}: ${e?.message || e}`);
    }
  }

  for (const visit of scheduledVisits) {
    try {
      await saveScheduledVisitToFirestore(visit);
      result.scheduledVisitsCount++;
    } catch (e: any) {
      result.errors.push(`Visit ${visit.id}: ${e?.message || e}`);
    }
  }

  for (const job of unscheduledJobs) {
    try {
      await saveUnscheduledJobToFirestore(job);
      result.unscheduledJobsCount++;
    } catch (e: any) {
      result.errors.push(`Unscheduled Job ${job.id}: ${e?.message || e}`);
    }
  }

  for (const quote of quotes) {
    try {
      await saveQuoteToFirestore(quote);
      result.quotesCount++;
    } catch (e: any) {
      result.errors.push(`Quote ${quote.id}: ${e?.message || e}`);
    }
  }

  for (const invoice of invoices) {
    try {
      await saveInvoiceToFirestore(invoice);
      result.invoicesCount++;
    } catch (e: any) {
      result.errors.push(`Invoice ${invoice.id}: ${e?.message || e}`);
    }
  }

  for (const tech of technicians) {
    try {
      await saveVanOverrideToFirestore(tech);
      result.vanOverridesCount++;
    } catch (e: any) {
      result.errors.push(`Van ${tech.id}: ${e?.message || e}`);
    }
  }

  return result;
}
