/**
 * Dispatch Optimization Prompt Template
 * Used by /api/dispatch/ai-assistant with Gemini models
 */

export interface NormalizedTechnician {
  id: string;
  name: string;
  vanNumber: string;
  status: string;
  skills: string[];
  location?: { lat: number; lng: number; address?: string };
  currentJobCount: number;
  shiftCapacityHours: number;
  partsInventory: Array<string | { partNumber?: string; name: string }>;
}

export interface NormalizedTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  urgency: string;
  equipmentType: string;
  issueDescription?: string;
  requiredSkills?: string[];
  requiredParts?: Array<string | { name: string }>;
  location?: { lat: number; lng: number; address?: string };
  slaDeadline?: string;
  estimatedDurationMinutes?: number;
}

export function createDispatchPrompt(
  territoryName: string,
  technicians: NormalizedTechnician[],
  pendingTickets: NormalizedTicket[]
): string {
  return `You are the Lead AI Field Service Dispatch Coordinator for a professional Cleaning Service fleet operating in ${territoryName} with 15 decentralized mobile cleaning cleaners/units across Edmonton and 3 core cleaning services: Standard Cleaning, Deep Cleaning, and Move-Out Cleaning.
Analyze the active cleaning cleaners and pending booking queue to formulate a high-efficiency dispatch optimization plan. All route metrics, travel distances, and transit evaluations must be calculated in Kilometers (KM) and Liters (L).

Technicians available (${technicians.length}):
${JSON.stringify(
  technicians.map((t) => ({
    id: t.id,
    name: t.name,
    vanNumber: t.vanNumber,
    status: t.status,
    skills: t.skills,
    location: t.location,
    currentJobCount: t.currentJobCount,
    shiftCapacityHours: t.shiftCapacityHours,
    partsInventory: t.partsInventory,
  })),
  null,
  2
)}

Pending Ticket Queue (${pendingTickets.length}):
${JSON.stringify(
  pendingTickets.map((tk) => ({
    id: tk.id,
    ticketNumber: tk.ticketNumber,
    customerName: tk.customerName,
    urgency: tk.urgency,
    equipmentType: tk.equipmentType,
    issueDescription: tk.issueDescription,
    requiredSkills: tk.requiredSkills,
    requiredParts: tk.requiredParts,
    location: tk.location,
    slaDeadline: tk.slaDeadline,
    estimatedDurationMinutes: tk.estimatedDurationMinutes,
  })),
  null,
  2
)}

Optimization Objectives:
1. Priority 1: Emergency & High urgency tickets (move-out tenant turnover deadlines, landlord inspections, urgent re-cleans) must be assigned to the nearest available cleaning crew immediately.
2. Priority 2: Service Type Alignment - Match the 3 core services ('Standard Cleaning', 'Deep Cleaning', 'Move-Out Cleaning') with crew workload and shift capacity hours.
3. Fuel & Route Efficiency: Cluster jobs geographically across Edmonton quadrants (Downtown/Central vs. South/Whyte Ave vs. West) to minimize transit time between stops.
4. Supply Kit Match: Ensure crew inventory (HEPA vacuums, oven degreasers, microfibers, grout detail kits) matches booking needs.

Return a strictly structured JSON response containing:
1. summary: A concise 2-sentence executive dispatch briefing.
2. fleetHealth: Rating ('OPTIMAL', 'MODERATE_LOAD', 'OVERLOADED', 'EMERGENCY_ALERT') with brief justification.
3. estimatedFuelSavingsGallons: Estimated fuel saved by optimizing routes (e.g., 6.8).
4. estimatedDriveTimeSavedMinutes: Estimated drive minutes saved (e.g., 45).
5. recommendations: Array of recommendations, each having:
   - ticketId: string
   - ticketNumber: string
   - recommendedTechId: string
   - recommendedTechName: string
   - urgency: string
   - rationale: string (concise explanation of skill match, proximity, and route fit)
   - estimatedDriveMins: number
   - urgencyLevelScore: number (1-10)
6. strategicInsights: Array of 3 short bullet points highlighting tactical suggestions (e.g., parts restocking, severe weather standby).`;
}
