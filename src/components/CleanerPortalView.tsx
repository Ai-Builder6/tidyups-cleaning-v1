import React, { useState } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Phone, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Navigation, 
  MessageSquare, 
  Users, 
  ShieldCheck, 
  Truck, 
  Key, 
  ChevronRight, 
  Send, 
  Search, 
  Home, 
  Check, 
  ExternalLink,
  ChevronDown,
  Info,
  CircleDot,
  Radio
} from 'lucide-react';
import { AppUser, APP_USERS } from '../types/authAndChat';
import { ServiceTicket, Technician, TechnicianStatus, TicketStatus } from '../types/dispatch';

interface CleanerPortalViewProps {
  currentUser: AppUser;
  tickets: ServiceTicket[];
  technicians: Technician[];
  onUpdateTicketStatus: (ticketId: string, newStatus: TicketStatus) => void;
  onUpdateTechStatus: (techId: string, newStatus: TechnicianStatus) => void;
  onOpenChatWith: (targetUser: AppUser | null) => void;
  onViewMap?: () => void;
}

export const CleanerPortalView: React.FC<CleanerPortalViewProps> = ({
  currentUser,
  tickets,
  technicians,
  onUpdateTicketStatus,
  onUpdateTechStatus,
  onOpenChatWith,
  onViewMap,
}) => {
  const [activeTab, setActiveTab] = useState<'MY_JOBS' | 'TEAM_DIRECTORY'>('MY_JOBS');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MANAGEMENT' | 'CLEANERS'>('ALL');
  const [completedChecklistItems, setCompletedChecklistItems] = useState<Record<string, boolean>>({});

  // Match the technician profile for the logged in cleaner
  const currentCleanerTech = technicians.find(
    (t) => t.id === currentUser.cleanerId || t.email === currentUser.email
  );

  // Tickets specifically assigned to this cleaner
  const myAssignedTickets = tickets.filter(
    (t) => t.assignedTechId === currentUser.cleanerId || (currentCleanerTech && t.assignedTechId === currentCleanerTech.id)
  );

  // Fallback demo/sample jobs if no tickets are currently assigned so the cleaner can test the interface
  const sampleFallbackJobs: Partial<ServiceTicket>[] = [
    {
      id: 'demo-cleaner-stop-1',
      ticketNumber: 'JOB-4182',
      customerName: 'Sarah Jenkins',
      customerPhone: '(780) 555-8291',
      customerEmail: 's.jenkins@gmail.com',
      location: {
        address: '10405 Jasper Ave NW, Unit 1402, Edmonton, AB T5J 3S2',
        lat: 53.5412,
        lng: -113.4988,
      },
      urgency: 'HIGH',
      status: 'ASSIGNED',
      equipmentType: 'Move-Out Cleaning',
      equipmentModel: '2 Bed / 2 Bath Condo (1,150 sq ft)',
      equipmentSerial: 'Full Turnover Package + Oven Degreasing',
      issueDescription: 'Tenant moved out. Clean all cabinets inside/out, scrub appliances, degrease oven interior, wipe baseboards, and vacuum carpets.',
      accessNotes: 'Lockbox code 4482 on right railing by parkade entrance. Buzzer #1402. Park in visitor stall #8.',
      scheduledTimeWindow: '09:00 AM - 12:00 PM',
      estimatedDurationMinutes: 180,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-cleaner-stop-2',
      ticketNumber: 'JOB-4189',
      customerName: 'David & Michelle Wong',
      customerPhone: '(780) 555-3914',
      customerEmail: 'mwong.yeg@yahoo.ca',
      location: {
        address: '7412 119 St NW, Edmonton, AB T6G 1W3',
        lat: 53.5110,
        lng: -113.5350,
      },
      urgency: 'ROUTINE',
      status: 'ASSIGNED',
      equipmentType: 'Deep Cleaning',
      equipmentModel: 'Single Family Home (2,200 sq ft)',
      equipmentSerial: 'Deep Kitchen & Bath Detail + Interior Glass',
      issueDescription: 'Bi-weekly recurring deep scrub. Please focus on shower grout in master en-suite and vacuum underneath sectional couch.',
      accessNotes: 'Customer will be working upstairs in home office. Friendly golden retriever is crated in laundry room.',
      scheduledTimeWindow: '01:30 PM - 04:30 PM',
      estimatedDurationMinutes: 180,
      createdAt: new Date().toISOString(),
    },
  ];

  const displayJobs = myAssignedTickets.length > 0 ? myAssignedTickets : sampleFallbackJobs;

  // Toggle checklist item
  const toggleChecklist = (jobId: string, itemIdx: number) => {
    const key = `${jobId}-${itemIdx}`;
    setCompletedChecklistItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Helper for status badge
  const currentStatus: TechnicianStatus = currentCleanerTech?.status || 'AVAILABLE';

  // Filter team members for Team Directory
  const otherTeamMembers = APP_USERS.filter((u) => u.id !== currentUser.id).filter((u) => {
    if (roleFilter === 'MANAGEMENT') {
      if (u.role !== 'OWNER' && u.role !== 'DISPATCHER') return false;
    } else if (roleFilter === 'CLEANERS') {
      if (u.role !== 'CLEANER') return false;
    }

    if (!teamSearchQuery.trim()) return true;
    const q = teamSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.title.toLowerCase().includes(q) ||
      (u.assignedVan && u.assignedVan.toLowerCase().includes(q)) ||
      u.phone.includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-100 font-sans p-3 sm:p-5 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* Cleaner Top Identity Banner */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white text-lg font-black shadow-md flex-shrink-0">
              {currentUser.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cleaner Session Active
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {currentUser.assignedVan || 'Mobile Van Unit'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {currentUser.name}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{currentUser.title}</span>
                <span>•</span>
                <span className="font-mono text-slate-600">{currentUser.phone}</span>
              </p>
            </div>
          </div>

          {/* Real-Time Shift Status Toggles */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 sm:px-2 uppercase tracking-wider">
              Shift Status:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(['AVAILABLE', 'EN_ROUTE', 'ON_SITE', 'OFF_DUTY'] as TechnicianStatus[]).map((statusKey) => {
                const isActive = currentStatus === statusKey;
                const statusLabels: Record<TechnicianStatus, { label: string; color: string; activeColor: string }> = {
                  AVAILABLE: { label: 'Available', color: 'text-emerald-700', activeColor: 'bg-emerald-600 text-white' },
                  EN_ROUTE: { label: 'En Route', color: 'text-blue-700', activeColor: 'bg-blue-600 text-white' },
                  ON_SITE: { label: 'On Site', color: 'text-purple-700', activeColor: 'bg-purple-600 text-white' },
                  OFF_DUTY: { label: 'Off Duty', color: 'text-slate-600', activeColor: 'bg-slate-700 text-white' },
                  RETURNING_DEPOT: { label: 'Depot', color: 'text-amber-700', activeColor: 'bg-amber-600 text-white' },
                  ON_DUTY: { label: 'On Duty', color: 'text-teal-700', activeColor: 'bg-teal-600 text-white' },
                };

                const meta = statusLabels[statusKey] || statusLabels.AVAILABLE;

                return (
                  <button
                    key={statusKey}
                    onClick={() => {
                      if (currentCleanerTech) {
                        onUpdateTechStatus(currentCleanerTech.id, statusKey);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isActive
                        ? `${meta.activeColor} shadow-xs font-black`
                        : `bg-white border border-slate-200 ${meta.color} hover:bg-slate-100`
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cleaner Main Navigation Tabs */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('MY_JOBS')}
              className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'MY_JOBS'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4 text-pink-400" />
              <span>My Assigned Jobs ({displayJobs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('TEAM_DIRECTORY')}
              className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'TEAM_DIRECTORY'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-white" />
              <span>Team Messaging &amp; Directory</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Broadcast Button */}
            <button
              onClick={() => onOpenChatWith(null)}
              className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Broadcast message to all crew"
            >
              <Radio className="w-3.5 h-3.5 text-pink-600" />
              <span className="hidden sm:inline">All-Crew Radio</span>
            </button>

            {onViewMap && (
              <button
                onClick={onViewMap}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="View Edmonton map"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">View GPS Map</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: MY ASSIGNED JOBS */}
        {activeTab === 'MY_JOBS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
              <span>Today's Itinerary for {currentUser.name}</span>
              <span className="text-[11px] font-mono text-slate-400">
                {new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {displayJobs.map((job, index) => {
              const isFirstStop = index === 0;
              const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.location?.address || 'Edmonton, AB')}`;
              
              const checklistTasks = [
                'Living area dusting & vacuuming',
                'Kitchen sanitization & appliances scrub',
                'Oven degreased & stove burners cleaned',
                'Bathroom shower tiles, toilet & mirror polished',
                'Interior windows & high touch baseboards wiped',
                'Garbage emptied & lockbox key secured',
              ];

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Job Header Card */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-black text-sm text-white shadow-xs">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-pink-300">
                            {job.ticketNumber}
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase bg-white/15 text-white">
                            {job.equipmentType || 'Cleaning'}
                          </span>
                          {job.urgency === 'HIGH' && (
                            <span className="px-1.5 py-0.2 rounded bg-red-500/80 text-white text-[9px] font-bold">
                              HIGH PRIORITY
                            </span>
                          )}
                        </div>
                        <h2 className="text-base font-extrabold text-white mt-0.5">
                          {job.customerName}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-white/10 text-white text-xs font-mono font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-pink-300" />
                        {job.scheduledTimeWindow || '09:00 AM - 12:00 PM'}
                      </span>
                    </div>
                  </div>

                  {/* Job Body */}
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Location & Quick Action Navigation */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-800 truncate">
                            {job.location?.address}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {job.equipmentModel || 'Residential Property'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={gmapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Google Maps</span>
                          <ExternalLink className="w-3 h-3 text-blue-200" />
                        </a>

                        {job.customerPhone && (
                          <a
                            href={`tel:${job.customerPhone}`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call Client</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Access Instructions & Entry Notes */}
                    {job.accessNotes && (
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5">
                        <Key className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                            Access &amp; Entry Instructions
                          </h4>
                          <p className="text-xs text-amber-950 font-medium mt-0.5 leading-relaxed">
                            {job.accessNotes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Special Scope Notes */}
                    {job.issueDescription && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-blue-600" />
                          <span>Specific Service Requirements</span>
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {job.issueDescription}
                        </p>
                      </div>
                    )}

                    {/* Service Checklist */}
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Quality Inspection Checklist</span>
                        <span className="text-[11px] font-mono text-slate-500 font-normal">
                          {checklistTasks.filter((_, idx) => completedChecklistItems[`${job.id}-${idx}`]).length} / {checklistTasks.length} complete
                        </span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {checklistTasks.map((task, idx) => {
                          const isDone = !!completedChecklistItems[`${job.id}-${idx}`];
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleChecklist(job.id!, idx)}
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                                isDone
                                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 line-through opacity-80'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="truncate">{task}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress Controls & Ask Dispatcher Button */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (job.id) onUpdateTicketStatus(job.id, 'EN_ROUTE');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            job.status === 'EN_ROUTE'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          🚗 Mark En Route
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (job.id) onUpdateTicketStatus(job.id, 'IN_PROGRESS');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            job.status === 'IN_PROGRESS'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          🧹 Start Clean
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (job.id) onUpdateTicketStatus(job.id, 'COMPLETED');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          ✅ Complete Job
                        </button>
                      </div>

                      {/* Ask Dispatcher / Chat about this stop */}
                      <button
                        type="button"
                        onClick={() => {
                          const dispatcherUser = APP_USERS.find((u) => u.role === 'DISPATCHER') || APP_USERS[1];
                          onOpenChatWith(dispatcherUser);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ml-auto"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
                        <span>Chat Dispatcher About Stop #{index + 1}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: TEAM DIRECTORY & MESSAGING ("Talk to cleaners or one another if we click on one another") */}
        {activeTab === 'TEAM_DIRECTORY' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
            {/* Header Description */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold text-pink-600 uppercase tracking-wider block">
                  Internal Team Messaging System
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Staff Directory &amp; Direct Messaging
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click on any staff member below to start a live direct conversation.
                </p>
              </div>

              {/* Broadcast Channel Button */}
              <button
                onClick={() => onOpenChatWith(null)}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-black flex items-center gap-2 shadow-md hover:opacity-95 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Radio className="w-4 h-4 text-white" />
                <span>Open All-Crew Radio Chat</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by cleaner name, van unit, phone, or neighborhood..."
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-pink-500 shadow-inner"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {(['ALL', 'MANAGEMENT', 'CLEANERS'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setRoleFilter(filterKey)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      roleFilter === filterKey
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filterKey === 'ALL' ? 'All (16)' : filterKey === 'MANAGEMENT' ? 'Owner & Dispatch' : 'Cleaners (14)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {otherTeamMembers.map((member) => {
                const isOwner = member.role === 'OWNER';
                const isDispatcher = member.role === 'DISPATCHER';

                return (
                  <div
                    key={member.id}
                    onClick={() => onOpenChatWith(member)}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-pink-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs shrink-0 ${
                        isOwner
                          ? 'bg-purple-600'
                          : isDispatcher
                          ? 'bg-pink-600'
                          : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                      }`}>
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-pink-600 transition-colors truncate">
                            {member.name}
                          </h4>
                        </div>

                        <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase font-mono mt-0.5 ${
                          isOwner
                            ? 'bg-purple-100 text-purple-800'
                            : isDispatcher
                            ? 'bg-pink-100 text-pink-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {member.role}
                        </span>

                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {member.assignedVan || member.title}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">
                        {member.phone}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChatWith(member);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-pink-50 group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 text-pink-700 group-hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
