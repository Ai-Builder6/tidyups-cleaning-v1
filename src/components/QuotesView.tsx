import React, { useState } from 'react';
import { 
  FileCheck, 
  ExternalLink, 
  Search, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Filter,
  Plus,
  RefreshCw,
  Database,
  Zap,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { JobberQuote } from '../services/jobberSyncModules';

interface QuotesViewProps {
  quotes: JobberQuote[];
  onQuotesUpdated?: (quotes: JobberQuote[]) => void;
  onRefreshQuotes?: () => void;
  onBackToManagement?: () => void;
}

export const QuotesView: React.FC<QuotesViewProps> = ({
  quotes,
  onQuotesUpdated,
  onRefreshQuotes,
  onBackToManagement,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<'ALL' | '2026-09' | '2026-10'>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // New Quote Modal state
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newService, setNewService] = useState('Residential Standard Cleaning');
  const [newTotal, setNewTotal] = useState('280');
  const [newDeposit, setNewDeposit] = useState('50');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.clientName.toLowerCase().includes(search.toLowerCase()) ||
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.service.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || q.quoteStatus === statusFilter;
    const matchesMonth = monthFilter === 'ALL' || (q.createdAt && q.createdAt.startsWith(monthFilter));

    return matchesSearch && matchesStatus && matchesMonth;
  });

  const totalValue = filteredQuotes.reduce((acc, q) => acc + q.total, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'CONVERTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'AWAITING_RESPONSE':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'CHANGES_REQUESTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleSyncWithJobber = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/jobber/sync-quotes', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (data.quotes && onQuotesUpdated) {
          onQuotesUpdated(data.quotes);
        }
        if (data.delta) {
          setSyncFeedback(
            `✓ Incremental Sync: ${data.delta.newCount} new, ${data.delta.updatedCount} updated, ${data.delta.unchangedCount} cached from database (${data.delta.durationMs}ms)`
          );
        } else {
          setSyncFeedback(data.message || 'Quotes synchronized with local database!');
        }
      }
    } catch {
      setSyncFeedback('Sync failed. Please check network connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStatusChange = async (quote: JobberQuote, newStatus: JobberQuote['quoteStatus']) => {
    try {
      const res = await fetch(`/api/database/quotes/${encodeURIComponent(quote.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success && onQuotesUpdated) {
        onQuotesUpdated(
          quotes.map((q) => (q.id === quote.id ? { ...q, quoteStatus: newStatus, updatedAt: new Date().toISOString() } : q))
        );
        setSyncFeedback(`Quote ${quote.quoteNumber} marked as ${newStatus.replace('_', ' ')} in database!`);
      }
    } catch (err) {
      console.warn('Quote status update error:', err);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newTotal) return;
    setIsSubmittingQuote(true);

    try {
      const res = await fetch('/api/database/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: newClientName.trim(),
          clientPhone: newClientPhone.trim() || '(780) 555-0199',
          clientEmail: newClientEmail.trim(),
          service: newService,
          total: Number(newTotal) || 280,
          depositRequired: Number(newDeposit) || 0,
          notes: newNotes.trim(),
          quoteStatus: 'AWAITING_RESPONSE',
        }),
      });

      const data = await res.json();
      if (data.success && data.quote) {
        if (onQuotesUpdated) {
          onQuotesUpdated([data.quote, ...quotes]);
        }
        setIsNewQuoteModalOpen(false);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientEmail('');
        setNewNotes('');
        setSyncFeedback(`✓ Created ${data.quote.quoteNumber} for ${data.quote.clientName} and saved in local database!`);
      }
    } catch (err) {
      console.warn('Failed to create quote:', err);
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50/70 font-sans p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <FileCheck className="w-4 h-4 text-white" />
            </span>
            <span>Job Quotes Pipeline ({filteredQuotes.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>Local Database Copy: Active</span>
            </span>
            <span>• Fast 0ms cache • Incremental Jobber delta sync</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3.5 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 text-purple-900 border border-purple-200/80 rounded-xl font-mono text-xs font-bold shadow-2xs">
            Total Pipeline: <span className="text-pink-600 font-extrabold">${totalValue.toLocaleString()}</span>
          </div>

          <button
            onClick={() => setIsNewQuoteModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quote</span>
          </button>

          {onBackToManagement && (
            <button
              onClick={onBackToManagement}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 cursor-pointer"
            >
              ← Management
            </button>
          )}

          <button
            onClick={handleSyncWithJobber}
            disabled={isSyncing}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync with Jobber (Delta)'}</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast / Banner */}
      {syncFeedback && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center justify-between shadow-2xs animate-fadeIn font-medium">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-2">×</button>
        </div>
      )}

      {/* Local-First Architecture Information Box */}
      <div className="mb-3.5 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Local-First Database Storage:</strong> All {quotes.length} quotes are stored in our Dispatch Genie database (<code>data/dispatch_store.json</code>). Loads instantly without waiting for external Jobber GraphQL roundtrips.
          </span>
        </div>
        <span className="text-[11px] font-mono text-blue-700 bg-white/80 px-2 py-0.5 rounded border border-blue-200 shrink-0">
          Incremental Delta Mode: Only updates modified quotes
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2.5 mb-4">
        {/* Month Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>Filter Month:</span>
          </span>
          <button
            onClick={() => setMonthFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              monthFilter === 'ALL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            All Quotes ({quotes.length})
          </button>
          <button
            onClick={() => setMonthFilter('2026-09')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              monthFilter === '2026-09'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            September 2026 ({quotes.filter((q) => q.createdAt?.startsWith('2026-09')).length})
          </button>
          <button
            onClick={() => setMonthFilter('2026-10')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              monthFilter === '2026-10'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            October 2026 ({quotes.filter((q) => q.createdAt?.startsWith('2026-10')).length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client or quote number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-none shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="AWAITING_RESPONSE">Awaiting Response</option>
              <option value="CONVERTED">Converted to Job</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quotes Cards Grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredQuotes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-200">
            <FileCheck className="w-10 h-10 text-slate-300 mb-2" />
            <p className="font-bold text-slate-700 text-sm">No Quotes Found</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Click &quot;New Quote&quot; to create a quote locally, or &quot;Sync with Jobber&quot; to fetch quotes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredQuotes.map((q) => (
              <div
                key={q.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {q.quoteNumber}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(q.quoteStatus)}`}>
                      {q.quoteStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug mb-1">{q.clientName}</h3>
                  <p className="text-xs text-slate-500 mb-2">{q.service}</p>
                  {q.clientPhone && (
                    <p className="text-[11px] text-slate-400 font-mono mb-2">{q.clientPhone}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total</span>
                      <span className="font-extrabold text-slate-900 text-sm font-mono">${q.total}</span>
                    </div>

                    {q.depositRequired > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Deposit</span>
                        <span className="font-semibold text-emerald-700 font-mono">${q.depositRequired}</span>
                      </div>
                    )}

                    <a
                      href={q.jobberWebUri || 'https://secure.getjobber.com/quotes'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Open in Jobber"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Inline Quick Action Status Buttons */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100/80">
                    {q.quoteStatus !== 'APPROVED' && (
                      <button
                        onClick={() => handleStatusChange(q, 'APPROVED')}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                    {q.quoteStatus !== 'CONVERTED' && (
                      <button
                        onClick={() => handleStatusChange(q, 'CONVERTED')}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Convert to Job
                      </button>
                    )}
                    {q.quoteStatus !== 'AWAITING_RESPONSE' && (
                      <button
                        onClick={() => handleStatusChange(q, 'AWAITING_RESPONSE')}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Awaiting
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create New Job Quote Directly in Database */}
      {isNewQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Create New Job Quote (Local Database)</h3>
              </div>
              <button
                onClick={() => setIsNewQuoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-4 space-y-3.5 text-xs text-slate-700">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer / Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="(780) 555-0199"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cleaning Service Type</label>
                <select
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white"
                >
                  <option value="Residential Standard Cleaning">Residential Standard Cleaning</option>
                  <option value="Residential Deep Scrub Cleaning">Residential Deep Scrub Cleaning</option>
                  <option value="Turnover Move-Out / Vacate Cleaning">Turnover Move-Out / Vacate Cleaning</option>
                  <option value="Commercial Office Cleaning">Commercial Office Cleaning</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Amount ($ CAD) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={newTotal}
                    onChange={(e) => setNewTotal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deposit Required ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newDeposit}
                    onChange={(e) => setNewDeposit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Special Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 3 bedrooms, 2.5 baths. Key under mat."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewQuoteModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingQuote ? 'Saving...' : 'Save to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
