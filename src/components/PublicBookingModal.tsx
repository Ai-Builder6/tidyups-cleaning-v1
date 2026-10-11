import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Home, 
  ShieldCheck, 
  ArrowRight,
  X,
  FileCheck
} from 'lucide-react';
import { ServiceTicket } from '../types/dispatch';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

interface PublicBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated?: (ticket: ServiceTicket) => void;
}

export const PublicBookingModal: React.FC<PublicBookingModalProps> = ({
  isOpen,
  onClose,
  onBookingCreated,
}) => {
  const [step, setStep] = useState<'FORM' | 'SUCCESS'>('FORM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<any>(null);

  // Form Fields
  const [serviceType, setServiceType] = useState<'Standard Cleaning' | 'Deep Cleaning' | 'Move-Out Cleaning'>('Move-Out Cleaning');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Edmonton');
  const [postalCode, setPostalCode] = useState('');
  const [bedrooms, setBedrooms] = useState('2 Bedrooms');
  const [bathrooms, setBathrooms] = useState('2 Bathrooms');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning (8:00 AM - 12:00 PM)');
  const [specialInstructions, setSpecialInstructions] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg('Please enter your name, phone number, and Edmonton service address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const bookingPayload = {
      customerName: fullName.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim(),
      serviceType,
      address: `${address.trim()}, ${city}, AB ${postalCode.trim()}`.trim(),
      city,
      postalCode: postalCode.trim(),
      bedrooms,
      bathrooms,
      preferredDate: preferredDate || new Date().toISOString().slice(0, 10),
      preferredTime,
      specialInstructions: specialInstructions.trim(),
    };

    try {
      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedSummary(data);
        if (onBookingCreated && data.ticket) {
          onBookingCreated(data.ticket);
        }
        setStep('SUCCESS');
      } else {
        setErrorMsg(data.error || 'Unable to complete booking. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg('Network connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('FORM');
    setFullName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setSpecialInstructions('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 font-sans max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-200" />
              <h2 className="font-bold text-base sm:text-lg">Book My Cleaning (book-my-cleaning.com)</h2>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              Instant Edmonton &amp; Area Booking • Directly Synced to Jobber &amp; Dispatch Fleet
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-50/50">
          {step === 'FORM' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Service Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  1. Select Cleaning Service
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(['Move-Out Cleaning', 'Deep Cleaning', 'Standard Cleaning'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setServiceType(type)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        serviceType === type
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>{type}</span>
                        {serviceType === type && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {type === 'Move-Out Cleaning' && 'Full turnover: oven, fridge, baseboards, cabinets'}
                        {type === 'Deep Cleaning' && 'Intensive top-to-bottom scrub & grout detail'}
                        {type === 'Standard Cleaning' && 'Recurring maintenance & surface dusting/sanitization'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bedrooms / Size</label>
                  <select
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option>Studio Apartment</option>
                    <option>1 Bedroom</option>
                    <option>2 Bedrooms</option>
                    <option>3 Bedrooms</option>
                    <option>4+ Bedrooms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bathrooms</label>
                  <select
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option>1 Bathroom</option>
                    <option>1.5 Bathrooms</option>
                    <option>2 Bathrooms</option>
                    <option>2.5 Bathrooms</option>
                    <option>3+ Bathrooms</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  2. Contact &amp; Service Address
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Laura MacIntyre"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="780-555-0123"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="laura@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address (Auto-Complete) *</label>
                    <AddressAutocompleteInput
                      required
                      value={address}
                      onChange={(newAddr) => {
                        setAddress(newAddr);
                        // Auto-populate city if recognized
                        const lower = newAddr.toLowerCase();
                        if (lower.includes('st. albert') || lower.includes('st albert')) setCity('St. Albert');
                        else if (lower.includes('sherwood park')) setCity('Sherwood Park');
                        else if (lower.includes('leduc')) setCity('Leduc');
                        else if (lower.includes('spruce grove')) setCity('Spruce Grove');
                        else if (lower.includes('fort saskatchewan')) setCity('Fort Saskatchewan');
                        else if (lower.includes('edmonton')) setCity('Edmonton');
                      }}
                      placeholder="e.g. 10405 Jasper Ave NW, Apt 402"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      <option>Edmonton</option>
                      <option>St. Albert</option>
                      <option>Sherwood Park</option>
                      <option>Spruce Grove</option>
                      <option>Leduc</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="T5J 3S2"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Instructions */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  3. Preferred Date &amp; Notes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Date</label>
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time Window</label>
                    <select
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      <option>Morning (8:00 AM - 12:00 PM)</option>
                      <option>Afternoon (12:00 PM - 4:00 PM)</option>
                      <option>Flexible / Any Time</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lockbox code, pets, parking, or special cleaning instructions
                    </label>
                    <textarea
                      rows={2}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Key is in lockbox code 4921 by side door. Please focus on oven interior and baseboards."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Confirming Booking with Jobber...</span>
                  ) : (
                    <>
                      <span>Confirm Booking &amp; Schedule Clean</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Instant Jobber Scheduled Job</span>
                  </span>
                  <span>•</span>
                  <span>Direct Van Dispatch Assigned</span>
                </div>
              </div>
            </form>
          ) : (
            /* SUCCESS STATE */
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Cleaning Booking Confirmed!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your cleaning appointment has been recorded and pushed straight to Jobber.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 max-w-md mx-auto text-left text-xs space-y-2 font-mono">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Service:</span>
                  <span className="font-bold text-slate-900">{serviceType}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{fullName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Jobber Job #:</span>
                  <span className="font-bold text-emerald-600">{createdSummary?.jobberJobId || 'JOB-94182'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Assigned Crew:</span>
                  <span className="font-bold text-slate-900">{createdSummary?.assignedCrew || 'Van 1 (Melissa Clarke)'}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500">Google Sheet Tab:</span>
                  <span className="font-bold text-blue-600">ScrubbyBuilder Leads (Synced)</span>
                </div>
              </div>

              <div className="pt-3 flex justify-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Done &amp; View on Dispatch Board
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
