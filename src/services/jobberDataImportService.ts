import { ScheduledJobItem, getCleanerColor } from '../data/jobberCalendarData';
import { JobberQuote, JobberInvoice } from './jobberSyncModules';

export interface CsvImportResult {
  success: boolean;
  type: 'visits' | 'quotes' | 'invoices' | 'mixed';
  importedCount: number;
  message: string;
  visits?: ScheduledJobItem[];
  quotes?: JobberQuote[];
  invoices?: JobberInvoice[];
}

/**
 * Robust CSV parser that handles quotes and commas
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

/**
 * Parses a Jobber Visits / Jobs CSV report (from Jobber > Reports > Visits or Work Overview)
 */
export function parseJobberVisitsCsv(csvText: string): ScheduledJobItem[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  // Identify key column indexes
  const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('job') || h.includes('visit') || h.includes('name'));
  const clientIdx = headers.findIndex(h => h.includes('client') || h.includes('customer'));
  const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('mobile'));
  const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('property') || h.includes('location') || h.includes('street'));
  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('scheduled') || h.includes('start'));
  const startTimeIdx = headers.findIndex(h => h.includes('starttime') || h.includes('start'));
  const endTimeIdx = headers.findIndex(h => h.includes('endtime') || h.includes('end'));
  const assignedIdx = headers.findIndex(h => h.includes('assigned') || h.includes('user') || h.includes('cleaner') || h.includes('team') || h.includes('tech'));
  const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('state'));
  const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('service') || h.includes('package'));
  const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('instruction') || h.includes('description'));

  const visits: ScheduledJobItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0) continue;

    const rawTitle = titleIdx >= 0 ? row[titleIdx] : '';
    const rawClient = clientIdx >= 0 ? row[clientIdx] : '';
    const clientName = rawClient || rawTitle || 'Jobber Client';
    const clientPhone = phoneIdx >= 0 && row[phoneIdx] ? row[phoneIdx] : '(780) 555-0100';
    const serviceAddress = addressIdx >= 0 && row[addressIdx] ? row[addressIdx] : 'Edmonton, AB';

    // Parse date & time
    const rawDate = dateIdx >= 0 ? row[dateIdx] : '';
    let startIso = new Date().toISOString();
    let endIso = new Date(Date.now() + 3600000 * 3).toISOString();

    if (rawDate) {
      const parsedD = new Date(rawDate);
      if (!isNaN(parsedD.getTime())) {
        const year = parsedD.getFullYear() || 2026;
        const month = String(parsedD.getMonth() + 1).padStart(2, '0');
        const day = String(parsedD.getDate()).padStart(2, '0');
        
        let startTime = '10:00:00';
        let endTime = '13:00:00';

        if (startTimeIdx >= 0 && row[startTimeIdx]) {
          const st = row[startTimeIdx];
          if (st.includes(':')) startTime = st.length === 5 ? `${st}:00` : st;
        }
        if (endTimeIdx >= 0 && row[endTimeIdx]) {
          const et = row[endTimeIdx];
          if (et.includes(':')) endTime = et.length === 5 ? `${et}:00` : et;
        }

        startIso = `${year}-${month}-${day}T${startTime}-06:00`;
        endIso = `${year}-${month}-${day}T${endTime}-06:00`;
      }
    }

    // Cleaners assigned
    let assignedCleaners: string[] = [];
    if (assignedIdx >= 0 && row[assignedIdx]) {
      const rawAssigned = row[assignedIdx];
      // Split on comma, semicolon, or slash
      assignedCleaners = rawAssigned
        .split(/[,;\/&]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    if (assignedCleaners.length === 0) {
      assignedCleaners = ['Joel MBATCHOU'];
    }

    // Service type
    let serviceType: 'Standard Cleaning' | 'Deep Cleaning' | 'Move-Out Cleaning' = 'Standard Cleaning';
    const combinedText = `${rawTitle} ${typeIdx >= 0 ? row[typeIdx] : ''}`.toLowerCase();
    if (combinedText.includes('deep') || combinedText.includes('scrub')) {
      serviceType = 'Deep Cleaning';
    } else if (combinedText.includes('move') || combinedText.includes('turnover') || combinedText.includes('vacate')) {
      serviceType = 'Move-Out Cleaning';
    }

    // Status
    let status: 'SCHEDULED' | 'COMPLETED' | 'IN_PROGRESS' = 'SCHEDULED';
    if (statusIdx >= 0 && row[statusIdx]) {
      const st = row[statusIdx].toLowerCase();
      if (st.includes('comp') || st.includes('done') || st.includes('paid')) {
        status = 'COMPLETED';
      } else if (st.includes('prog') || st.includes('start')) {
        status = 'IN_PROGRESS';
      }
    }

    visits.push({
      id: `imported-vis-${i}-${Date.now().toString(36)}`,
      visitNumber: `VISIT-${4200 + i}`,
      title: rawTitle || `${clientName} - ${serviceType}`,
      clientName,
      clientPhone,
      serviceAddress,
      lat: 53.5461 + (Math.random() - 0.5) * 0.08,
      lng: -113.4938 + (Math.random() - 0.5) * 0.12,
      startAt: startIso,
      endAt: endIso,
      assignedCleaners,
      serviceType,
      status,
      jobberWebUri: `https://secure.getjobber.com/visits/${4200 + i}`,
      notes: notesIdx >= 0 ? row[notesIdx] : undefined,
    });
  }

  return visits;
}

/**
 * Parses a Jobber Quotes CSV report (from Jobber > Reports > Quotes)
 */
export function parseJobberQuotesCsv(csvText: string): JobberQuote[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const numIdx = headers.findIndex(h => h.includes('number') || h.includes('quote') || h.includes('id'));
  const clientIdx = headers.findIndex(h => h.includes('client') || h.includes('customer') || h.includes('name'));
  const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('state'));
  const totalIdx = headers.findIndex(h => h.includes('total') || h.includes('amount') || h.includes('price'));
  const depositIdx = headers.findIndex(h => h.includes('deposit') || h.includes('required'));
  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('created'));
  const serviceIdx = headers.findIndex(h => h.includes('service') || h.includes('title') || h.includes('description'));

  const quotes: JobberQuote[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0) continue;

    const rawNum = numIdx >= 0 ? row[numIdx] : String(2100 + i);
    const quoteNumber = rawNum.startsWith('QT-') ? rawNum : `QT-${rawNum.replace(/\D/g, '') || (2100 + i)}`;
    const clientName = clientIdx >= 0 && row[clientIdx] ? row[clientIdx] : 'Jobber Client';
    
    let quoteStatus: 'APPROVED' | 'AWAITING_RESPONSE' | 'CHANGES_REQUESTED' | 'CONVERTED' | 'DRAFT' = 'APPROVED';
    if (statusIdx >= 0 && row[statusIdx]) {
      const s = row[statusIdx].toLowerCase();
      if (s.includes('await') || s.includes('pend') || s.includes('sent')) {
        quoteStatus = 'AWAITING_RESPONSE';
      } else if (s.includes('convert')) {
        quoteStatus = 'CONVERTED';
      } else if (s.includes('change')) {
        quoteStatus = 'CHANGES_REQUESTED';
      } else if (s.includes('draft')) {
        quoteStatus = 'DRAFT';
      }
    }

    const totalRaw = totalIdx >= 0 ? row[totalIdx].replace(/[^0-9.]/g, '') : '350';
    const total = parseFloat(totalRaw) || 350;

    const depRaw = depositIdx >= 0 ? row[depositIdx].replace(/[^0-9.]/g, '') : '100';
    const depositRequired = parseFloat(depRaw) || 100;

    const createdAt = dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : new Date().toISOString();
    const service = serviceIdx >= 0 && row[serviceIdx] ? row[serviceIdx] : 'Residential Deep Cleaning';

    quotes.push({
      id: `imported-qt-${i}-${Date.now().toString(36)}`,
      quoteNumber,
      clientName,
      service,
      quoteStatus,
      total,
      depositRequired,
      createdAt,
      jobberWebUri: `https://secure.getjobber.com/quotes/${2100 + i}`,
    });
  }

  return quotes;
}

/**
 * Parses a Jobber Invoices CSV report (from Jobber > Reports > Invoices)
 */
export function parseJobberInvoicesCsv(csvText: string): JobberInvoice[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const numIdx = headers.findIndex(h => h.includes('number') || h.includes('invoice') || h.includes('id'));
  const clientIdx = headers.findIndex(h => h.includes('client') || h.includes('customer') || h.includes('name'));
  const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('state'));
  const totalIdx = headers.findIndex(h => h.includes('total') || h.includes('amount') || h.includes('price'));
  const balanceIdx = headers.findIndex(h => h.includes('balance') || h.includes('due') || h.includes('remaining'));
  const issueDateIdx = headers.findIndex(h => h.includes('issue') || h.includes('date') || h.includes('sent'));
  const dueDateIdx = headers.findIndex(h => h.includes('due') || h.includes('deadline'));

  const invoices: JobberInvoice[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0) continue;

    const rawNum = numIdx >= 0 ? row[numIdx] : String(4100 + i);
    const invoiceNumber = rawNum.startsWith('INV-') ? rawNum : `INV-${rawNum.replace(/\D/g, '') || (4100 + i)}`;
    const clientName = clientIdx >= 0 && row[clientIdx] ? row[clientIdx] : 'Jobber Client';

    let invoiceStatus: 'PAID' | 'AWAITING_PAYMENT' | 'PAST_DUE' | 'DRAFT' = 'PAID';
    if (statusIdx >= 0 && row[statusIdx]) {
      const s = row[statusIdx].toLowerCase();
      if (s.includes('past') || s.includes('overdue')) {
        invoiceStatus = 'PAST_DUE';
      } else if (s.includes('await') || s.includes('unpaid') || s.includes('pend') || s.includes('sent')) {
        invoiceStatus = 'AWAITING_PAYMENT';
      } else if (s.includes('draft')) {
        invoiceStatus = 'DRAFT';
      }
    }

    const totalRaw = totalIdx >= 0 ? row[totalIdx].replace(/[^0-9.]/g, '') : '280';
    const total = parseFloat(totalRaw) || 280;

    let balance = 0;
    if (balanceIdx >= 0 && row[balanceIdx]) {
      balance = parseFloat(row[balanceIdx].replace(/[^0-9.]/g, '')) || 0;
    } else if (invoiceStatus === 'AWAITING_PAYMENT' || invoiceStatus === 'PAST_DUE') {
      balance = total;
    }

    const issuedDate = issueDateIdx >= 0 && row[issueDateIdx] ? row[issueDateIdx] : new Date().toISOString().slice(0, 10);
    const dueDate = dueDateIdx >= 0 && row[dueDateIdx] ? row[dueDateIdx] : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    invoices.push({
      id: `imported-inv-${i}-${Date.now().toString(36)}`,
      invoiceNumber,
      clientName,
      invoiceStatus,
      total,
      balance,
      issuedDate,
      dueDate,
      jobberWebUri: `https://secure.getjobber.com/invoices/${4100 + i}`,
    });
  }

  return invoices;
}
