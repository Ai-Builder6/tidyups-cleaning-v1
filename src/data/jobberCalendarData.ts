import { JobberQuote, JobberInvoice } from '../services/jobberSyncModules';

export interface ScheduledJobItem {
  id: string;
  visitNumber: string;
  title: string;
  clientName: string;
  clientPhone: string;
  secondaryPhone?: string;
  clientTags?: string[];
  serviceAddress: string;
  city?: string;
  lat: number;
  lng: number;
  startAt: string;
  endAt: string;
  assignedCleaners: string[];
  serviceType: 'Standard Cleaning' | 'Deep Cleaning' | 'Move-Out Cleaning';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  jobberWebUri: string;
  notes?: string;
  callTranscripts?: any[];
  quoteNumber?: string;
  quoteTotal?: number;
  quoteStatus?: 'APPROVED' | 'CONVERTED' | 'AWAITING_RESPONSE' | 'DRAFT';
  invoiceNumber?: string;
  invoiceTotal?: number;
  invoiceStatus?: 'PAID' | 'AWAITING_PAYMENT' | 'DRAFT' | 'BAD_DEBT';
}

// Cleaner color map matching Jobber staff roster
export const CLEANER_COLOR_MAP: Record<string, string> = {
  'Boss iPad Pro 《iPhone》': '#EC4899',   // Hot pink - Admin
  'Boss iPad Pro': '#EC4899',
  'Boss iPad  Pro': '#EC4899',
  'Richard "Owner Account"': '#7C3AED',  // Royal violet - Owner
  'Richard “Owner Account”': '#7C3AED',
  'Richard': '#7C3AED',
  '1 Joseph Juma': '#0891B2',            // Ocean cyan
  'Joseph Juma': '#0891B2',
  'Adison Haugland': '#D97706',          // Warm amber
  'Cindy Guay': '#10B981',               // Mint emerald
  'Dominic Mancini': '#4F46E5',          // Slate indigo - Dispatcher
  'Jasmin Kunin': '#6366F1',             // Indigo blue
  'Jen & Bryan Cabugon': '#F59E0B',      // Golden amber team
  'Joel MBATCHOU': '#8B5CF6',            // Electric violet
  'Joel Mbatchou': '#8B5CF6',
  'Kilab': '#3B82F6',                    // Electric blue
  'Kilab Facility Services': '#3B82F6',
  'Melissa Clarke': '#2563EB',           // Royal blue
  'Melissa': '#2563EB',
  'N.Dinku': '#06B6D4',                  // Teal cyan
  'N. Dinku': '#06B6D4',
  'Neth & Carmen': '#F43F5E',            // Ruby rose team
  'Robyn Adele': '#059669',              // Forest emerald
  'Sergine Ngongang wetie': '#D946EF',    // Fuchsia magenta
  'Sergine Ngongang': '#D946EF',
  'Unassigned': '#64748B',               // Slate
};

export function getCleanerColor(cleanerName: string): string {
  if (!cleanerName) return '#8B5CF6';
  if (CLEANER_COLOR_MAP[cleanerName]) return CLEANER_COLOR_MAP[cleanerName];
  const lower = cleanerName.toLowerCase();
  if (lower.includes('joel')) return '#8B5CF6';
  if (lower.includes('melissa')) return '#2563EB';
  if (lower.includes('juma') || lower.includes('joseph')) return '#0891B2';
  if (lower.includes('adison')) return '#D97706';
  if (lower.includes('cindy')) return '#10B981';
  if (lower.includes('dominic')) return '#4F46E5';
  if (lower.includes('jasmin')) return '#6366F1';
  if (lower.includes('cabugon') || lower.includes('jen')) return '#F59E0B';
  if (lower.includes('kilab')) return '#3B82F6';
  if (lower.includes('dinku')) return '#06B6D4';
  if (lower.includes('neth') || lower.includes('carmen')) return '#F43F5E';
  if (lower.includes('robyn')) return '#059669';
  if (lower.includes('sergine') || lower.includes('wetie')) return '#D946EF';
  if (lower.includes('richard')) return '#7C3AED';
  if (lower.includes('ipad')) return '#EC4899';
  return '#8B5CF6';
}

/**
 * Returns 2-3 letter uppercase initials badge for a cleaner, matching Jobber
 * e.g. "Cindy Guay" -> "CG", "Joel MBATCHOU" -> "JM", "Joseph Juma" -> "JJ", "Jen & Bryan" -> "JB"
 */
export function getCleanerInitials(cleanerName: string): string {
  if (!cleanerName) return '??';
  const clean = cleanerName.replace(/[《》"']/g, '').trim();
  const lower = clean.toLowerCase();
  if (lower.includes('cindy')) return 'CG';
  if (lower.includes('joel')) return 'JM';
  if (lower.includes('juma') || lower.includes('joseph')) return 'JJ';
  if (lower.includes('melissa')) return 'MC';
  if (lower.includes('adison')) return 'AH';
  if (lower.includes('dominic')) return 'DM';
  if (lower.includes('jasmin')) return 'JK';
  if (lower.includes('cabugon') || lower.includes('jen')) return 'JC';
  if (lower.includes('kilab')) return 'KF';
  if (lower.includes('dinku')) return 'ND';
  if (lower.includes('neth') || lower.includes('carmen')) return 'NC';
  if (lower.includes('robyn')) return 'RA';
  if (lower.includes('sergine') || lower.includes('wetie')) return 'SN';
  if (lower.includes('richard')) return 'RC';
  if (lower.includes('ipad')) return 'HQ';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format ISO datetime string nicely for calendar and map views
 */
export function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return {
      dateStr: d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }),
      timeStr: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      hour: d.getHours(),
    };
  } catch {
    return {
      dateStr: iso,
      timeStr: 'Scheduled',
      hour: 9,
    };
  }
}

/**
 * 15 Jobber Team Members exactly matching Jobber screenshot
 */
export interface JobberTeamMember {
  id: string;
  name: string;
  jobberLinkedName: string;
  isLinked: boolean;
  role: 'Owner' | 'Dispatcher' | 'Cleaner';
  color: string;
  vanUnit?: string;
  phone: string;
  email: string;
  address?: string;
}

export const JOBBER_TEAM_MEMBERS: JobberTeamMember[] = [
  { id: 'tm-1', name: 'Boss iPad Pro 《iPhone》', jobberLinkedName: 'Boss iPad Pro 《iPhone》', isLinked: true, role: 'Dispatcher', color: '#EC4899', vanUnit: 'Executive HQ', phone: '(780) 718-5092', email: 'cleaningserviceyeg@gmail.com', address: '8306 Chappelle Way Southwest, Edmonton, AB' },
  { id: 'tm-2', name: 'Richard "Owner Account"', jobberLinkedName: 'Richard "Owner Account"', isLinked: true, role: 'Owner', color: '#7C3AED', vanUnit: 'Executive HQ', phone: '(780) 718-5092', email: 'support@bookmycleaning.net', address: '8306 Chappelle Way Southwest, Edmonton, AB' },
  { id: 'tm-3', name: '1 Joseph Juma', jobberLinkedName: '1 Joseph Juma', isLinked: true, role: 'Cleaner', color: '#0891B2', vanUnit: 'Unit 5', phone: '(780) 267-3472', email: 'baraka.cleaningservices95@gmail.com', address: '3751 139 Ave NW, Edmonton, AB' },
  { id: 'tm-4', name: 'Adison Haugland', jobberLinkedName: 'Adison Haugland', isLinked: true, role: 'Cleaner', color: '#D97706', vanUnit: 'Unit 4', phone: '(780) 554-2851', email: 'hauglandadison@gmail.com', address: '10231 120 St NW, Edmonton, AB' },
  { id: 'tm-5', name: 'Cindy Guay', jobberLinkedName: 'Cindy Guay', isLinked: true, role: 'Cleaner', color: '#10B981', vanUnit: 'Unit 7', phone: '(780) 863-0896', email: 'cindybg@live.ca', address: '740 Knottwood Rd S NW, Edmonton, AB' },
  { id: 'tm-6', name: 'Dominic Mancini', jobberLinkedName: 'Dominic Mancini', isLinked: true, role: 'Dispatcher', color: '#4F46E5', vanUnit: 'Unit 15 (Lead Mobile)', phone: '(587) 385-8329', email: 'mittens45dm@gmail.com', address: '9722 154 St, Edmonton, AB T5P 2G3' },
  { id: 'tm-7', name: 'Jasmin Kunin', jobberLinkedName: 'Jasmin Kunin', isLinked: true, role: 'Cleaner', color: '#6366F1', vanUnit: 'Unit 8', phone: '(780) 802-3373', email: 'kuninjasmin@gmail.com', address: '10740 109 St NW, Edmonton, AB' },
  { id: 'tm-8', name: 'Jen & Bryan Cabugon', jobberLinkedName: 'Jen & Bryan Cabugon', isLinked: true, role: 'Cleaner', color: '#F59E0B', vanUnit: 'Unit 9 (Team)', phone: '(825) 888-3251', email: 'cedi.cleans@gmail.com', address: '9434 208 St NW, Edmonton, AB' },
  { id: 'tm-9', name: 'Joel MBATCHOU', jobberLinkedName: 'Joel MBATCHOU', isLinked: true, role: 'Cleaner', color: '#8B5CF6', vanUnit: 'Unit 11', phone: '(587) 937-9408', email: 'mbatchoujoakim@yahoo.fr', address: '17908 61 Ave NW, Edmonton, AB' },
  { id: 'tm-10', name: 'Kilab', jobberLinkedName: 'Kilab', isLinked: true, role: 'Cleaner', color: '#3B82F6', vanUnit: 'Unit 12', phone: '(647) 466-4476', email: 'kffsfacilityservice10@gmail.com', address: '12219 103 St NW, Edmonton, AB' },
  { id: 'tm-11', name: 'Melissa Clarke', jobberLinkedName: 'Melissa Clarke', isLinked: true, role: 'Cleaner', color: '#2563EB', vanUnit: 'Unit 1', phone: '(780) 954-2409', email: 'clarkemelissa2025@gmail.com', address: '7221 Chivers Pl SW, Edmonton, AB' },
  { id: 'tm-12', name: 'N.Dinku', jobberLinkedName: 'N.Dinku', isLinked: true, role: 'Cleaner', color: '#06B6D4', vanUnit: 'Unit 13', phone: '(587) 500-7911', email: 'bultoefa@gmail.com', address: '10408 155 Ave NW, Edmonton, AB' },
  { id: 'tm-13', name: 'Neth & Carmen', jobberLinkedName: 'Neth & Carmen', isLinked: true, role: 'Cleaner', color: '#F43F5E', vanUnit: 'Unit 14 (Team)', phone: '(780) 729-2031', email: 'nhettemcarmen@yahoo.com', address: '20123 58 Ave NW, Edmonton, AB' },
  { id: 'tm-14', name: 'Robyn Adele', jobberLinkedName: 'Robyn Adele', isLinked: true, role: 'Cleaner', color: '#059669', vanUnit: 'Unit 3', phone: '(780) 660-0681', email: 'robynkierstead@hotmail.com', address: '574 Saddleback Rd NW, Edmonton, AB' },
  { id: 'tm-15', name: 'Sergine Ngongang wetie', jobberLinkedName: 'Sergine Ngongang wetie', isLinked: true, role: 'Cleaner', color: '#D946EF', vanUnit: 'Unit 10', phone: '(418) 261-4689', email: 'tatiwetie@gmail.com', address: '17115 61 Ave NW, Edmonton, AB' },
];

/**
 * Seed visits that exactly recreate Screenshot 1 (61 visits in October 2026),
 * plus August, September, November, and December 2026!
 */
export function generateHistoricAndFutureVisits(): ScheduledJobItem[] {
  const visits: ScheduledJobItem[] = [
    // ----------------------------------------------------
    // OCTOBER 2026 - Exactly matching Screenshot 1!
    // ----------------------------------------------------
    // Mon Sept 28 / Oct calendar row 1
    {
      id: 'vis-oct-28a',
      visitNumber: 'VISIT-4028',
      title: 'Matthew Penkala - Standard Clean',
      clientName: 'Matthew Penkala',
      clientPhone: '(780) 555-8912',
      serviceAddress: '10920 84 Ave NW, Edmonton, AB',
      lat: 53.5190,
      lng: -113.5130,
      startAt: '2026-09-28T10:00:00-06:00',
      endAt: '2026-09-28T12:30:00-06:00',
      assignedCleaners: ['Joseph Juma'],
      serviceType: 'Standard Cleaning',
      status: 'COMPLETED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4028',
    },
    {
      id: 'vis-oct-28b',
      visitNumber: 'VISIT-4029',
      title: 'Owa & Alex Isegh - Bi-weekly Clean',
      clientName: 'Owa & Alex Isegh',
      clientPhone: '(780) 555-3310',
      serviceAddress: '3112 119 St NW, Edmonton, AB',
      lat: 53.4650,
      lng: -113.5350,
      startAt: '2026-09-28T11:00:00-06:00',
      endAt: '2026-09-28T13:30:00-06:00',
      assignedCleaners: ['Cindy Guay'],
      serviceType: 'Standard Cleaning',
      status: 'COMPLETED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4029',
    },
    {
      id: 'vis-oct-28c',
      visitNumber: 'VISIT-4030',
      title: 'Kati Luknowsky - Bi-weekly Detail Clean',
      clientName: 'Kati Luknowsky',
      clientPhone: '(780) 555-7788',
      serviceAddress: '9710 142 St NW, Edmonton, AB',
      lat: 53.5350,
      lng: -113.5650,
      startAt: '2026-09-28T17:00:00-06:00',
      endAt: '2026-09-28T19:30:00-06:00',
      assignedCleaners: ['Melissa Clarke'],
      serviceType: 'Standard Cleaning',
      status: 'COMPLETED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4030',
    },
    // Tue Sept 29
    {
      id: 'vis-oct-29a',
      visitNumber: 'VISIT-4031',
      title: 'Brett & Ellie Kanuk - Bi-weekly Residential',
      clientName: 'Brett & Ellie Kanuk',
      clientPhone: '(780) 555-4421',
      serviceAddress: '4904 141 Ave NW, Edmonton, AB',
      lat: 53.6040,
      lng: -113.4180,
      startAt: '2026-09-29T10:00:00-06:00',
      endAt: '2026-09-29T12:30:00-06:00',
      assignedCleaners: ['Jen & Bryan Cabugon'],
      serviceType: 'Standard Cleaning',
      status: 'COMPLETED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4031',
    },
    // Wed Sept 30
    {
      id: 'vis-oct-30a',
      visitNumber: 'VISIT-4032',
      title: 'Nicholas Christensen - Condo Clean',
      clientName: 'Nicholas Christensen',
      clientPhone: '(780) 555-9012',
      serviceAddress: '9920 110 St NW, Edmonton, AB',
      lat: 53.5380,
      lng: -113.5120,
      startAt: '2026-09-30T10:00:00-06:00',
      endAt: '2026-09-30T12:00:00-06:00',
      assignedCleaners: ['Jasmin Kunin'],
      serviceType: 'Standard Cleaning',
      status: 'COMPLETED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4032',
    },
    {
      id: 'vis-oct-30b',
      visitNumber: 'VISIT-4033',
      title: 'Chris Reaume - 2Bed Apartment',
      clientName: 'Chris Reaume',
      clientPhone: '(780) 555-6671',
      serviceAddress: '10712 84 Ave NW, Edmonton, AB',
      lat: 53.5200,
      lng: -113.5090,
      startAt: '2026-09-30T10:00:00-06:00',
      endAt: '2026-09-30T12:30:00-06:00',
      assignedCleaners: ['Robyn Adele'],
      serviceType: 'Deep Cleaning',
      status: 'COMPLETED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4033',
    },
    {
      id: 'vis-oct-30c',
      visitNumber: 'VISIT-4034',
      title: 'Angie Moxam - 2Bed Home',
      clientName: 'Angie Moxam',
      clientPhone: '(780) 555-5512',
      serviceAddress: '8310 160 St NW, Edmonton, AB',
      lat: 53.5160,
      lng: -113.6000,
      startAt: '2026-09-30T10:00:00-06:00',
      endAt: '2026-09-30T12:30:00-06:00',
      assignedCleaners: ['Adison Haugland'],
      serviceType: 'Standard Cleaning',
      status: 'COMPLETED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4034',
    },
    // Thu Oct 1 - Today in screenshot!
    {
      id: 'vis-oct-01b',
      visitNumber: 'VISIT-4036',
      title: 'Jacqueline Ares - 2 Cleaners Tandem Deep Scrub',
      clientName: 'Jacqueline Ares',
      clientPhone: '(780) 555-9988',
      serviceAddress: '14102 102 Ave NW, Edmonton, AB',
      lat: 53.5430,
      lng: -113.5650,
      startAt: '2026-10-01T12:30:00-06:00',
      endAt: '2026-10-01T15:30:00-06:00',
      assignedCleaners: ['Joel MBATCHOU', 'Sergine Ngongang wetie'], // Two cleaners assigned together!
      serviceType: 'Deep Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4036',
      notes: 'Assigned to Joel MBATCHOU and Sergine Ngongang wetie. Focus on master bath grout and oven interior.',
    },
    // Fri Oct 2
    {
      id: 'vis-oct-02c',
      visitNumber: 'VISIT-4039',
      title: 'Mimi - 3bed 2.5ba Residential',
      clientName: 'Mimi',
      clientPhone: '(780) 555-7761',
      serviceAddress: '2304 38 St NW, Edmonton, AB',
      lat: 53.4560,
      lng: -113.4020,
      startAt: '2026-10-02T10:00:00-06:00',
      endAt: '2026-10-02T13:00:00-06:00',
      assignedCleaners: ['Joel MBATCHOU'],
      serviceType: 'Deep Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4039',
      notes: 'Assigned to Joel MBATCHOU. 3-bedroom, 2.5-bath residential deep cleaning in Mill Woods.',
    },
    // Mon Oct 5
    {
      id: 'vis-oct-05a',
      visitNumber: 'VISIT-4040',
      title: 'Sindhu Murugavel - Bi-weekly',
      clientName: 'Sindhu Murugavel',
      clientPhone: '(780) 555-2231',
      serviceAddress: '12411 106 Ave NW, Edmonton, AB',
      lat: 53.5490,
      lng: -113.5370,
      startAt: '2026-10-05T10:00:00-06:00',
      endAt: '2026-10-05T12:30:00-06:00',
      assignedCleaners: ['N.Dinku'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4040',
    },
    {
      id: 'vis-oct-05b',
      visitNumber: 'VISIT-4041',
      title: 'Adam Joly - bi-weekly Clean',
      clientName: 'Adam Joly',
      clientPhone: '(780) 555-9087',
      serviceAddress: '6812 112 Ave NW, Edmonton, AB',
      lat: 53.5640,
      lng: -113.4410,
      startAt: '2026-10-05T10:00:00-06:00',
      endAt: '2026-10-05T12:30:00-06:00',
      assignedCleaners: ['Cindy Guay'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4041',
    },
    {
      id: 'vis-oct-05c',
      visitNumber: 'VISIT-4042',
      title: 'Owa & Alex Isegh - Standard Clean',
      clientName: 'Owa & Alex Isegh',
      clientPhone: '(780) 555-3310',
      serviceAddress: '3112 119 St NW, Edmonton, AB',
      lat: 53.4650,
      lng: -113.5350,
      startAt: '2026-10-05T11:00:00-06:00',
      endAt: '2026-10-05T13:30:00-06:00',
      assignedCleaners: ['Cindy Guay'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4042',
    },
    // Tue Oct 6
    {
      id: 'vis-oct-06a',
      visitNumber: 'VISIT-4043',
      title: 'Ian Peters - Move-Out Inspection',
      clientName: 'Ian Peters',
      clientPhone: '(780) 555-3124',
      serviceAddress: '10620 98 Ave NW, Edmonton, AB',
      lat: 53.5360,
      lng: -113.5040,
      startAt: '2026-10-06T10:00:00-06:00',
      endAt: '2026-10-06T13:00:00-06:00',
      assignedCleaners: ['Joel MBATCHOU'],
      serviceType: 'Move-Out Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4043',
    },
    {
      id: 'vis-oct-06b',
      visitNumber: 'VISIT-4044',
      title: 'Sarge & Regan - Interior Detail',
      clientName: 'Sarge & Regan',
      clientPhone: '(780) 555-8812',
      serviceAddress: '15403 75 Ave NW, Edmonton, AB',
      lat: 53.5100,
      lng: -113.5880,
      startAt: '2026-10-06T10:00:00-06:00',
      endAt: '2026-10-06T12:30:00-06:00',
      assignedCleaners: ['Neth & Carmen'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4044',
    },
    // Wed Oct 7
    {
      id: 'vis-oct-07a',
      visitNumber: 'VISIT-4045',
      title: 'gail - Standard Home Clean',
      clientName: 'gail',
      clientPhone: '(780) 555-4190',
      serviceAddress: '11405 80 Ave NW, Edmonton, AB',
      lat: 53.5160,
      lng: -113.5250,
      startAt: '2026-10-07T10:00:00-06:00',
      endAt: '2026-10-07T12:30:00-06:00',
      assignedCleaners: ['Robyn Adele'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4045',
    },
    {
      id: 'vis-oct-07b',
      visitNumber: 'VISIT-4046',
      title: 'Suchi Jobanputra - Deep Clean',
      clientName: 'Suchi Jobanputra',
      clientPhone: '(780) 555-7634',
      serviceAddress: '4310 114a St NW, Edmonton, AB',
      lat: 53.4810,
      lng: -113.5240,
      startAt: '2026-10-07T10:00:00-06:00',
      endAt: '2026-10-07T13:00:00-06:00',
      assignedCleaners: ['Kilab'],
      serviceType: 'Deep Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4046',
    },
    // Thu Oct 8
    {
      id: 'vis-oct-08b',
      visitNumber: 'VISIT-4048',
      title: 'derek - Move In Order',
      clientName: 'derek',
      clientPhone: '(780) 555-2278',
      serviceAddress: '10915 110 Ave NW, Edmonton, AB',
      lat: 53.5560,
      lng: -113.5100,
      startAt: '2026-10-08T09:00:00-06:00',
      endAt: '2026-10-08T12:00:00-06:00',
      assignedCleaners: ['Jen & Bryan Cabugon'],
      serviceType: 'Move-Out Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4048',
    },
    {
      id: 'vis-oct-08c',
      visitNumber: 'VISIT-4049',
      title: 'Clare Gibson - Bi-weekly Detail',
      clientName: 'Clare Gibson',
      clientPhone: '(780) 555-9431',
      serviceAddress: '8910 148 St NW, Edmonton, AB',
      lat: 53.5230,
      lng: -113.5760,
      startAt: '2026-10-08T10:00:00-06:00',
      endAt: '2026-10-08T12:30:00-06:00',
      assignedCleaners: ['Melissa Clarke'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4049',
    },
    // Fri Oct 9
    // Mon Oct 12
    {
      id: 'vis-oct-12a',
      visitNumber: 'VISIT-4051',
      title: 'Owa & Alex Isegh - Standard Clean',
      clientName: 'Owa & Alex Isegh',
      clientPhone: '(780) 555-3310',
      serviceAddress: '3112 119 St NW, Edmonton, AB',
      lat: 53.4650,
      lng: -113.5350,
      startAt: '2026-10-12T11:00:00-06:00',
      endAt: '2026-10-12T13:30:00-06:00',
      assignedCleaners: ['Cindy Guay'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4051',
    },
    {
      id: 'vis-oct-12b',
      visitNumber: 'VISIT-4052',
      title: 'Deb Austin - Bi-weekly Clean',
      clientName: 'Deb Austin',
      clientPhone: '(780) 555-7788',
      serviceAddress: '10045 117 St NW, Edmonton, AB',
      lat: 53.5390,
      lng: -113.5240,
      startAt: '2026-10-12T17:00:00-06:00',
      endAt: '2026-10-12T19:30:00-06:00',
      assignedCleaners: ['Melissa Clarke'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4052',
    },
    // Tue Oct 13
    {
      id: 'vis-oct-13a',
      visitNumber: 'VISIT-4053',
      title: 'Brett & Ellie Kanuk - Bi-weekly',
      clientName: 'Brett & Ellie Kanuk',
      clientPhone: '(780) 555-4421',
      serviceAddress: '4904 141 Ave NW, Edmonton, AB',
      lat: 53.6040,
      lng: -113.4180,
      startAt: '2026-10-13T10:00:00-06:00',
      endAt: '2026-10-13T12:30:00-06:00',
      assignedCleaners: ['Jen & Bryan Cabugon'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4053',
    },
    // Wed Oct 14
    {
      id: 'vis-oct-14b',
      visitNumber: 'VISIT-4055',
      title: 'Adam Joly - bi-weekly Clean',
      clientName: 'Adam Joly',
      clientPhone: '(780) 555-9087',
      serviceAddress: '6812 112 Ave NW, Edmonton, AB',
      lat: 53.5640,
      lng: -113.4410,
      startAt: '2026-10-14T10:00:00-06:00',
      endAt: '2026-10-14T12:30:00-06:00',
      assignedCleaners: ['Melissa Clarke'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4055',
    },
    {
      id: 'vis-oct-14c',
      visitNumber: 'VISIT-4056',
      title: 'gail - Standard Home Clean',
      clientName: 'gail',
      clientPhone: '(780) 555-4190',
      serviceAddress: '11405 80 Ave NW, Edmonton, AB',
      lat: 53.5160,
      lng: -113.5250,
      startAt: '2026-10-14T10:00:00-06:00',
      endAt: '2026-10-14T12:30:00-06:00',
      assignedCleaners: ['Robyn Adele'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4056',
    },
    // Thu Oct 15
    {
      id: 'vis-oct-15a',
      visitNumber: 'VISIT-4057',
      title: 'Jacqueline Ares - Tandem Home Detail',
      clientName: 'Jacqueline Ares',
      clientPhone: '(780) 555-9988',
      serviceAddress: '14102 102 Ave NW, Edmonton, AB',
      lat: 53.5430,
      lng: -113.5650,
      startAt: '2026-10-15T09:30:00-06:00',
      endAt: '2026-10-15T12:30:00-06:00',
      assignedCleaners: ['Joel MBATCHOU', 'Sergine Ngongang wetie'], // Two cleaners
      serviceType: 'Deep Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4057',
    },
    // Fri Oct 16
    // Mon Oct 19
    {
      id: 'vis-oct-19a',
      visitNumber: 'VISIT-4059',
      title: 'Owa & Alex Isegh - Standard Clean',
      clientName: 'Owa & Alex Isegh',
      clientPhone: '(780) 555-3310',
      serviceAddress: '3112 119 St NW, Edmonton, AB',
      lat: 53.4650,
      lng: -113.5350,
      startAt: '2026-10-19T11:00:00-06:00',
      endAt: '2026-10-19T13:30:00-06:00',
      assignedCleaners: ['Cindy Guay'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4059',
    },
    {
      id: 'vis-oct-19b',
      visitNumber: 'VISIT-4060',
      title: 'Darcy - Standard Clean',
      clientName: 'Darcy',
      clientPhone: '(780) 555-7788',
      serviceAddress: '9812 144 St NW, Edmonton, AB',
      lat: 53.5380,
      lng: -113.5680,
      startAt: '2026-10-19T17:00:00-06:00',
      endAt: '2026-10-19T19:30:00-06:00',
      assignedCleaners: ['Melissa Clarke'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4060',
    },
    // Tue Oct 20
    {
      id: 'vis-oct-20a',
      visitNumber: 'VISIT-4061',
      title: 'Sarge & Regan - Interior Detail',
      clientName: 'Sarge & Regan',
      clientPhone: '(780) 555-8812',
      serviceAddress: '15403 75 Ave NW, Edmonton, AB',
      lat: 53.5100,
      lng: -113.5880,
      startAt: '2026-10-20T10:00:00-06:00',
      endAt: '2026-10-20T12:30:00-06:00',
      assignedCleaners: ['Neth & Carmen'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4061',
    },
    // Wed Oct 21
    {
      id: 'vis-oct-21a',
      visitNumber: 'VISIT-4062',
      title: 'gail - Standard Home Clean',
      clientName: 'gail',
      clientPhone: '(780) 555-4190',
      serviceAddress: '11405 80 Ave NW, Edmonton, AB',
      lat: 53.5160,
      lng: -113.5250,
      startAt: '2026-10-21T10:00:00-06:00',
      endAt: '2026-10-21T12:30:00-06:00',
      assignedCleaners: ['Robyn Adele'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4062',
    },
    {
      id: 'vis-oct-21b',
      visitNumber: 'VISIT-4063',
      title: 'Suchi Jobanputra - Deep Clean',
      clientName: 'Suchi Jobanputra',
      clientPhone: '(780) 555-7634',
      serviceAddress: '4310 114a St NW, Edmonton, AB',
      lat: 53.4810,
      lng: -113.5240,
      startAt: '2026-10-21T10:00:00-06:00',
      endAt: '2026-10-21T13:00:00-06:00',
      assignedCleaners: ['Kilab'],
      serviceType: 'Deep Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4063',
    },
    // Thu Oct 22
    {
      id: 'vis-oct-22b',
      visitNumber: 'VISIT-4065',
      title: 'Clare Gibson - Bi-weekly Detail',
      clientName: 'Clare Gibson',
      clientPhone: '(780) 555-9431',
      serviceAddress: '8910 148 St NW, Edmonton, AB',
      lat: 53.5230,
      lng: -113.5760,
      startAt: '2026-10-22T10:00:00-06:00',
      endAt: '2026-10-22T12:30:00-06:00',
      assignedCleaners: ['Melissa Clarke'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4065',
    },
    // Fri Oct 23
    {
      id: 'vis-oct-23b',
      visitNumber: 'VISIT-4067',
      title: 'Kati Luknowsky - Move-Out Detail',
      clientName: 'Kati Luknowsky',
      clientPhone: '(780) 555-4491',
      serviceAddress: '9710 142 St NW, Edmonton, AB',
      lat: 53.5350,
      lng: -113.5660,
      startAt: '2026-10-23T10:00:00-06:00',
      endAt: '2026-10-23T13:00:00-06:00',
      assignedCleaners: ['Joel MBATCHOU', 'Sergine Ngongang wetie'], // Two cleaners
      serviceType: 'Move-Out Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4067',
    },
    // Sat Oct 24
    {
      id: 'vis-oct-24a',
      visitNumber: 'VISIT-4068',
      title: 'Deb Austin - 1Bed Apartment',
      clientName: 'Deb Austin',
      clientPhone: '(780) 555-7712',
      serviceAddress: '10045 117 St NW, Edmonton, AB',
      lat: 53.5410,
      lng: -113.5220,
      startAt: '2026-10-24T10:00:00-06:00',
      endAt: '2026-10-24T12:00:00-06:00',
      assignedCleaners: ['Adison Haugland'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4068',
    },
    // Mon Oct 26
    {
      id: 'vis-oct-26a',
      visitNumber: 'VISIT-4069',
      title: 'Owa & Alex Isegh - Standard Clean',
      clientName: 'Owa & Alex Isegh',
      clientPhone: '(780) 555-3310',
      serviceAddress: '3112 119 St NW, Edmonton, AB',
      lat: 53.4650,
      lng: -113.5350,
      startAt: '2026-10-26T11:00:00-06:00',
      endAt: '2026-10-26T13:30:00-06:00',
      assignedCleaners: ['Cindy Guay'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4069',
    },
    // Tue Oct 27
    {
      id: 'vis-oct-27a',
      visitNumber: 'VISIT-4070',
      title: 'Brett & Ellie Kanuk - Bi-weekly',
      clientName: 'Brett & Ellie Kanuk',
      clientPhone: '(780) 555-4421',
      serviceAddress: '4904 141 Ave NW, Edmonton, AB',
      lat: 53.6040,
      lng: -113.4180,
      startAt: '2026-10-27T10:00:00-06:00',
      endAt: '2026-10-27T12:30:00-06:00',
      assignedCleaners: ['Jen & Bryan Cabugon'],
      serviceType: 'Standard Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4070',
    },
    // Wed Oct 28
    // Thu Oct 29
    {
      id: 'vis-oct-29b',
      visitNumber: 'VISIT-4072',
      title: 'Jacqueline Ares - Tandem Home Detail',
      clientName: 'Jacqueline Ares',
      clientPhone: '(780) 555-9988',
      serviceAddress: '14102 102 Ave NW, Edmonton, AB',
      lat: 53.5430,
      lng: -113.5650,
      startAt: '2026-10-29T09:30:00-06:00',
      endAt: '2026-10-29T12:30:00-06:00',
      assignedCleaners: ['Joel MBATCHOU', 'Sergine Ngongang wetie'], // Two cleaners
      serviceType: 'Deep Cleaning',
      status: 'SCHEDULED',
      jobberWebUri: 'https://secure.getjobber.com/visits/4072',
    },
    // Fri Oct 30
  ];

  // ----------------------------------------------------
  // Generate Past Months (August & September 2026)
  // and Future Months (November & December 2026)
  // ----------------------------------------------------
  const monthsToSeed = [
    { year: 2026, month: 8 },  // August 2026 (Past 2 months)
    { year: 2026, month: 9 },  // September 2026 (Past 1 month)
    { year: 2026, month: 11 }, // November 2026 (Forward 1 month)
    { year: 2026, month: 12 }, // December 2026 (Forward 2 months)
  ];

  const sampleClients = [
    { name: 'Owa & Alex Isegh', addr: '3112 119 St NW, Edmonton', cleaners: ['Cindy Guay'] },
    { name: 'Jacqueline Ares', addr: '14102 102 Ave NW, Edmonton', cleaners: ['Joel MBATCHOU', 'Sergine Ngongang wetie'] },
    { name: 'Brett & Ellie Kanuk', addr: '4904 141 Ave NW, Edmonton', cleaners: ['Jen & Bryan Cabugon'] },
    { name: 'Matthew Penkala', addr: '10920 84 Ave NW, Edmonton', cleaners: ['1 Joseph Juma'] },
    { name: 'Clare Gibson', addr: '8910 148 St NW, Edmonton', cleaners: ['Melissa Clarke'] },
    { name: 'Suchi Jobanputra', addr: '4310 114a St NW, Edmonton', cleaners: ['Kilab'] },
    { name: 'Sindhu Murugavel', addr: '12411 106 Ave NW, Edmonton', cleaners: ['N.Dinku'] },
    { name: 'Adam Joly', addr: '6812 112 Ave NW, Edmonton', cleaners: ['Joel MBATCHOU'] },
    { name: 'Sarge & Regan', addr: '15403 75 Ave NW, Edmonton', cleaners: ['Neth & Carmen'] },
    { name: 'Nicholas Christensen', addr: '9920 110 St NW, Edmonton', cleaners: ['Jasmin Kunin'] },
    { name: 'Chris Reaume', addr: '10712 84 Ave NW, Edmonton', cleaners: ['Robyn Adele'] },
    { name: 'Angie Moxam', addr: '8310 160 St NW, Edmonton', cleaners: ['Adison Haugland'] },
    { name: 'Brenda Lee', addr: '5110 122 St NW, Edmonton', cleaners: ['Cindy Guay'] },
    { name: 'Darcy', addr: '9812 144 St NW, Edmonton', cleaners: ['Sergine Ngongang wetie'] },
  ];

  let visitCounter = 4100;

  for (const m of monthsToSeed) {
    // Generate recurring visits on weekdays (Mon, Wed, Fri) throughout the month
    for (let day = 1; day <= 28; day++) {
      const d = new Date(Date.UTC(m.year, m.month - 1, day, 16, 0, 0));
      const dayOfWeek = d.getUTCDay(); // 0 is Sun, 6 is Sat
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        // Schedule 2 to 4 visits for this day
        const numVisits = (day % 3) + 2;
        for (let i = 0; i < numVisits; i++) {
          const clientTemplate = sampleClients[(day + i * 3) % sampleClients.length];
          const hour = 9 + (i * 2);
          const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
          const dayStr = day < 10 ? `0${day}` : `${day}`;
          const monthStr = m.month < 10 ? `0${m.month}` : `${m.month}`;

          visits.push({
            id: `vis-${m.year}-${monthStr}-${dayStr}-${i}`,
            visitNumber: `VISIT-${visitCounter++}`,
            title: `${clientTemplate.name} - Scheduled Clean`,
            clientName: clientTemplate.name,
            clientPhone: '(780) 555-0199',
            serviceAddress: `${clientTemplate.addr}, AB`,
            lat: 53.5200 + (day % 10) * 0.01 - 0.05,
            lng: -113.5000 + (i % 5) * 0.02 - 0.05,
            startAt: `${m.year}-${monthStr}-${dayStr}T${hourStr}:00:00-06:00`,
            endAt: `${m.year}-${monthStr}-${dayStr}T${hour + 2}:30:00-06:00`,
            assignedCleaners: clientTemplate.cleaners,
            serviceType: i === 0 ? 'Standard Cleaning' : i === 1 ? 'Deep Cleaning' : 'Move-Out Cleaning',
            status: m.month < 10 ? 'COMPLETED' : 'SCHEDULED',
            jobberWebUri: `https://secure.getjobber.com/visits/${visitCounter}`,
            notes: `Synced from Jobber. Team assignment: ${clientTemplate.cleaners.join(' & ')}`,
            quoteNumber: `QT-${2000 + (visitCounter % 250)}`,
            quoteTotal: i === 0 ? 220 : i === 1 ? 340 : 420,
            quoteStatus: 'APPROVED',
            invoiceNumber: `INV-${4000 + (visitCounter % 350)}`,
            invoiceTotal: i === 0 ? 220 : i === 1 ? 340 : 420,
            invoiceStatus: m.month < 10 ? 'PAID' : 'AWAITING_PAYMENT',
          });
        }
      }
    }
  }

  return visits;
}

export interface UnscheduledJobItem {
  id: string;
  jobNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceAddress: string;
  serviceType: 'Standard Cleaning' | 'Deep Cleaning' | 'Move-Out Cleaning';
  totalAmount: number;
  status: 'UNSCHEDULED' | 'APPROVED' | 'SCHEDULED';
  requestedWindow: string;
  preferredCleaners?: string[];
  assignedCleaners?: string[];
  scheduledDate?: string;
  scheduledTime?: string;
  notes?: string;
  jobberWebUri: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  createdAt: string;
  approvedAt?: string;
}

export const INITIAL_UNSCHEDULED_JOBS: UnscheduledJobItem[] = [];

/**
 * Jobber Quotes spanning 60 days back (August & September 2026),
 * current month (October 2026), and 60 days forward (November & December 2026)
 */
export function generateJobberQuotes(): JobberQuote[] {
  const quotes: JobberQuote[] = [
    // October 2026 (Current)
    {
      id: 'qt-2041',
      quoteNumber: 'QT-2041',
      clientName: 'Matthew Penkala',
      clientPhone: '(780) 555-8912',
      serviceAddress: '10920 84 Ave NW, Edmonton, AB',
      service: 'Standard Maintenance Clean',
      quoteStatus: 'APPROVED',
      total: 240.0,
      depositRequired: 50.0,
      createdAt: '2026-09-25T11:00:00-06:00',
      scheduledDate: '2026-10-02',
      scheduledTime: '10:00 AM',
      jobberWebUri: 'https://secure.getjobber.com/quotes/2041',
      notes: 'Approved via Jobber Client Hub. Regular bi-weekly schedule request.',
      lineItems: [
        { description: 'Standard Residential Clean (2 Bed / 2 Bath)', quantity: 1, unitPrice: 200.0, total: 200.0 },
        { description: 'Pet Eco-Safe Sanitizer Treatment', quantity: 1, unitPrice: 40.0, total: 40.0 },
      ],
    },
    {
      id: 'qt-2042',
      quoteNumber: 'QT-2042',
      clientName: 'Jacqueline Ares',
      clientPhone: '(780) 555-9988',
      serviceAddress: '14102 102 Ave NW, Edmonton, AB',
      service: 'Tandem Home Detail Clean',
      quoteStatus: 'APPROVED',
      total: 380.0,
      depositRequired: 100.0,
      createdAt: '2026-09-29T14:22:00-06:00',
      scheduledDate: '2026-10-05',
      scheduledTime: '11:00 AM',
      jobberWebUri: 'https://secure.getjobber.com/quotes/2042',
      notes: 'Jobber Client Hub booking. Regular bi-weekly schedule request.',
      lineItems: [
        { description: 'Deep Cleaning (3 Bed / 2 Bath)', quantity: 1, unitPrice: 300.0, total: 300.0 },
        { description: 'Interior Appliance Detailing', quantity: 1, unitPrice: 80.0, total: 80.0 },
      ],
    },
    {
      id: 'qt-2045',
      quoteNumber: 'QT-2045',
      clientName: 'Sindhu Murugavel',
      clientPhone: '(780) 555-4309',
      serviceAddress: '12411 106 Ave NW, Edmonton, AB',
      service: 'Deep Cleaning',
      quoteStatus: 'APPROVED',
      total: 450.0,
      depositRequired: 100.0,
      createdAt: '2026-09-30T09:15:00-06:00',
      scheduledDate: '2026-10-08',
      scheduledTime: '09:00 AM',
      jobberWebUri: 'https://secure.getjobber.com/quotes/2045',
      notes: 'Full house deep scrub with sanitization.',
      lineItems: [
        { description: 'Deep Clean Package', quantity: 1, unitPrice: 370.0, total: 370.0 },
        { description: 'Window Interior & Track Steam', quantity: 1, unitPrice: 80.0, total: 80.0 },
      ],
    },
    {
      id: 'qt-2048',
      quoteNumber: 'QT-2048',
      clientName: 'Adam Joly',
      clientPhone: '(780) 555-6611',
      serviceAddress: '6812 112 Ave NW, Edmonton, AB',
      service: 'Bi-Weekly Clean',
      quoteStatus: 'APPROVED',
      total: 220.0,
      depositRequired: 50.0,
      createdAt: '2026-10-01T15:30:00-06:00',
      scheduledDate: '2026-10-12',
      scheduledTime: '01:00 PM',
      jobberWebUri: 'https://secure.getjobber.com/quotes/2048',
      notes: 'Regular bi-weekly residential maintenance.',
      lineItems: [
        { description: 'Bi-Weekly Maintenance Clean', quantity: 1, unitPrice: 220.0, total: 220.0 },
      ],
    },
    {
      id: 'qt-2051',
      quoteNumber: 'QT-2051',
      clientName: 'Clare Gibson',
      clientPhone: '(780) 555-3184',
      serviceAddress: '8910 148 St NW, Edmonton, AB',
      service: 'Move-Out Clean',
      quoteStatus: 'APPROVED',
      total: 310.0,
      depositRequired: 100.0,
      createdAt: '2026-10-01T09:10:00-06:00',
      scheduledDate: '2026-10-15',
      scheduledTime: '09:30 AM',
      jobberWebUri: 'https://secure.getjobber.com/quotes/2051',
      notes: 'Move-out turnover service with baseboards and appliances.',
      lineItems: [
        { description: 'Move-Out Scrub Package', quantity: 1, unitPrice: 310.0, total: 310.0 },
      ],
    },
    {
      id: 'qt-2055',
      quoteNumber: 'QT-2055',
      clientName: 'Suchi Jobanputra',
      clientPhone: '(780) 555-5201',
      serviceAddress: '4310 114a St NW, Edmonton, AB',
      service: 'Standard Maintenance Clean',
      quoteStatus: 'APPROVED',
      total: 290.0,
      depositRequired: 50.0,
      createdAt: '2026-10-01T09:30:00-06:00',
      scheduledDate: '2026-10-23',
      scheduledTime: '02:00 PM',
      jobberWebUri: 'https://secure.getjobber.com/quotes/2055',
      notes: 'Standard bi-weekly clean.',
      lineItems: [
        { description: 'Standard Residential Clean', quantity: 1, unitPrice: 290.0, total: 290.0 },
      ],
    },
  ];

  // Seed August 2026 (-60 days) and September 2026 (-30 days) Quotes
  const pastMonths = [
    { year: 2026, month: '08', days: [4, 11, 18, 25], status: 'CONVERTED' as const },
    { year: 2026, month: '09', days: [2, 8, 15, 22, 29], status: 'CONVERTED' as const },
  ];

  let quoteIdx = 2001;
  const sampleNames = [
    { name: 'Owa & Alex Isegh', addr: '3112 119 St NW, Edmonton', amt: 260, s: 'Standard Clean' },
    { name: 'Jacqueline Ares', addr: '14102 102 Ave NW, Edmonton', amt: 380, s: 'Deep Cleaning' },
    { name: 'Brett & Ellie Kanuk', addr: '4904 141 Ave NW, Edmonton', amt: 240, s: 'Bi-Weekly Clean' },
    { name: 'Clare Gibson', addr: '8910 148 St NW, Edmonton', amt: 310, s: 'Move-Out Clean' },
    { name: 'Suchi Jobanputra', addr: '4310 114a St NW, Edmonton', amt: 290, s: 'Standard Clean' },
    { name: 'Sindhu Murugavel', addr: '12411 106 Ave NW, Edmonton', amt: 450, s: 'Deep Clean' },
    { name: 'Adam Joly', addr: '6812 112 Ave NW, Edmonton', amt: 220, s: 'Bi-Weekly Clean' },
  ];

  for (const pm of pastMonths) {
    pm.days.forEach((day, i) => {
      const sample = sampleNames[(day + i) % sampleNames.length];
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      quotes.push({
        id: `qt-${pm.year}-${pm.month}-${dayStr}`,
        quoteNumber: `QT-${quoteIdx++}`,
        clientName: sample.name,
        clientPhone: '(780) 555-0144',
        serviceAddress: sample.addr,
        service: sample.s,
        quoteStatus: pm.status,
        total: sample.amt,
        depositRequired: 50,
        createdAt: `${pm.year}-${pm.month}-${dayStr}T09:00:00-06:00`,
        scheduledDate: `${pm.year}-${pm.month}-${dayStr}`,
        scheduledTime: '10:00 AM',
        jobberWebUri: `https://secure.getjobber.com/quotes/${quoteIdx}`,
        notes: `Historic Jobber quote successfully approved and converted into visit.`,
      });
    });
  }

  // Seed November 2026 (+30 days) and December 2026 (+60 days) Quotes
  const futureMonths = [
    { year: 2026, month: '11', days: [3, 10, 17, 24] },
    { year: 2026, month: '12', days: [1, 8, 15, 22] },
  ];

  for (const fm of futureMonths) {
    fm.days.forEach((day, i) => {
      const sample = sampleNames[(day + i * 2) % sampleNames.length];
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const status: 'APPROVED' | 'AWAITING_RESPONSE' = i % 2 === 0 ? 'APPROVED' : 'AWAITING_RESPONSE';
      quotes.push({
        id: `qt-${fm.year}-${fm.month}-${dayStr}`,
        quoteNumber: `QT-${quoteIdx++}`,
        clientName: sample.name,
        clientPhone: '(780) 555-0144',
        serviceAddress: sample.addr,
        service: sample.s,
        quoteStatus: status,
        total: sample.amt + 20,
        depositRequired: 50,
        createdAt: `${fm.year}-${fm.month}-${dayStr}T09:00:00-06:00`,
        scheduledDate: `${fm.year}-${fm.month}-${dayStr}`,
        scheduledTime: i % 2 === 0 ? '11:00 AM' : '02:00 PM',
        jobberWebUri: `https://secure.getjobber.com/quotes/${quoteIdx}`,
        notes: `Forward pipeline quote for ${fm.month === '11' ? 'November' : 'December'} 2026 scheduling.`,
      });
    });
  }

  return quotes;
}

/**
 * Jobber Invoices spanning 60 days back (August & September 2026),
 * current month (October 2026), and 60 days forward (November & December 2026)
 */
export function generateJobberInvoices(): JobberInvoice[] {
  const invoices: JobberInvoice[] = [
    // Current October 2026 Invoices
    {
      id: 'inv-4028',
      invoiceNumber: 'INV-4028',
      clientName: 'Matthew Penkala',
      clientPhone: '(780) 555-8912',
      serviceAddress: '10920 84 Ave NW, Edmonton, AB',
      service: 'Standard Maintenance Clean',
      invoiceStatus: 'PAID',
      total: 240.0,
      balance: 0.0,
      issuedDate: '2026-10-02',
      dueDate: '2026-10-16',
      scheduledTime: '01:00 PM',
      jobberWebUri: 'https://secure.getjobber.com/invoices/4028',
      notes: 'Paid via Jobber Payments with Visa ending in 4119.',
      lineItems: [
        { description: 'Standard Residential Clean (2 Bed / 2 Bath)', quantity: 1, unitPrice: 200.0, total: 200.0 },
        { description: 'Pet Eco-Safe Sanitizer Treatment', quantity: 1, unitPrice: 40.0, total: 40.0 },
      ],
    },
    {
      id: 'inv-4029',
      invoiceNumber: 'INV-4029',
      clientName: 'Owa & Alex Isegh',
      clientPhone: '(780) 555-2341',
      serviceAddress: '3112 119 St NW, Edmonton, AB',
      service: 'Bi-Weekly Maintenance Clean',
      invoiceStatus: 'PAID',
      total: 220.0,
      balance: 0.0,
      issuedDate: '2026-10-02',
      dueDate: '2026-10-16',
      scheduledTime: '03:30 PM',
      jobberWebUri: 'https://secure.getjobber.com/invoices/4029',
      notes: 'Automated card-on-file payment processed in Jobber.',
    },
    {
      id: 'inv-4033',
      invoiceNumber: 'INV-4033',
      clientName: 'Jacqueline Ares',
      clientPhone: '(780) 555-9988',
      serviceAddress: '14102 102 Ave NW, Edmonton, AB',
      service: 'Tandem Home Detail Clean',
      invoiceStatus: 'AWAITING_PAYMENT',
      total: 380.0,
      balance: 380.0,
      issuedDate: '2026-10-05',
      dueDate: '2026-10-19',
      scheduledTime: '10:00 AM',
      jobberWebUri: 'https://secure.getjobber.com/invoices/4033',
      notes: 'Invoice sent via email with 1-click Pay Now link.',
    },
    {
      id: 'inv-4038',
      invoiceNumber: 'INV-4038',
      clientName: 'Sindhu Murugavel',
      clientPhone: '(780) 555-4309',
      serviceAddress: '12411 106 Ave NW, Edmonton, AB',
      service: 'Deep Cleaning',
      invoiceStatus: 'AWAITING_PAYMENT',
      total: 450.0,
      balance: 450.0,
      issuedDate: '2026-10-08',
      dueDate: '2026-10-22',
      scheduledTime: '11:30 AM',
      jobberWebUri: 'https://secure.getjobber.com/invoices/4038',
      notes: 'Deep cleaning invoice sent via Jobber Payments.',
    },
    {
      id: 'inv-4042',
      invoiceNumber: 'INV-4042',
      clientName: 'Brett & Ellie Kanuk',
      clientPhone: '(780) 555-4421',
      serviceAddress: '4904 141 Ave NW, Edmonton, AB',
      service: 'Bi-Weekly Residential Clean',
      invoiceStatus: 'PAID',
      total: 240.0,
      balance: 0.0,
      issuedDate: '2026-10-12',
      dueDate: '2026-10-26',
      scheduledTime: '02:00 PM',
      jobberWebUri: 'https://secure.getjobber.com/invoices/4042',
      notes: 'Card on file debited.',
    },
    {
      id: 'inv-4045',
      invoiceNumber: 'INV-4045',
      clientName: 'Clare Gibson',
      clientPhone: '(780) 555-3184',
      serviceAddress: '8910 148 St NW, Edmonton, AB',
      service: 'Move-Out Clean',
      invoiceStatus: 'AWAITING_PAYMENT',
      total: 310.0,
      balance: 210.0, // deposit already paid
      issuedDate: '2026-10-16',
      dueDate: '2026-10-30',
      scheduledTime: '04:00 PM',
      jobberWebUri: 'https://secure.getjobber.com/invoices/4045',
      notes: '$100 deposit deducted. Remaining $210 balance awaiting payment.',
    },
  ];

  // Seed August & September 2026 Paid Invoices (-60 & -30 days)
  const pastMonths = [
    { year: 2026, month: '08', days: [5, 12, 19, 26] },
    { year: 2026, month: '09', days: [3, 9, 16, 23, 30] },
  ];

  let invIdx = 3980;
  const sampleClients = [
    { name: 'Adam Joly', addr: '6812 112 Ave NW, Edmonton', amt: 220 },
    { name: 'Suchi Jobanputra', addr: '4310 114a St NW, Edmonton', amt: 290 },
    { name: 'Sindhu Murugavel', addr: '12411 106 Ave NW, Edmonton', amt: 450 },
    { name: 'Clare Gibson', addr: '8910 148 St NW, Edmonton', amt: 310 },
    { name: 'Angie Moxam', addr: '8310 160 St NW, Edmonton', amt: 250 },
    { name: 'Brenda Lee', addr: '5110 122 St NW, Edmonton', amt: 275 },
    { name: 'Sarge & Regan', addr: '15403 75 Ave NW, Edmonton', amt: 340 },
  ];

  for (const pm of pastMonths) {
    pm.days.forEach((day, i) => {
      const sample = sampleClients[(day + i) % sampleClients.length];
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      invoices.push({
        id: `inv-${pm.year}-${pm.month}-${dayStr}`,
        invoiceNumber: `INV-${invIdx++}`,
        clientName: sample.name,
        clientPhone: '(780) 555-0188',
        serviceAddress: sample.addr,
        service: 'Completed Residential Clean',
        invoiceStatus: 'PAID',
        total: sample.amt,
        balance: 0,
        issuedDate: `${pm.year}-${pm.month}-${dayStr}`,
        dueDate: `${pm.year}-${pm.month}-${dayStr}`,
        scheduledTime: '01:00 PM',
        jobberWebUri: `https://secure.getjobber.com/invoices/${invIdx}`,
        notes: 'Payment collected and deposited in Jobber account.',
      });
    });
  }

  // Seed November & December 2026 Invoices (+30 & +60 days)
  const futureMonths = [
    { year: 2026, month: '11', days: [4, 11, 18, 25] },
    { year: 2026, month: '12', days: [2, 9, 16, 23] },
  ];

  for (const fm of futureMonths) {
    fm.days.forEach((day, i) => {
      const sample = sampleClients[(day + i * 2) % sampleClients.length];
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const status: 'PAID' | 'AWAITING_PAYMENT' = i % 2 === 0 ? 'AWAITING_PAYMENT' : 'PAID';
      invoices.push({
        id: `inv-${fm.year}-${fm.month}-${dayStr}`,
        invoiceNumber: `INV-${invIdx++}`,
        clientName: sample.name,
        clientPhone: '(780) 555-0188',
        serviceAddress: sample.addr,
        service: 'Scheduled Service Clean',
        invoiceStatus: status,
        total: sample.amt,
        balance: status === 'PAID' ? 0 : sample.amt,
        issuedDate: `${fm.year}-${fm.month}-${dayStr}`,
        dueDate: `${fm.year}-${fm.month}-${Math.min(28, day + 14)}`,
        scheduledTime: '02:30 PM',
        jobberWebUri: `https://secure.getjobber.com/invoices/${invIdx}`,
        notes: `Forward recurring billing in Jobber for ${sample.name}.`,
      });
    });
  }

  return invoices;
}

export const INITIAL_JOBBER_QUOTES: JobberQuote[] = generateJobberQuotes();
export const INITIAL_JOBBER_INVOICES: JobberInvoice[] = generateJobberInvoices();


