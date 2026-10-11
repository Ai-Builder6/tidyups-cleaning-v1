import { Technician, TechnicianStatus } from '../types/dispatch';
import { AppUser, AppUserRole } from '../types/authAndChat';
import { CLEANER_COLOR_MAP, getCleanerColor } from '../data/jobberCalendarData';

export interface JobberStaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Owner' | 'Dispatcher' | 'Cleaner';
  lead: boolean;
  active: boolean;
  homeAddress: string;
  color: string;
  vanUnit: string;
  lat: number;
  lng: number;
}

// Canonical default color palette for staff members
const DEFAULT_PALETTE = [
  '#2563EB', '#7C3AED', '#059669', '#D97706', '#0891B2',
  '#EC4899', '#10B981', '#6366F1', '#F59E0B', '#14B8A6',
  '#8B5CF6', '#3B82F6', '#06B6D4', '#F43F5E', '#4F46E5',
  '#84CC16', '#D946EF', '#FB7185', '#9333EA', '#E11D48'
];

// Edmonton neighborhood coordinates mapping for known addresses
export function approximateEdmontonCoords(address: string): { lat: number; lng: number } {
  const addr = address.toLowerCase();
  if (addr.includes('chappelle')) return { lat: 53.4184, lng: -113.5786 };
  if (addr.includes('chivers')) return { lat: 53.4150, lng: -113.5720 };
  if (addr.includes('charlesworth') || addr.includes('1 avenue southwest') || addr.includes('1 ave sw')) return { lat: 53.4285, lng: -113.4350 };
  if (addr.includes('saddleback') || addr.includes('keheewin')) return { lat: 53.4680, lng: -113.5280 };
  if (addr.includes('120 st') || addr.includes('oliver')) return { lat: 53.5435, lng: -113.5285 };
  if (addr.includes('139 ave') || addr.includes('clareview')) return { lat: 53.6025, lng: -113.4010 };
  if (addr.includes('ambleside') || addr.includes('windermere')) return { lat: 53.4350, lng: -113.5950 };
  if (addr.includes('knottwood') || addr.includes('mill woods')) return { lat: 53.4540, lng: -113.4350 };
  if (addr.includes('109 st') || addr.includes('central')) return { lat: 53.5525, lng: -113.5085 };
  if (addr.includes('208 st') || addr.includes('secord')) return { lat: 53.5310, lng: -113.6820 };
  if (addr.includes('17115 61 ave') || addr.includes('callingwood')) return { lat: 53.4980, lng: -113.6180 };
  if (addr.includes('17908 61 ave') || addr.includes('dechene')) return { lat: 53.4975, lng: -113.6310 };
  if (addr.includes('103 st') || addr.includes('westwood')) return { lat: 53.5780, lng: -113.4980 };
  if (addr.includes('155 ave') || addr.includes('lorelei')) return { lat: 53.6175, lng: -113.5040 };
  if (addr.includes('58 ave') || addr.includes('hamptons')) return { lat: 53.4940, lng: -113.6680 };
  if (addr.includes('154 st') || addr.includes('jasper park')) return { lat: 53.5350, lng: -113.5870 };
  if (addr.includes('156 st') || addr.includes('meadowlark')) return { lat: 53.5220, lng: -113.5910 };
  if (addr.includes('82 ave') || addr.includes('strathcona') || addr.includes('whyte')) return { lat: 53.5180, lng: -113.5100 };
  if (addr.includes('92a ave') || addr.includes('laurier')) return { lat: 53.5285, lng: -113.5680 };
  if (addr.includes('112 ave') || addr.includes('highlands')) return { lat: 53.5650, lng: -113.4210 };
  if (addr.includes('76 ave') || addr.includes('belgravia') || addr.includes('university')) return { lat: 53.5130, lng: -113.5230 };
  
  // Default to central Edmonton with slight deterministic jitter based on address length
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    lat: 53.5200 + ((hash % 100) / 1000 - 0.05),
    lng: -113.5000 + (((hash * 13) % 100) / 1000 - 0.05),
  };
}

export const CANONICAL_JOBBER_STAFF: JobberStaffMember[] = [
  {
    id: 'staff-1',
    name: 'Boss iPad Pro 《iPhone》',
    email: 'cleaningserviceyeg@gmail.com',
    phone: '(780) 718-5092',
    role: 'Dispatcher',
    lead: false,
    active: true,
    homeAddress: '8306 Chappelle Way Southwest, Edmonton, AB, Canada T6W4L3',
    color: '#EC4899',
    vanUnit: 'Executive HQ',
    lat: 53.4184,
    lng: -113.5786,
  },
  {
    id: 'staff-2',
    name: 'Richard "Owner Account"',
    email: 'support@bookmycleaning.net',
    phone: '(780) 718-5092',
    role: 'Owner',
    lead: false,
    active: true,
    homeAddress: '8306 Chappelle Way Southwest, Edmonton, AB, Canada T6W4L3',
    color: '#7C3AED',
    vanUnit: 'Executive HQ',
    lat: 53.4184,
    lng: -113.5786,
  },
  {
    id: 'staff-3',
    name: '1 Joseph Juma',
    email: 'baraka.cleaningservices95@gmail.com',
    phone: '(780) 267-3472',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '3751 139 Ave NW, Edmonton, AB T5Y 3J5',
    color: '#0891B2',
    vanUnit: 'Unit 5',
    lat: 53.6025,
    lng: -113.4010,
  },
  {
    id: 'staff-4',
    name: 'Adison Haugland',
    email: 'hauglandadison@gmail.com',
    phone: '(780) 554-2851',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '10231 120 St NW, Edmonton, AB T5K 2A4',
    color: '#D97706',
    vanUnit: 'Unit 4',
    lat: 53.5435,
    lng: -113.5285,
  },
  {
    id: 'staff-5',
    name: 'Cindy Guay',
    email: 'cindybg@live.ca',
    phone: '(780) 863-0896',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '740 Knottwood Rd S Northwest, Edmonton, AB T6K 1W5',
    color: '#10B981',
    vanUnit: 'Unit 7',
    lat: 53.4540,
    lng: -113.4350,
  },
  {
    id: 'staff-6',
    name: 'Dominic Mancini',
    email: 'mittens45dm@gmail.com',
    phone: '(587) 385-8329',
    role: 'Dispatcher',
    lead: true,
    active: true,
    homeAddress: '9722 154 St, Edmonton, AB T5P 2G3',
    color: '#4F46E5',
    vanUnit: 'Unit 15 (Lead Mobile)',
    lat: 53.5350,
    lng: -113.5870,
  },
  {
    id: 'staff-7',
    name: 'Jasmin Kunin',
    email: 'kuninjasmin@gmail.com',
    phone: '(780) 802-3373',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '10740 109 St NW, Edmonton, AB T5H 3B6',
    color: '#6366F1',
    vanUnit: 'Unit 8',
    lat: 53.5525,
    lng: -113.5085,
  },
  {
    id: 'staff-8',
    name: 'Jen & Bryan Cabugon',
    email: 'cedi.cleans@gmail.com',
    phone: '(825) 888-3251',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '9434 208 St NW, Edmonton, AB T5T 5X9',
    color: '#F59E0B',
    vanUnit: 'Unit 9 (Team)',
    lat: 53.5310,
    lng: -113.6820,
  },
  {
    id: 'staff-9',
    name: 'Joel MBATCHOU',
    email: 'mbatchoujoakim@yahoo.fr',
    phone: '(587) 937-9408',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '17908 61 Ave NW, Edmonton, AB T6M 1T1',
    color: '#8B5CF6',
    vanUnit: 'Unit 11',
    lat: 53.4975,
    lng: -113.6310,
  },
  {
    id: 'staff-10',
    name: 'Kilab',
    email: 'kffsfacilityservice10@gmail.com',
    phone: '(647) 466-4476',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '12219 103 St NW, Edmonton, AB T5G 2K2',
    color: '#3B82F6',
    vanUnit: 'Unit 12',
    lat: 53.5780,
    lng: -113.4980,
  },
  {
    id: 'staff-11',
    name: 'Melissa Clarke',
    email: 'clarkemelissa2025@gmail.com',
    phone: '(780) 954-2409',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '7221 Chivers Pl SW, Edmonton, AB, Canada T6W4L4',
    color: '#2563EB',
    vanUnit: 'Unit 1',
    lat: 53.4150,
    lng: -113.5720,
  },
  {
    id: 'staff-12',
    name: 'N.Dinku',
    email: 'bultoefa@gmail.com',
    phone: '(587) 500-7911',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '10408 155 Ave NW, Edmonton, AB T5X 4G6',
    color: '#06B6D4',
    vanUnit: 'Unit 13',
    lat: 53.6175,
    lng: -113.5040,
  },
  {
    id: 'staff-13',
    name: 'Neth & Carmen',
    email: 'nhettemcarmen@yahoo.com',
    phone: '(780) 729-2031',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '20123 58 Ave NW, Edmonton, AB T6M 0B5',
    color: '#F43F5E',
    vanUnit: 'Unit 14 (Team)',
    lat: 53.4940,
    lng: -113.6680,
  },
  {
    id: 'staff-14',
    name: 'Robyn Adele',
    email: 'robynkierstead@hotmail.com',
    phone: '(780) 660-0681',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '574 Saddleback Rd NW, Edmonton, AB T6J 4Z3',
    color: '#059669',
    vanUnit: 'Unit 3',
    lat: 53.4680,
    lng: -113.5280,
  },
  {
    id: 'staff-15',
    name: 'Sergine Ngongang wetie',
    email: 'tatiwetie@gmail.com',
    phone: '(418) 261-4689',
    role: 'Cleaner',
    lead: false,
    active: true,
    homeAddress: '17115 61 Ave NW, Edmonton, AB',
    color: '#D946EF',
    vanUnit: 'Unit 10',
    lat: 53.4980,
    lng: -113.6180,
  },
];

/**
 * Robust CSV Parser that handles quoted strings with commas and multiline addresses
 */
export function parseStaffCsv(csvText: string): JobberStaffMember[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++; // skip \r\n
      }
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  if (lines.length < 2) return CANONICAL_JOBBER_STAFF;

  // Header inspection
  const headerParts = splitCsvRow(lines[0]);
  const nameIdx = headerParts.findIndex(h => /name/i.test(h));
  const emailIdx = headerParts.findIndex(h => /email/i.test(h));
  const phoneIdx = headerParts.findIndex(h => /phone/i.test(h));
  const roleIdx = headerParts.findIndex(h => /role/i.test(h));
  const leadIdx = headerParts.findIndex(h => /lead/i.test(h));
  const activeIdx = headerParts.findIndex(h => /active/i.test(h));
  const addrIdx = headerParts.findIndex(h => /address/i.test(h));

  const result: JobberStaffMember[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvRow(lines[i]);
    if (row.length === 0 || !row[nameIdx >= 0 ? nameIdx : 0]) continue;

    const rawName = (row[nameIdx >= 0 ? nameIdx : 0] || '').trim();
    if (!rawName) continue;

    const email = (row[emailIdx >= 0 ? emailIdx : 1] || '').trim();
    const phone = (row[phoneIdx >= 0 ? phoneIdx : 2] || '').trim();
    const rawRole = (row[roleIdx >= 0 ? roleIdx : 3] || 'Cleaner').trim();
    const rawLead = (row[leadIdx >= 0 ? leadIdx : 4] || 'No').trim();
    const rawActive = (row[activeIdx >= 0 ? activeIdx : 5] || 'Yes').trim();
    const homeAddress = (row[addrIdx >= 0 ? addrIdx : 6] || 'Edmonton, AB').trim();

    let role: 'Owner' | 'Dispatcher' | 'Cleaner' = 'Cleaner';
    if (/owner/i.test(rawRole) || /director/i.test(rawRole)) role = 'Owner';
    else if (/dispatcher/i.test(rawRole) || /dispatch/i.test(rawRole)) role = 'Dispatcher';

    const lead = /yes|true|1/i.test(rawLead);
    const active = !/no|false|0/i.test(rawActive);

    const color = CLEANER_COLOR_MAP[rawName] || DEFAULT_PALETTE[(i - 1) % DEFAULT_PALETTE.length];
    const coords = approximateEdmontonCoords(homeAddress);

    // Extract unit number if found in name or assign standard Unit #
    let vanUnit = `Unit ${i}`;
    if (role === 'Owner') vanUnit = 'Executive HQ';
    else if (rawName.includes('Boss iPad')) vanUnit = 'HQ Ops 1';
    else if (rawName.includes('Richard')) vanUnit = 'HQ Ops 2';
    else if (rawName.includes('Dominic')) vanUnit = 'Unit 15 (Lead Mobile)';
    else if (rawName.includes('Team')) vanUnit = `Unit ${i} (Team)`;

    result.push({
      id: `staff-${i}`,
      name: rawName,
      email,
      phone,
      role,
      lead,
      active,
      homeAddress,
      color,
      vanUnit,
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  return result.length > 0 ? result : CANONICAL_JOBBER_STAFF;
}

/**
 * Splits a CSV row respecting double quotes
 */
function splitCsvRow(rowText: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    if (char === '"') {
      if (inQuotes && rowText[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Converts staff array back into canonical CSV string
 */
export function generateStaffCsv(staffList: JobberStaffMember[]): string {
  const headers = ['Name', 'Email', 'Phone', 'Role', 'Lead', 'Active', 'Home Address'];
  const rows = staffList.map(s => {
    const safeName = s.name.includes(',') ? `"${s.name}"` : s.name;
    const safeAddr = `"${s.homeAddress.replace(/"/g, '""')}"`;
    return [
      safeName,
      s.email,
      s.phone,
      s.role,
      s.lead ? 'Yes' : 'No',
      s.active ? 'Yes' : 'No',
      safeAddr
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Converts a JobberStaffMember to Dispatcher Technician interface for Map & Kanban
 */
export function staffMemberToTechnician(staff: JobberStaffMember, index: number): Technician {
  return {
    id: `cleaner-${index + 1}`,
    name: staff.name,
    vanNumber: staff.vanUnit || `Unit ${index + 1}`,
    phone: staff.phone,
    email: staff.email,
    role: staff.role === 'Dispatcher' ? 'Dispatcher / Mobile Lead' : staff.role,
    homeAddress: staff.homeAddress,
    color: staff.color || getCleanerColor(staff.name),
    active: staff.active !== false,
    status: staff.active ? 'AVAILABLE' : 'OFF_DUTY',
    rating: 5.0,
    skills: ['Standard Cleaning', 'Deep Cleaning', 'Move-Out Cleaning', 'Sanitization'],
    certifications: ['Certified Residential Cleaner', 'WHMIS Certified'],
    experienceYears: 5,
    currentLocation: {
      lat: staff.lat,
      lng: staff.lng,
      address: staff.homeAddress,
      city: 'Edmonton',
    },
    depotLocation: {
      lat: staff.lat,
      lng: staff.lng,
      name: `${staff.name.split(' ')[0]} Home Hub`,
      address: staff.homeAddress,
    },
    assignedTicketIds: [],
    shiftCapacityHours: 8,
    completedJobsCount: 0,
    partsInventory: [],
  };
}

/**
 * Converts JobberStaffMember to AppUser for Auth and Team Chat
 */
export function staffMemberToAppUser(staff: JobberStaffMember, index: number): AppUser {
  let appRole: AppUserRole = 'CLEANER';
  if (staff.role === 'Owner') appRole = 'OWNER';
  else if (staff.role === 'Dispatcher') appRole = 'DISPATCHER';

  return {
    id: `user-${staff.role.toLowerCase()}-${index + 1}`,
    cleanerId: `cleaner-${index + 1}`,
    name: staff.name,
    role: appRole,
    email: staff.email,
    phone: staff.phone,
    assignedVan: staff.vanUnit,
    title: staff.role === 'Owner' 
      ? 'Owner & Executive Director' 
      : staff.role === 'Dispatcher' 
      ? 'Dispatcher & Operations Lead' 
      : 'Residential & Commercial Cleaner',
    pin: `${3000 + index + 1}`,
  };
}
