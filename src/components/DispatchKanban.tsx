import React, { useState } from 'react';
import { Technician, ServiceTicket, UrgencyLevel } from '../types/dispatch';
import { 
  Flame, 
  Clock, 
  Wrench, 
  Truck, 
  MapPin, 
  Phone, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronDown, 
  GripVertical, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Route, 
  ArrowUpRight,
  ExternalLink,
  Plus,
  Database,
  MessageSquare
} from 'lucide-react';

interface DispatchKanbanProps {
  technicians: Technician[];
  tickets: ServiceTicket[];
  selectedTechId: string | null;
  onSelectTech: (techId: string | null) => void;
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string | null) => void;
  onAssignTicket: (ticketId: string, techId: string) => void;
  onUnassignTicket: (ticketId: string) => void;
  onReorderTechTickets: (techId: string, reorderedTicketIds: string[]) => void;
  onOpenAiAssistant: () => void;
  onOpenManifest: (tech: Technician) => void;
  onOpenNewTicketModal: () => void;
  onOpenJobberModal?: () => void;
  onMessageTech?: (tech: Technician) => void;
  onClose?: () => void;
  activeTab?: 'BOARD' | 'UNASSIGNED';
  onActiveTabChange?: (tab: 'BOARD' | 'UNASSIGNED') => void;
}

export const DispatchKanban: React.FC<DispatchKanbanProps> = ({
  technicians,
  tickets,
  selectedTechId,
  onSelectTech,
  selectedTicketId,
  onSelectTicket,
  onAssignTicket,
  onUnassignTicket,
  onReorderTechTickets,
  onOpenAiAssistant,
  onOpenManifest,
  onOpenNewTicketModal,
  onOpenJobberModal,
  onMessageTech,
  onClose,
  activeTab: controlledActiveTab,
  onActiveTabChange,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'BOARD' | 'UNASSIGNED'>('BOARD');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = (tab: 'BOARD' | 'UNASSIGNED') => {
    if (onActiveTabChange) {
      onActiveTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [expandedTechIds, setExpandedTechIds] = useState<Record<string, boolean>>({});
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverTechId, setDragOverTechId] = useState<string | null>(null);
  const [isCompactTechs, setIsCompactTechs] = useState(false);

  const unassignedTickets = tickets.filter((t) => !t.assignedTechId);

  const filteredUnassignedTickets = unassignedTickets.filter((t) => {
    let matchesUrgency = true;
    if (urgencyFilter !== 'ALL') {
      const u = String(t.urgency || '').toUpperCase();
      if (urgencyFilter === 'EMERGENCY') matchesUrgency = u === 'EMERGENCY';
      else if (urgencyFilter === 'HIGH') matchesUrgency = u === 'HIGH';
      else if (urgencyFilter === 'MEDIUM') matchesUrgency = u === 'MEDIUM' || u === 'SAME_DAY';
      else if (urgencyFilter === 'LOW') matchesUrgency = u === 'LOW' || u === 'ROUTINE';
    }
    const matchesSearch =
      searchQuery === '' ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.equipmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.faultCode && t.faultCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesUrgency && matchesSearch;
  });

  const toggleTechExpand = (techId: string) => {
    setExpandedTechIds((prev) => ({ ...prev, [techId]: !prev[techId] }));
  };

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData('text/plain', ticketId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTicketId(ticketId);
  };

  const handleDragOver = (e: React.DragEvent, techId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTechId !== techId) {
      setDragOverTechId(techId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, techId: string) => {
    if (dragOverTechId === techId) {
      setDragOverTechId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, techId: string) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain') || draggedTicketId;
    setDragOverTechId(null);
    setDraggedTicketId(null);
    if (ticketId) {
      onAssignTicket(ticketId, techId);
    }
  };

  const getUrgencyStyles = (urgency: UrgencyLevel | string) => {
    const u = String(urgency || '').toUpperCase();
    if (u === 'EMERGENCY') {
      return {
        level: 'Emergency',
        badge: 'bg-rose-50 text-rose-700 border-rose-200/90',
        dot: 'bg-rose-500 animate-pulse',
        borderIndicator: 'border-l-4 border-l-rose-500',
        cardBorder: 'border-slate-200 hover:border-rose-400',
        cardBg: 'bg-white hover:bg-rose-50/25',
        accentBg: 'bg-rose-50/25',
        tagText: 'text-rose-700 font-bold',
        icon: <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />,
      };
    }
    if (u === 'HIGH') {
      return {
        level: 'High',
        badge: 'bg-amber-50 text-amber-800 border-amber-200/90',
        dot: 'bg-amber-500',
        borderIndicator: 'border-l-4 border-l-amber-500',
        cardBorder: 'border-slate-200 hover:border-amber-400',
        cardBg: 'bg-white hover:bg-amber-50/25',
        accentBg: 'bg-amber-50/25',
        tagText: 'text-amber-800 font-bold',
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
      };
    }
    if (u === 'MEDIUM' || u === 'SAME_DAY') {
      return {
        level: u === 'SAME_DAY' ? 'Same-Day' : 'Medium',
        badge: 'bg-sky-50 text-sky-700 border-sky-200/90',
        dot: 'bg-sky-500',
        borderIndicator: 'border-l-4 border-l-sky-500',
        cardBorder: 'border-slate-200 hover:border-sky-400',
        cardBg: 'bg-white hover:bg-sky-50/20',
        accentBg: 'bg-sky-50/20',
        tagText: 'text-sky-700 font-bold',
        icon: <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
      };
    }
    // LOW / ROUTINE / default
    return {
      level: u === 'ROUTINE' ? 'Routine' : 'Low',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
      dot: 'bg-emerald-500',
      borderIndicator: 'border-l-4 border-l-emerald-500',
      cardBorder: 'border-slate-200 hover:border-emerald-300',
      cardBg: 'bg-white hover:bg-emerald-50/15',
      accentBg: 'bg-emerald-50/15',
      tagText: 'text-emerald-700 font-bold',
      icon: <Wrench className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ON_SITE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EN_ROUTE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'AVAILABLE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'RETURNING_DEPOT':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div id="dispatch-kanban-panel" className="h-full flex flex-col bg-slate-100 border-l border-slate-200 overflow-hidden select-none font-sans">
      {/* Header with Search, Jobber Sync and AI Assistant Action */}
      <div className="p-3 border-b border-slate-200 bg-white flex flex-col gap-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 truncate">
              <Truck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <span className="truncate">Cleaning Dispatch Board</span>
            </h2>
            <span className="hidden xl:inline-block px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold shrink-0">
              {technicians.length} Cleaners Active
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenJobberModal && (
              <button
                id="open-jobber-sync-btn"
                onClick={onOpenJobberModal}
                className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Jobber GraphQL Integration: Sync clients, invoices, and visits"
                aria-label="Jobber Sync Hub"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Jobber Sync</span>
              </button>
            )}

            <button
              onClick={() => setIsCompactTechs(!isCompactTechs)}
              className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                isCompactTechs
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isCompactTechs ? 'Switch to detailed card view' : 'Compact view: show dense 1-line rows to minimize visual space'}
              aria-label="Toggle compact technician cards"
            >
              <span className="text-[11px]">{isCompactTechs ? 'Detailed' : 'Compact'}</span>
            </button>

            <button
              id="open-ai-dispatcher-btn"
              onClick={onOpenAiAssistant}
              className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              aria-label="Open AI Dispatch Assistant"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>AI Dispatch</span>
            </button>

            <button
              id="create-new-ticket-btn"
              onClick={onOpenNewTicketModal}
              className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center cursor-pointer"
              title="Book New Cleaning Job (Voice Dictation Supported)"
              aria-label="Book New Cleaning Job (Voice Dictation Supported)"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                title="Collapse Dispatch Board and expand Territory Map"
                aria-label="Close board"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search and Tab Switcher (Full-width stacked rows to prevent any horizontal truncation or overlap) */}
        <div className="flex flex-col gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg border border-slate-200 w-full" role="tablist" aria-label="Dispatch view selector">
            <button
              id="tab-all-vans"
              role="tab"
              aria-selected={activeTab === 'BOARD'}
              aria-controls="technicians-grid-container"
              onClick={() => setActiveTab('BOARD')}
              className={`flex-1 min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer text-center ${
                activeTab === 'BOARD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              All 15 Cleaning Units (Hubs)
            </button>
            <button
              id="tab-queue"
              role="tab"
              aria-selected={activeTab === 'UNASSIGNED'}
              aria-controls="unassigned-ticket-queue"
              onClick={() => setActiveTab('UNASSIGNED')}
              className={`flex-1 min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'UNASSIGNED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <span>Pending Queue</span>
              {unassignedTickets.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold" aria-label={`${unassignedTickets.length} unassigned tickets`}>
                  {unassignedTickets.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              id="ticket-search-input"
              type="text"
              placeholder="Search client name, address, cleaning service, lockbox..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search tickets by customer, address, or cleaning service"
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white min-h-[38px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1 rounded text-xs cursor-pointer"
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </div>

          {/* Subtle Color-Coded Urgency Level Indicator Legend Strip */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg text-[10px]">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Urgency:</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setUrgencyFilter(urgencyFilter === 'EMERGENCY' ? 'ALL' : 'EMERGENCY')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold text-[10px] ${
                  urgencyFilter === 'EMERGENCY'
                    ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Filter Emergency tickets (Rose indicator)"
              >
                <span className="w-2 h-2 rounded-xs bg-rose-500 shrink-0 shadow-2xs" />
                <span>Emergency</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter(urgencyFilter === 'HIGH' ? 'ALL' : 'HIGH')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold text-[10px] ${
                  urgencyFilter === 'HIGH'
                    ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Filter High urgency tickets (Amber indicator)"
              >
                <span className="w-2 h-2 rounded-xs bg-amber-500 shrink-0 shadow-2xs" />
                <span>High</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter(urgencyFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold text-[10px] ${
                  urgencyFilter === 'MEDIUM'
                    ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Filter Medium urgency tickets (Sky indicator)"
              >
                <span className="w-2 h-2 rounded-xs bg-sky-500 shrink-0 shadow-2xs" />
                <span>Medium</span>
              </button>
              <button
                type="button"
                onClick={() => setUrgencyFilter(urgencyFilter === 'LOW' ? 'ALL' : 'LOW')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold text-[10px] ${
                  urgencyFilter === 'LOW'
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Filter Low urgency tickets (Emerald indicator)"
              >
                <span className="w-2 h-2 rounded-xs bg-emerald-500 shrink-0 shadow-2xs" />
                <span>Low</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Kanban Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Unassigned Tickets Queue View */}
        <div
          id="unassigned-ticket-queue"
          className={`${
            activeTab === 'UNASSIGNED' ? 'flex flex-col w-full h-full' : 'hidden'
          } bg-slate-50 overflow-y-auto p-3`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('BOARD')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                ← 15 Vans
              </button>
              <span className="text-slate-300">|</span>
              <span className="font-bold text-xs text-slate-800">Pending Queue</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-50 text-red-700 font-mono font-bold border border-red-200">
                {unassignedTickets.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">Drag to assign</span>
            </div>
          </div>

          {/* Urgency Filter Tabs with subtle color dot indicators */}
          <div className="flex items-center gap-1 mb-3">
            {[
              { id: 'ALL', label: 'All', dot: null },
              { id: 'EMERGENCY', label: 'Emergency', dot: 'bg-rose-500' },
              { id: 'HIGH', label: 'High', dot: 'bg-amber-500' },
              { id: 'MEDIUM', label: 'Medium', dot: 'bg-sky-500' },
              { id: 'LOW', label: 'Low', dot: 'bg-emerald-500' },
            ].map(({ id, label, dot }) => (
              <button
                key={id}
                onClick={() => setUrgencyFilter(id as any)}
                className={`flex-1 py-1 px-1 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  urgencyFilter === id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Ticket Cards List with Color-Coded Border Indicators */}
          <div className="flex flex-col gap-2.5">
            {filteredUnassignedTickets.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-300 rounded-xl bg-white">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500 opacity-80" />
                <span className="block font-medium">All pending tickets are dispatched!</span>
                <div className="mt-3">
                  <button
                    onClick={onOpenNewTicketModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Ticket (Voice or Text)</span>
                  </button>
                </div>
              </div>
            ) : (
              filteredUnassignedTickets.map((ticket) => {
                const styles = getUrgencyStyles(ticket.urgency);
                const isSelected = selectedTicketId === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    id={`ticket-card-${ticket.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                    onClick={() => onSelectTicket(ticket.id)}
                    className={`p-3 rounded-xl border ${styles.borderIndicator} ${styles.cardBorder} ${styles.cardBg} cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150 shadow-xs ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Card Header: Ticket # & SLA */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                        <span className="font-mono font-bold text-xs text-slate-800">{ticket.ticketNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${styles.badge} flex items-center gap-1 shadow-2xs`}>
                          {styles.icon}
                          <span>{styles.level}</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">{ticket.slaDeadline}</span>
                    </div>

                    {/* Customer & Location */}
                    <div className="font-bold text-xs text-slate-900 mb-0.5 line-clamp-1">
                      {ticket.customerName}
                    </div>
                    <div className="text-[11px] text-slate-600 mb-1.5 flex items-center gap-1 line-clamp-1">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>{ticket.location.address}</span>
                    </div>

                    {/* Cleaning Service & Property Badge */}
                    <div className="p-2 bg-slate-50 rounded-lg text-[11px] border border-slate-100 mb-2">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span className="line-clamp-1 flex items-center gap-1">
                          {ticket.equipmentType === 'Move-Out Cleaning' ? '📦' : ticket.equipmentType === 'Deep Cleaning' ? '🧼' : '✨'}
                          <span>{ticket.equipmentType}</span>
                        </span>
                        {ticket.faultCode && (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold">
                            {ticket.faultCode}
                          </span>
                        )}
                      </div>
                      {ticket.equipmentModel && (
                        <div className="text-[10px] text-blue-700 font-medium mt-0.5">
                          🏡 {ticket.equipmentModel}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">
                        {ticket.issueDescription}
                      </div>
                      {ticket.accessNotes && (
                        <div className="text-[10px] text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/80 mt-1 line-clamp-1">
                          🔑 {ticket.accessNotes}
                        </div>
                      )}
                    </div>

                    {/* Quick Assign Dropdown */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-600 font-mono">⏱️ {ticket.estimatedDurationMinutes}m est</span>
                      <select
                        aria-label={`Assign booking ${ticket.ticketNumber} for ${ticket.customerName} to cleaning crew`}
                        onChange={(e) => {
                          if (e.target.value) {
                            onAssignTicket(ticket.id, e.target.value);
                          }
                        }}
                        defaultValue=""
                        className="bg-slate-50 text-slate-800 border border-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500 min-h-[36px] cursor-pointer font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="" disabled>
                          Assign Cleaning Crew...
                        </option>
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.vanNumber} - {t.name} ({t.assignedTicketIds.length} stops)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: 2 Mobile Cleaning Van Workload Cards Grid */}
        <div
          id="technicians-grid-container"
          className={`${
            activeTab === 'BOARD' ? 'flex flex-col w-full h-full' : 'hidden'
          } overflow-y-auto p-3 bg-slate-100 flex-1`}
        >
          {/* Pending Dispatch Queue Notification Banner */}
          {unassignedTickets.length > 0 && (
            <div
              onClick={() => setActiveTab('UNASSIGNED')}
              className="mb-3 px-3 py-2 bg-amber-50 hover:bg-amber-100/90 border border-amber-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors shadow-2xs group"
              role="button"
              tabIndex={0}
              aria-label={`Open pending queue with ${unassignedTickets.length} tickets`}
            >
              <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>{unassignedTickets.length} bookings pending dispatch in queue</span>
              </div>
              <span className="text-xs font-bold text-amber-900 group-hover:text-amber-950 flex items-center gap-1 shrink-0">
                Open Queue →
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-800">15 Dedicated Cleaners &amp; Individual Home Hubs</h3>
              <p className="hidden sm:block text-[11px] text-slate-500">
                Drag and drop cleaning bookings onto any cleaner to calculate optimal multi-stop route sequence from their Edmonton home hub.
              </p>
            </div>
            <span className="text-xs text-blue-700 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Dispatched: {tickets.filter((t) => t.assignedTechId).length} / {tickets.length}
            </span>
          </div>

          {/* 15 Tech Cards */}
          <div className={`grid ${isCompactTechs ? 'grid-cols-1' : 'grid-cols-1 2xl:grid-cols-2'} gap-2.5`}>
            {technicians.map((tech) => {
              const isSelected = selectedTechId === tech.id;
              const isDragOver = dragOverTechId === tech.id;
              const isExpanded = !!expandedTechIds[tech.id];

              const techTickets = tickets
                .filter((t) => tech.assignedTicketIds.includes(t.id))
                .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));

              const metrics = tech.routeMetrics || {
                totalDistanceMiles: 0,
                totalDistanceKm: 0,
                totalDriveMinutes: 0,
                estimatedFuelGallons: 0,
                estimatedFuelLiters: 0,
                stopCount: techTickets.length,
              };

              // Capacity calculation (assume 8 hours shift)
              const totalEstWorkMinutes = techTickets.reduce((acc, tk) => acc + tk.estimatedDurationMinutes, 0);
              const totalCommittedHours = Math.round(((metrics.totalDriveMinutes + totalEstWorkMinutes) / 60) * 10) / 10;
              const capacityPercent = Math.min(Math.round((totalCommittedHours / tech.shiftCapacityHours) * 100), 100);

              if (isCompactTechs) {
                return (
                  <div
                    key={tech.id}
                    id={`tech-lane-compact-${tech.id}`}
                    onDragOver={(e) => handleDragOver(e, tech.id)}
                    onDragLeave={(e) => handleDragLeave(e, tech.id)}
                    onDrop={(e) => handleDrop(e, tech.id)}
                    onClick={() => onSelectTech(tech.id === selectedTechId ? null : tech.id)}
                    className={`rounded-xl border transition-all duration-150 flex items-center justify-between p-2.5 bg-white shadow-2xs cursor-pointer ${
                      isDragOver
                        ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/50'
                        : isSelected
                        ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tech.color }} />
                      <span className="font-extrabold text-xs text-slate-800 whitespace-nowrap">{tech.vanNumber}</span>
                      <span className="text-xs text-slate-600 truncate">({tech.name})</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getStatusBadge(tech.status)}`}>
                        {tech.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                      <span className="text-slate-700 font-bold">{techTickets.length} stops</span>
                      <span className="text-blue-600 font-semibold">{Math.round(metrics.totalDistanceKm ?? (metrics.totalDistanceMiles * 1.60934))} km</span>
                      <span className="text-slate-500 text-[11px] hidden sm:inline">{capacityPercent}% cap</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenManifest(tech); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer rounded"
                        title="Export Manifest"
                        aria-label={`Export manifest for ${tech.vanNumber}`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      {onMessageTech && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onMessageTech(tech); }}
                          className="p-1.5 text-slate-400 hover:text-pink-600 cursor-pointer rounded"
                          title={`Message ${tech.name}`}
                          aria-label={`Message ${tech.name}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={tech.id}
                  id={`tech-lane-${tech.id}`}
                  onDragOver={(e) => handleDragOver(e, tech.id)}
                  onDragLeave={(e) => handleDragLeave(e, tech.id)}
                  onDrop={(e) => handleDrop(e, tech.id)}
                  onClick={() => onSelectTech(tech.id === selectedTechId ? null : tech.id)}
                  className={`rounded-xl border transition-all duration-200 flex flex-col bg-white shadow-xs overflow-hidden ${
                    isDragOver
                      ? 'border-blue-500 ring-4 ring-blue-500/20 bg-blue-50/50 scale-[1.01]'
                      : isSelected
                      ? 'border-blue-500 ring-2 ring-blue-400 bg-white'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Top Color Accent Line */}
                  <div className="h-1 w-full" style={{ backgroundColor: tech.color }} />

                  {/* Card Top Header */}
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tech.color }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-800">{tech.vanNumber}</span>
                          <span className="text-xs font-semibold text-slate-600">({tech.name})</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getStatusBadge(tech.status)}`}>
                            {tech.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>🏠 {tech.homeAddress ? tech.homeAddress.split(',')[0] : tech.currentLocation.address}</span>
                          <span className="text-slate-300">•</span>
                          <span>📞 {tech.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {onMessageTech && (
                        <button
                          onClick={() => onMessageTech(tech)}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs flex items-center gap-1 border border-pink-200 transition-colors cursor-pointer"
                          title={`Send Direct Message to ${tech.name}`}
                          aria-label={`Send Direct Message to ${tech.name}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-pink-600" aria-hidden="true" />
                          <span className="hidden sm:inline text-[10px] font-bold">Chat</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenManifest(tech)}
                        className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                        title="Export Daily Manifest"
                        aria-label={`Export Daily Manifest for ${tech.vanNumber} - ${tech.name}`}
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                        <span className="hidden sm:inline text-[10px] font-semibold">Manifest</span>
                      </button>

                      <button
                        onClick={() => toggleTechExpand(tech.id)}
                        className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 flex items-center justify-center cursor-pointer"
                        title="Toggle Technician Certifications and Inventory"
                        aria-label={`Toggle certifications and parts inventory for ${tech.vanNumber}`}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  {/* Calculated Routes API Metrics Strip */}
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-blue-700 font-bold flex items-center gap-1">
                        <Route className="w-3.5 h-3.5" />
                        {metrics.totalDistanceKm ?? Math.round(metrics.totalDistanceMiles * 1.60934 * 10) / 10} km
                      </span>
                      <span className="text-slate-600">⏱️ {metrics.totalDriveMinutes}m drive</span>
                      <span className="text-emerald-700 font-semibold hidden xs:inline">⛽ ~{metrics.estimatedFuelLiters ?? Math.round(metrics.estimatedFuelGallons * 3.78541 * 10) / 10} L</span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                      <span className="text-[10px] text-slate-500">{totalCommittedHours}h / 8h</span>
                      <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            capacityPercent > 90 ? 'bg-red-500' : capacityPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${capacityPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assigned Stops Container (Drop Zone) */}
                  <div className="p-2.5 flex-1 flex flex-col gap-1.5 min-h-[68px] bg-white">
                    {techTickets.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-200 text-[11px] text-slate-400">
                        Drop tickets here to plan route
                      </div>
                    ) : (
                      techTickets.map((stopTicket, index) => {
                        const urg = getUrgencyStyles(stopTicket.urgency);
                        const isCompleted = stopTicket.status === 'COMPLETED';
                        const isInProgress = stopTicket.status === 'IN_PROGRESS';
                        const isEnRoute = stopTicket.status === 'EN_ROUTE';

                        return (
                          <div
                            key={stopTicket.id}
                            id={`tech-stop-${stopTicket.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTicket(stopTicket.id);
                            }}
                            className={`p-2 rounded-lg border ${urg.borderIndicator} flex items-center justify-between text-xs group transition-all shadow-2xs ${
                              isCompleted
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 opacity-80'
                                : isInProgress
                                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/50 shadow-xs'
                                : isEnRoute
                                ? 'bg-blue-50/60 border-blue-200'
                                : `${urg.cardBg} ${urg.cardBorder}`
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                              {/* Sequence Badge */}
                              <span
                                className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white flex-shrink-0 ${
                                  isCompleted ? 'bg-emerald-600' : ''
                                }`}
                                style={!isCompleted ? { backgroundColor: tech.color } : undefined}
                              >
                                {isCompleted ? '✓' : index + 1}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-mono font-bold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                    {stopTicket.ticketNumber}
                                  </span>

                                  {isCompleted ? (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-emerald-600 text-white flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Done
                                    </span>
                                  ) : isInProgress ? (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-amber-500 text-white animate-pulse flex items-center gap-0.5">
                                      <Wrench className="w-2.5 h-2.5 animate-spin" /> In Progress
                                    </span>
                                  ) : isEnRoute ? (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-blue-600 text-white flex items-center gap-0.5">
                                      <Truck className="w-2.5 h-2.5" /> En Route
                                    </span>
                                  ) : (
                                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase border ${urg.badge} flex items-center gap-0.5 shadow-2xs`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />
                                      <span>{urg.level}</span>
                                    </span>
                                  )}

                                  <span className={`font-semibold truncate ${isCompleted ? 'text-slate-500' : 'text-slate-800'}`}>
                                    {stopTicket.customerName}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                  <span className="truncate">{stopTicket.location.address}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-700 shrink-0">
                                    {stopTicket.equipmentType === 'Move-Out Cleaning' ? '📦 Move-Out' : stopTicket.equipmentType === 'Deep Cleaning' ? '🧼 Deep Clean' : '✨ Standard'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              {/* Reorder Buttons for Touch Devices */}
                              {!isCompleted && index > 0 && (
                                <button
                                  onClick={() => {
                                    const currentIds = [...tech.assignedTicketIds];
                                    const prevId = currentIds[index - 1];
                                    currentIds[index - 1] = stopTicket.id;
                                    currentIds[index] = prevId;
                                    onReorderTechTickets(tech.id, currentIds);
                                  }}
                                  className="min-h-[36px] min-w-[28px] px-1 py-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-xs font-bold"
                                  title="Move stop earlier in sequence"
                                  aria-label={`Move stop ${index + 1} earlier`}
                                >
                                  ▲
                                </button>
                              )}

                              {!isCompleted && index < techTickets.length - 1 && (
                                <button
                                  onClick={() => {
                                    const currentIds = [...tech.assignedTicketIds];
                                    const nextId = currentIds[index + 1];
                                    currentIds[index + 1] = stopTicket.id;
                                    currentIds[index] = nextId;
                                    onReorderTechTickets(tech.id, currentIds);
                                  }}
                                  className="min-h-[36px] min-w-[28px] px-1 py-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-xs font-bold"
                                  title="Move stop later in sequence"
                                  aria-label={`Move stop ${index + 1} later`}
                                >
                                  ▼
                                </button>
                              )}

                              {!isCompleted && (
                                <button
                                  onClick={() => onUnassignTicket(stopTicket.id)}
                                  className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Unassign ticket back to queue"
                                  aria-label={`Unassign ticket ${stopTicket.ticketNumber} from ${tech.vanNumber}`}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Expanded Skills & Inventory Drawer */}
                  {isExpanded && (
                    <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs">
                      <div className="mb-2">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Certifications & Skills:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {tech.skills.map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {tech.partsInventory && tech.partsInventory.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Cleaning Equipment / Inventory:
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-700">
                            {tech.partsInventory.map((item, i) => (
                              <div key={i} className="flex items-center justify-between p-1 bg-white border border-slate-200 rounded">
                                <span className="truncate pr-1">{item.name}</span>
                                <span className="font-bold text-blue-600">{item.quantity} {item.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
