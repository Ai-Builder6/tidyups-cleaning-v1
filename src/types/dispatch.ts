export type UrgencyLevel = 'EMERGENCY' | 'HIGH' | 'SAME_DAY' | 'MEDIUM' | 'ROUTINE' | 'LOW';

export type CleaningServiceType = 
  | 'Standard Cleaning' 
  | 'Deep Cleaning' 
  | 'Move-Out Cleaning';

export type TechnicianStatus = 
  | 'AVAILABLE' 
  | 'EN_ROUTE' 
  | 'ON_SITE' 
  | 'RETURNING_DEPOT' 
  | 'ON_DUTY' 
  | 'OFF_DUTY';

export type TicketStatus = 
  | 'UNASSIGNED' 
  | 'ASSIGNED' 
  | 'EN_ROUTE' 
  | 'IN_PROGRESS' 
  | 'COMPLETED';

// Supports the 3 core cleaning services while maintaining compatibility
export type EquipmentType = 
  | CleaningServiceType 
  | string;

export interface JobberConfig {
  clientId?: string;
  clientSecret?: string;
  hasSecret?: boolean;
  redirectUri?: string;
  accessToken?: string;
  isConnected: boolean;
  lastSyncedAt?: string;
  accountName?: string;
  isDevSandbox?: boolean;
}

export interface JobberVisitSyncResult {
  importedCount: number;
  exportedCount: number;
  timestamp: string;
  status: 'SUCCESS' | 'ERROR' | 'OFFLINE';
  message: string;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  zip?: string;
}

export interface InventoryItem {
  partNumber: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface RouteMetrics {
  totalDistanceMiles: number;
  totalDistanceKm: number;
  totalDriveMinutes: number;
  estimatedFuelGallons: number;
  estimatedFuelLiters: number;
  stopCount: number;
  encodedPolyline?: string;
  legs?: Array<{
    distanceMeters: number;
    durationSeconds: number;
    fromAddress: string;
    toAddress: string;
  }>;
}

export interface Technician {
  id: string;
  name: string;
  vanNumber: string;
  phone: string;
  email?: string;
  role?: string;
  homeAddress?: string;
  color: string;
  active?: boolean;
  status: TechnicianStatus;
  rating: number;
  skills: string[];
  certifications: string[];
  experienceYears: number;
  currentLocation: LocationPoint;
  depotLocation: LocationPoint & { name: string };
  assignedTicketIds: string[];
  shiftCapacityHours: number;
  completedJobsCount: number;
  partsInventory: InventoryItem[];
  routeMetrics?: RouteMetrics;
  lastUpdated?: string;
}

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  companyName?: string;
  customerPhone: string;
  customerEmail: string;
  location: LocationPoint;
  urgency: UrgencyLevel;
  status: TicketStatus;
  assignedTechId?: string;
  equipmentType: EquipmentType;
  equipmentModel: string;
  equipmentSerial: string;
  faultCode?: string;
  issueDescription: string;
  accessNotes?: string;
  requiredSkills: string[];
  requiredParts: string[];
  slaDeadline: string;
  scheduledTimeWindow?: string;
  estimatedDurationMinutes: number;
  createdAt: string;
  stopSequence?: number;
  jobberJobId?: string;
  jobberSyncStatus?: 'SYNCED' | 'LOCAL' | 'PENDING';
}

export interface AIRecommendation {
  ticketId: string;
  ticketNumber: string;
  recommendedTechId: string;
  recommendedTechName: string;
  urgency: UrgencyLevel;
  rationale: string;
  estimatedDriveMins: number;
  urgencyLevelScore: number;
}

export interface AIAnalysisResult {
  summary: string;
  fleetHealth: string;
  estimatedFuelSavingsGallons: number;
  estimatedDriveTimeSavedMinutes: number;
  recommendations: AIRecommendation[];
  strategicInsights: string[];
}

export interface RouteCalculationRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  intermediates?: Array<{ lat: number; lng: number }>;
  travelMode?: string;
}
