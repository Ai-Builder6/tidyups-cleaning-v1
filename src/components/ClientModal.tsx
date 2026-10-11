import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Tag, 
  FileText, 
  Check, 
  Trash2, 
  ExternalLink,
  Sparkles,
  PhoneCall,
  MessageSquare
} from 'lucide-react';
import { ClientRecord, ClientVerdict } from '../types/client';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientRecord | null;
  onSave: (client: ClientRecord) => void;
  onDelete?: (clientId: string) => void;
  onOpenSchedule?: (client: ClientRecord) => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  client,
  onSave,
  onDelete,
  onOpenSchedule,
}) => {
  const isEditing = Boolean(client && client.id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [verdict, setVerdict] = useState<ClientVerdict>('Client');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isJobberLinked, setIsJobberLinked] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setPhone(client.phone || '');
      setSecondaryPhone(client.secondaryPhone || '');
      setEmail(client.email || '');
      setAddress(client.address || '');
      setVerdict(client.verdict || 'Client');
      setTags(client.tags || []);
      setIsJobberLinked(client.isJobberLinked ?? true);
      setNotes(client.notes || '');
    } else {
      setName('');
      setPhone('');
      setSecondaryPhone('');
      setEmail('');
      setAddress('');
      setVerdict('Client');
      setTags(['client']);
      setIsJobberLinked(true);
      setNotes('');
    }
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const clean = newTagInput.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const record: ClientRecord = {
      id: client?.id || `cli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      phone: phone.trim() || '(780) 555-0100',
      secondaryPhone: secondaryPhone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || 'Edmonton, AB',
      verdict,
      tags,
      isJobberLinked,
      jobberId: client?.jobberId || (isJobberLinked ? `jobber-${Date.now()}` : undefined),
      totalJobs: client?.totalJobs || 1,
      latestServiceDate: client?.latestServiceDate || new Date().toISOString().split('T')[0],
      notes: notes.trim(),
      source: client?.source || (isJobberLinked ? 'Jobber' : 'Manual'),
      createdAt: client?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300 font-black">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white leading-tight">
                {isEditing ? `Edit Client: ${client?.name}` : 'New Client'}
              </h3>
              <p className="text-xs text-slate-300">
                {isEditing ? 'Update client phone numbers, address, and Jobber sync tags' : 'Add a new client to the database and sync with Jobber'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Client Name & Jobber Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Client Name / Company *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Mimi, +16073302822 DDF, Suchi..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Jobber Sync
              </label>
              <button
                type="button"
                onClick={() => setIsJobberLinked(!isJobberLinked)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isJobberLinked
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{isJobberLinked ? 'Linked' : 'Local Only'}</span>
              </button>
            </div>
          </div>

          {/* TWO PHONE NUMBERS (Primary & Secondary) */}
          <div className="p-3.5 bg-pink-50/40 rounded-2xl border border-pink-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-pink-900 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-pink-600" />
                <span>Client Phone Numbers (Primary &amp; Secondary)</span>
              </span>
              <span className="text-[10px] bg-pink-200 text-pink-900 px-2 py-0.5 rounded-full font-bold">
                2 Numbers Supported
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Primary Phone */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Primary Phone *</span>
                  {phone && (
                    <a href={`tel:${phone}`} className="text-pink-600 hover:underline flex items-center gap-0.5 font-mono">
                      <Phone className="w-2.5 h-2.5" /> Call
                    </a>
                  )}
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="(780) 807-1996"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Secondary Phone */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Secondary / Alt Phone</span>
                  {secondaryPhone && (
                    <a href={`tel:${secondaryPhone}`} className="text-pink-600 hover:underline flex items-center gap-0.5 font-mono">
                      <Phone className="w-2.5 h-2.5" /> Call
                    </a>
                  )}
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="e.g. (780) 555-0182 or Cell 2"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email & Service Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Service Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Twin Brooks Court, Edmonton..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Verdict (Shared with calls & leads - Good Lead, Bad Lead, Spam, Client) */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
              <span>Quick Verdict Status (Syncs with Jobber)</span>
              <span className="text-[11px] text-slate-400 font-normal">Select status tag</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Client', 'Good lead', 'Bad lead', 'Spam'] as ClientVerdict[]).map((v) => {
                const isSelected = verdict === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVerdict(v)}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      isSelected
                        ? v === 'Good lead'
                          ? 'bg-cyan-600 text-white border-cyan-700 shadow-md scale-102'
                          : v === 'Bad lead'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-102'
                          : v === 'Spam'
                          ? 'bg-red-600 text-white border-red-700 shadow-md scale-102'
                          : 'bg-slate-900 text-white border-slate-900 shadow-md scale-102'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client Tags (Synced with Jobber) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
              <span>Client Tags (Synced with Jobber when linked)</span>
              <span className="text-[10px] text-slate-400 font-mono">{tags.length} tags</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a tag (e.g. block, bi-weekly, vip)..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-pink-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Tag Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-red-600 cursor-pointer text-slate-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Notes & Special Instructions */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Notes &amp; Access Details
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Gate code, pet instructions, preferred cleaner, billing notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete client record for "${name}"?`)) {
                    onDelete(client!.id);
                    onClose();
                  }
                }}
                className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Client</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-98 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Save Changes' : 'Create Client'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
