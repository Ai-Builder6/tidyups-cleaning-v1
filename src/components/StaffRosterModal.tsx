import React, { useState } from 'react';
import { 
  Users, 
  X, 
  Download, 
  Upload, 
  Plus, 
  Check, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Mail, 
  Sparkles, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckCircle2,
  UserX,
  UserCheck,
  Info
} from 'lucide-react';
import { 
  JobberStaffMember, 
  CANONICAL_JOBBER_STAFF, 
  parseStaffCsv, 
  generateStaffCsv,
  approximateEdmontonCoords
} from '../services/staffRosterService';

interface StaffRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: JobberStaffMember[];
  onUpdateStaffList: (updatedList: JobberStaffMember[]) => void;
}

export const StaffRosterModal: React.FC<StaffRosterModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onUpdateStaffList,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'Owner' | 'Dispatcher' | 'Cleaner'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  
  // CSV Import / Paste state
  const [isCsvInputOpen, setIsCsvInputOpen] = useState(false);
  const [csvTextInput, setCsvTextInput] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Add / Edit Single Staff State
  const [editingStaff, setEditingStaff] = useState<JobberStaffMember | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  // Delete Confirmation State
  const [staffToDelete, setStaffToDelete] = useState<JobberStaffMember | null>(null);

  // Toast feedback message
  const [toastFeedback, setToastFeedback] = useState<{
    text: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastFeedback({ text, type });
    setTimeout(() => {
      setToastFeedback((curr) => (curr?.text === text ? null : curr));
    }, 4000);
  };

  if (!isOpen) return null;

  const activeCount = staffList.filter((s) => s.active !== false).length;
  const archivedCount = staffList.filter((s) => s.active === false).length;

  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.homeAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.vanUnit.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || staff.role === roleFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && staff.active !== false) ||
      (statusFilter === 'ARCHIVED' && staff.active === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle CSV Import
  const handleProcessCsvImport = () => {
    if (!csvTextInput.trim()) {
      setSyncStatusMsg('Please paste your CSV spreadsheet data.');
      return;
    }

    try {
      const parsed = parseStaffCsv(csvTextInput);
      if (parsed.length === 0) {
        setSyncStatusMsg('No valid rows found in the pasted CSV.');
        return;
      }

      onUpdateStaffList(parsed);

      // Save to server
      fetch('/api/staff/sync-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvTextInput }),
      }).catch(err => console.warn('Could not post CSV to server:', err));

      setSyncStatusMsg(`Successfully synchronized ${parsed.length} staff members with Jobber!`);
      showToast(`Synchronized ${parsed.length} staff members with Jobber spreadsheet!`, 'success');
      setTimeout(() => {
        setIsCsvInputOpen(false);
        setSyncStatusMsg(null);
        setCsvTextInput('');
      }, 1200);
    } catch (err: any) {
      setSyncStatusMsg(`Error parsing CSV: ${err.message}`);
    }
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    const csvContent = generateStaffCsv(staffList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'jobber_staff_roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded Jobber staff spreadsheet CSV', 'info');
  };

  // Handle Archive / Deactivate Toggle
  const handleToggleArchiveStaff = (staff: JobberStaffMember) => {
    const newActiveState = staff.active === false; // If currently false, reactivate to true. Else archive to false.
    const updatedList = staffList.map((s) =>
      s.id === staff.id ? { ...s, active: newActiveState } : s
    );

    onUpdateStaffList(updatedList);

    // Call server API
    fetch('/api/staff/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: staff.id, active: newActiveState }),
    }).catch((err) => console.warn('Server archive sync error:', err));

    if (newActiveState) {
      showToast(`${staff.name} is reactivated and available for job dispatch.`, 'success');
    } else {
      showToast(
        `${staff.name} is archived. Past job history is preserved, but they are removed from active dispatch.`,
        'warning'
      );
    }
  };

  // Handle Delete Staff Permanently
  const handleConfirmDelete = () => {
    if (!staffToDelete) return;

    const target = staffToDelete;
    const updatedList = staffList.filter((s) => s.id !== target.id);

    onUpdateStaffList(updatedList);

    // Call server API
    fetch('/api/staff/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: target.id }),
    }).catch((err) => console.warn('Server delete sync error:', err));

    showToast(`${target.name} has been removed from the staff roster.`, 'info');
    setStaffToDelete(null);
    if (editingStaff?.id === target.id) {
      setEditingStaff(null);
    }
  };

  // Handle Save Single Staff Member
  const handleSaveStaffMember = () => {
    if (!editingStaff || !editingStaff.name.trim()) return;

    let updated: JobberStaffMember[];
    if (isAddMode) {
      updated = [...staffList, { ...editingStaff, id: `staff-${Date.now()}` }];
      showToast(`Added ${editingStaff.name} to Jobber staff roster!`, 'success');
    } else {
      updated = staffList.map((s) => (s.id === editingStaff.id ? editingStaff : s));
      showToast(`Saved changes for ${editingStaff.name}.`, 'success');
    }

    onUpdateStaffList(updated);

    // Save CSV to server
    const newCsv = generateStaffCsv(updated);
    fetch('/api/staff/sync-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText: newCsv }),
    }).catch((err) => console.warn('Could not post updated staff to server:', err));

    setEditingStaff(null);
    setIsAddMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-pink-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">Jobber Staff Roster &amp; Spreadsheet Sync</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-white">
                  {activeCount} Active • {archivedCount} Archived
                </span>
              </div>
              <p className="text-xs text-white/80">
                Syncs with Jobber spreadsheet: archive cleaners who are not working anymore or delete them from the roster
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification Banner */}
        {toastFeedback && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-all shrink-0 ${
              toastFeedback.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-b border-amber-200'
                : toastFeedback.type === 'info'
                ? 'bg-blue-50 text-blue-900 border-b border-blue-200'
                : 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastFeedback.type === 'warning' ? (
                <Archive className="w-4 h-4 text-amber-600 shrink-0" />
              ) : toastFeedback.type === 'info' ? (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{toastFeedback.text}</span>
            </div>
            <button
              onClick={() => setToastFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Controls & Filters Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Search, Status & Role Filters */}
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search cleaners by name, email, phone, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({staffList.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Active ({activeCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('ARCHIVED')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'ARCHIVED'
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="w-3 h-3" />
                <span>Archived ({archivedCount})</span>
              </button>
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="Cleaner">Cleaners</option>
              <option value="Dispatcher">Dispatchers</option>
              <option value="Owner">Owner</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setCsvTextInput(generateStaffCsv(staffList));
                setIsCsvInputOpen(true);
                setSyncStatusMsg(null);
              }}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Paste Spreadsheet</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download CSV spreadsheet matching Jobber format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setEditingStaff({
                  id: `staff-${Date.now()}`,
                  name: '',
                  email: '',
                  phone: '',
                  role: 'Cleaner',
                  lead: false,
                  active: true,
                  homeAddress: 'Edmonton, AB',
                  color: '#3B82F6',
                  vanUnit: `Unit ${staffList.length + 1}`,
                  lat: 53.5200,
                  lng: -113.5000,
                });
                setIsAddMode(true);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Cleaner</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Staff / Color</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Role &amp; Van Unit</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Home Hub / Depot Address</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No staff members match the current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const isArchived = staff.active === false;

                    return (
                      <tr 
                        key={staff.id} 
                        className={`transition-colors ${
                          isArchived 
                            ? 'bg-slate-50/70 opacity-75 hover:bg-slate-100/60' 
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-white ${
                                isArchived ? 'grayscale' : ''
                              }`}
                              style={{ backgroundColor: staff.color }}
                              title={`Jobber Color: ${staff.color}`}
                            />
                            <div className="flex flex-col">
                              <span className={`font-bold ${isArchived ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                                {staff.name}
                              </span>
                              {isArchived && (
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  Not working / Off-duty
                                </span>
                              )}
                            </div>
                            {staff.lead && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-800">
                                Lead
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-3">
                          {isArchived ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Archive className="w-2.5 h-2.5 text-amber-600" />
                              <span>Archived</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                staff.role === 'Owner'
                                  ? 'bg-purple-100 text-purple-800'
                                  : staff.role === 'Dispatcher'
                                  ? 'bg-pink-100 text-pink-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {staff.role}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {staff.vanUnit}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          <a href={`tel:${staff.phone.replace(/\D/g, '')}`} className="hover:text-purple-600 transition-colors flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{staff.phone}</span>
                          </a>
                        </td>

                        <td className="py-2.5 px-3 text-slate-600">
                          <a href={`mailto:${staff.email}`} className="hover:text-purple-600 transition-colors flex items-center gap-1 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{staff.email}</span>
                          </a>
                        </td>

                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          <div className="flex items-center gap-1 truncate max-w-[240px]" title={staff.homeAddress}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{staff.homeAddress}</span>
                          </div>
                        </td>

                        {/* Action Buttons: Edit, Archive / Reactivate, Delete */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Archive / Reactivate Button */}
                            {isArchived ? (
                              <button
                                onClick={() => handleToggleArchiveStaff(staff)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                                title="Reactivate cleaner (return to active dispatch)"
                              >
                                <ArchiveRestore className="w-3 h-3" />
                                <span>Reactivate</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleArchiveStaff(staff)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                                title="Archive cleaner (not working anymore; preserves past job logs)"
                              >
                                <Archive className="w-3 h-3" />
                                <span>Archive</span>
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                setEditingStaff(staff);
                                setIsAddMode(false);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                              title="Edit cleaner details"
                            >
                              Edit
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setStaffToDelete(staff)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={`Delete ${staff.name} permanently`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Modal Dialog */}
        {staffToDelete && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Remove Cleaner from Roster?</h3>
                  <p className="text-xs text-slate-500">Choose whether to archive or permanently delete</p>
                </div>
              </div>

              {/* Staff Summary Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-white shadow-2xs"
                    style={{ backgroundColor: staffToDelete.color }}
                  />
                  <div>
                    <div className="font-extrabold text-slate-900">{staffToDelete.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {staffToDelete.role} • {staffToDelete.vanUnit}
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  {staffToDelete.phone}
                </div>
              </div>

              {/* Informational Guidance */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Are they simply not working right now?</span>
                </div>
                <p>
                  <strong>Archiving</strong> is recommended because it keeps their past cleaning jobs, ratings, and invoices intact in your history while removing them from future active scheduling and dispatch.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => {
                    handleToggleArchiveStaff(staffToDelete);
                    setStaffToDelete(null);
                  }}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Cleaner Instead (Recommended)</span>
                </button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => setStaffToDelete(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Modal / Overlay */}
        {isCsvInputOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Paste Spreadsheet / CSV to Sync</h3>
                    <p className="text-[11px] text-slate-500">Paste your rows directly from Google Sheets or Excel</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCsvInputOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  CSV Data (Header: Name, Email, Phone, Role, Lead, Active, Home Address)
                </label>
                <textarea
                  value={csvTextInput}
                  onChange={(e) => setCsvTextInput(e.target.value)}
                  placeholder="Paste your CSV spreadsheet rows here..."
                  className="w-full h-56 p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              {syncStatusMsg && (
                <div className={`p-2.5 rounded-xl text-xs font-bold text-center border ${
                  syncStatusMsg.startsWith('Error')
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  {syncStatusMsg}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setIsCsvInputOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleProcessCsvImport}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Staff with Jobber</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Staff Single Modal */}
        {editingStaff && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isAddMode ? 'Add New Cleaner / Staff' : `Edit ${editingStaff.name}`}
                </h3>
                <button
                  onClick={() => setEditingStaff(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Active / Archived Status Selector */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Employment &amp; Dispatch Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingStaff({ ...editingStaff, active: true })}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        editingStaff.active !== false
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Active &amp; Working</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingStaff({ ...editingStaff, active: false })}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        editingStaff.active === false
                          ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5 text-amber-600" />
                      <span>Archived (Not Working)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Archived cleaners are hidden from active job assignments while retaining historical past visits and records.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      value={editingStaff.phone}
                      onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      value={editingStaff.email}
                      onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Role</label>
                    <select
                      value={editingStaff.role}
                      onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    >
                      <option value="Cleaner">Cleaner</option>
                      <option value="Dispatcher">Dispatcher</option>
                      <option value="Owner">Owner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Van Unit</label>
                    <input
                      type="text"
                      value={editingStaff.vanUnit}
                      onChange={(e) => setEditingStaff({ ...editingStaff, vanUnit: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jobber Color</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={editingStaff.color}
                        onChange={(e) => setEditingStaff({ ...editingStaff, color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                      />
                      <span className="font-mono text-[11px] text-slate-600">{editingStaff.color}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Edmonton Home Address</label>
                  <input
                    type="text"
                    value={editingStaff.homeAddress}
                    onChange={(e) => setEditingStaff({ ...editingStaff, homeAddress: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {!isAddMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStaffToDelete(editingStaff);
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Cleaner...</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingStaff(null)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSaveStaffMember}
                    className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    Save &amp; Sync
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
