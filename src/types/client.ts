export type ClientVerdict = 'Client' | 'Good lead' | 'Bad lead' | 'Spam';

export interface CallTranscriptLog {
  id: string;
  callId?: string;
  direction?: 'inbound' | 'outbound';
  callerPhone: string;
  callerName?: string;
  duration?: number;
  recordingUrl?: string;
  transcriptText?: string;
  summary?: string;
  lineName?: string;
  timestamp: string;
  matchedJobId?: string | null;
  matchedJobTitle?: string | null;
  status?: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address: string;
  city?: string;
  province?: string;
  postalCode?: string;
  verdict: ClientVerdict;
  tags: string[];
  isJobberLinked: boolean;
  jobberId?: string;
  quoContactId?: string;
  totalJobs?: number;
  latestServiceDate?: string;
  notes?: string;
  source?: 'Jobber' | 'Booking' | 'Lead' | 'Manual' | 'Quo';
  createdAt?: string;
  updatedAt?: string;
  callHistory?: CallTranscriptLog[];
}

export interface ClientFilters {
  searchQuery: string;
  verdictFilter: 'ALL' | ClientVerdict | 'JOBBER_LINKED';
  fromDate?: string;
  toDate?: string;
}
