import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Navigation, 
  Phone, 
  MessageSquare, 
  Users, 
  Check, 
  Edit2, 
  ExternalLink,
  ThumbsUp,
  FileText,
  Clock,
  Sparkles,
  PhoneCall,
  Volume2,
  Mic,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ScheduledJobItem } from '../data/jobberCalendarData';

interface JobVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ScheduledJobItem | null;
  onShowOnMap?: (job: ScheduledJobItem) => void;
  onSaveJobDetails?: (jobId: string, updates: Partial<ScheduledJobItem>) => void;
  onOpenBookingEdit?: (job: ScheduledJobItem) => void;
}

export const JobVisitModal: React.FC<JobVisitModalProps> = ({
  isOpen,
  onClose,
  job,
  onShowOnMap,
  onSaveJobDetails,
  onOpenBookingEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSecondaryPhone, setEditSecondaryPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [quoteApproved, setQuoteApproved] = useState(false);

  // Initialize edit fields when opening or toggling edit mode
  React.useEffect(() => {
    if (job) {
      setEditName(job.clientName || '');
      setEditPhone(job.clientPhone || '');
      setEditSecondaryPhone(job.secondaryPhone || '');
      setEditAddress(job.serviceAddress || '');
      setIsEditing(false);
    }
  }, [job, isOpen]);

  if (!isOpen || !job) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    onSaveJobDetails?.(job.id, {
      clientName: editName.trim(),
      clientPhone: editPhone.trim() || job.clientPhone,
      secondaryPhone: editSecondaryPhone.trim() || undefined,
      serviceAddress: editAddress.trim() || job.serviceAddress,
    });
    setIsEditing(false);
  };

  const formattedDate = (() => {
    try {
      const d = new Date(job.startAt);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' MDT';
    } catch {
      return job.startAt;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-[#181a20] text-white rounded-3xl max-w-md w-full border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Screenshot 1 (Screenshot 2026-10-07 141526.png) */}
        <div className="p-5 pb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-black text-white tracking-tight">{job.clientName}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Client confirmed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {job.title || `${job.clientName} - ${job.serviceType}`} · 2 hr
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 pt-1 space-y-4">
          {isEditing ? (
            /* Inline Edit Form for Client, Phones, & Address */
            <form onSubmit={handleSave} className="space-y-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-black uppercase text-pink-400">Edit Client &amp; Phone Numbers</span>
                <span className="text-[10px] text-slate-400">2 Phone Numbers Supported</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Client Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Primary Phone *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="(780) 807-1996"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-pink-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Secondary / Alt Phone</label>
                  <input
                    type="tel"
                    value={editSecondaryPhone}
                    onChange={(e) => setEditSecondaryPhone(e.target.value)}
                    placeholder="(780) 555-0182"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Service Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-pink-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Date & Time */}
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{formattedDate}</span>
              </div>

              {/* Service Address with Change button */}
              <div className="flex items-start justify-between gap-2 text-xs">
                <div className="flex items-start gap-2.5 text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="font-semibold">{job.serviceAddress}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-pink-400 hover:text-pink-300 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              {/* Big Action Buttons matching Screenshot 1 */}
              <div className="space-y-2 pt-1">
                {/* Show on Map button */}
                <button
                  type="button"
                  onClick={() => {
                    onShowOnMap?.(job);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 bg-[#232733] hover:bg-[#2c3140] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-white" />
                  <span>Show on map</span>
                </button>

                {/* Get directions vibrant pink button */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.serviceAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-pink-900/40 transition-all cursor-pointer active:scale-98"
                >
                  <Navigation className="w-4 h-4 text-white" />
                  <span>Get directions</span>
                </a>

                {/* Call and Text Side-by-Side Pills matching Screenshot 1 */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${job.clientPhone}`}
                    className="py-2 px-3 bg-[#232733] hover:bg-[#2c3140] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-white" />
                    <span>Call</span>
                  </a>

                  <a
                    href={`sms:${job.clientPhone}`}
                    className="py-2 px-3 bg-[#232733] hover:bg-[#2c3140] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                    <span>Text</span>
                  </a>
                </div>
              </div>

              {/* Details List matching Screenshot 1 */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                {/* Primary Phone */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <a href={`tel:${job.clientPhone}`} className="font-mono font-bold text-white hover:text-pink-400">
                      {job.clientPhone}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-slate-400 hover:text-white p-1"
                    title="Edit Phone Number"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Secondary Phone (if available or add prompt) */}
                {job.secondaryPhone ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-[10px] text-slate-400 font-sans uppercase">Alt:</span>
                        <a href={`tel:${job.secondaryPhone}`} className="font-bold text-white hover:text-pink-400">
                          {job.secondaryPhone}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={`tel:${job.secondaryPhone}`} className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-bold">
                        Call
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 pl-6 cursor-pointer"
                  >
                    <span>+ Add 2nd phone number for {job.clientName}</span>
                  </button>
                )}

                {/* Cleaners */}
                <div className="flex items-start gap-2.5">
                  <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="font-semibold text-white">
                    {job.assignedCleaners && job.assignedCleaners.length > 0
                      ? job.assignedCleaners.join(', ')
                      : 'Unassigned Cleaners'}
                  </span>
                </div>

                {/* Requested service */}
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300 font-medium">
                    Requested: {job.title || job.serviceType}
                  </span>
                </div>

                {/* Quo Phone Call Transcripts Section */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-400 flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-violet-400" />
                      <span>Quo Call Transcripts &amp; Audio Notes</span>
                    </span>
                    {job.callTranscripts && job.callTranscripts.length > 0 && (
                      <span className="text-[10px] bg-violet-950 text-violet-300 px-2 py-0.5 rounded-full border border-violet-800 font-bold">
                        {job.callTranscripts.length} {job.callTranscripts.length === 1 ? 'Call Log' : 'Call Logs'}
                      </span>
                    )}
                  </div>

                  {job.callTranscripts && job.callTranscripts.length > 0 ? (
                    <div className="space-y-2">
                      {job.callTranscripts.map((call: any, idx: number) => (
                        <div key={call.id || idx} className="p-2.5 bg-slate-950/80 rounded-xl border border-violet-900/50 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-200 flex items-center gap-1">
                              <Volume2 className="w-3 h-3 text-violet-400" />
                              <span>{call.lineName || 'Primary Dispatch'} ({call.callerPhone})</span>
                            </span>
                            <span className="text-[10px] font-mono">
                              {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'Call log'}
                            </span>
                          </div>

                          {call.summary && (
                            <p className="text-slate-300 text-[11px] font-medium leading-relaxed bg-violet-950/30 p-2 rounded-lg border border-violet-900/30">
                              <strong className="text-violet-300">AI Summary: </strong>
                              {call.summary}
                            </p>
                          )}

                          {call.transcriptText && (
                            <details className="text-[11px] text-slate-400 cursor-pointer">
                              <summary className="hover:text-slate-200 transition-colors font-semibold">
                                View Full Voice Transcript
                              </summary>
                              <div className="mt-1 p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                                {call.transcriptText}
                              </div>
                            </details>
                          )}

                          {call.recordingUrl && (
                            <div className="pt-1 flex items-center gap-2">
                              <a
                                href={call.recordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1"
                              >
                                <span>▶ Listen to Call Audio</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>No phone calls attached yet.</span>
                      <span className="text-[10px] text-violet-400 font-medium">Auto-syncs via Quo Webhook</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions matching Screenshot 1 */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setQuoteApproved(!quoteApproved)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    quoteApproved
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-[#232733] hover:bg-[#2c3140] text-white border-slate-700'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${quoteApproved ? 'text-emerald-400' : 'text-white'}`} />
                  <span>{quoteApproved ? '✓ Quote Approved' : 'Approve quote — client said yes'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                    }}
                    className="flex-1 py-2 px-3 bg-[#232733] hover:bg-[#2c3140] text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Phone / Details</span>
                  </button>

                  <a
                    href={job.jobberWebUri || 'https://secure.getjobber.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-[#232733] hover:bg-[#2c3140] text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Jobber</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
