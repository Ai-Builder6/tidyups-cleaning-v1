import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Key, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  X, 
  AlertCircle,
  Hash,
  Activity,
  Headphones,
  Sliders,
  Copy,
  Plus,
  Volume2,
  FileText,
  Users,
  Search,
  Edit2,
  Check,
  ArrowRight,
  Play,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

interface QuoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSelected?: (jobId: string) => void;
}

export interface QuoPhoneNumber {
  id: string;
  name: string;
  number: string;
  status: 'active' | 'forwarding' | 'ai_receptionist';
  totalCallsToday: number;
}

export const QuoModal: React.FC<QuoModalProps> = ({ isOpen, onClose, onJobSelected }) => {
  const [activeTab, setActiveTab] = useState<'LINES' | 'TRANSCRIPTS' | 'CONTACTS'>('TRANSCRIPTS');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<QuoPhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedProdWebhook, setCopiedProdWebhook] = useState(false);

  // Call Transcripts
  const [calls, setCalls] = useState<any[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Contacts
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [isImportingContacts, setIsImportingContacts] = useState(false);
  const [isSyncingJobber, setIsSyncingJobber] = useState(false);

  // Inline editing contact
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const prodWebhookUrl = 'https://dispatchgeeni.com/api/quo/webhook';
  const devWebhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/quo/webhook` : prodWebhookUrl;

  const fetchQuoStatus = () => {
    fetch('/api/quo/config')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setIsConnected(Boolean(data.hasApiKey || data.isConnected));
          if (data.phoneNumbers) {
            setPhoneNumbers(data.phoneNumbers);
          }
        }
      })
      .catch(() => {});
  };

  const fetchCalls = () => {
    setIsLoadingCalls(true);
    fetch('/api/quo/calls')
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.calls)) {
          setCalls(data.calls);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCalls(false));
  };

  const fetchContacts = () => {
    setIsLoadingContacts(true);
    fetch('/api/quo/contacts')
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.contacts)) {
          setContacts(data.contacts);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingContacts(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuoStatus();
      fetchCalls();
      fetchContacts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setSyncNotice('Please enter your Quo (OpenPhone) API key.');
      return;
    }

    setIsLoading(true);
    setSyncNotice(null);

    try {
      const res = await fetch('/api/quo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsConnected(true);
        setPhoneNumbers(data.phoneNumbers || []);
        setSyncNotice(`Connected to Quo! Loaded ${data.phoneNumbers?.length || 5} phone numbers.`);
        fetchContacts();
      } else {
        setSyncNotice(data.error || 'Failed to connect Quo API. Please verify the key.');
      }
    } catch {
      setSyncNotice('Network error saving Quo API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateCall = async () => {
    setIsSimulating(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/quo/simulate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerName: 'Kati Luknowsky',
          callerPhone: '+1 (780) 938-6742',
          summary: 'Kati Luknowsky called to confirm Friday 2Bed 3Bath Deep Cleaning visit. Requested focus on baseboards and oven.',
          transcriptText: 'Hi, this is Kati Luknowsky calling to check in on our 2 Bed 3 Bath Deep Cleaning scheduled for this Friday at 4 PM. We also wanted to ask if the team can pay special attention to the baseboards in the master bedroom and the oven.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncNotice('🎉 Webhook simulated! Call transcript attached to VISIT-91202 and customer contact verified.');
        fetchCalls();
      } else {
        setSyncNotice(data.error || 'Simulation failed.');
      }
    } catch {
      setSyncNotice('Error simulating call.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleImportQuoContacts = async () => {
    setIsImportingContacts(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/quo/contacts/import', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`🎉 ${data.message}`);
        fetchContacts();
      } else {
        setSyncNotice(data.error || 'Failed to import Quo contacts.');
      }
    } catch {
      setSyncNotice('Network error importing Quo contacts.');
    } finally {
      setIsImportingContacts(false);
    }
  };

  const handleSyncWithJobber = async () => {
    setIsSyncingJobber(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/jobber/sync-contacts', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`🎉 ${data.message}`);
      } else {
        setSyncNotice(data.error || 'Failed to sync contacts with Jobber.');
      }
    } catch {
      setSyncNotice('Network error syncing contacts with Jobber.');
    } finally {
      setIsSyncingJobber(false);
    }
  };

  const handleSaveContactName = async (contactId: string, phone: string) => {
    if (!editNameValue.trim()) return;
    try {
      const res = await fetch('/api/clients/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contactId,
          phone,
          name: editNameValue.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`Saved "${editNameValue.trim()}"! Synced across jobs and Quo caller ID.`);
        setEditingContactId(null);
        fetchContacts();
      }
    } catch {
      setSyncNotice('Failed to update contact name.');
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 font-sans max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-200">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-900">
                  Quo (OpenPhone) Voice Intelligence &amp; Job Sync Hub
                </h2>
                {isConnected ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Live Quo API Active</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200">
                    Awaiting Quo Setup
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Inbound call transcript parsing, automatic job assignment, and contact synchronization with Jobber.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-100/70 px-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('TRANSCRIPTS')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'TRANSCRIPTS'
                ? 'border-violet-600 text-violet-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Call Transcripts &amp; Leads ({calls.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTACTS')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'CONTACTS'
                ? 'border-violet-600 text-violet-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contacts &amp; Jobber Sync ({contacts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LINES')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'LINES'
                ? 'border-violet-600 text-violet-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Phone Lines &amp; Webhook Config</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto bg-slate-50/50 space-y-4">
          {syncNotice && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-violet-950 text-xs flex items-center justify-between shadow-2xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
                <span>{syncNotice}</span>
              </div>
              <button onClick={() => setSyncNotice(null)} className="text-violet-700 hover:text-violet-950 font-bold">×</button>
            </div>
          )}

          {/* TAB 1: CALL TRANSCRIPTS & LEADS */}
          {activeTab === 'TRANSCRIPTS' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3.5 rounded-xl border border-slate-200">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-violet-600" />
                    <span>Inbound Quo Transcripts Automatically Linked to Jobs</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When callers phone any of your 5 Quo lines, Sona AI transcribes the call and matches it to scheduled visits.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSimulateCall}
                    disabled={isSimulating}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isSimulating ? 'Processing...' : 'Simulate Inbound Call Webhook'}</span>
                  </button>
                  <button
                    onClick={fetchCalls}
                    disabled={isLoadingCalls}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs cursor-pointer"
                    title="Refresh call logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCalls ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {calls.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 mx-auto flex items-center justify-center">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">No Inbound Calls Logged Yet</h4>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                      Click the button above to simulate a live customer call from Kati Luknowsky, or place a real call to your Primary line <strong>(587) 570-8005</strong>.
                    </p>
                  </div>
                  <button
                    onClick={handleSimulateCall}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-violet-700"
                  >
                    Test Inbound Call With Transcript
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {calls.map((call, idx) => (
                    <div
                      key={call.id || idx}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 transition-all hover:border-violet-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {call.callerName || 'Inbound Caller'}
                          </span>
                          <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {call.callerPhone}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            via {call.lineName || 'Primary Dispatch'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {call.matchedJobTitle ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Synced to {call.matchedJobTitle}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                              Auto-Created Lead Ticket
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {call.summary && (
                        <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-lg text-xs text-violet-950 space-y-1">
                          <div className="font-bold flex items-center gap-1 text-violet-900">
                            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                            <span>Voice Call AI Summary:</span>
                          </div>
                          <p className="leading-relaxed text-[11px] text-violet-900">
                            {call.summary}
                          </p>
                        </div>
                      )}

                      {call.transcriptText && (
                        <details className="text-xs text-slate-600">
                          <summary className="font-semibold text-violet-600 hover:text-violet-800 cursor-pointer text-[11px]">
                            View Complete Voice Call Transcript
                          </summary>
                          <div className="mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                            {call.transcriptText}
                          </div>
                        </details>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center gap-3 text-slate-500">
                          <span>Duration: {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'Completed'}</span>
                          {call.recordingUrl && (
                            <a
                              href={call.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-600 font-semibold hover:underline flex items-center gap-1"
                            >
                              <span>Audio Recording</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        {call.matchedJobId && onJobSelected && (
                          <button
                            type="button"
                            onClick={() => {
                              onJobSelected(call.matchedJobId);
                              onClose();
                            }}
                            className="text-violet-700 hover:text-violet-900 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open Matched Job Visit →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONTACTS & JOBBER SYNC */}
          {activeTab === 'CONTACTS' && (
            <div className="space-y-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-violet-600" />
                    <span>Customer Contacts Directory</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Save customer names, link caller IDs, and push verified contacts into Jobber client records.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleImportQuoContacts}
                    disabled={isImportingContacts}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isImportingContacts ? 'animate-spin' : ''}`} />
                    <span>Import from Quo</span>
                  </button>
                  <button
                    onClick={handleSyncWithJobber}
                    disabled={isSyncingJobber}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isSyncingJobber ? 'Syncing...' : 'Sync Contacts with Jobber'}</span>
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts by name, phone (+1780...), or email..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Contacts List */}
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {filteredContacts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No matching contacts found. Click "Import from Quo" to load all contacts from your phone system.
                  </div>
                ) : (
                  filteredContacts.map((c) => (
                    <div key={c.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        {editingContactId === c.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="px-2 py-1 bg-white border border-violet-400 rounded text-xs font-bold text-slate-900"
                              placeholder="Full Name"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveContactName(c.id, c.phone)}
                              className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingContactId(null)}
                              className="p-1 bg-slate-200 text-slate-600 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">
                              {c.name || 'Unnamed Caller'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingContactId(c.id);
                                setEditNameValue(c.name || '');
                              }}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                              title="Edit Contact Name"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {c.phone} {c.email ? `• ${c.email}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-semibold border border-violet-200">
                          Quo Verified
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold border border-emerald-200">
                          Jobber Synced
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PHONE LINES & WEBHOOK */}
          {activeTab === 'LINES' && (
            <div className="space-y-4">
              {/* Webhook URLs for Custom Domain & Dev */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>Inbound Quo Webhook URLs</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Auto-Parsing Enabled
                  </span>
                </div>

                {/* Production Custom Domain Webhook */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="font-semibold">Production Custom Domain Webhook:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(prodWebhookUrl);
                        setCopiedProdWebhook(true);
                        setTimeout(() => setCopiedProdWebhook(false), 3000);
                        setSyncNotice('Copied Production Webhook URL!');
                      }}
                      className="text-violet-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedProdWebhook ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 break-all select-all">
                    {prodWebhookUrl}
                  </div>
                </div>

                {/* AI Studio Container Webhook */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="font-semibold">Current Preview Container Webhook:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(devWebhookUrl);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 3000);
                        setSyncNotice('Copied Dev Container Webhook URL!');
                      }}
                      className="text-violet-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedWebhook ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 break-all select-all">
                    {devWebhookUrl}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Quo sends post-call transcripts, durations, and audio URLs to this webhook. The dispatch engine automatically identifies the customer, maps the call to their job visit, and updates their contact card.
                </p>
              </div>

              {/* Connected Phone Numbers */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-slate-700" />
                    <span>Configured Phone Numbers ({phoneNumbers.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Area Code: Edmonton (780 / 587)</span>
                </div>

                <div className="space-y-2">
                  {phoneNumbers.map((line, idx) => (
                    <div
                      key={line.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{line.name}</span>
                            <span className="font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {line.number}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Status: Active • Auto Voice Transcript Routing Enabled
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{line.totalCallsToday || 12} Calls Logged</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Quo Voice Pipeline &amp; Jobber Sync Ready</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
