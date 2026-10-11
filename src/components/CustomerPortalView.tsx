import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Phone, 
  Mail, 
  ArrowRight, 
  Check, 
  Star, 
  Home, 
  Building2, 
  Key, 
  Brush, 
  HeartHandshake, 
  Award, 
  ExternalLink,
  PhoneCall,
  ChevronDown,
  Lock
} from 'lucide-react';
import { BookMyCleaningLogo } from './BookMyCleaningLogo';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { ServiceTicket } from '../types/dispatch';

interface CustomerPortalViewProps {
  onBookingSubmitted?: (ticket: ServiceTicket) => void;
  onNavigateToMap?: () => void;
  onOpenPhoneModal?: () => void;
  onOpenStaffLogin?: () => void;
}

export type CleaningCategory = 
  | 'move-out' 
  | 'deep' 
  | 'standard' 
  | 'airbnb' 
  | 'commercial' 
  | 'post-renovation' 
  | 'carpet';

interface ServiceDetail {
  id: CleaningCategory;
  name: string;
  badge: string;
  tagline: string;
  startingPrice: string;
  recommendedFor: string;
  duration: string;
  icon: any;
  checklist: string[];
  popularAddons: string[];
}

const CLEANING_SERVICES: ServiceDetail[] = [
  {
    id: 'move-out',
    name: 'Move-Out & Move-In Cleaning',
    badge: '100% Deposit Guarantee',
    tagline: 'Comprehensive property inspection-ready turn for tenants, landlords, and realtors.',
    startingPrice: '$249',
    recommendedFor: 'Rental tenants, property managers, home buyers, and real estate staging',
    duration: '3.5 - 5 Hours (Dedicated Crew)',
    icon: Key,
    checklist: [
      'Full interior oven degrease & rack scrubbing',
      'Interior & exterior refrigerator sanitization',
      'All cabinets & drawers wiped inside & out',
      'Baseboards, door frames & trim scrubbed clean',
      'Full bathroom grout & scale descaling',
      'Interior window glass, tracks & sills wiped',
      'Light fixtures, outlets & switch plates sanitized',
      'Complete HEPA vacuuming & edge-to-edge mopping'
    ],
    popularAddons: ['Inside all kitchen cabinets', 'Wall spot cleaning', 'Balcony / Patio sweep']
  },
  {
    id: 'deep',
    name: 'Deep Cleaning & Sanitization',
    badge: 'Top Seasonal Pick',
    tagline: 'Intensive restorative clean targeting built-up grime, heavy scale, and neglected corners.',
    startingPrice: '$219',
    recommendedFor: 'Spring cleaning, homes uncleaned for 60+ days, pre-hosting gatherings',
    duration: '3 - 4.5 Hours',
    icon: Sparkles,
    checklist: [
      'Heavy soap scum and limescale removal in bathrooms',
      'Hand-washing baseboards, doors, and wainscoting',
      'Under & behind reachable furniture dust extraction',
      'Kitchen backsplash degreasing & exterior hood scrub',
      'Cabinet fronts detailed and polished',
      'Ceiling fan blades and air vents hand-dusted',
      'Complete sanitization of all high-touch surfaces',
      'Hardwood & tile deep wash and neutral rinse'
    ],
    popularAddons: ['Interior fridge scrub', 'Interior oven detailing', 'Bed linen replacement']
  },
  {
    id: 'standard',
    name: 'Standard Recurring Cleaning',
    badge: 'Weekly / Bi-Weekly / Monthly',
    tagline: 'Reliable upkeep that keeps your home fresh, hygienic, and stress-free all year round.',
    startingPrice: '$149',
    recommendedFor: 'Busy professionals, active families, regular scheduled maintenance',
    duration: '2 - 3 Hours',
    icon: Brush,
    checklist: [
      'Dusting all furniture, ledges, and decor',
      'Kitchen countertops, sink, and exterior appliances wiped',
      'Bathroom sinks, mirrors, toilets, and showers disinfected',
      'Trash bins emptied and re-lined',
      'Beds neatly made (linens changed upon request)',
      'Floors vacuumed and freshly damp-mopped',
      'Microwave interior wiped clean',
      'Door knobs and light switches disinfected'
    ],
    popularAddons: ['Laundry fold service', 'Interior window panes', 'Dishes cycle loading']
  },
  {
    id: 'airbnb',
    name: 'Airbnb & Short-Term Rental Turnovers',
    badge: 'Same-Day Fast Turn',
    tagline: 'Fast, hotel-grade turnaround cleaning between guests with linen changes and supply restock.',
    startingPrice: '$169',
    recommendedFor: 'Superhosts, VRBO hosts, boutique hospitality managers in Edmonton',
    duration: '2 - 3 Hours (Tight Window)',
    icon: Home,
    checklist: [
      'Same-day check-out to check-in scheduling window',
      'Hotel-style bed making with fresh linens & towels',
      'Guest welcome staging & toilet paper folding',
      'Full kitchen sanitize & dish inspection',
      'Bathroom sanitization with hospitality checklist',
      'Restocking guest toiletries & coffee station check',
      'Damage & forgotten item inspection report with photos',
      'Key lockbox verification & patio tidy'
    ],
    popularAddons: ['Off-site laundry run', 'Consumables inventory restock', 'Photo audit report']
  },
  {
    id: 'commercial',
    name: 'Commercial & Office Cleaning',
    badge: 'After-Hours Available',
    tagline: 'Spotless workspaces, storefronts, and medical/professional offices for a stellar impression.',
    startingPrice: '$189',
    recommendedFor: 'Offices, clinics, retail storefronts, law firms, creative studios',
    duration: 'Flexible / After-Hours',
    icon: Building2,
    checklist: [
      'Workstations, computer desks, and conference tables sanitized',
      'Breakroom & kitchenette degreasing and fridge upkeep',
      'Restroom hygiene sanitization and supply restocking',
      'Commercial carpet HEPA vacuuming and high-traffic mopping',
      'Entryway glass, vestibules, and fingerprint removal',
      'Recycling and waste consolidation & disposal',
      'Water cooler and touchpoint antibacterial wipe-down',
      'Security alarm arming & facility lockout compliance'
    ],
    popularAddons: ['Computer monitor dusting', 'Interior glass partitions', 'Scheduled weekend floor buffing']
  },
  {
    id: 'post-renovation',
    name: 'Post-Construction & Renovation Clean',
    badge: 'Fine Dust Removal',
    tagline: 'Specialized extraction of drywall dust, paint splatter, and contractor residue.',
    startingPrice: '$289',
    recommendedFor: 'Contractors, interior designers, homeowners after remodel or painting',
    duration: '4 - 6 Hours',
    icon: Award,
    checklist: [
      'Multi-pass HEPA micro-filtration air and surface extraction',
      'Wiping drywall dust off walls, trims, and ceilings',
      'Removing sticker labels and protective films from fixtures',
      'Window tracks, sills, and glazing residue cleaning',
      'Inside all new cabinets, drawers, and closets vacuumed & wiped',
      'Polishing chrome plumbing fixtures, tile, and stone',
      'Floor scrubbing to remove adhesive and paint specks',
      'HVAC vent cover cleaning and dust filter review'
    ],
    popularAddons: ['Exterior window glass', 'Garage sweep-out', 'Debris haul-away']
  }
];

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  onBookingSubmitted,
  onNavigateToMap,
  onOpenPhoneModal,
  onOpenStaffLogin,
}) => {
  // Active selected service for detailed display and pre-filling
  const [selectedService, setSelectedService] = useState<CleaningCategory>('move-out');
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string>('');

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Edmonton');
  const [postalCode, setPostalCode] = useState('');
  const [bedrooms, setBedrooms] = useState('2 Bedrooms');
  const [bathrooms, setBathrooms] = useState('2 Bathrooms');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning (8:00 AM - 12:00 PM)');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeServiceData = CLEANING_SERVICES.find((s) => s.id === selectedService) || CLEANING_SERVICES[0];

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      setErrorMessage('Please provide your full name, phone number, and service address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const fullAddress = `${address.trim()}, ${city}, AB ${postalCode.trim()}`.trim();

    try {
      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          serviceType: activeServiceData.name,
          address: fullAddress,
          city,
          postalCode: postalCode.trim(),
          bedrooms,
          bathrooms,
          preferredDate: preferredDate || new Date().toISOString().slice(0, 10),
          preferredTime,
          specialInstructions: specialInstructions.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmedBookingId(data.jobberJobId || `JOB-${Math.floor(10000 + Math.random() * 90000)}`);
        setFormSubmitted(true);
        if (onBookingSubmitted && data.ticket) {
          onBookingSubmitted(data.ticket);
        }
      } else {
        setErrorMessage(data.error || 'Failed to submit booking. Please call dispatch directly.');
      }
    } catch {
      setErrorMessage('Network connection error. Please call our direct dispatch line.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 font-sans text-slate-800">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. HERO HEADER SECTION
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#120e18] via-[#1a1324] to-[#120e18] text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8 border-b border-fuchsia-950/60">
        {/* Glow orb background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-gradient-to-r from-pink-500/15 via-fuchsia-500/20 to-purple-600/15 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-pink-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Edmonton's #1 Rated Cleaning Service • Book Online in 60s</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Spotless Cleanings with <br />
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-300 to-purple-400 bg-clip-text text-transparent">
                Guaranteed Satisfaction
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              From security-deposit move-out cleans to recurring residential care, our vetted and background-checked teams deliver hotel-grade perfection across Edmonton, Sherwood Park &amp; St. Albert.
            </p>

            {/* Trust Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-pink-400" /> Insured &amp; Bonded
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 5.0 Star Reviews
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 24h Free Re-Clean Guarantee
              </span>
            </div>
          </div>

          {/* Quick Call / Direct Dispatch Contact Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/15 rounded-2xl p-5 sm:p-6 w-full md:w-80 shrink-0 text-center md:text-left space-y-3.5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider block">Live Dispatch Call</span>
                <span className="text-base font-extrabold text-white font-mono">(780) 718-5092</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-normal">
              Need immediate emergency cleaning or same-day move-out? Call our Edmonton dispatch center directly.
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <a
                href="tel:7807185092"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer text-center"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Now: (780) 718-5092</span>
              </a>
              {onOpenPhoneModal && (
                <button
                  type="button"
                  onClick={onOpenPhoneModal}
                  className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  View 5 Regional Phone Lines
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. CORE SERVICE EXPLORER & BOOKING INTAKE SECTION
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Choose Your Cleaning Service
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Click on any service package below to inspect the comprehensive checklist and calculate your customized booking.
          </p>
        </div>

        {/* Service Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {CLEANING_SERVICES.map((s) => {
            const IconComp = s.icon;
            const isSelected = selectedService === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedService(s.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-gradient-to-b from-white to-pink-50/50 border-pink-500 shadow-md ring-2 ring-pink-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    From {s.startingPrice}
                  </span>
                </div>
                <div>
                  <h3 className={`font-bold text-xs leading-tight ${isSelected ? 'text-pink-900' : 'text-slate-800'}`}>
                    {s.name}
                  </h3>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{s.badge}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Split Grid: Service Detail Card (Left) vs Interactive Request Form (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Detailed Service Information & Verified Checklist */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6">
              {/* Service Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                    {activeServiceData.badge}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {activeServiceData.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    {activeServiceData.tagline}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Starting at</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                    {activeServiceData.startingPrice}
                  </span>
                </div>
              </div>

              {/* Service Meta Specs */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Ideal For</span>
                  <span className="font-bold text-slate-800 leading-tight block mt-0.5">
                    {activeServiceData.recommendedFor}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Typical Time</span>
                  <span className="font-bold text-slate-800 leading-tight block mt-0.5">
                    {activeServiceData.duration}
                  </span>
                </div>
              </div>

              {/* Detailed Checklist */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" />
                  What's Included in This Package
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeServiceData.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Addons */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2">Available Custom Add-ons:</span>
                <div className="flex flex-wrap gap-2">
                  {activeServiceData.popularAddons.map((addon, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-medium"
                    >
                      + {addon}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Satisfaction Guarantee Banner */}
            <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 border border-pink-500/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-sm text-slate-900">The Dispatch Genie 24-Hour Clean Guarantee</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  If your landlord or inspector flags any item on your checklist, notify us within 24 hours. We return and re-clean free of charge.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Interactive Booking Request Form */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600" />

              {formSubmitted ? (
                /* Success State */
                <div className="py-8 text-center space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">Cleaning Request Received!</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Thank you, <strong className="text-slate-800">{customerName}</strong>! Your job has been scheduled in our Jobber dispatch system.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-sm mx-auto text-left text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jobber Ticket:</span>
                      <span className="font-bold text-slate-800">#{confirmedBookingId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Package:</span>
                      <span className="font-bold text-slate-800">{activeServiceData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Preferred Date:</span>
                      <span className="font-bold text-slate-800">{preferredDate || 'Earliest Available'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                    <button
                      onClick={() => {
                        setFormSubmitted(false);
                        setCustomerName('');
                        setCustomerPhone('');
                        setAddress('');
                      }}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Book Another Clean
                    </button>
                    {onNavigateToMap && (
                      <button
                        onClick={onNavigateToMap}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        View Live Dispatch Map
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Booking Form */
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">
                      Fast Online Intake
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                      Request Your {activeServiceData.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No upfront charges required. We confirm your crew and time slot immediately.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {/* Customer Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Jenkins"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (SMS Updates) *</label>
                      <input
                        type="tel"
                        required
                        placeholder="(780) 555-0199"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email (For Confirmation &amp; Invoice)</label>
                    <input
                      type="email"
                      placeholder="sarah@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>

                  {/* Address Auto-complete */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Edmonton Property Street Address *</label>
                    <AddressAutocompleteInput
                      value={address}
                      onChange={setAddress}
                      onSelect={(pred) => {
                        setAddress(pred.description || pred.mainText);
                      }}
                      placeholder="Start typing your street address..."
                      className="text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">City / Area</label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                      >
                        <option value="Edmonton">Edmonton</option>
                        <option value="Sherwood Park">Sherwood Park</option>
                        <option value="St. Albert">St. Albert</option>
                        <option value="Leduc">Leduc</option>
                        <option value="Spruce Grove">Spruce Grove</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bedrooms</label>
                      <select
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                      >
                        <option value="1 Bedroom">1 Bedroom</option>
                        <option value="2 Bedrooms">2 Bedrooms</option>
                        <option value="3 Bedrooms">3 Bedrooms</option>
                        <option value="4 Bedrooms">4 Bedrooms</option>
                        <option value="5+ Bedrooms">5+ Bedrooms</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bathrooms</label>
                      <select
                        value={bathrooms}
                        onChange={(e) => setBathrooms(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                      >
                        <option value="1 Bathroom">1 Bathroom</option>
                        <option value="2 Bathrooms">2 Bathrooms</option>
                        <option value="3 Bathrooms">3 Bathrooms</option>
                        <option value="4+ Bathrooms">4+ Bathrooms</option>
                      </select>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Date</label>
                      <input
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Time Window</label>
                      <select
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                      >
                        <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
                        <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                        <option value="Evening (4:00 PM - 7:00 PM)">Evening (4:00 PM - 7:00 PM)</option>
                        <option value="Anytime Today (Urgent)">Anytime Today (Urgent)</option>
                      </select>
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Access Notes / Add-ons / Specific Requests
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Key is in lockbox code 4482. Please clean inside the oven and wipe balcony."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Scheduling with Crew...</span>
                    ) : (
                      <>
                        <span>Submit Booking for {activeServiceData.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    🔒 Instant confirmation • Automatically synched to Jobber dispatch
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. EDMONTON COVERAGE MAP PREVIEW & REGIONAL INFO
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="bg-slate-100/70 border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">
                Serving All Greater Edmonton
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                15 Decentralized Home Hubs Delivering Speedy Service
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Our crews start directly from local neighborhoods across Edmonton, cutting down travel time and fuel waste.
              </p>
            </div>
            {onOpenStaffLogin && (
              <button
                onClick={onOpenStaffLogin}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-pink-600 hover:opacity-95 text-xs font-bold text-white flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Lock className="w-3.5 h-3.5 text-white" />
                <span>Staff &amp; Dispatcher Portal Login</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center text-xs">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="font-extrabold text-slate-800 block">Downtown &amp; Oliver</span>
              <span className="text-[10px] text-slate-500">Condos &amp; Apartments</span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="font-extrabold text-slate-800 block">South &amp; Windermere</span>
              <span className="text-[10px] text-slate-500">Chappelle, Terwillegar</span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="font-extrabold text-slate-800 block">West Edmonton</span>
              <span className="text-[10px] text-slate-500">The Hamptons, Lewis</span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="font-extrabold text-slate-800 block">North &amp; Castledowns</span>
              <span className="text-[10px] text-slate-500">Lorelei, Clareview</span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="font-extrabold text-slate-800 block">Sherwood Park</span>
              <span className="text-[10px] text-slate-500">Strathcona County</span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="font-extrabold text-slate-800 block">St. Albert</span>
              <span className="text-[10px] text-slate-500">Residential &amp; Commercial</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
