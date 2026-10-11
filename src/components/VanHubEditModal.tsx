import React, { useState, useEffect } from 'react';
import { 
  X, 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Check, 
  Sparkles,
  Palette,
  Home,
  Loader2,
  Navigation
} from 'lucide-react';
import { Technician } from '../types/dispatch';
import { AddressAutocompleteInput, AddressPrediction } from './AddressAutocompleteInput';
import { approximateEdmontonCoords } from '../services/staffRosterService';

interface VanHubEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician | null;
  onSave: (updatedTech: Technician) => void;
}

export const VanHubEditModal: React.FC<VanHubEditModalProps> = ({
  isOpen,
  onClose,
  technician,
  onSave,
}) => {
  const [vanNumber, setVanNumber] = useState('');
  const [cleanerName, setCleanerName] = useState('');
  const [phone, setPhone] = useState('');
  const [hubName, setHubName] = useState('');
  const [hubAddress, setHubAddress] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (technician) {
      setVanNumber(technician.vanNumber || '');
      setCleanerName(technician.name || '');
      setPhone(technician.phone || '');
      setHubName(technician.depotLocation?.name || `${technician.name} Hub`);
      setHubAddress(technician.depotLocation?.address || technician.homeAddress || '');
      setColor(technician.color || '#2563EB');
      setIsSaving(false);
    }
  }, [technician, isOpen]);

  if (!isOpen || !technician) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const cleanAddr = hubAddress.trim() || technician.homeAddress || 'Edmonton, AB';
    let lat = technician.depotLocation?.lat || technician.currentLocation?.lat || 53.5412;
    let lng = technician.depotLocation?.lng || technician.currentLocation?.lng || -113.4988;

    // Check if address changed, resolve precise coordinates
    if (cleanAddr && cleanAddr !== technician.depotLocation?.address) {
      try {
        const res = await fetch(`/api/geocode/forward?address=${encodeURIComponent(cleanAddr)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
            lat = data.lat;
            lng = data.lng;
          } else {
            const fallback = approximateEdmontonCoords(cleanAddr);
            lat = fallback.lat;
            lng = fallback.lng;
          }
        } else {
          const fallback = approximateEdmontonCoords(cleanAddr);
          lat = fallback.lat;
          lng = fallback.lng;
        }
      } catch {
        const fallback = approximateEdmontonCoords(cleanAddr);
        lat = fallback.lat;
        lng = fallback.lng;
      }
    }

    const updated: Technician = {
      ...technician,
      name: cleanerName.trim() || technician.name,
      vanNumber: vanNumber.trim() || technician.vanNumber,
      phone: phone.trim() || technician.phone,
      color,
      homeAddress: cleanAddr,
      currentLocation: {
        ...technician.currentLocation,
        address: cleanAddr,
        lat,
        lng,
      },
      depotLocation: {
        ...technician.depotLocation,
        name: hubName.trim() || technician.depotLocation.name,
        address: cleanAddr,
        lat,
        lng,
      },
    };

    onSave(updated);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md font-black"
              style={{ backgroundColor: color }}
            >
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white leading-tight">
                Edit Van &amp; Hub Details
              </h3>
              <p className="text-xs text-slate-300">
                Update the van unit name, cleaner assignment, and depot hub address
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Van Identifier Name */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Van / Vehicle Identifier Name *
            </label>
            <div className="relative">
              <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Unit 1, Unit 2 - Westside, Mobile Unit A"
                value={vanNumber}
                onChange={(e) => setVanNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Cleaner Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Assigned Cleaner Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Cindy Guay"
                  value={cleanerName}
                  onChange={(e) => setCleanerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Cleaner Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="(780) 555-0101"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Hub Name & Hub Address */}
          <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-purple-900 tracking-wider">
              <Home className="w-3.5 h-3.5 text-purple-600" />
              <span>Depot &amp; Home Hub Location</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">
                Hub Name / Label
              </label>
              <input
                type="text"
                placeholder="e.g. North Edmonton Hub, West End Depot, Cindy's Home Hub"
                value={hubName}
                onChange={(e) => setHubName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">
                Hub Street Address (Home Base with Google Autocomplete)
              </label>
              <AddressAutocompleteInput
                value={hubAddress}
                onChange={(addr) => setHubAddress(addr)}
                onSelect={(pred: AddressPrediction) => setHubAddress(pred.description)}
                placeholder="e.g. 7221 Chivers Pl SW, Edmonton, AB"
              />
              {technician.depotLocation && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-1">
                  <Navigation className="w-3 h-3 text-purple-600" />
                  <span>GPS: {technician.depotLocation.lat.toFixed(4)}° N, {Math.abs(technician.depotLocation.lng).toFixed(4)}° W</span>
                </div>
              )}
            </div>
          </div>

          {/* Van Marker Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
              <span>Van Color Theme</span>
              <span className="font-mono text-xs">{color}</span>
            </label>
            <div className="flex items-center gap-2">
              {['#EC4899', '#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    color === c ? 'scale-120 border-slate-900 shadow-md ring-2 ring-purple-400' : 'border-white hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                title="Custom color"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-98 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Geocoding &amp; Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Van &amp; Hub</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
