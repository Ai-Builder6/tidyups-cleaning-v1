import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  PhoneCall, 
  MessageSquare, 
  MapPin, 
  Tag, 
  Edit2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Calendar, 
  ExternalLink, 
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  Copy,
  Check,
  Filter,
  Trash2
} from 'lucide-react';
import { ClientRecord, ClientVerdict } from '../types/client';
import { ClientModal } from './ClientModal';

interface ClientsDatabaseViewProps {
  clients: ClientRecord[];
  onUpdateClient: (updated: ClientRecord) => void;
  onAddClient: (newClient: ClientRecord) => void;
  onDeleteClient: (clientId: string) => void;
  onOpenQuoModal?: () => void;
  onSelectClientOnMap?: (client: ClientRecord) => void;
  onScheduleClient?: (client: ClientRecord) => void;
}

export const ClientsDatabaseView: React.FC<ClientsDatabaseViewProps> = ({
  clients,
  onUpdateClient,
  onAddClient,
  onDeleteClient,
  onOpenQuoModal,
  onSelectClientOnMap,
  onScheduleClient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | ClientVerdict | 'JOBBER_LINKED'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected client for edit modal
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Per-card quick tag inputs
  const [cardTagInputs, setCardTagInputs] = useState<Record<string, string>>({});
  const [copiedPhoneMap, setCopiedPhoneMap] = useState<Record<string, boolean>>({});
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isSyncingJobber, setIsSyncingJobber] = useState(false);
  const [isImportingQuo, setIsImportingQuo] = useState(false);

  const handleSyncWithJobber = async () => {
    setIsSyncingJobber(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/jobber/sync-contacts', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`🎉 ${data.message}`);
        if (data.clients && Array.isArray(data.clients)) {
          data.clients.forEach((c: ClientRecord) => onUpdateClient(c));
        }
      } else {
        setSyncNotice(data.error || 'Failed to sync contacts with Jobber.');
      }
    } catch {
      setSyncNotice('Network error syncing with Jobber.');
    } finally {
      setIsSyncingJobber(false);
    }
  };

  const handleImportFromQuo = async () => {
    setIsImportingQuo(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/quo/contacts/import', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`🎉 ${data.message}`);
        if (data.clients && Array.isArray(data.clients)) {
          data.clients.forEach((c: ClientRecord) => onUpdateClient(c));
        }
      } else {
        setSyncNotice(data.error || 'Failed to import Quo contacts.');
      }
    } catch {
      setSyncNotice('Network error importing Quo contacts.');
    } finally {
      setIsImportingQuo(false);
    }
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesPhone = c.phone?.toLowerCase().includes(q) || (c.secondaryPhone || '').toLowerCase().includes(q);
        const matchesEmail = (c.email || '').toLowerCase().includes(q);
        const matchesAddress = (c.address || '').toLowerCase().includes(q);
        const matchesTags = c.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesVerdict = c.verdict?.toLowerCase().includes(q);

        if (!matchesName && !matchesPhone && !matchesEmail && !matchesAddress && !matchesTags && !matchesVerdict) {
          return false;
        }
      }

      // Verdict filter
      if (verdictFilter === 'JOBBER_LINKED') {
        if (!c.isJobberLinked) return false;
      } else if (verdictFilter !== 'ALL') {
        if (c.verdict !== verdictFilter) return false;
      }

      // Date range filter
      if (fromDate && c.latestServiceDate) {
        if (c.latestServiceDate < fromDate) return false;
      }
      if (toDate && c.latestServiceDate) {
        if (c.latestServiceDate > toDate) return false;
      }

      return true;
    });
  }, [clients, searchQuery, verdictFilter, fromDate, toDate]);

  // Counts
  const counts = useMemo(() => {
    return {
      total: clients.length,
      goodLead: clients.filter((c) => c.verdict === 'Good lead').length,
      badLead: clients.filter((c) => c.verdict === 'Bad lead').length,
      spam: clients.filter((c) => c.verdict === 'Spam').length,
      client: clients.filter((c) => c.verdict === 'Client').length,
      jobberLinked: clients.filter((c) => c.isJobberLinked).length,
    };
  }, [clients]);

  // Quick verdict update on card
  const handleQuickVerdictChange = (client: ClientRecord, newVerdict: ClientVerdict) => {
    const updated: ClientRecord = {
      ...client,
      verdict: newVerdict,
      updatedAt: new Date().toISOString(),
    };
    onUpdateClient(updated);
  };

  // Quick tag add on card
  const handleAddCardTag = (client: ClientRecord) => {
    const raw = (cardTagInputs[client.id] || '').trim().toLowerCase();
    if (!raw) return;
    if (client.tags.includes(raw)) {
      setCardTagInputs((prev) => ({ ...prev, [client.id]: '' }));
      return;
    }
    const updated: ClientRecord = {
      ...client,
      tags: [...client.tags, raw],
      updatedAt: new Date().toISOString(),
    };
    onUpdateClient(updated);
    setCardTagInputs((prev) => ({ ...prev, [client.id]: '' }));
  };

  // Quick tag remove on card
  const handleRemoveCardTag = (client: ClientRecord, tagToRemove: string) => {
    const updated: ClientRecord = {
      ...client,
      tags: client.tags.filter((t) => t !== tagToRemove),
      updatedAt: new Date().toISOString(),
    };
    onUpdateClient(updated);
  };

  const handleCopyPhone = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPhoneMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedPhoneMap((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────
          Header matching Screenshots 2, 3, 4
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Clients</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
              {clients.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {clients.length} clients on file, gathered from bookings, Jobber and leads.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleImportFromQuo}
            disabled={isImportingQuo}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isImportingQuo ? 'animate-spin' : ''}`} />
            <span>{isImportingQuo ? 'Importing...' : 'Import from Quo'}</span>
          </button>

          <button
            onClick={handleSyncWithJobber}
            disabled={isSyncingJobber}
            className="px-3.5 py-2 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isSyncingJobber ? 'Syncing...' : 'Sync with Jobber'}</span>
          </button>

          {onOpenQuoModal && (
            <button
              onClick={onOpenQuoModal}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
            >
              <span>Review Quo contacts</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingClient(null);
              setIsClientModalOpen(true);
            }}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-pink-900/30 active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New Client</span>
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="p-3.5 bg-violet-950/60 border border-violet-800/80 rounded-xl text-violet-200 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button onClick={() => setSyncNotice(null)} className="text-violet-400 hover:text-white font-bold cursor-pointer">×</button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          Search & Date Range Filters matching Screenshot 2, 3, 4
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        {/* Search input with ⌘K */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by name, phone, email, address or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 font-medium focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
          />
          <div className="absolute right-3 top-2.5 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px] font-bold border border-slate-700">
            ⌘K
          </div>
        </div>

        {/* Date Filters & Quick Verdict Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          {/* Service Date Range */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                From service date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-hidden focus:border-pink-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                To service date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-hidden focus:border-pink-500"
                />
              </div>
            </div>

            {(fromDate || toDate || searchQuery) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearchQuery('');
                  setVerdictFilter('ALL');
                }}
                className="self-end px-2.5 py-1.5 text-xs text-pink-400 hover:text-pink-300 font-bold cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Quick Filter Verdict Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setVerdictFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                verdictFilter === 'ALL'
                  ? 'bg-white text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setVerdictFilter('Good lead')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                verdictFilter === 'Good lead'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-cyan-400 hover:text-cyan-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Good lead ({counts.goodLead})</span>
            </button>
            <button
              onClick={() => setVerdictFilter('Bad lead')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                verdictFilter === 'Bad lead'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-amber-400 hover:text-amber-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Bad lead ({counts.badLead})</span>
            </button>
            <button
              onClick={() => setVerdictFilter('Spam')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                verdictFilter === 'Spam'
                  ? 'bg-red-500 text-white shadow-md font-black'
                  : 'bg-slate-800/80 text-red-400 hover:text-red-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Spam ({counts.spam})</span>
            </button>
            <button
              onClick={() => setVerdictFilter('Client')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                verdictFilter === 'Client'
                  ? 'bg-pink-600 text-white shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <span>Client ({counts.client})</span>
            </button>
            <button
              onClick={() => setVerdictFilter('JOBBER_LINKED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                verdictFilter === 'JOBBER_LINKED'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <span>Jobber ({counts.jobberLinked})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          Cards Grid (3 Columns on Desktop matching Screenshots 2, 3, 4)
         ───────────────────────────────────────────────────────────────────────── */}
      {filteredClients.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-black text-white">No clients match your filter criteria</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search terms, dates, or verdict status tag.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredClients.map((client) => {
            const tagInputVal = cardTagInputs[client.id] || '';
            const isCopied1 = copiedPhoneMap[`${client.id}-1`];
            const isCopied2 = copiedPhoneMap[`${client.id}-2`];

            return (
              <div
                key={client.id}
                className="bg-[#12151d] hover:bg-[#151923] border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-lg transition-all duration-150 group"
              >
                {/* Top Section */}
                <div className="space-y-3">
                  {/* Card Header: Name + Jobber Pill + Edit Icon */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate max-w-[200px]" title={client.name}>
                        {client.name}
                      </h3>

                      {client.isJobberLinked && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/70 flex items-center gap-1 shadow-2xs">
                          <span>↔ Jobber</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingClient(client);
                        setIsClientModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Edit Client Information & Phone Numbers"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick verdict badge */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Quick verdict
                    </div>
                    <div>
                      {client.verdict === 'Good lead' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
                          Good lead
                        </span>
                      ) : client.verdict === 'Bad lead' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">
                          Bad lead
                        </span>
                      ) : client.verdict === 'Spam' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-950/70 text-red-300 border border-red-800/60">
                          Spam
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          Client
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick status selector buttons (shared with calls and leads) */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-slate-400 font-medium">
                      Quick status (shared with calls and leads)
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold mr-0.5">Tag:</span>
                      {(['Client', 'Good lead', 'Bad lead', 'Spam'] as ClientVerdict[]).map((v) => {
                        const isSelected = client.verdict === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleQuickVerdictChange(client, v)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? v === 'Good lead'
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-xs'
                                  : v === 'Bad lead'
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                                  : v === 'Spam'
                                  ? 'bg-red-600 text-white border-red-500 font-black shadow-xs'
                                  : 'bg-white text-slate-950 border-white font-black shadow-xs'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                            }`}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Client tags section (synced with Jobber when linked) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] text-slate-400 font-medium">
                      Client tags (synced with Jobber when linked)
                    </div>

                    {/* Tag input row */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Add a tag (e.g. block)"
                        value={tagInputVal}
                        onChange={(e) => setCardTagInputs((prev) => ({ ...prev, [client.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCardTag(client);
                          }
                        }}
                        className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 font-medium focus:outline-hidden focus:border-pink-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCardTag(client)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    {/* Tags Pills */}
                    {client.tags && client.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {client.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-slate-800/90 text-slate-300 border border-slate-700/80 rounded text-[10px] font-medium flex items-center gap-1"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCardTag(client, tag)}
                              className="text-slate-500 hover:text-red-400 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sync Jobber tags helper notice */}
                  <div className="space-y-0.5 pt-1 text-[10px] text-slate-400 leading-relaxed border-t border-slate-900">
                    <div className="font-bold text-slate-300">Sync Jobber tags</div>
                    <p className="text-slate-400">
                      Tags sync with this linked Jobber client. Sync also brings in tags added in Jobber.
                    </p>
                  </div>
                </div>

                {/* Bottom Details Section: Phones, Address, Source */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                  {/* Primary Phone */}
                  <div className="flex items-center justify-between group/phone">
                    <div className="flex items-center gap-1.5 font-mono text-slate-200">
                      <Phone className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <a href={`tel:${client.phone}`} className="hover:text-pink-300 font-bold">
                        {client.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover/phone:opacity-100 transition-opacity">
                      <a
                        href={`tel:${client.phone}`}
                        className="px-2 py-0.5 bg-pink-950/60 hover:bg-pink-900 text-pink-300 border border-pink-800/60 rounded text-[10px] font-bold"
                        title="Click to dial"
                      >
                        Call
                      </a>
                      <a
                        href={`sms:${client.phone}`}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold"
                        title="Send SMS"
                      >
                        Text
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(`${client.id}-1`, client.phone)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        title="Copy phone"
                      >
                        {isCopied1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Secondary Phone (if available or add prompt) */}
                  {client.secondaryPhone ? (
                    <div className="flex items-center justify-between group/altphone">
                      <div className="flex items-center gap-1.5 font-mono text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Alt:</span>
                        <a href={`tel:${client.secondaryPhone}`} className="hover:text-pink-300 font-bold">
                          {client.secondaryPhone}
                        </a>
                      </div>
                      <div className="flex items-center gap-1 opacity-80 group-hover/altphone:opacity-100 transition-opacity">
                        <a
                          href={`tel:${client.secondaryPhone}`}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold"
                        >
                          Call
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(`${client.id}-2`, client.secondaryPhone!)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          {isCopied2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClient(client);
                        setIsClientModalOpen(true);
                      }}
                      className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ Add 2nd phone number</span>
                    </button>
                  )}

                  {/* Address */}
                  {client.address && (
                    <div className="flex items-start gap-1.5 text-slate-400 text-[11px] leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-slate-200 transition-colors"
                        title="Open on Google Maps"
                      >
                        {client.address}
                      </a>
                    </div>
                  )}

                  {/* Footer Source */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>From {client.source || 'Jobber'}</span>

                    <div className="flex items-center gap-2">
                      {onSelectClientOnMap && (
                        <button
                          type="button"
                          onClick={() => onSelectClientOnMap(client)}
                          className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>View on Map</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Edit / Create Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setEditingClient(null);
        }}
        client={editingClient}
        onSave={(savedClient) => {
          if (editingClient) {
            onUpdateClient(savedClient);
          } else {
            onAddClient(savedClient);
          }
        }}
        onDelete={(clientId) => {
          onDeleteClient(clientId);
        }}
      />
    </div>
  );
};
