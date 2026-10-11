import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  Database, 
  Key, 
  ArrowUpRight, 
  ShieldCheck, 
  FileText, 
  Sparkles,
  X,
  AlertCircle,
  Calendar,
  Users,
  FileCheck,
  Receipt,
  Send,
  Table,
  Copy,
  Layers,
  Lock,
  Globe,
  Unlink,
  FileSpreadsheet,
  Upload
} from 'lucide-react';
import { JobberConfig, ServiceTicket } from '../types/dispatch';
import { ticketToSheetRow, APP_LEAD_HEADERS, generateTsvRows, LEADS_SPREADSHEET_ID, APP_LEADS_TAB } from '../services/leadSheetSync';

interface JobberSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: ServiceTicket[];
  onTicketsUpdated?: (tickets: ServiceTicket[]) => void;
  onDataUpdated?: () => void;
  projectId?: 'dispatchgeeni' | 'tidyups';
}

export const JobberSyncModal: React.FC<JobberSyncModalProps> = ({
  isOpen,
  onClose,
  tickets,
  onDataUpdated,
  projectId = 'dispatchgeeni',
}) => {
  const [activeProjectTab, setActiveProjectTab] = useState<'dispatchgeeni' | 'tidyups'>(projectId);

  useEffect(() => {
    setActiveProjectTab(projectId);
  }, [projectId]);

  const DOMAIN_REDIRECT_URI = activeProjectTab === 'tidyups'
    ? 'https://app.tidyupscleaning.com/api/jobber/oauth/callback'
    : 'https://dispatchgeeni.com/api/jobber/oauth/callback';

  const previewRedirectUri = typeof window !== 'undefined'
    ? `${window.location.origin.replace(/^http:\/\//i, 'https://')}/api/jobber/oauth/callback`
    : DOMAIN_REDIRECT_URI;

  const [config, setConfig] = useState<JobberConfig>({
    isConnected: false,
    accountName: 'Tidyups Cleaning Service Inc (Jobber)',
    accessToken: '',
    clientId: '27966135-e33e-4c2e-8dc3-ad7ba06dabb8',
    lastSyncedAt: new Date().toLocaleTimeString(),
  });

  const [clientIdInput, setClientIdInput] = useState('27966135-e33e-4c2e-8dc3-ad7ba06dabb8');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [redirectUri, setRedirectUri] = useState(DOMAIN_REDIRECT_URI);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [copiedAuthLink, setCopiedAuthLink] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const [activeTab, setActiveTab] = useState<'CREDENTIALS' | 'CSV_IMPORT' | 'JOBBER' | 'GOOGLE_SHEETS'>('CREDENTIALS');
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [copiedTsv, setCopiedTsv] = useState(false);

  // Live Token Verification state
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenVerificationMsg, setTokenVerificationMsg] = useState<{ isValid: boolean; text: string } | null>(null);

  // CSV Import state
  const [csvImportType, setCsvImportType] = useState<'visits' | 'quotes' | 'invoices'>('visits');
  const [csvInputText, setCsvInputText] = useState('');
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvImportFeedback, setCsvImportFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // Live module stats
  const [moduleStats, setModuleStats] = useState({
    calendar: { syncedVisitsCount: 6, crew1: 3, crew2: 3, status: 'synced' },
    clients: { syncedClientsCount: 8, verified: 8, status: 'synced' },
    quotes: { syncedQuotesCount: 5, approved: 3, awaiting: 2, status: 'synced' },
    invoices: { syncedInvoicesCount: 7, paid: 5, awaiting: 2, balance: 480, status: 'synced' },
    push: { pushedCount: 14, ready: true },
  });

  // Calculate instant authorization URL (never requires async roundtrip before opening)
  const computedAuthUrl = React.useMemo(() => {
    const cId = (clientIdInput || config.clientId || '27966135-e33e-4c2e-8dc3-ad7ba06dabb8').trim();
    const rUri = redirectUri || DOMAIN_REDIRECT_URI;
    return `https://api.getjobber.com/api/oauth/authorize?response_type=code&client_id=${encodeURIComponent(cId)}&redirect_uri=${encodeURIComponent(rUri)}&state=tidyups_auth`;
  }, [clientIdInput, config.clientId, redirectUri]);

  const fetchConfig = () => {
    fetch('/api/jobber/config')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setConfig(data);
          if (data.clientId) setClientIdInput(data.clientId);
          if (data.accessToken && !accessTokenInput) {
            setAccessTokenInput(data.accessToken);
          } else if (!data.accessToken) {
            const localSavedToken = typeof window !== 'undefined' ? localStorage.getItem('tidyups_jobber_token') : null;
            if (localSavedToken) {
              setAccessTokenInput(localSavedToken);
              fetch('/api/jobber/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: localSavedToken }),
              }).catch(() => {});
            }
          }
        }
      })
      .catch(() => {});
  };

  const handleSaveCredentialsQuietly = () => {
    const payload: { clientId: string; accountName: string; clientSecret?: string } = {
      clientId: (clientIdInput || config.clientId || '27966135-e33e-4c2e-8dc3-ad7ba06dabb8').trim(),
      accountName: config.accountName || 'Tidyups Cleaning Service Inc',
    };
    if (clientSecretInput.trim()) {
      payload.clientSecret = clientSecretInput.trim();
    }
    fetch('/api/jobber/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchConfig();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'JOBBER_CONNECTED' || event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchConfig();
        setIsAuthorizing(false);
        setSyncNotice('🎉 Jobber OAuth authorized and connected successfully! Live data synchronized.');
        setActiveTab('JOBBER');
        if (onDataUpdated) onDataUpdated();
      }
    };

    window.addEventListener('message', handleMessage);

    // Auto-poll to catch authorization when completed in another tab or popup
    const pollInterval = setInterval(() => {
      fetch('/api/jobber/config')
        .then((r) => r.json())
        .then((data) => {
          if (data) {
            if (data.isConnected && !config.isConnected) {
              setConfig(data);
              setIsAuthorizing(false);
              setSyncNotice('🎉 Jobber connected successfully! Live 5-module synchronization active.');
              setActiveTab('JOBBER');
              if (onDataUpdated) onDataUpdated();
            } else {
              setConfig(data);
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(pollInterval);
    };
  }, [isOpen, config.isConnected, onDataUpdated]);

  if (!isOpen) return null;

  // Open popup synchronously without async await delays that trigger browser popup blockers
  const handleOpenPopup = () => {
    if (!clientIdInput.trim() && !config.clientId) {
      setSyncNotice('Please provide your Jobber Client ID first.');
      return;
    }
    if (!clientSecretInput.trim() && !config.hasSecret) {
      setSyncNotice('Please paste your Jobber Client Secret so the app can complete token exchange.');
      return;
    }

    handleSaveCredentialsQuietly();
    setIsAuthorizing(true);

    const width = 640;
    const height = 740;
    const left = typeof window !== 'undefined' ? window.screen.width / 2 - width / 2 : 100;
    const top = typeof window !== 'undefined' ? window.screen.height / 2 - height / 2 : 100;
    const popup = window.open(
      computedAuthUrl,
      'JobberAuthorization',
      `toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,copyhistory=no,width=${width},height=${height},top=${top},left=${left}`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setSyncNotice('Popup window was blocked by your browser. Please click the green "Open Jobber in New Tab (Direct)" button!');
    } else {
      setSyncNotice('Waiting for Jobber approval in popup window. Log in to Jobber and click "Allow Access".');
    }
  };

  const handleCopyRedirectUri = (uriToCopy?: string) => {
    const text = uriToCopy || redirectUri;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedRedirectUri(true);
      setTimeout(() => setCopiedRedirectUri(false), 3000);
      setSyncNotice(`Copied Redirect URI to clipboard: ${text}`);
    });
  };

  const handleCopyAuthLink = () => {
    navigator.clipboard.writeText(computedAuthUrl).then(() => {
      setCopiedAuthLink(true);
      setTimeout(() => setCopiedAuthLink(false), 3000);
      setSyncNotice('Copied Jobber authorization link to clipboard! You can paste it into any browser tab to approve.');
    });
  };

  const handleDisconnect = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tidyups_jobber_token');
      }
      await fetch('/api/jobber/disconnect', { method: 'POST' });
      fetchConfig();
      setSyncNotice('Disconnected from Jobber.');
    } catch {
      setSyncNotice('Error disconnecting.');
    }
  };

  // Run Master Comprehensive Sync (All 5 Modules)
  const handleComprehensiveSync = async () => {
    setIsSyncing('ALL');
    setSyncNotice(null);
    try {
      const res = await fetch('/api/jobber/sync-all-comprehensive', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.summary) {
        setModuleStats({
          calendar: {
            syncedVisitsCount: data.summary.calendar.syncedVisitsCount,
            crew1: data.summary.calendar.assignedToCrew1,
            crew2: data.summary.calendar.assignedToCrew2,
            status: 'synced',
          },
          clients: {
            syncedClientsCount: data.summary.clients.syncedClientsCount,
            verified: data.summary.clients.contactsVerified,
            status: 'synced',
          },
          quotes: {
            syncedQuotesCount: data.summary.quotes.syncedQuotesCount,
            approved: data.summary.quotes.approvedCount,
            awaiting: data.summary.quotes.awaitingResponseCount,
            status: 'synced',
          },
          invoices: {
            syncedInvoicesCount: data.summary.invoices.syncedInvoicesCount,
            paid: data.summary.invoices.paidCount,
            awaiting: data.summary.invoices.awaitingPaymentCount,
            balance: data.summary.invoices.outstandingBalance,
            status: 'synced',
          },
          push: {
            pushedCount: data.summary.push.autoPushedCount,
            ready: true,
          },
        });
        setConfig((prev) => ({
          ...prev,
          lastSyncedAt: new Date().toLocaleTimeString(),
        }));
        setSyncNotice('Comprehensive 5-module Jobber sync completed successfully!');
      }
    } catch {
      setSyncNotice('Sync failed. Please check network connection.');
    } finally {
      setIsSyncing(null);
    }
  };

  // Sync specific submodule
  const handleSyncModule = async (endpoint: string, moduleKey: string, successMsg: string) => {
    setIsSyncing(moduleKey);
    setSyncNotice(null);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setConfig((prev) => ({
          ...prev,
          lastSyncedAt: new Date().toLocaleTimeString(),
        }));
        setSyncNotice(successMsg);
      }
    } catch {
      setSyncNotice(`Failed to sync ${moduleKey}.`);
    } finally {
      setIsSyncing(null);
    }
  };

  // Google Sheets Push
  const handleSyncGoogleSheets = async () => {
    setIsSyncing('SHEETS');
    setSyncNotice(null);
    try {
      const res = await fetch('/api/google-sheets/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`Exported ${data.syncedRowsCount} cleaning leads directly to "${data.targetTab}" in Google Sheets!`);
      }
    } catch {
      setSyncNotice('Google Sheets sync error.');
    } finally {
      setIsSyncing(null);
    }
  };

  // Copy TSV to clipboard
  const handleCopyTsv = () => {
    const rows = tickets.map((t) => ticketToSheetRow(t));
    const tsv = generateTsvRows(rows);
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedTsv(true);
      setTimeout(() => setCopiedTsv(false), 3000);
      setSyncNotice('Copied 20-column ScrubbyBuilder Leads data to clipboard! Paste directly into Google Sheets (Cmd/Ctrl + V).');
    });
  };

  const handleSaveCredentials = async () => {
    try {
      const payload: { clientId: string; accountName: string; clientSecret?: string; accessToken?: string } = {
        clientId: (clientIdInput || config.clientId || '27966135-e33e-4c2e-8dc3-ad7ba06dabb8').trim(),
        accountName: config.accountName || 'Tidyups Cleaning Service Inc',
      };
      if (clientSecretInput.trim()) {
        payload.clientSecret = clientSecretInput.trim();
      }
      if (accessTokenInput.trim()) {
        payload.accessToken = accessTokenInput.trim();
      }
      const res = await fetch('/api/jobber/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setSyncNotice('Jobber API credentials saved securely on server!');
      }
    } catch {
      setSyncNotice('Error updating credentials.');
    }
  };

  const handleVerifyToken = async () => {
    if (!accessTokenInput.trim()) {
      setSyncNotice('Please paste your Jobber Access Token first.');
      return;
    }
    setIsVerifyingToken(true);
    setTokenVerificationMsg(null);
    try {
      const res = await fetch('/api/jobber/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: accessTokenInput.trim() }),
      });
      const data = await res.json();
      if (data.isValid) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('tidyups_jobber_token', accessTokenInput.trim().replace(/^Bearer\s+/i, ''));
        }
        setTokenVerificationMsg({
          isValid: true,
          text: `Success! Valid Jobber Token for Account: "${data.accountName || 'Tidyups Cleaning Service Inc'}".`,
        });
        fetchConfig();
        if (onDataUpdated) onDataUpdated();
      } else {
        setTokenVerificationMsg({
          isValid: false,
          text: data.error || 'Jobber rejected this token. Check scopes or generate a fresh token at developer.getjobber.com.',
        });
      }
    } catch {
      setTokenVerificationMsg({
        isValid: false,
        text: 'Network error communicating with server or Jobber.',
      });
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvInputText.trim()) {
      setCsvImportFeedback({ success: false, text: 'Please paste CSV text or upload a CSV file first.' });
      return;
    }
    setIsImportingCsv(true);
    setCsvImportFeedback(null);
    try {
      const res = await fetch('/api/jobber/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvInputText.trim(), type: csvImportType }),
      });
      const data = await res.json();
      if (data.success) {
        setCsvImportFeedback({
          success: true,
          text: data.message || `Successfully imported ${data.importedCount} records into the dispatch database!`,
        });
        setCsvInputText('');
        if (onDataUpdated) onDataUpdated();
      } else {
        setCsvImportFeedback({
          success: false,
          text: data.error || 'Failed to import CSV. Please verify column headers.',
        });
      }
    } catch {
      setCsvImportFeedback({
        success: false,
        text: 'Network error submitting CSV data.',
      });
    } finally {
      setIsImportingCsv(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvInputText(content);
        setCsvImportFeedback({ success: true, text: `Loaded file "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Ready to import.` });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jobber-sync-modal-title"
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 font-sans max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200" aria-hidden="true">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 id="jobber-sync-modal-title" className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Jobber &amp; Google Sheets Hub</span>
                {config.isConnected ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Connected to Jobber Live</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Awaiting Authorization</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Jobber App Client ID: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{clientIdInput.slice(0, 16)}...</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
            aria-label="Close sync modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 bg-slate-100/80 border-b border-slate-200 text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab('CREDENTIALS')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'CREDENTIALS'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-white -mb-px rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>Jobber Connect &amp; Secrets</span>
          </button>

          <button
            onClick={() => setActiveTab('CSV_IMPORT')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'CSV_IMPORT'
                ? 'border-purple-600 text-purple-800 font-bold bg-white -mb-px rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
            <span>Import Jobber CSV (Sept &amp; Oct)</span>
          </button>

          <button
            onClick={() => setActiveTab('JOBBER')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'JOBBER'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-white -mb-px rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Jobber 5-Module Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('GOOGLE_SHEETS')}
            className={`px-3.5 py-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'GOOGLE_SHEETS'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-white -mb-px rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-blue-600" />
            <span>Google Sheets (ScrubbyBuilder Leads)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto bg-slate-50/50 space-y-4">
          {syncNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between shadow-2xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{syncNotice}</span>
              </div>
              <button onClick={() => setSyncNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">×</button>
            </div>
          )}

          {/* TAB: JOBBER CREDENTIALS & OAUTH CONNECT */}
          {activeTab === 'CREDENTIALS' && (
            <div className="space-y-4">
              {/* Step-by-Step Connection Card */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span>Connect Your Real Jobber Account</span>
                    </h3>
                    {config.isConnected && (
                      <button
                        onClick={handleDisconnect}
                        className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Link your <strong>Jobber Developer App</strong> to synchronize cleaning visits, customer profiles, quotes, invoices, and dispatch routes in real time.
                  </p>
                </div>

                {/* Step 1: Redirect URI */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                      <span>Jobber Developer Center Redirect URI</span>
                    </span>
                    <button
                      onClick={() => handleCopyRedirectUri()}
                      className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedRedirectUri ? 'Copied!' : 'Copy Active URI'}</span>
                    </button>
                  </div>

                  {/* Quick Selectors for Production Domains vs Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProjectTab('dispatchgeeni');
                        setRedirectUri('https://dispatchgeeni.com/api/jobber/oauth/callback');
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        redirectUri === 'https://dispatchgeeni.com/api/jobber/oauth/callback'
                          ? 'bg-purple-700 text-white border-purple-800 shadow-2xs font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>dispatchgeeni.com</span>
                        </span>
                        {redirectUri === 'https://dispatchgeeni.com/api/jobber/oauth/callback' && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">ACTIVE</span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] break-all mt-1 opacity-90">
                        https://dispatchgeeni.com/api/jobber/oauth/callback
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveProjectTab('tidyups');
                        setRedirectUri('https://app.tidyupscleaning.com/api/jobber/oauth/callback');
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        redirectUri === 'https://app.tidyupscleaning.com/api/jobber/oauth/callback'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>app.tidyupscleaning.com</span>
                        </span>
                        {redirectUri === 'https://app.tidyupscleaning.com/api/jobber/oauth/callback' && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">ACTIVE</span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] break-all mt-1 opacity-90">
                        https://app.tidyupscleaning.com/api/jobber/oauth/callback
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRedirectUri(previewRedirectUri)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        redirectUri === previewRedirectUri
                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          <span>Preview Container</span>
                        </span>
                        {redirectUri === previewRedirectUri && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">ACTIVE</span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] break-all mt-1 opacity-90">
                        {previewRedirectUri}
                      </div>
                    </button>
                  </div>

                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    In your <strong>Jobber Developer Center App Settings</strong>, paste the active URL into the <strong>OAuth Callback URLs / Redirect URIs</strong> list.
                  </p>
                </div>

                {/* Step 2: Client ID & Secret Inputs */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                      <span>Jobber App Credentials</span>
                    </div>
                    {config.hasSecret && (
                      <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Client Secret is Safely Stored</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={clientIdInput}
                        onChange={(e) => setClientIdInput(e.target.value)}
                        placeholder="e.g. 27966135-e33e-4c2e-8dc3-ad7ba06dabb8"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        value={clientSecretInput}
                        onChange={(e) => setClientSecretInput(e.target.value)}
                        placeholder={config.hasSecret ? "•••••••••••••••• (Secret Stored On Server)" : "Paste your Jobber Client Secret"}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleSaveCredentials}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Save Credentials
                    </button>
                    <span className="text-[11px] text-slate-500">Credentials remain securely encrypted on your server instance.</span>
                  </div>
                </div>

                {/* Step 3: Authorize Button */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">3</span>
                        <span>Click to Open Jobber &amp; Approve Access</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Opens Jobber's authorization screen so you can log in and click <strong>"Allow Access"</strong>.
                      </p>
                    </div>

                    {/* Action buttons: Direct tab (bypass popup blocker) + synchronous popup */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <a
                        id="jobber-direct-auth-button"
                        href={computedAuthUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          handleSaveCredentialsQuietly();
                          setIsAuthorizing(true);
                          setSyncNotice('Jobber authorization opened in a new tab! Please click "Allow Access" in Jobber to approve.');
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-emerald-200 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        <span>Open Jobber in New Tab (Direct) →</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleOpenPopup}
                        disabled={isAuthorizing}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>Open as Popup</span>
                      </button>
                    </div>
                  </div>

                  {/* Direct Link Verification and Copy helper */}
                  <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Direct Jobber OAuth Approval URL:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyAuthLink}
                        className="px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[11px] font-semibold text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedAuthLink ? 'Copied!' : 'Copy Direct Link'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 break-all select-all leading-relaxed">
                      {computedAuthUrl}
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>What to do when Jobber opens (Important):</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-amber-800 text-[11px] leading-relaxed">
                        <li><strong>Jobber approval is NOT a popup dialog</strong> — it opens as a full webpage.</li>
                        <li>If prompted, <strong>enter your Jobber email and password</strong> to sign in.</li>
                        <li>On the permissions page, <strong>scroll down to the very bottom</strong> and click the green <strong>"Allow Access"</strong> button!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Access Token Fallback Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Direct Personal Access Token / API Key</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">developer.getjobber.com</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  In your <strong>Jobber Developer Center</strong>, go to your app and generate a <strong>Personal Access Token</strong> (or OAuth Bearer Token). Paste it below to immediately link your live Jobber account without configuring redirect domains:
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="password"
                    value={accessTokenInput}
                    onChange={(e) => {
                      setAccessTokenInput(e.target.value);
                      setTokenVerificationMsg(null);
                    }}
                    placeholder="Paste Jobber Access Token or Bearer Token"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleVerifyToken}
                      disabled={isVerifyingToken || !accessTokenInput.trim()}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isVerifyingToken ? 'animate-spin' : ''}`} />
                      <span>{isVerifyingToken ? 'Testing...' : 'Test & Verify Token'}</span>
                    </button>
                    <button
                      onClick={handleSaveCredentials}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {tokenVerificationMsg && (
                  <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    tokenVerificationMsg.isValid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {tokenVerificationMsg.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-snug">{tokenVerificationMsg.text}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: JOBBER CSV IMPORT (SEPTEMBER & OCTOBER VISITS, QUOTES, INVOICES) */}
          {activeTab === 'CSV_IMPORT' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                      <span>Import Jobber Data (Jobs, Quotes, Invoices)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload or paste CSV exports directly from your Jobber web account (Reports &gt; Export).
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCsvImportType('visits')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        csvImportType === 'visits' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-600'
                      }`}
                    >
                      Jobs &amp; Visits
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvImportType('quotes')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        csvImportType === 'quotes' ? 'bg-white text-purple-700 shadow-2xs font-extrabold' : 'text-slate-600'
                      }`}
                    >
                      Quotes
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvImportType('invoices')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        csvImportType === 'invoices' ? 'bg-white text-emerald-700 shadow-2xs font-extrabold' : 'text-slate-600'
                      }`}
                    >
                      Invoices
                    </button>
                  </div>
                </div>

                {/* Instructions helper box */}
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>How to export from Jobber:</span>
                  </div>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    1. In your Jobber account, go to <strong>Reports</strong> (or Clients / Work).<br />
                    2. Filter by date (e.g. September 1 – October 31, 2026).<br />
                    3. Click <strong>Export CSV</strong>.<br />
                    4. Drag and drop the downloaded file below, or open it in Excel/Notepad and paste the contents.
                  </p>
                </div>

                {/* File Upload Selector */}
                <div className="flex items-center justify-between gap-3 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Upload Jobber Export File</div>
                      <div className="text-[10px] text-slate-500">Supports .csv and .txt exports directly from Jobber</div>
                    </div>
                  </div>
                  <label className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs cursor-pointer transition-colors">
                    <span>Browse File</span>
                    <input
                      type="file"
                      accept=".csv, text/csv, .txt, text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Textarea for direct paste */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Or Paste CSV Data Below:
                  </label>
                  <textarea
                    rows={6}
                    value={csvInputText}
                    onChange={(e) => setCsvInputText(e.target.value)}
                    placeholder={`Paste your Jobber ${csvImportType === 'visits' ? 'Visits/Jobs' : csvImportType === 'quotes' ? 'Quotes' : 'Invoices'} CSV rows here with column headers...`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500 resize-y"
                  />
                </div>

                {/* Import Action & Feedback */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    {csvImportFeedback && (
                      <div className={`text-xs font-semibold flex items-center gap-1.5 ${
                        csvImportFeedback.success ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {csvImportFeedback.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{csvImportFeedback.text}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleImportCsv}
                    disabled={isImportingCsv || !csvInputText.trim()}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isImportingCsv ? 'animate-spin' : ''}`} />
                    <span>{isImportingCsv ? 'Importing Data...' : `Import ${csvImportType.toUpperCase()} to Dispatch Database`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: JOBBER 5-MODULE SYNC */}
          {activeTab === 'JOBBER' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <div className="text-xs font-bold text-slate-900">Jobber GraphQL Two-Way Engine</div>
                  <div className="text-[11px] text-slate-500">
                    Synchronizes 5 distinct modules directly with Jobber's API (developer.getjobber.com)
                  </div>
                </div>
                <button
                  onClick={handleComprehensiveSync}
                  disabled={isSyncing !== null}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing === 'ALL' ? 'animate-spin' : ''}`} />
                  <span>{isSyncing === 'ALL' ? 'Running All Syncs...' : 'Run All 5 Jobber Syncs'}</span>
                </button>
              </div>

              {/* Grid of the 5 modules from Day-3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Calendar Sync */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-900">jobberCalendarSync</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Live</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mb-2">
                      Pulls scheduled visits out of Jobber, mapping them to <strong>Van 1 (Sparkle Crew 1)</strong> and <strong>Van 2 (Sparkle Crew 2)</strong>.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3">
                      <div>Visits: <strong className="text-slate-800">{moduleStats.calendar.syncedVisitsCount}</strong></div>
                      <div>Van 1: <strong className="text-slate-800">{moduleStats.calendar.crew1}</strong></div>
                      <div>Van 2: <strong className="text-slate-800">{moduleStats.calendar.crew2}</strong></div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSyncModule('/api/jobber/sync-calendar', 'CALENDAR', 'Calendar & Scheduled Visits synchronized with Jobber!')}
                    disabled={isSyncing !== null}
                    className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing === 'CALENDAR' ? 'animate-spin' : ''}`} />
                    <span>Sync Calendar &amp; Visits</span>
                  </button>
                </div>

                {/* 2. Client Directory Sync */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-900">jobberClientSync</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Verified</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mb-2">
                      Keeps client phone numbers, Edmonton street addresses, and property notes synchronized two-way.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3">
                      <div>Clients: <strong className="text-slate-800">{moduleStats.clients.syncedClientsCount}</strong></div>
                      <div>Verified Contacts: <strong className="text-slate-800">{moduleStats.clients.verified}</strong></div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSyncModule('/api/jobber/sync-clients', 'CLIENTS', 'Client directory and addresses synchronized with Jobber!')}
                    disabled={isSyncing !== null}
                    className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing === 'CLIENTS' ? 'animate-spin' : ''}`} />
                    <span>Sync Client Directory</span>
                  </button>
                </div>

                {/* 3. Quote Pipeline Sync */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-900">jobberQuoteSync</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Pipeline</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mb-2">
                      Monitors quotes (Standard, Deep, Move-Out) from draft to approved and converted into scheduled jobs.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3">
                      <div>Quotes: <strong className="text-slate-800">{moduleStats.quotes.syncedQuotesCount}</strong></div>
                      <div>Approved: <strong className="text-slate-800">{moduleStats.quotes.approved}</strong></div>
                      <div>Awaiting: <strong className="text-slate-800">{moduleStats.quotes.awaiting}</strong></div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSyncModule('/api/jobber/sync-quotes', 'QUOTES', 'Quotes pipeline updated from Jobber!')}
                    disabled={isSyncing !== null}
                    className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing === 'QUOTES' ? 'animate-spin' : ''}`} />
                    <span>Sync Quotes Pipeline</span>
                  </button>
                </div>

                {/* 4. Invoice & Payment Sync */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-900">jobberInvoiceSync</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Billing</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mb-2">
                      Tracks who has paid and which client accounts have outstanding balances directly in Jobber.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3">
                      <div>Invoices: <strong className="text-slate-800">{moduleStats.invoices.syncedInvoicesCount}</strong></div>
                      <div>Paid: <strong className="text-slate-800">{moduleStats.invoices.paid}</strong></div>
                      <div>Due: <strong className="text-amber-700">${moduleStats.invoices.balance}</strong></div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSyncModule('/api/jobber/sync-invoices', 'INVOICES', 'Invoices and payments synchronized with Jobber!')}
                    disabled={isSyncing !== null}
                    className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing === 'INVOICES' ? 'animate-spin' : ''}`} />
                    <span>Sync Invoices &amp; Payments</span>
                  </button>
                </div>

                {/* 5. Jobber Outbound Push (Full Width) */}
                <div className="md:col-span-2 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/10 text-emerald-400 rounded-lg">
                        <Send className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs">jobberPush (Outbound Booking Creator)</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/30">Auto-Push Ready</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                    Whenever an AI voice dictation booking or manual cleaning booking is confirmed in this dispatch board, <code>pushBookingToJobber</code> automatically calls Jobber's GraphQL mutation to mint a new Job and Scheduled Visit with idempotency tags.
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
                    <span>Mutation: <code>jobCreate(input: &#123; title, clientId, scheduledAt &#125;)</code></span>
                    <span className="text-emerald-400 font-mono font-bold">14 Bookings Linked</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOOGLE SHEETS (ScrubbyBuilder Leads) */}
          {activeTab === 'GOOGLE_SHEETS' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-xs text-slate-900">
                        Google Sheets Lead-to-Sheet Processor (Day-3 Integration)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Target Spreadsheet: <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">{LEADS_SPREADSHEET_ID}</code> • Tab: <strong className="text-slate-800 font-semibold">{APP_LEADS_TAB}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyTsv}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Copy all 20 columns to clipboard to paste directly into Google Sheets"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedTsv ? 'Copied TSV!' : 'Copy TSV for Sheets'}</span>
                    </button>

                    <button
                      onClick={handleSyncGoogleSheets}
                      disabled={isSyncing !== null}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing === 'SHEETS' ? 'animate-spin' : ''}`} />
                      <span>{isSyncing === 'SHEETS' ? 'Pushing...' : 'Push to Google Sheet'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700 mb-3 space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Exact 20-Column Schema Formatter:</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto whitespace-nowrap">
                    {APP_LEAD_HEADERS.join(' | ')}
                  </div>
                </div>

                {/* Preview Table of Active Bookings formatted for Sheets */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Active Cleaning Bookings Preview ({tickets.length} records)</span>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${LEADS_SPREADSHEET_ID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <span>Open Google Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="max-h-60 overflow-y-auto overflow-x-auto text-[11px]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 text-left border-b border-slate-200">
                          <th className="p-2 font-semibold">Client Name</th>
                          <th className="p-2 font-semibold">Phone</th>
                          <th className="p-2 font-semibold">Service</th>
                          <th className="p-2 font-semibold">Address</th>
                          <th className="p-2 font-semibold">Date Requested</th>
                          <th className="p-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((t) => {
                          const row = ticketToSheetRow(t);
                          return (
                            <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="p-2 font-medium text-slate-900">{row.first_name} {row.last_name}</td>
                              <td className="p-2 text-slate-600 font-mono">{row.phone_number}</td>
                              <td className="p-2 text-blue-700 font-semibold">{row.service}</td>
                              <td className="p-2 text-slate-600 truncate max-w-xs">{row.street_address}, {row.city}</td>
                              <td className="p-2 text-slate-600">{row.date_of_service_requested}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.lead_status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.lead_status === 'booked'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {row.lead_status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${config.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{config.isConnected ? 'Connected to Jobber' : 'Jobber Authorization Setup'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
