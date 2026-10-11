import React from 'react';
import { 
  SlidersHorizontal, 
  FileCheck, 
  Receipt, 
  Users, 
  RefreshCw, 
  PhoneCall, 
  HelpCircle, 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  Truck, 
  Globe, 
  ExternalLink,
  Sparkles,
  Database,
  Building,
  Key,
  Edit2,
  MapPin,
  Phone,
  User,
  Navigation
} from 'lucide-react';
import { Technician } from '../types/dispatch';

interface ManagementHubViewProps {
  onNavigateToQuotes: () => void;
  onNavigateToInvoices: () => void;
  onOpenStaffRoster: () => void;
  onOpenJobberSync: () => void;
  onOpenQuoModal: () => void;
  onNavigateToLegal: (tab: 'SUPPORT' | 'TERMS' | 'PRIVACY') => void;
  onNavigateToCustomerPortal: () => void;
  quotesCount?: number;
  invoicesCount?: number;
  staffCount?: number;
  cleanersCount?: number;
  technicians?: Technician[];
  onEditVanHub?: (tech: Technician) => void;
  onSyncFirestore?: () => void;
  isSyncingFirestore?: boolean;
}

export const ManagementHubView: React.FC<ManagementHubViewProps> = ({
  onNavigateToQuotes,
  onNavigateToInvoices,
  onOpenStaffRoster,
  onOpenJobberSync,
  onOpenQuoModal,
  onNavigateToLegal,
  onNavigateToCustomerPortal,
  quotesCount = 0,
  invoicesCount = 0,
  staffCount = 15,
  cleanersCount = 15,
  technicians = [],
  onEditVanHub,
  onSyncFirestore,
  isSyncingFirestore = false,
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-100 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Management &amp; Operations</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Centralized hub for quotes, invoices, mobile fleet and van hubs, staff roster, policies, and Jobber CRM sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenJobberSync}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Jobber Status</span>
          </button>
        </div>
      </div>

      {/* Main Grid of Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* 1. Quotes Pipeline */}
        <div className="bg-[#151923] border border-slate-800 hover:border-amber-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Quotes Pipeline</h3>
                {quotesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    ⚡ {quotesCount} in Local DB
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Fast local database copy loads in 0ms. Incremental Jobber delta sync only pulls modified quotes, preserving your entire pipeline.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToQuotes}
            className="w-full py-2.5 px-4 bg-amber-600/90 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Quotes Pipeline (Local DB)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Invoices & Billing */}
        <div className="bg-[#151923] border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Invoices &amp; Billing</h3>
                {invoicesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    ⚡ {invoicesCount} in Local DB
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Real-time billing ledger cached in database. Tracks paid and due balances with fast incremental delta sync from Jobber.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToInvoices}
            className="w-full py-2.5 px-4 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Invoices &amp; Billing (Local DB)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Staff, Vans & Hubs Roster */}
        <div className="bg-[#151923] border border-slate-800 hover:border-purple-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Staff &amp; Roster Master</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  {staffCount} Members
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Manage mobile cleaning staff, roles, spreadsheet CSV imports, archive status, and employee permissions.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenStaffRoster}
            className="w-full py-2.5 px-4 bg-purple-600/90 hover:bg-purple-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Staff Roster Spreadsheet</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4. Quo Voice Intake & Contacts */}
        <div className="bg-[#151923] border border-slate-800 hover:border-pink-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Quo Voice &amp; Contacts</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Access incoming voice calls, call transcripts, auto-logged phone leads, and synchronized Quo contact lists.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenQuoModal}
            className="w-full py-2.5 px-4 bg-pink-600/90 hover:bg-pink-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Quo Voice Desk</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 5. Support & Dispatch Policies */}
        <div className="bg-[#151923] border border-slate-800 hover:border-blue-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Support &amp; Policies</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Dispatch support desk, customer satisfaction guidelines, damage protocols, and staff training documentation.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToLegal('SUPPORT')}
            className="w-full py-2.5 px-4 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Support &amp; Policies</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 6. Terms of Service & Privacy */}
        <div className="bg-[#151923] border border-slate-800 hover:border-slate-600 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Terms &amp; Privacy</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Legal customer agreements, cancellation policy clauses, deposit requirements, and privacy disclosures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToLegal('TERMS')}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Terms of Service
            </button>
            <button
              onClick={() => onNavigateToLegal('PRIVACY')}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {/* 7. Customer Booking Portal */}
        <div className="bg-[#151923] border border-slate-800 hover:border-pink-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Customer Booking Portal</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Public client booking landing page for residential and commercial customers to request cleaning estimates.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToCustomerPortal}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <span>Open Booking Portal View</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* 8. Firebase Cloud Firestore Database */}
        <div className="bg-[#151923] border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Cloud Firestore</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Persistent multi-tenant database: clients, scheduled visits, unscheduled jobs, quotes, invoices, and van hubs.
              </p>
              <div className="mt-2 text-[10px] font-mono text-indigo-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800 truncate">
                ai-studio-cleaningserviced-8a2493ab-cb9d-4c28-a60b-c28e7d08d30e
              </div>
            </div>
          </div>

          {onSyncFirestore && (
            <button
              onClick={onSyncFirestore}
              disabled={isSyncingFirestore}
              className="w-full py-2.5 px-4 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
              <span>{isSyncingFirestore ? 'Syncing to Firestore...' : 'Sync Live Store to Firestore'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Fleet & Van Hubs Direct Management Section */}
      <div className="bg-[#151923] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Mobile Fleet Vans &amp; Home Hubs</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  {technicians.length} Vans Stationed
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live fleet units deployed across Greater Edmonton. Click "Edit Van &amp; Hub" on any unit to rename the vehicle, change driver assignment, phone number, or home depot base.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenStaffRoster}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Full Staff Roster ({staffCount})</span>
          </button>
        </div>

        {/* Grid of Van Units */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {technicians.map((tech) => (
            <div 
              key={tech.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all group"
            >
              <div className="space-y-2.5">
                {/* Header: Color & Van Identifier */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-xs"
                      style={{ backgroundColor: tech.color || '#2563EB' }}
                    >
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white leading-tight">
                        {tech.vanNumber || tech.id}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tech.role}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    tech.status === 'AVAILABLE' 
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {tech.status === 'AVAILABLE' ? 'On Duty' : 'Off Duty'}
                  </span>
                </div>

                {/* Driver Info */}
                <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{tech.name}</span>
                  </div>
                  {tech.phone && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                      <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{tech.phone}</span>
                    </div>
                  )}
                </div>

                {/* Hub Depot Info */}
                <div className="p-2.5 bg-purple-950/20 rounded-xl border border-purple-900/30 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                    <MapPin className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    <span className="truncate">{tech.depotLocation?.name || `${tech.name} Home Hub`}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 pl-4.5">
                    {tech.depotLocation?.address || tech.homeAddress || 'Edmonton, AB'}
                  </p>
                  {tech.depotLocation && (
                    <div className="text-[9px] text-slate-500 font-mono pl-4.5 flex items-center gap-1">
                      <Navigation className="w-2.5 h-2.5 text-slate-500" />
                      <span>{tech.depotLocation.lat.toFixed(4)}° N, {Math.abs(tech.depotLocation.lng).toFixed(4)}° W</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Van & Hub Button */}
              {onEditVanHub && (
                <button
                  type="button"
                  onClick={() => onEditVanHub(tech)}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/80 active:scale-98"
                >
                  <Edit2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Edit Van &amp; Hub Details</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
