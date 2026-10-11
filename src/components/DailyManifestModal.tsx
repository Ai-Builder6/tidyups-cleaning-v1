import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Technician, ServiceTicket } from '../types/dispatch';
import { generateGoogleMapsNavigationUrl } from '../services/routesApi';
import { 
  Printer, 
  ExternalLink, 
  Download, 
  MapPin, 
  Phone, 
  Mail, 
  Truck, 
  Clock, 
  Route, 
  Fuel, 
  CheckSquare, 
  AlertCircle, 
  Flame, 
  Wrench,
  Copy,
  Share2,
  CheckCircle2,
  X
} from 'lucide-react';

interface DailyManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician | null;
  tickets: ServiceTicket[];
}

export const DailyManifestModal: React.FC<DailyManifestModalProps> = ({
  isOpen,
  onClose,
  technician,
  tickets,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation: Escape key closes modal (WCAG 2.1.2)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Safe calculation of assigned tickets and navigation route regardless of open state
  const assignedTickets = technician
    ? tickets
        .filter(
          (t) =>
            (technician.assignedTicketIds && technician.assignedTicketIds.includes(t.id)) ||
            t.assignedTechId === technician.id
        )
        .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0))
    : [];

  const navigationUrl = technician
    ? generateGoogleMapsNavigationUrl(
        technician.currentLocation,
        assignedTickets,
        technician.depotLocation
      )
    : '';

  const metrics = {
    totalDistanceMiles: Number(
      technician?.routeMetrics?.totalDistanceMiles || (assignedTickets.length > 0 ? 54.5 : 0)
    ),
    totalDistanceKm: Number(
      technician?.routeMetrics?.totalDistanceKm ||
        Math.round((technician?.routeMetrics?.totalDistanceMiles || (assignedTickets.length > 0 ? 54.5 : 0)) * 1.60934 * 10) / 10
    ),
    totalDriveMinutes: Number(
      technician?.routeMetrics?.totalDriveMinutes || (assignedTickets.length > 0 ? 72 : 0)
    ),
    estimatedFuelGallons: Number(
      technician?.routeMetrics?.estimatedFuelGallons || (assignedTickets.length > 0 ? 3.8 : 0)
    ),
    estimatedFuelLiters: Number(
      technician?.routeMetrics?.estimatedFuelLiters ||
        Math.round((technician?.routeMetrics?.estimatedFuelGallons || (assignedTickets.length > 0 ? 3.8 : 0)) * 3.78541 * 10) / 10
    ),
    stopCount: assignedTickets.length,
  };

  // Precompute clean manifest payload without heavy geometry or polyline strings
  const cleanManifestPayload = useMemo(() => {
    if (!technician) return null;
    return {
      technician: {
        id: technician.id,
        name: technician.name,
        vanNumber: technician.vanNumber,
        phone: technician.phone,
        color: technician.color,
        status: technician.status,
        currentLocation: technician.currentLocation ? {
          address: technician.currentLocation.address || 'Field Location',
        } : undefined,
        depotLocation: technician.depotLocation ? {
          name: technician.depotLocation.name,
          address: technician.depotLocation.address,
        } : undefined,
      },
      metrics: {
        totalDistanceMiles: Number(
          technician.routeMetrics?.totalDistanceMiles || (assignedTickets.length > 0 ? 54.5 : 0)
        ),
        totalDistanceKm: Number(
          technician.routeMetrics?.totalDistanceKm ||
            Math.round((technician.routeMetrics?.totalDistanceMiles || (assignedTickets.length > 0 ? 54.5 : 0)) * 1.60934 * 10) / 10
        ),
        totalDriveMinutes: Number(
          technician.routeMetrics?.totalDriveMinutes || (assignedTickets.length > 0 ? 72 : 0)
        ),
        estimatedFuelGallons: Number(
          technician.routeMetrics?.estimatedFuelGallons || (assignedTickets.length > 0 ? 3.8 : 0)
        ),
        estimatedFuelLiters: Number(
          technician.routeMetrics?.estimatedFuelLiters ||
            Math.round((technician.routeMetrics?.estimatedFuelGallons || (assignedTickets.length > 0 ? 3.8 : 0)) * 3.78541 * 10) / 10
        ),
        stopCount: assignedTickets.length,
      },
      navigationUrl,
      tickets: assignedTickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        customerName: t.customerName,
        customerPhone: t.customerPhone,
        customerEmail: t.customerEmail,
        urgency: t.urgency,
        equipmentType: t.equipmentType,
        equipmentModel: t.equipmentModel,
        faultCode: t.faultCode,
        issueDescription: t.issueDescription,
        accessNotes: t.accessNotes,
        estimatedDurationMinutes: t.estimatedDurationMinutes,
        location: t.location ? { address: t.location.address } : undefined,
      })),
    };
  }, [technician, navigationUrl, assignedTickets]);

  const handlePrint = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setIsPrinting(true);
    setPrintError(null);
    setPrintNotice(null);

    // Pre-open popup window in the synchronous user click context to prevent browser popup blockers
    let printWindow: Window | null = null;
    try {
      printWindow = window.open('about:blank', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Preparing Route Manifest...</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #334155; }
                .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                h3 { margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #0f172a; }
                p { margin: 0; font-size: 13px; color: #64748b; }
              </style>
            </head>
            <body>
              <div style="text-align: center;">
                <div class="spinner"></div>
                <h3>Generating Daily Service Manifest</h3>
                <p>Loading technician stop itinerary & customer records...</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch {
      // Ignored if window.open fails directly
    }

    try {
      // 1. Post complete manifest payload via standard JSON fetch (cannot be stripped by iframe sandboxes)
      const res = await fetch('/api/manifest/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanManifestPayload || {}),
      });

      let targetUrl = `/api/manifest/print?techId=${encodeURIComponent(technician.id)}`;
      if (res.ok) {
        const data = await res.json();
        if (data?.printUrl) {
          targetUrl = data.printUrl;
        }
      }

      // 2. Navigate opened window to the prepared manifest URL
      if (printWindow && !printWindow.closed) {
        printWindow.location.href = targetUrl;
      } else {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      setPrintNotice('Print dialog opened in new tab. Choose "Save as PDF" to export.');
    } catch (err: any) {
      console.error('Failed to prepare manifest for print:', err);
      const fallbackUrl = `/api/manifest/print?techId=${encodeURIComponent(technician.id)}`;
      if (printWindow && !printWindow.closed) {
        printWindow.location.href = fallbackUrl;
      } else {
        window.open(fallbackUrl, '_blank');
      }
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
      }, 700);
      setTimeout(() => {
        setPrintNotice(null);
      }, 7000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(navigationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Early return comes strictly AFTER all hooks have executed unconditionally
  if (!isOpen || !technician) return null;

  return (
    <div
      id="daily-manifest-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn print:p-0 print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-manifest-modal-title"
    >
      <div 
        id="daily-manifest-modal-container"
        className="w-full max-w-3xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 font-sans print:border-none print:shadow-none print:max-h-full print:bg-white print:text-black"
      >
        {/* Top Action Bar (Hidden during print) */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: technician.color }} aria-hidden="true" />
            <h2 id="daily-manifest-modal-title" className="font-bold text-base text-slate-900">
              Daily Service Route Manifest — {technician.vanNumber}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {printNotice && (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>{printNotice}</span>
              </span>
            )}

            {printError && (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                {printError}
              </span>
            )}

            <button
              onClick={handleCopyLink}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 shadow-2xs cursor-pointer"
              aria-label="Copy Google Maps Navigation Link to clipboard"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span className="text-emerald-700 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copy Nav Link</span>
                </>
              )}
            </button>

            <a
              href={navigationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              aria-label="Open turn by turn route in Google Maps (opens new tab)"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              <span>Google Maps</span>
            </a>

            <button
              id="manifest-print-btn"
              onClick={handlePrint}
              disabled={isPrinting}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer select-none active:scale-95 disabled:opacity-75 disabled:cursor-wait ${
                isPrinting
                  ? 'bg-emerald-700 ring-2 ring-emerald-400'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2'
              }`}
              aria-label="Print or save manifest as PDF"
              title="Print or save manifest as PDF"
            >
              <Printer className={`w-4 h-4 ${isPrinting ? 'animate-bounce' : ''}`} aria-hidden="true" />
              <span>{isPrinting ? 'Opening Print...' : 'Print / PDF'}</span>
            </button>

            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Close manifest dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Live Copied Announcement Banner for Screen Readers */}
        <div role="status" aria-live="polite" className="sr-only">
          {copied ? 'Google Maps turn by turn navigation link copied to clipboard.' : ''}
        </div>

        {/* Printable Manifest Document Content */}
        <div 
          id="daily-manifest-printable-content"
          className="p-6 flex-1 overflow-y-auto bg-white print:p-0"
        >
          {/* Company & Driver Manifest Header */}
          <div className="border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-blue-700">
                  EDMONTON CLEANING SERVICES DISPATCH
                </div>
                <h1 className="text-xl font-black text-slate-900 mt-0.5">
                  Daily Dispatch Manifest & Multi-Stop Route
                </h1>
                <div className="text-xs text-slate-500 mt-1">
                  Date: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              <div className="text-right">
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-extrabold font-mono text-slate-800 border border-slate-200 inline-block">
                  {technician.vanNumber}
                </div>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  {technician.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {technician.phone}
                </div>
              </div>
            </div>

            {/* Metrics Overview Bar */}
            <div className="grid grid-cols-4 gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="text-[10px] text-slate-500">Total Route Distance</div>
                <div className="font-mono font-bold text-slate-900">{metrics.totalDistanceKm} Kilometers</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Estimated Drive Time</div>
                <div className="font-mono font-bold text-blue-700">{metrics.totalDriveMinutes} Minutes</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Fuel Allocation</div>
                <div className="font-mono font-bold text-emerald-700">~{metrics.estimatedFuelLiters} Liters</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Service Stops</div>
                <div className="font-mono font-bold text-slate-900">{assignedTickets.length} Scheduled</div>
              </div>
            </div>
          </div>

          {/* Depot Departure */}
          <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs mb-3">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px]">
              0
            </span>
            <div className="flex-1">
              <span className="font-bold text-slate-800">Origin / Base Departure: </span>
              <span className="text-slate-600">{technician.currentLocation.address}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">08:00 AM Rollout</span>
          </div>

          {/* Stops List */}
          <div className="space-y-3">
            {assignedTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
                No active service tickets currently assigned to this vehicle.
              </div>
            ) : (
              assignedTickets.map((ticket, idx) => (
                <div
                  key={ticket.id}
                  className="manifest-stop-card p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col gap-2 text-xs"
                >
                  {/* Stop Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full text-white font-extrabold flex items-center justify-center text-xs"
                        style={{ backgroundColor: technician.color }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-mono font-extrabold text-sm text-slate-900">
                          {ticket.ticketNumber}
                        </span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className="font-bold text-slate-800">
                          {ticket.customerName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        ticket.urgency === 'EMERGENCY'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : ticket.urgency === 'SAME_DAY'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {ticket.urgency}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ⏱️ {ticket.estimatedDurationMinutes}m on-site
                      </span>
                    </div>
                  </div>

                  {/* Customer Contact & Navigation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{ticket.location.address}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <a
                        href={`tel:${ticket.customerPhone}`}
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{ticket.customerPhone}</span>
                      </a>
                      <a
                        href={`mailto:${ticket.customerEmail}`}
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{ticket.customerEmail}</span>
                      </a>
                    </div>
                  </div>

                  {/* Cleaning Service Type & Issue Details */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1">
                      <span>✨ {ticket.equipmentType} — {ticket.equipmentModel}</span>
                      {ticket.faultCode && (
                        <span className="font-mono text-red-700 bg-red-100 px-1.5 py-0.2 rounded border border-red-200">
                          Fault Code: {ticket.faultCode}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-1">
                      {ticket.issueDescription}
                    </p>
                    {ticket.accessNotes && (
                      <div className="text-[11px] text-amber-800 font-medium bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                        🔑 Access Notes: {ticket.accessNotes}
                      </div>
                    )}
                  </div>

                  {/* Technician Completion Checkbox Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                        <span>Arrival Time: _______</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                        <span>Refrigerant Logged (lb): _______</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Customer Signature: _______________________</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Depot Return Finish */}
          {assignedTickets.length > 0 && technician.depotLocation && (
            <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs mt-3">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                {assignedTickets.length + 1}
              </span>
              <div className="flex-1">
                <span className="font-bold text-slate-800">Return to Regional Hub: </span>
                <span className="text-slate-600">{technician.depotLocation.name} ({technician.depotLocation.address})</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-mono font-bold">Shift Complete</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
