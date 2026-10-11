import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  HelpCircle, 
  Smartphone, 
  Sliders, 
  Send, 
  ChevronRight,
  ShieldCheck,
  Phone,
  Layers,
  CheckCircle2,
  ListPlus
} from 'lucide-react';

interface QuickRepliesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SmsMessageBlock {
  number: string; // e.g. "1/3"
  heading: string;
  body: string;
  charCount: number;
}

export interface ServiceTemplate {
  id: string;
  title: string;
  badge: string;
  description: string;
  messages: SmsMessageBlock[];
}

export const PRESET_TEMPLATES: ServiceTemplate[] = [
  {
    id: 'STANDARD',
    title: 'Standard House Cleaning',
    badge: 'Routine Maintenance',
    description: 'Standard upkeep for kitchens, bathrooms, living areas, and bedrooms.',
    messages: [
      {
        number: '1/3',
        heading: 'Standard House Cleaning - Kitchen & Bath',
        body: `1/3 Standard House Cleaning - Kitchen & Bath
Kitchen:
- Counters, sinks and backsplash
- Stovetop and appliance exteriors
- Microwave inside and outside
- Cabinet fronts
Bathrooms:
- Toilets, sinks and counters
- Tubs and showers
- Mirrors and fixtures`,
        charCount: 247,
      },
      {
        number: '2/3',
        heading: 'Standard House Cleaning - Living Areas & Floors',
        body: `2/3 Standard House Cleaning - Living & Bedrooms
Living areas and bedrooms:
- Dust reachable surfaces, sills and ledges
- Wipe switches and handles
- Dust baseboards
- Vacuum and mop floors
- Empty garbage bins
Work covers safely reachable surfaces.`,
        charCount: 260,
      },
      {
        number: '3/3',
        heading: 'Optional Extras & Quote Invitation',
        body: `3/3 Optional Extras
Available upon request:
- Inside oven
- Inside fridge
- Interior window glass
- Blinds
- Carpet steam cleaning
- Inside empty cabinets
Please let us know if you need any extras added.
Would you like a quote?`,
        charCount: 227,
      },
    ],
  },
  {
    id: 'DEEP',
    title: 'Deep House Cleaning',
    badge: 'Detailed Scrub',
    description: 'Detailed seasonal scrub covering baseboards, door frames, vents, and edges.',
    messages: [
      {
        number: '1/4',
        heading: 'Deep House Cleaning - Overview & Trim',
        body: `1/4 Deep House Cleaning - Overview & Trim
Includes standard cleaning, plus:
- Wipe baseboards and trim
- Wipe doors, frames, switches and handles
- Clean reachable vents and remove cobwebs
- Detail window sills and tracks
- Spot-wipe walls where suitable`,
        charCount: 263,
      },
      {
        number: '2/4',
        heading: 'Deep Cleaning - Kitchen, Bath & Floor Edges',
        body: `2/4 Deep Cleaning - Kitchen & Bathrooms
- Detailed kitchen and bathroom cleaning
- Counters, sinks, tubs and showers
- Stovetop and appliance exteriors
- Microwave inside and outside
- Clean floor edges and beneath accessible furniture`,
        charCount: 256,
      },
      {
        number: '3/4',
        heading: 'Optional Extras',
        body: `3/4 Optional Extras
Available upon request:
- Inside oven
- Inside fridge
- Interior window glass
- Blinds
- Carpet steam cleaning
- Inside empty cabinets
Work covers accessible, safely reachable surfaces.`,
        charCount: 227,
      },
      {
        number: '4/4',
        heading: 'Quote Invitation',
        body: `4/4 Next Steps
We can tailor this to your home's square footage and layout.
Would you like a quote?`,
        charCount: 97,
      },
    ],
  },
  {
    id: 'MOVE_OUT',
    title: 'Move-Out Cleaning',
    badge: 'Tenant Turnover / Deposit',
    description: 'Comprehensive empty home handover cleaning for landlords, tenants, and realtors.',
    messages: [
      {
        number: '1/4',
        heading: 'Move-Out Cleaning - Kitchen & Cabinets',
        body: `1/4 Move-Out Cleaning - Kitchen & Cabinets
- Detailed kitchen cleaning
- Clean inside and outside empty cabinets and drawers
- Clean microwave inside and outside
- Clean stovetop and appliance exteriors
- Wipe counters and backsplash`,
        charCount: 254,
      },
      {
        number: '2/4',
        heading: 'Move-Out Cleaning - Bathrooms, Doors & Walls',
        body: `2/4 Move-Out Cleaning - Bathrooms & Walls
- Detailed bathroom sanitization
- Wipe baseboards, doors and frames
- Wipe switches and handles
- Clean window sills and tracks
- Spot-wipe walls where suitable`,
        charCount: 233,
      },
      {
        number: '3/4',
        heading: 'Move-Out Cleaning - Floors & Extras',
        body: `3/4 Move-Out Cleaning - Floors & Extras
- Vacuum and mop all floors
- Remove ordinary household garbage
Optional extras available:
- Inside oven
- Inside fridge
- Interior window glass
- Blinds
- Carpet steam cleaning`,
        charCount: 236,
      },
      {
        number: '4/4',
        heading: 'Scope Note & Quote Invitation',
        body: `4/4 Move-Out Scope Note
Covers accessible empty surfaces. Does not cover heavy damage, renovation residue or large junk removal.
Would you like a quote?`,
        charCount: 161,
      },
    ],
  },
  {
    id: 'EXTRAS_ONLY',
    title: 'Optional Add-Ons / Extras',
    badge: 'Custom Add-Ons',
    description: 'Stand-alone reply explaining optional add-on services.',
    messages: [
      {
        number: '1/2',
        heading: 'Optional Cleaning Add-Ons',
        body: `1/2 Optional Cleaning Extras
We can add any of these to your booking:
- Inside oven
- Inside fridge
- Interior window glass
- Blinds
- Carpet steam cleaning
- Inside cabinets (if requested and empty)`,
        charCount: 219,
      },
      {
        number: '2/2',
        heading: 'Add-On Quote Invitation',
        body: `2/2 Booking Details
Extras are added to standard or deep cleans so our crew schedules sufficient time and supplies.
Would you like a quote?`,
        charCount: 147,
      },
    ],
  },
];

export const QuickRepliesModal: React.FC<QuickRepliesModalProps> = ({ isOpen, onClose }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('STANDARD');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Custom Generator state
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'CUSTOM_GENERATOR'>('PRESETS');
  const [customService, setCustomService] = useState<'STANDARD' | 'DEEP' | 'MOVE_OUT'>('STANDARD');
  const [customExtras, setCustomExtras] = useState<{
    oven: boolean;
    fridge: boolean;
    windows: boolean;
    blinds: boolean;
    carpet: boolean;
    cabinets: boolean;
  }>({
    oven: false,
    fridge: false,
    windows: false,
    blinds: false,
    carpet: false,
    cabinets: false,
  });
  const [customNotes, setCustomNotes] = useState('');

  const currentTemplate = useMemo(() => {
    return PRESET_TEMPLATES.find((t) => t.id === selectedTemplateId) || PRESET_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Generate dynamic custom messages based on checklist selections
  const generatedCustomMessages = useMemo<SmsMessageBlock[]>(() => {
    const list: SmsMessageBlock[] = [];

    if (customService === 'STANDARD') {
      list.push({
        number: '1/3',
        heading: 'Standard Cleaning - Kitchen & Bath',
        body: `1/3 Standard House Cleaning - Kitchen & Bath
Kitchen:
- Counters, sinks and backsplash
- Stovetop and appliance exteriors
- Microwave inside and outside
- Cabinet fronts
Bathrooms:
- Toilets, sinks and counters
- Tubs and showers
- Mirrors and fixtures`,
        charCount: 247,
      });

      list.push({
        number: '2/3',
        heading: 'Standard Cleaning - Living & Floors',
        body: `2/3 Standard House Cleaning - Living & Bedrooms
Living areas and bedrooms:
- Dust reachable surfaces, sills and ledges
- Wipe switches and handles
- Dust baseboards
- Vacuum and mop floors
- Empty garbage bins
Work covers safely reachable surfaces.`,
        charCount: 260,
      });
    } else if (customService === 'DEEP') {
      list.push({
        number: '1/3',
        heading: 'Deep Cleaning - Detail Trim & Walls',
        body: `1/3 Deep House Cleaning - Trim & Walls
Includes standard cleaning, plus:
- Wipe baseboards and trim
- Wipe doors, frames, switches and handles
- Clean reachable vents and remove cobwebs
- Detail window sills and tracks
- Spot-wipe walls where suitable`,
        charCount: 254,
      });

      list.push({
        number: '2/3',
        heading: 'Deep Cleaning - Kitchen, Bath & Floor Edges',
        body: `2/3 Deep Cleaning - Kitchen & Bathrooms
- Detailed kitchen and bathroom cleaning
- Counters, sinks, tubs and showers
- Stovetop and appliance exteriors
- Microwave inside and outside
- Clean floor edges and beneath accessible furniture`,
        charCount: 256,
      });
    } else {
      list.push({
        number: '1/3',
        heading: 'Move-Out Cleaning - Kitchen & Cabinets',
        body: `1/3 Move-Out Cleaning - Kitchen & Storage
- Detailed kitchen cleaning
- Clean inside and outside empty cabinets and drawers
- Clean microwave inside and outside
- Clean stovetop and appliance exteriors
- Wipe counters and backsplash`,
        charCount: 254,
      });

      list.push({
        number: '2/3',
        heading: 'Move-Out Cleaning - Bathrooms, Trim & Floors',
        body: `2/3 Move-Out Cleaning - Bathrooms & Floors
- Detailed bathroom sanitization
- Wipe baseboards, doors and frames
- Wipe switches and handles
- Clean window sills and tracks
- Vacuum and mop all floors
- Remove ordinary household garbage`,
        charCount: 255,
      });
    }

    // Extras message
    const activeExtrasList: string[] = [];
    if (customExtras.oven) activeExtrasList.push('- Inside oven');
    if (customExtras.fridge) activeExtrasList.push('- Inside fridge');
    if (customExtras.windows) activeExtrasList.push('- Interior window glass');
    if (customExtras.blinds) activeExtrasList.push('- Blinds');
    if (customExtras.carpet) activeExtrasList.push('- Carpet steam cleaning');
    if (customExtras.cabinets) activeExtrasList.push('- Inside empty cabinets');

    let extrasBody = '';
    if (activeExtrasList.length > 0) {
      extrasBody = `3/3 Requested Extras
Included in your request:
${activeExtrasList.join('\n')}
Work covers accessible, safely reachable surfaces.
Would you like a quote?`;
    } else {
      extrasBody = `3/3 Optional Extras
Available upon request:
- Inside oven
- Inside fridge
- Interior window glass
- Blinds
- Carpet steam cleaning
- Inside empty cabinets
Would you like a quote?`;
    }

    list.push({
      number: '3/3',
      heading: 'Extras & Quote Invitation',
      body: extrasBody,
      charCount: extrasBody.length,
    });

    // Re-index total count
    return list.map((msg, idx) => {
      const total = list.length;
      const numPrefix = `${idx + 1}/${total}`;
      const updatedBody = msg.body.replace(/^\d+\/\d+/, numPrefix);
      return {
        ...msg,
        number: numPrefix,
        body: updatedBody,
        charCount: updatedBody.length,
      };
    });
  }, [customService, customExtras]);

  if (!isOpen) return null;

  const handleCopySingle = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCopyAll = (messages: SmsMessageBlock[]) => {
    const fullText = messages.map((m) => m.body).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const activeMessages = activeTab === 'PRESETS' ? currentTemplate.messages : generatedCustomMessages;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <MessageSquare className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Client SMS Quick Replies</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-white">
                  Tidyups Customer Assistant
                </span>
              </div>
              <p className="text-xs text-white/80">
                Client-ready, phone-friendly SMS messages (250–350 chars each) with 1-click copy
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Navigation */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('PRESETS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PRESETS'
                  ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Standard Service Scripts</span>
            </button>

            <button
              onClick={() => setActiveTab('CUSTOM_GENERATOR')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CUSTOM_GENERATOR'
                  ? 'bg-white text-purple-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Custom Checklist Builder</span>
            </button>
          </div>

          <button
            onClick={() => handleCopyAll(activeMessages)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              copiedAll
                ? 'bg-emerald-600 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
            title="Copy all numbered SMS messages with blank line separation"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAll ? 'Copied Entire Sequence!' : 'Copy All SMS Chunks'}</span>
          </button>
        </div>

        {/* Tab 1: Presets Selector */}
        {activeTab === 'PRESETS' && (
          <div className="p-3 bg-white border-b border-slate-200 shrink-0 overflow-x-auto scrollbar-none flex items-center gap-2">
            {PRESET_TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-purple-50 border-purple-400 text-purple-900 ring-2 ring-purple-400/20 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{tmpl.title}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tmpl.messages.length} SMS
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Custom Checklist Generator Controls */}
        {activeTab === 'CUSTOM_GENERATOR' && (
          <div className="p-3.5 bg-purple-50/60 border-b border-purple-200 shrink-0 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700">Service:</span>
              {(['STANDARD', 'DEEP', 'MOVE_OUT'] as const).map((svc) => (
                <label key={svc} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="customService"
                    checked={customService === svc}
                    onChange={() => setCustomService(svc)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>{svc === 'STANDARD' ? 'Standard Clean' : svc === 'DEEP' ? 'Deep Clean' : 'Move-Out Clean'}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-purple-100">
              <span className="font-bold text-slate-700">Add Optional Extras:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customExtras.oven}
                  onChange={(e) => setCustomExtras({ ...customExtras, oven: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Inside Oven</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customExtras.fridge}
                  onChange={(e) => setCustomExtras({ ...customExtras, fridge: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Inside Fridge</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customExtras.windows}
                  onChange={(e) => setCustomExtras({ ...customExtras, windows: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Windows (Interior)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customExtras.blinds}
                  onChange={(e) => setCustomExtras({ ...customExtras, blinds: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Blinds</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customExtras.carpet}
                  onChange={(e) => setCustomExtras({ ...customExtras, carpet: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Carpet Steam</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customExtras.cabinets}
                  onChange={(e) => setCustomExtras({ ...customExtras, cabinets: e.target.checked })}
                  className="rounded text-purple-600"
                />
                <span>Inside Cabinets</span>
              </label>
            </div>
          </div>
        )}

        {/* Messages List Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Format Rule: <strong>Plain text</strong>, numbered <code>1/{activeMessages.length}</code>, ~250–350 chars each, ending with &quot;Would you like a quote?&quot;
            </span>
            <span className="font-mono text-purple-700 font-bold">
              {activeMessages.length} Message Parts
            </span>
          </div>

          <div className="space-y-3.5">
            {activeMessages.map((msg, idx) => {
              const isCopied = copiedKey === `msg_${idx}`;
              const isIdealLength = msg.charCount >= 100 && msg.charCount <= 360;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-purple-300 transition-all flex flex-col gap-2 group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-purple-100 text-purple-900">
                        {msg.number}
                      </span>
                      <h4 className="text-xs font-extrabold text-slate-900">{msg.heading}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isIdealLength
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                        title="Character count for standard SMS delivery"
                      >
                        {msg.charCount} chars
                      </span>

                      <button
                        onClick={() => handleCopySingle(msg.body, `msg_${idx}`)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900'
                        }`}
                      >
                        {isCopied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Copied!' : 'Copy SMS'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Preformatted text preview */}
                  <pre className="font-mono text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/70 whitespace-pre-wrap leading-relaxed select-all">
                    {msg.body}
                  </pre>
                </div>
              );
            })}
          </div>

          {/* Assistant Policy Reminder Footer */}
          <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Tidyups Assistant Policy Reminder:</p>
              <p className="mt-0.5">
                Work promises apply exclusively to safely reachable, accessible surfaces. Stains, damage, heavy renovation buildup, or large rubbish removal are not automatically covered without an inspection quote.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Direct Dispatch:</span>
            <span className="font-mono font-bold text-slate-800">(587) 900-7223</span>
            <span>•</span>
            <span className="font-mono font-bold text-pink-700">1-833-TIDYUPS</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
