import React, { useEffect, useRef, useState } from 'react';
import { Map, useMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Technician, ServiceTicket, UrgencyLevel, TicketStatus } from '../types/dispatch';
import { HVAC_DEPOTS } from '../data/cleaningData';
import { decodePolyline } from '../services/routesApi';
import { reverseGeocode, GeocodedAddress } from '../services/geocodingService';
import { MapErrorBoundary } from './MapErrorBoundary';
import { 
  Flame, 
  Clock, 
  Wrench, 
  Truck, 
  Building2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Phone, 
  ShieldAlert, 
  ExternalLink, 
  CheckCircle2, 
  Activity, 
  MapPin, 
  Compass, 
  Navigation, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Copy, 
  Check, 
  MessageSquare,
  Calendar,
  CalendarDays,
  PhoneCall,
  UserCheck,
  Edit2
} from 'lucide-react';
import { 
  ScheduledJobItem, 
  getCleanerColor, 
  getCleanerInitials, 
  formatDateTime 
} from '../data/jobberCalendarData';
import { VanHubEditModal } from './VanHubEditModal';

interface TerritoryMapProps {
  technicians: Technician[];
  tickets: ServiceTicket[];
  scheduledJobs?: ScheduledJobItem[];
  selectedScheduledJobId?: string | null;
  onSelectScheduledJob?: (jobId: string | null) => void;
  onToggleJobStatus?: (jobId: string, newStatus: 'SCHEDULED' | 'COMPLETED') => void;
  onNavigateToCalendar?: (date?: string) => void;
  onUpdateTechnician?: (updatedTech: Technician) => void;
  selectedTechId: string | null;
  onSelectTech: (techId: string | null) => void;
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string | null) => void;
  urgencyFilter: 'ALL' | UrgencyLevel;
  onUrgencyFilterChange: (urgency: 'ALL' | UrgencyLevel) => void;
  onAssignTicketToTech?: (ticketId: string, techId: string) => void;
  onMessageTech?: (tech: Technician) => void;
  isMapsAuthError?: boolean;
  refererErrorUrl?: string | null;
}

// Subcomponent that renders rich Vehicle details and live Reverse Geocoded address from Geocoding API (only on Google Map surfaces per ToS)
function TechInfoWindowContent({
  tech,
  tickets,
  allowGeocoding = true,
  onEditVanHub,
}: {
  tech: Technician;
  tickets: ServiceTicket[];
  allowGeocoding?: boolean;
  onEditVanHub?: (tech: Technician) => void;
}) {
  const [addressData, setAddressData] = useState<GeocodedAddress | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(allowGeocoding);

  // Active tickets for this technician
  const assignedTickets = tickets
    .filter((t) => tech.assignedTicketIds.includes(t.id))
    .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));

  const currentStopTicket = assignedTickets.find((t) => t.status === 'IN_PROGRESS') || assignedTickets[0];

  useEffect(() => {
    if (!allowGeocoding) {
      setIsLoadingAddress(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingAddress(true);

    reverseGeocode(tech.currentLocation.lat, tech.currentLocation.lng)
      .then((res) => {
        if (isCurrent) {
          setAddressData(res);
          setIsLoadingAddress(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setIsLoadingAddress(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [allowGeocoding, tech.currentLocation.lat, tech.currentLocation.lng]);

  return (
    <div className="p-1 max-w-[290px] text-slate-900 font-sans">
      {/* Van Number & Status Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tech.color }} />
          <span className="font-extrabold text-sm text-slate-900">{tech.vanNumber}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            tech.status === 'ON_SITE'
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : tech.status === 'EN_ROUTE'
              ? 'bg-blue-100 text-blue-800 border-blue-300'
              : tech.status === 'RETURNING_DEPOT'
              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}
        >
          {tech.status.replace('_', ' ')}
        </span>
      </div>

      {/* Technician Profile */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-bold text-xs text-slate-800">{tech.name}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" /> {tech.phone}
          </div>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
          {tech.shiftCapacityHours}h Shift
        </span>
      </div>

      {/* Vehicle Location Card: Google Geocoding API on Google Map, Fleet GPS on Fallback */}
      {allowGeocoding ? (
        <div className="p-2 bg-blue-50/80 rounded-lg border border-blue-200 mb-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-blue-900 mb-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>Current Vehicle Address</span>
            </span>
            <span className="text-[8px] px-1 bg-blue-200/80 text-blue-900 rounded font-bold uppercase">
              Geocoding API
            </span>
          </div>

          {isLoadingAddress ? (
            <div className="animate-pulse py-1 space-y-1">
              <div className="h-3 bg-blue-200/60 rounded w-4/5"></div>
              <div className="h-2 bg-blue-100 rounded w-1/2"></div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold text-slate-900 leading-snug">
                {addressData?.formattedAddress || `${tech.currentLocation.lat.toFixed(4)}, ${tech.currentLocation.lng.toFixed(4)}`}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>{tech.currentLocation.lat.toFixed(4)}° N, {tech.currentLocation.lng.toFixed(4)}° W</span>
                {addressData?.neighborhood && (
                  <span className="text-blue-700 font-sans font-medium">{addressData.neighborhood}</span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mb-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <span>Vehicle GPS Coordinates</span>
            </span>
            <span className="text-[8px] px-1 bg-slate-200 text-slate-700 rounded font-bold uppercase">
              Telematics
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 leading-snug font-mono">
              {tech.currentLocation.lat.toFixed(4)}° N, {Math.abs(tech.currentLocation.lng).toFixed(4)}° W
            </p>
            <div className="text-[10px] text-slate-500 mt-1">
              🏠 Home Hub: <strong className="text-slate-700">{tech.homeAddress || tech.depotLocation.name}</strong>
            </div>
            {tech.email && (
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                ✉️ {tech.email}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Stop / Assignment Status */}
      {currentStopTicket && (
        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 mb-2 text-xs">
          <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
            <Navigation className="w-3 h-3 text-amber-600" />
            <span>
              {tech.status === 'ON_SITE' ? 'Servicing Stop' : 'Target Destination'}:
            </span>
          </div>
          <p className="font-bold text-slate-800 text-[11px] truncate">
            {currentStopTicket.ticketNumber} • {currentStopTicket.customerName}
          </p>
        </div>
      )}

      {/* Route & Stop Metrics */}
      <div className="grid grid-cols-2 gap-1.5 text-center p-1.5 bg-slate-50 rounded-lg text-xs mb-2 border border-slate-200">
        <div className="bg-white p-1 rounded border border-slate-200">
          <div className="text-[10px] text-slate-500">Route Stops</div>
          <div className="font-bold text-slate-800">{tech.assignedTicketIds.length} Scheduled</div>
        </div>
        <div className="bg-white p-1 rounded border border-slate-200">
          <div className="text-[10px] text-slate-500">Est Route Time</div>
          <div className="font-bold text-blue-600">{tech.routeMetrics?.totalDriveMinutes || 0}m drive</div>
        </div>
      </div>

      {/* Skills */}
      <div className="text-[10px] text-slate-600 flex flex-wrap gap-1">
        <span className="font-semibold text-slate-700">Skills:</span>
        {tech.skills.slice(0, 3).map((s) => (
          <span key={s} className="px-1 py-0.2 bg-slate-100 text-slate-700 rounded text-[9px]">
            {s}
          </span>
        ))}
      </div>

      {/* Edit Van Name & Hub Button */}
      {onEditVanHub && (
        <button
          type="button"
          onClick={() => onEditVanHub(tech)}
          className="w-full mt-2.5 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
        >
          <Edit2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Edit Van Name &amp; Hub Address</span>
        </button>
      )}
    </div>
  );
}

// Bounding box for Greater Edmonton Area (Lat: 53.28 to 53.68, Lng: -113.72 to -113.26)
const EDMONTON_BOUNDS = {
  minLat: 53.28,
  maxLat: 53.68,
  minLng: -113.72,
  maxLng: -113.26,
};

// Subcomponent to manage polylines and viewport fitting with useMap() for Google Maps API
function MapRouteRenderer({
  selectedTech,
  technicians,
  tickets,
}: {
  selectedTech: Technician | null;
  technicians: Technician[];
  tickets: ServiceTicket[];
}) {
  const map = useMap();
  const polylineRefs = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || !window.google?.maps) return;

    // Clear existing polylines
    polylineRefs.current.forEach((p) => p.setMap(null));
    polylineRefs.current = [];

    // If a tech is selected, draw their active route polyline
    const techsToRender = selectedTech ? [selectedTech] : technicians.filter((t) => t.assignedTicketIds.length > 0);

    techsToRender.forEach((tech) => {
      const isSelected = selectedTech?.id === tech.id;
      const techTickets = tickets
        .filter((t) => tech.assignedTicketIds.includes(t.id))
        .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));

      if (techTickets.length === 0) return;

      let pathCoords: google.maps.LatLngLiteral[] = [];

      if (tech.routeMetrics?.encodedPolyline) {
        pathCoords = decodePolyline(tech.routeMetrics.encodedPolyline);
      }

      // Fallback direct path
      if (pathCoords.length === 0) {
        pathCoords = [
          { lat: tech.currentLocation.lat, lng: tech.currentLocation.lng },
          ...techTickets.map((t) => ({ lat: t.location.lat, lng: t.location.lng })),
          { lat: tech.depotLocation.lat, lng: tech.depotLocation.lng },
        ];
      }

      const polyline = new google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: tech.color || '#3B82F6',
        strokeOpacity: isSelected ? 0.95 : 0.45,
        strokeWeight: isSelected ? 5 : 3,
        icons: isSelected
          ? [
              {
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: '#FFFFFF',
                  fillColor: tech.color,
                  fillOpacity: 1,
                  strokeWeight: 1.5,
                },
                offset: '35%',
                repeat: '80px',
              },
            ]
          : undefined,
        map,
      });

      polylineRefs.current.push(polyline);
    });

    return () => {
      polylineRefs.current.forEach((p) => p.setMap(null));
      polylineRefs.current = [];
    };
  }, [map, selectedTech, technicians, tickets]);

  return null;
}

// Custom Zoom and View Reset Controls for Google Maps JS SDK (eliminates default UI collision)
function GoogleMapZoomControls() {
  const map = useMap();
  if (!map) return null;

  return (
    <div className="absolute bottom-18 landscape:bottom-3 md:bottom-4 right-3 md:right-4 z-20 flex flex-col gap-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-1 shadow-md">
      <button
        onClick={() => {
          const currentZoom = map.getZoom() || 10;
          map.setZoom(Math.min(18, currentZoom + 1));
        }}
        className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors flex items-center justify-center cursor-pointer"
        title="Zoom In"
        aria-label="Zoom in on territory map"
      >
        <ZoomIn className="w-5 h-5" aria-hidden="true" />
      </button>
      <button
        onClick={() => {
          const currentZoom = map.getZoom() || 10;
          map.setZoom(Math.max(6, currentZoom - 1));
        }}
        className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors flex items-center justify-center cursor-pointer"
        title="Zoom Out"
        aria-label="Zoom out on territory map"
      >
        <ZoomOut className="w-5 h-5" aria-hidden="true" />
      </button>
      <button
        onClick={() => {
          map.setCenter({ lat: 53.5461, lng: -113.4938 });
          map.setZoom(11);
        }}
        className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors border-t border-slate-100 flex items-center justify-center cursor-pointer"
        title="Reset View"
        aria-label="Reset territory map zoom and center"
      >
        <RotateCcw className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
}

// Subcomponent to smoothly pan and zoom to selected job or ticket
function MapPanController({
  selectedScheduledJob,
  selectedTicket,
}: {
  selectedScheduledJob?: ScheduledJobItem | null;
  selectedTicket?: ServiceTicket | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (selectedScheduledJob) {
      map.panTo({ lat: selectedScheduledJob.lat, lng: selectedScheduledJob.lng });
      map.setZoom(14);
    } else if (selectedTicket) {
      map.panTo({ lat: selectedTicket.location.lat, lng: selectedTicket.location.lng });
      map.setZoom(14);
    }
  }, [map, selectedScheduledJob, selectedTicket]);
  return null;
}

export const TerritoryMap: React.FC<TerritoryMapProps> = ({
  technicians,
  tickets,
  scheduledJobs = [],
  selectedScheduledJobId = null,
  onSelectScheduledJob,
  onToggleJobStatus,
  onNavigateToCalendar,
  onUpdateTechnician,
  selectedTechId,
  onSelectTech,
  selectedTicketId,
  onSelectTicket,
  urgencyFilter,
  onUrgencyFilterChange,
  onAssignTicketToTech,
  onMessageTech,
  isMapsAuthError = false,
  refererErrorUrl = null,
}) => {
  const [activeInfoWindow, setActiveInfoWindow] = useState<{
    type: 'TICKET' | 'TECH' | 'DEPOT' | 'JOB';
    id: string;
    position: { lat: number; lng: number };
  } | null>(null);

  const [showDepots, setShowDepots] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showScheduledJobs, setShowScheduledJobs] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid' | 'terrain'>('roadmap');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [localMapError, setLocalMapError] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [isFilterBarCollapsed, setIsFilterBarCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [isSummaryMinimized, setIsSummaryMinimized] = useState(true);

  // Van & Hub Editor modal state
  const [editingVanHubTech, setEditingVanHubTech] = useState<Technician | null>(null);
  const [isVanHubModalOpen, setIsVanHubModalOpen] = useState<boolean>(false);

  // Auto-focus and open info window when selectedScheduledJobId is set
  useEffect(() => {
    if (selectedScheduledJobId && scheduledJobs && scheduledJobs.length > 0) {
      const job = scheduledJobs.find((j) => j.id === selectedScheduledJobId);
      if (job) {
        setActiveInfoWindow({
          type: 'JOB',
          id: job.id,
          position: { lat: job.lat, lng: job.lng },
        });
      }
    }
  }, [selectedScheduledJobId, scheduledJobs]);

  const isMapFallbackActive = isMapsAuthError || localMapError;

  // Fallback vector map pan/zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const vectorContainerRef = useRef<HTMLDivElement>(null);

  // Touch handlers for tablet / mobile gesture panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const selectedTech = technicians.find((t) => t.id === selectedTechId) || null;
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  // Filter tickets according to urgency selection
  const filteredTickets = tickets.filter((t) => {
    if (urgencyFilter === 'ALL') return true;
    return t.urgency === urgencyFilter;
  });

  const getTicketBadge = (ticket: ServiceTicket) => {
    if (ticket.status === 'COMPLETED') {
      return {
        bg: 'bg-emerald-600',
        border: 'border-emerald-500',
        text: 'text-emerald-700',
        label: 'Resolved / Completed',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-white" />,
        isCompleted: true,
      };
    }
    if (ticket.status === 'IN_PROGRESS') {
      return {
        bg: 'bg-amber-500',
        border: 'border-amber-400',
        text: 'text-amber-700',
        label: 'In Progress (On-Site Repair)',
        icon: <Wrench className="w-3.5 h-3.5 text-white animate-spin" />,
        isInProgress: true,
      };
    }
    if (ticket.status === 'EN_ROUTE') {
      return {
        bg: 'bg-blue-600',
        border: 'border-blue-500',
        text: 'text-blue-700',
        label: 'Technician En Route',
        icon: <Truck className="w-3.5 h-3.5 text-white animate-pulse" />,
        isEnRoute: true,
      };
    }

    switch (ticket.urgency) {
      case 'EMERGENCY':
        return {
          bg: 'bg-red-600',
          border: 'border-red-500',
          text: 'text-red-700',
          label: 'Emergency SLA <2h',
          icon: <Flame className="w-3.5 h-3.5 text-white animate-pulse" />,
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-600',
          border: 'border-amber-500',
          text: 'text-amber-700',
          label: 'High Urgency SLA <4h',
          icon: <Flame className="w-3.5 h-3.5 text-white" />,
        };
      case 'SAME_DAY':
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-500',
          text: 'text-amber-700',
          label: 'Same-Day SLA <6h',
          icon: <Clock className="w-3.5 h-3.5 text-white" />,
        };
      case 'ROUTINE':
      case 'LOW':
      default:
        return {
          bg: 'bg-blue-600',
          border: 'border-blue-500',
          text: 'text-blue-700',
          label: 'Routine PM',
          icon: <Wrench className="w-3.5 h-3.5 text-white" />,
        };
    }
  };

  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'EMERGENCY':
        return {
          bg: 'bg-red-600',
          border: 'border-red-500',
          text: 'text-red-700',
          label: 'Emergency SLA <2h',
          icon: <Flame className="w-3.5 h-3.5 text-white animate-pulse" />,
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-600',
          border: 'border-amber-500',
          text: 'text-amber-700',
          label: 'High Urgency SLA <4h',
          icon: <Flame className="w-3.5 h-3.5 text-white" />,
        };
      case 'SAME_DAY':
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-500',
          text: 'text-amber-700',
          label: 'Same-Day SLA <6h',
          icon: <Clock className="w-3.5 h-3.5 text-white" />,
        };
      case 'ROUTINE':
      case 'LOW':
      default:
        return {
          bg: 'bg-blue-600',
          border: 'border-blue-500',
          text: 'text-blue-700',
          label: 'Routine PM',
          icon: <Wrench className="w-3.5 h-3.5 text-white" />,
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_SITE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'EN_ROUTE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'AVAILABLE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'RETURNING_DEPOT':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // Convert lat/lng to SVG percentage coordinates (0% to 100%)
  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - EDMONTON_BOUNDS.minLng) / (EDMONTON_BOUNDS.maxLng - EDMONTON_BOUNDS.minLng)) * 100;
    const y = ((EDMONTON_BOUNDS.maxLat - lat) / (EDMONTON_BOUNDS.maxLat - EDMONTON_BOUNDS.minLat)) * 100;
    return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
  };

  // Pan and drag handlers for vector map
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div id="territory-map-container" className="relative w-full h-full flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* Top Notification Banner if ApiProjectMapError, RefererNotAllowedMapError, or Auth Missing */}
      {isMapFallbackActive && !bannerDismissed && (
        <div className="absolute top-14 left-3 right-3 z-30 bg-amber-50 border border-amber-300 rounded-xl p-3.5 shadow-lg flex items-start justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <div className="font-bold text-amber-950 flex flex-wrap items-center gap-2">
                <span>Google Maps API Key Notice: Interactive Territory Mode Active</span>
                <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-mono font-semibold">
                  Edmonton Dispatch Engine
                </span>
              </div>
              {refererErrorUrl ? (
                <div className="text-amber-900 text-[11px] leading-relaxed space-y-1.5">
                  <p>
                    <strong>HTTP Referrer Restriction (RefererNotAllowedMapError):</strong> Your Google Cloud API key has HTTP referrer restrictions enabled that block requests from this origin.
                  </p>
                  <p>
                    To enable Google Maps for this preview deployment, add this URL pattern to your API Key's <strong>Allowed Websites</strong> in Google Cloud Console:
                  </p>
                  <div className="flex items-center gap-2 bg-amber-100/90 border border-amber-300 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-amber-950">
                    <span className="truncate select-all">{refererErrorUrl}/*</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(`${refererErrorUrl}/*`);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2500);
                      }}
                      className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-sans font-bold text-[10px] cursor-pointer shrink-0 transition-colors"
                      title="Copy URL pattern to clipboard"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3 text-amber-800" />}
                      <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  The Google Maps JavaScript API is restricted or not authorized on this API key. The application is seamlessly utilizing the built-in <strong>Edmonton Territory Dispatch Engine</strong> with real coordinates, 15 live service vans, SLA ticket routes, real-time Routes API simulation, and reverse geocoding.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                <a
                  href="https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-800 hover:text-slate-950 underline flex items-center gap-1"
                >
                  <span>Configure Google Cloud Key Credentials</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-sm font-bold shrink-0 cursor-pointer"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* Screen Reader Live Region for Territory Status Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedTech
          ? `Technician ${selectedTech.vanNumber} (${selectedTech.name}) selected, status: ${selectedTech.status}, ${selectedTech.assignedTicketIds.length} scheduled stops.`
          : `Viewing all service territory. Filter: ${urgencyFilter} tickets. Total tickets: ${tickets.length}.`}
      </div>

      {/* Top Floating Map Controls Bar with Collapsible Mode */}
      <div id="map-control-bar" className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        {isFilterBarCollapsed ? (
          /* Minimized Filter Pill */
          <div className="flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md pointer-events-auto self-start">
            <button
              onClick={() => setIsFilterBarCollapsed(false)}
              className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              title="Expand filter bar"
              aria-label="Expand filter bar"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Filter: {urgencyFilter === 'ALL' ? 'All Tickets' : urgencyFilter} ({filteredTickets.length})</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => setShowScheduledJobs(!showScheduledJobs)}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                showScheduledJobs ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Toggle Scheduled Calendar Jobs"
              aria-label="Toggle scheduled jobs"
            >
              <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Jobs ({scheduledJobs.length})</span>
            </button>

            <button
              onClick={() => setShowVehicles(!showVehicles)}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                showVehicles ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Toggle 15 Vans"
              aria-label="Toggle 15 service vans"
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">15 Vans</span>
            </button>

            <button
              onClick={() => setShowDepots(!showDepots)}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                showDepots ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Toggle Depots"
              aria-label="Toggle regional depots"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Hubs</span>
            </button>

            <button
              onClick={() => setMapType((m) => (m === 'roadmap' ? 'hybrid' : m === 'hybrid' ? 'terrain' : 'roadmap'))}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                mapType === 'hybrid'
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : mapType === 'terrain'
                  ? 'bg-purple-50 text-purple-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={`Current: ${mapType === 'roadmap' ? 'Streets' : mapType === 'hybrid' ? 'Satellite' : 'Terrain'} (Click to cycle Streets / Satellite / Terrain)`}
              aria-label="Toggle map view between Streets, Satellite, and Terrain"
            >
              <Layers className={`w-3.5 h-3.5 ${mapType === 'hybrid' ? 'text-emerald-600' : mapType === 'terrain' ? 'text-purple-600' : 'text-slate-600'}`} />
              <span className="hidden sm:inline capitalize">{mapType === 'roadmap' ? 'Streets' : mapType}</span>
            </button>
          </div>
        ) : (
          /* Full Expanded Filter Row */
          <div className="flex items-center justify-between gap-2 w-full flex-wrap sm:flex-nowrap">
            {/* Left Pills: Urgency Filters */}
            <div className="flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md pointer-events-auto overflow-x-auto max-w-full" role="group" aria-label="Ticket Urgency Filter">
              <button
                id="filter-all-tickets"
                onClick={() => onUrgencyFilterChange('ALL')}
                aria-label={`Show all ${tickets.length} tickets`}
                aria-pressed={urgencyFilter === 'ALL'}
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  urgencyFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                All
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  urgencyFilter === 'ALL' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700 font-bold'
                }`}>
                  {tickets.length}
                </span>
              </button>

              <button
                id="filter-emergency-tickets"
                onClick={() => onUrgencyFilterChange('EMERGENCY')}
                aria-label={`Filter by Emergency urgency, ${tickets.filter((t) => t.urgency === 'EMERGENCY').length} tickets`}
                aria-pressed={urgencyFilter === 'EMERGENCY'}
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  urgencyFilter === 'EMERGENCY'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-700 hover:text-red-800 hover:bg-red-50'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                <span className="hidden xs:inline">Emergency</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  urgencyFilter === 'EMERGENCY' ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800'
                }`}>
                  {tickets.filter((t) => t.urgency === 'EMERGENCY').length}
                </span>
              </button>

              <button
                id="filter-sameday-tickets"
                onClick={() => onUrgencyFilterChange('SAME_DAY')}
                aria-label={`Filter by Same-Day urgency, ${tickets.filter((t) => t.urgency === 'SAME_DAY').length} tickets`}
                aria-pressed={urgencyFilter === 'SAME_DAY'}
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  urgencyFilter === 'SAME_DAY'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:text-amber-900 hover:bg-amber-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                <span className="hidden xs:inline">Same-Day</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  urgencyFilter === 'SAME_DAY' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
                }`}>
                  {tickets.filter((t) => t.urgency === 'SAME_DAY').length}
                </span>
              </button>

              <button
                id="filter-routine-tickets"
                onClick={() => onUrgencyFilterChange('ROUTINE')}
                aria-label={`Filter by Routine urgency, ${tickets.filter((t) => t.urgency === 'ROUTINE').length} tickets`}
                aria-pressed={urgencyFilter === 'ROUTINE'}
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  urgencyFilter === 'ROUTINE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span className="hidden xs:inline">Routine</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  urgencyFilter === 'ROUTINE' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-900'
                }`}>
                  {tickets.filter((t) => t.urgency === 'ROUTINE').length}
                </span>
              </button>
            </div>

            {/* Right Controls: Layer Toggles + Collapse Button */}
            <div className="flex items-center bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-1 shadow-md pointer-events-auto shrink-0 gap-0.5">
              <button
                id="toggle-scheduled-jobs-layer"
                onClick={() => setShowScheduledJobs(!showScheduledJobs)}
                aria-pressed={showScheduledJobs}
                aria-label="Toggle display of scheduled cleaner jobs"
                className={`min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showScheduledJobs
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Scheduled Jobs on Map"
              >
                <CalendarDays className="w-4 h-4 text-purple-600" aria-hidden="true" />
                <span className="hidden sm:inline">Jobs ({scheduledJobs.length})</span>
              </button>

              <button
                id="toggle-vehicles-layer"
                onClick={() => setShowVehicles(!showVehicles)}
                aria-pressed={showVehicles}
                aria-label="Toggle display of 15 service vans on map"
                className={`min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showVehicles ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle 15 Service Vans"
              >
                <Truck className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span className="hidden sm:inline">15 Vans</span>
              </button>

              <button
                id="toggle-depots-layer"
                onClick={() => setShowDepots(!showDepots)}
                aria-pressed={showDepots}
                aria-label="Toggle display of regional logistics hubs"
                className={`min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showDepots ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Regional Depots"
              >
                <Building2 className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                <span className="hidden sm:inline">Hubs</span>
              </button>

              <button
                id="toggle-maptype-layer"
                onClick={() => setMapType((m) => (m === 'roadmap' ? 'hybrid' : m === 'hybrid' ? 'terrain' : 'roadmap'))}
                aria-pressed={mapType !== 'roadmap'}
                aria-label="Toggle map view between Streets, Satellite, and Terrain"
                className={`min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mapType === 'hybrid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                    : mapType === 'terrain'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`Current: ${mapType === 'roadmap' ? 'Streets' : mapType === 'hybrid' ? 'Satellite' : 'Terrain'} (Click to cycle Streets / Satellite / Terrain)`}
              >
                <Layers className={`w-4 h-4 ${mapType === 'hybrid' ? 'text-emerald-600' : mapType === 'terrain' ? 'text-purple-600' : 'text-slate-600'}`} aria-hidden="true" />
                <span className="hidden sm:inline capitalize">{mapType === 'roadmap' ? 'Streets' : mapType}</span>
              </button>

              <button
                onClick={() => setIsFilterBarCollapsed(true)}
                className="min-h-[38px] min-w-[34px] px-1.5 py-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                title="Collapse filter bar to see more map"
                aria-label="Collapse filter bar"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Selected Technician Floating Route Status Bar (Shown cleanly below filters when active) */}
        {selectedTech && (
          <div className="pointer-events-auto self-start flex items-center justify-between gap-2 px-3 py-1.5 bg-white/95 border border-blue-200 rounded-xl backdrop-blur-md text-xs text-slate-800 shadow-md max-w-full animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedTech.color }} />
              <span className="font-bold whitespace-nowrap">{selectedTech.vanNumber}</span>
              <span className="text-slate-600 truncate hidden xs:inline">({selectedTech.name})</span>
              <span className="text-blue-600 font-mono font-semibold whitespace-nowrap text-[11px] sm:text-xs">
                {selectedTech.assignedTicketIds.length} stops • {selectedTech.routeMetrics?.totalDistanceKm ?? Math.round((selectedTech.routeMetrics?.totalDistanceMiles || 0) * 1.60934 * 10) / 10} km
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onMessageTech && (
                <button
                  type="button"
                  onClick={() => onMessageTech(selectedTech)}
                  className="px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-pink-200 shadow-2xs"
                  title={`Send Direct Message to ${selectedTech.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
                  <span className="hidden xs:inline">Message</span>
                </button>
              )}
              <button
                onClick={() => onSelectTech(null)}
                className="min-h-[30px] min-w-[30px] text-slate-500 hover:text-slate-800 text-xs font-bold p-1 rounded-md flex items-center justify-center cursor-pointer"
                title="Clear route selection"
                aria-label="Clear route selection"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Rendering Container */}
      <div className="w-full h-full relative overflow-hidden">
        {!isMapFallbackActive ? (
          /* Official Google Maps Platform SDK Canvas */
          <MapErrorBoundary
            fallback={
              <div className="w-full h-full relative bg-slate-100 flex items-center justify-center">
                <span className="text-xs text-slate-500 font-semibold">Initializing Edmonton Territory Dispatch Engine...</span>
              </div>
            }
            onError={() => setLocalMapError(true)}
          >
            <Map
              mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
              mapTypeId={mapType}
              defaultCenter={{ lat: 53.5461, lng: -113.4938 }}
              defaultZoom={11}
              gestureHandling="greedy"
              disableDefaultUI={true}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
              zoomControl={false}
              rotateControl={false}
              scaleControl={false}
              className="w-full h-full"
              colorScheme="LIGHT"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            >
              {/* Custom Zoom and View Reset Controls */}
              <GoogleMapZoomControls />
              <MapPanController
                selectedScheduledJob={scheduledJobs?.find((j) => j.id === selectedScheduledJobId) || null}
                selectedTicket={selectedTicket}
              />
            {/* Custom Route Lines Renderer */}
            <MapRouteRenderer
              selectedTech={selectedTech}
              technicians={technicians}
              tickets={tickets}
            />

            {/* Regional Depots Markers */}
            {showDepots &&
              HVAC_DEPOTS.map((depot) => (
                <AdvancedMarker
                  key={depot.id}
                  position={{ lat: depot.lat, lng: depot.lng }}
                  onClick={() => {
                    setActiveInfoWindow({
                      type: 'DEPOT',
                      id: depot.id,
                      position: { lat: depot.lat, lng: depot.lng },
                    });
                  }}
                >
                  <div className="flex flex-col items-center group cursor-pointer">
                    <div className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded-md text-[10px] font-bold text-white shadow-lg whitespace-nowrap mb-1">
                      🏢 {depot.name.split(' ')[0]} Hub
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                </AdvancedMarker>
              ))}

            {/* 2 Mobile Cleaning Service Vans */}
            {showVehicles &&
              technicians.map((tech) => {
                const isSelected = selectedTechId === tech.id;
                const isOnSite = tech.status === 'ON_SITE';
                const isEnRoute = tech.status === 'EN_ROUTE';
                const isReturning = tech.status === 'RETURNING_DEPOT';

                return (
                  <AdvancedMarker
                    key={tech.id}
                    position={{ lat: tech.currentLocation.lat, lng: tech.currentLocation.lng }}
                    onClick={() => {
                      onSelectTech(tech.id);
                      setActiveInfoWindow({
                        type: 'TECH',
                        id: tech.id,
                        position: { lat: tech.currentLocation.lat, lng: tech.currentLocation.lng },
                      });
                    }}
                  >
                    <div
                      className={`flex flex-col items-center group cursor-pointer transition-transform duration-200 ${
                        isSelected ? 'scale-125 z-40' : 'hover:scale-110 z-20'
                      }`}
                    >
                      <div
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg border flex items-center gap-1 whitespace-nowrap mb-1 bg-white text-slate-900"
                        style={{
                          borderColor: tech.color,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tech.color }} />
                        <span className="font-extrabold">{tech.vanNumber}</span>
                        {isOnSite ? (
                          <span className="text-amber-700 text-[9px] font-bold flex items-center gap-0.5">
                            <Wrench className="w-2.5 h-2.5 animate-spin" /> On Site
                          </span>
                        ) : isEnRoute ? (
                          <span className="text-blue-600 text-[9px] font-semibold flex items-center gap-0.5">
                            <Truck className="w-2.5 h-2.5" /> En Route
                          </span>
                        ) : isReturning ? (
                          <span className="text-indigo-600 text-[9px] font-semibold flex items-center gap-0.5">
                            <Building2 className="w-2.5 h-2.5" /> Returning
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[9px] font-normal">({tech.assignedTicketIds.length} stops)</span>
                        )}
                      </div>

                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs relative"
                        style={{ backgroundColor: tech.color }}
                      >
                        {isOnSite ? (
                          <Wrench className="w-4 h-4 text-white animate-bounce" />
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}
                        {isOnSite && (
                          <span className="absolute -inset-1.5 rounded-full border-2 border-amber-400 animate-ping opacity-90" />
                        )}
                        {isSelected && !isOnSite && (
                          <span className="absolute -inset-1 rounded-full border-2 border-blue-500 animate-ping opacity-75" />
                        )}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

            {/* Service Ticket Markers with Urgency Badges & Matching Van Colors */}
            {filteredTickets.map((ticket) => {
              const isSelected = selectedTicketId === ticket.id;
              const assignedTech = technicians.find((t) => t.id === ticket.assignedTechId);
              const isAssigned = !!assignedTech;
              const badge = getTicketBadge(ticket);
              const isCompleted = ticket.status === 'COMPLETED';
              const isInProgress = ticket.status === 'IN_PROGRESS';
              const vanColor = assignedTech?.color || '#64748B';

              return (
                <AdvancedMarker
                  key={ticket.id}
                  position={{ lat: ticket.location.lat, lng: ticket.location.lng }}
                  onClick={() => {
                    onSelectTicket(ticket.id);
                    setActiveInfoWindow({
                      type: 'TICKET',
                      id: ticket.id,
                      position: { lat: ticket.location.lat, lng: ticket.location.lng },
                    });
                  }}
                >
                  <div
                    className={`flex flex-col items-center group cursor-pointer transition-all duration-200 ${
                      isSelected ? 'scale-130 z-50' : 'hover:scale-115 z-30'
                    } ${isCompleted ? 'opacity-85' : ''}`}
                  >
                    {/* Van Matching Header Pill */}
                    <div
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-lg border flex items-center gap-1.5 whitespace-nowrap mb-0.5 ${
                        isCompleted ? 'border-dashed' : ''
                      }`}
                      style={{
                        backgroundColor: isCompleted ? `${vanColor}25` : (isAssigned ? vanColor : '#334155'),
                        borderColor: isCompleted ? `${vanColor}70` : (isAssigned ? '#FFFFFF' : '#475569'),
                        color: isCompleted ? '#0F172A' : '#FFFFFF',
                      }}
                    >
                      {isAssigned ? (
                        <>
                          <Truck className={`w-2.5 h-2.5 ${isCompleted ? 'text-slate-700' : 'text-white/90'}`} />
                          <span>{assignedTech.vanNumber}</span>
                          <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${isCompleted ? 'bg-black/10 text-slate-800' : 'bg-black/30'}`}>
                            #{ticket.stopSequence || 1}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300 text-[9px]">Unassigned</span>
                          <span className="font-mono text-amber-300">{ticket.ticketNumber}</span>
                        </>
                      )}

                      {isCompleted ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                      ) : isInProgress ? (
                        <Wrench className="w-3 h-3 text-amber-200 animate-spin" />
                      ) : ticket.urgency === 'EMERGENCY' ? (
                        <Flame className="w-3 h-3 text-white animate-pulse" />
                      ) : null}
                    </div>

                    {/* Marker Pin Body in Van's Color */}
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-xl border-2 shadow-xl flex items-center justify-center font-black text-xs transition-transform ${
                          !isAssigned ? 'border-dashed' : ''
                        }`}
                        style={{
                          backgroundColor: isCompleted ? `${vanColor}30` : (isAssigned ? vanColor : '#475569'),
                          borderColor: isCompleted ? `${vanColor}90` : '#FFFFFF',
                          color: isCompleted ? '#0F172A' : '#FFFFFF',
                          boxShadow: isSelected ? `0 0 16px ${vanColor}` : isCompleted ? '0 2px 6px rgba(0,0,0,0.06)' : `0 4px 12px ${vanColor}80`,
                        }}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                        ) : isInProgress ? (
                          <Wrench className="w-4 h-4 text-white animate-spin" />
                        ) : isAssigned ? (
                          <span className="text-xs font-mono font-black">#{ticket.stopSequence || 1}</span>
                        ) : (
                          badge.icon
                        )}
                      </div>

                      {/* Bottom Pin Pointer Tip */}
                      <div
                        className="w-2 h-2 rotate-45 border-r-2 border-b-2 shadow-xs -mt-1"
                        style={{
                          backgroundColor: isCompleted ? `${vanColor}30` : (isAssigned ? vanColor : '#475569'),
                          borderColor: isCompleted ? `${vanColor}90` : '#FFFFFF',
                        }}
                      />

                      {/* Urgency Overlay Badges */}
                      {ticket.urgency === 'EMERGENCY' && !isCompleted && !isInProgress && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 border border-white rounded-full flex items-center justify-center shadow-md animate-pulse">
                          <Flame className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {ticket.urgency === 'SAME_DAY' && !isCompleted && !isInProgress && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 border border-white rounded-full flex items-center justify-center shadow-md">
                          <Clock className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {isInProgress && (
                        <div className="absolute -inset-1 rounded-xl border-2 border-amber-400 animate-ping opacity-90 pointer-events-none" />
                      )}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Scheduled Calendar Cleaner Jobs with Individual Cleaner Colors & Done Lighter Shading */}
            {showScheduledJobs &&
              scheduledJobs.map((job) => {
                const isSelected = selectedScheduledJobId === job.id;
                const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                const cleanerColor = getCleanerColor(primaryCleaner);
                const initials = getCleanerInitials(primaryCleaner);
                const isCompleted = job.status === 'COMPLETED';
                const isInProgress = job.status === 'IN_PROGRESS';

                return (
                  <AdvancedMarker
                    key={`job-${job.id}`}
                    position={{ lat: job.lat, lng: job.lng }}
                    onClick={() => {
                      onSelectScheduledJob?.(job.id);
                      setActiveInfoWindow({
                        type: 'JOB',
                        id: job.id,
                        position: { lat: job.lat, lng: job.lng },
                      });
                    }}
                  >
                    <div
                      className={`flex flex-col items-center group cursor-pointer transition-all duration-200 ${
                        isSelected ? 'scale-130 z-50' : 'hover:scale-115 z-35'
                      }`}
                    >
                      {/* Cleaner Header Pill */}
                      <div
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-md border flex items-center gap-1.5 whitespace-nowrap mb-0.5 transition-all"
                        style={
                          isCompleted
                            ? {
                                backgroundColor: `${cleanerColor}25`,
                                borderColor: `${cleanerColor}70`,
                                color: '#0F172A',
                              }
                            : {
                                backgroundColor: cleanerColor,
                                borderColor: '#FFFFFF',
                                color: '#FFFFFF',
                                boxShadow: `0 2px 8px ${cleanerColor}60`,
                              }
                        }
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center shrink-0 border border-white/70 bg-black/25 text-white">
                            {initials}
                          </span>
                        )}
                        <span className="font-black truncate max-w-[95px]">{primaryCleaner}</span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                            isCompleted ? 'bg-black/10 text-slate-800' : 'bg-black/25 text-white'
                          }`}
                        >
                          {job.visitNumber}
                        </span>
                      </div>

                      {/* Marker Pin Body */}
                      <div className="relative flex flex-col items-center">
                        <div
                          className="w-8 h-8 rounded-xl border-2 shadow-xl flex items-center justify-center text-xs font-black transition-all"
                          style={
                            isCompleted
                              ? {
                                  // Done jobs: shaded lighter color with dark text
                                  backgroundColor: `${cleanerColor}30`,
                                  borderColor: `${cleanerColor}90`,
                                  color: '#0F172A',
                                  boxShadow: isSelected ? `0 0 16px ${cleanerColor}` : '0 2px 6px rgba(0,0,0,0.08)',
                                }
                              : {
                                  // Open jobs: bright vibrant solid color
                                  backgroundColor: cleanerColor,
                                  borderColor: '#FFFFFF',
                                  color: '#FFFFFF',
                                  boxShadow: isSelected ? `0 0 18px ${cleanerColor}` : `0 4px 14px ${cleanerColor}80`,
                                }
                          }
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                          ) : (
                            <span className="font-mono text-[11px] font-black">{initials}</span>
                          )}
                        </div>

                        {/* Pointer Tip */}
                        <div
                          className="w-2 h-2 rotate-45 border-r-2 border-b-2 shadow-xs -mt-1"
                          style={{
                            backgroundColor: isCompleted ? `${cleanerColor}30` : cleanerColor,
                            borderColor: isCompleted ? `${cleanerColor}90` : '#FFFFFF',
                          }}
                        />

                        {isInProgress && (
                          <div className="absolute -inset-1 rounded-xl border-2 border-amber-400 animate-ping opacity-90 pointer-events-none" />
                        )}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

            {/* Dynamic Interactive Info Windows */}
            {activeInfoWindow && activeInfoWindow.type === 'JOB' && (
              (() => {
                const job = scheduledJobs?.find((j) => j.id === activeInfoWindow.id);
                if (!job) return null;
                const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                const cleanerColor = getCleanerColor(primaryCleaner);
                const isCompleted = job.status === 'COMPLETED';

                return (
                  <InfoWindow
                    position={activeInfoWindow.position}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-1 max-w-[290px] text-slate-900 font-sans space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cleanerColor }}
                          />
                          <span className="font-mono font-bold text-xs text-slate-800">{job.visitNumber}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-purple-50 text-purple-800 border-purple-300'
                          }`}
                        >
                          {isCompleted ? '✓ Done (Light Shaded)' : '● Open (Vibrant)'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-sm text-slate-900 leading-tight">
                          {job.clientName}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {job.serviceType} • {formatDateTime(job.startAt).timeStr}
                        </div>
                      </div>

                      {/* Clickable Phone Number */}
                      <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200">
                        <div className="text-[9px] font-extrabold uppercase text-emerald-800 tracking-wider mb-0.5">
                          Client Phone (Click to Call)
                        </div>
                        <a
                          href={`tel:${job.clientPhone}`}
                          className="flex items-center justify-between text-xs font-mono font-bold text-emerald-950 hover:text-emerald-700 transition-colors"
                          title="Click to dial phone"
                        >
                          <div className="flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{job.clientPhone}</span>
                          </div>
                          <span className="text-[10px] bg-emerald-600 text-white font-sans font-bold px-2 py-0.5 rounded-md shadow-2xs">
                            Call
                          </span>
                        </a>
                      </div>

                      {/* Secondary / Alternate Phone if present */}
                      {job.secondaryPhone && (
                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                          <div className="text-[9px] font-extrabold uppercase text-slate-600 tracking-wider mb-0.5">
                            Alt Phone (Click to Call)
                          </div>
                          <a
                            href={`tel:${job.secondaryPhone}`}
                            className="flex items-center justify-between text-xs font-mono font-bold text-slate-900 hover:text-pink-600 transition-colors"
                            title="Click to dial alternate phone"
                          >
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{job.secondaryPhone}</span>
                            </div>
                            <span className="text-[10px] bg-slate-800 text-white font-sans font-bold px-2 py-0.5 rounded-md shadow-2xs">
                              Call Alt
                            </span>
                          </a>
                        </div>
                      )}

                      {/* Clickable Address */}
                      <div className="bg-purple-50 rounded-xl p-2 border border-purple-200">
                        <div className="text-[9px] font-extrabold uppercase text-purple-800 tracking-wider mb-0.5">
                          Service Address (Click to Open Directions)
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.serviceAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-1 text-xs font-semibold text-purple-950 hover:text-purple-700 transition-colors"
                          title="Click to open directions in Google Maps"
                        >
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{job.serviceAddress}</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        </a>
                      </div>

                      {/* Assigned Cleaner & Quick Toggle */}
                      <div className="pt-1.5 border-t border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium text-[11px]">Assigned:</span>
                          <div className="flex items-center gap-1 font-bold">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: cleanerColor }}
                            />
                            <span style={{ color: cleanerColor }}>{primaryCleaner}</span>
                          </div>
                        </div>

                        {/* One-click Toggle Status */}
                        {onToggleJobStatus && (
                          <button
                            type="button"
                            onClick={() => onToggleJobStatus(job.id, isCompleted ? 'SCHEDULED' : 'COMPLETED')}
                            className={`w-full py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                              isCompleted
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Re-open Job (Switch to Vibrant)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark as Done (Switch to Shaded)</span>
                              </>
                            )}
                          </button>
                        )}

                        {onNavigateToCalendar && (
                          <button
                            type="button"
                            onClick={() => onNavigateToCalendar(job.startAt.split('T')[0])}
                            className="w-full py-1 px-2 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3 text-purple-600" />
                            <span>View in Jobber Calendar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                );
              })()
            )}

            {/* Dynamic Interactive Info Windows */}
            {activeInfoWindow && activeInfoWindow.type === 'TICKET' && (
              (() => {
                const ticket = tickets.find((t) => t.id === activeInfoWindow.id);
                if (!ticket) return null;
                const assignedTech = technicians.find((t) => t.id === ticket.assignedTechId);
                const badge = getUrgencyBadge(ticket.urgency);

                return (
                  <InfoWindow
                    position={activeInfoWindow.position}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-1 max-w-[280px] text-slate-900 font-sans">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${badge.bg}`}>
                            {ticket.urgency}
                          </span>
                          <span className="font-mono font-bold text-xs">{ticket.ticketNumber}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold">{ticket.slaDeadline}</span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 leading-tight mb-1">
                        {ticket.customerName}
                      </h4>

                      <p className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                        📍 {ticket.location.address}
                      </p>

                      <div className="p-1.5 bg-slate-50 rounded-lg text-xs mb-2 border border-slate-200">
                        <div className="font-semibold text-slate-800 text-[11px] mb-0.5">
                          ❄️ {ticket.equipmentType}
                        </div>
                        <p className="text-slate-600 text-[10px] line-clamp-2 leading-relaxed">
                          {ticket.issueDescription}
                        </p>
                        {ticket.faultCode && (
                          <div className="mt-1 font-mono text-[10px] font-bold text-red-600">
                            Fault: {ticket.faultCode}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                        {assignedTech ? (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: assignedTech.color }} />
                              <span style={{ color: assignedTech.color }}>{assignedTech.vanNumber}</span>
                              <span className="text-slate-600 font-normal text-[11px]">({assignedTech.name})</span>
                            </div>
                            {ticket.stopSequence && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] text-white font-mono font-bold"
                                style={{ backgroundColor: assignedTech.color }}
                              >
                                Stop #{ticket.stopSequence}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 font-bold text-xs">Unassigned in Queue</span>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                );
              })()
            )}

            {activeInfoWindow && activeInfoWindow.type === 'TECH' && (
              (() => {
                const tech = technicians.find((t) => t.id === activeInfoWindow.id);
                if (!tech) return null;

                return (
                  <InfoWindow
                    position={{ lat: tech.currentLocation.lat, lng: tech.currentLocation.lng }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <TechInfoWindowContent 
                      tech={tech} 
                      tickets={tickets} 
                      allowGeocoding={true} 
                      onEditVanHub={(t) => {
                        setEditingVanHubTech(t);
                        setIsVanHubModalOpen(true);
                      }}
                    />
                  </InfoWindow>
                );
              })()
            )}

            {activeInfoWindow && activeInfoWindow.type === 'DEPOT' && (
              (() => {
                const depot = HVAC_DEPOTS.find((d) => d.id === activeInfoWindow.id);
                if (!depot) return null;

                return (
                  <InfoWindow
                    position={{ lat: depot.lat, lng: depot.lng }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-3 max-w-[260px] text-slate-800">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base">🏢</span>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">{depot.name}</h4>
                      </div>
                      <p className="text-slate-600 text-xs mb-2">📍 {depot.address}</p>
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-[11px] mb-2.5">
                        Central Logistics, Cleaning Supplies &amp; Fleet Staging Hub.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (technicians.length > 0) {
                            setEditingVanHubTech(technicians[0]);
                            setIsVanHubModalOpen(true);
                          }
                        }}
                        className="w-full py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Edit Hub &amp; Fleet Names</span>
                      </button>
                    </div>
                  </InfoWindow>
                );
              })()
            )}
          </Map>
          </MapErrorBoundary>
        ) : (
          /* Interactive Fallback Edmonton Territory Dispatch Canvas */
          <div
            ref={vectorContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`w-full h-full relative bg-slate-100 overflow-hidden cursor-${isDragging ? 'grabbing' : 'grab'}`}
          >
            {/* Background Corridor Grid & Edmonton Landmarks */}
            <div
              className="absolute inset-0 transition-transform duration-75 origin-center"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                width: '100%',
                height: '100%',
              }}
            >
              {/* Edmonton Regional Highways & North Saskatchewan River SVG Network */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* North Saskatchewan River Valley (Winding southwest to northeast) */}
                <path
                  d="M 10 74 Q 28 62 44 54 T 66 40 T 92 24"
                  stroke="#BFDBFE"
                  strokeWidth="3.2"
                  fill="none"
                  opacity="0.8"
                  strokeLinecap="round"
                />

                {/* Anthony Henday Drive (Ring Road Loop around Edmonton) */}
                <path
                  d="M 50 16 C 82 16 86 38 86 50 C 86 68 82 84 50 84 C 18 84 14 68 14 50 C 14 38 18 16 50 16 Z"
                  stroke="#CBD5E1"
                  strokeWidth="1.6"
                  fill="none"
                  strokeDasharray="3,1"
                />

                {/* Yellowhead Trail / Hwy 16 (East-West northern freeway) */}
                <path d="M 4 33 Q 50 31 96 33" stroke="#CBD5E1" strokeWidth="1.5" fill="none" />

                {/* Whitemud Drive (East-West southern freeway) */}
                <path d="M 12 65 Q 50 62 90 64" stroke="#CBD5E1" strokeWidth="1.5" fill="none" />

                {/* Calgary Trail & Gateway Blvd (South arterial to Nisku / Airport) */}
                <path d="M 52 48 L 52 95" stroke="#CBD5E1" strokeWidth="1.5" fill="none" />

                {/* St. Albert Trail / Mark Messier Trail (Northwest) */}
                <path d="M 45 40 L 22 10" stroke="#CBD5E1" strokeWidth="1.2" fill="none" />

                {/* Sherwood Park Freeway & Baseline Rd (East corridors) */}
                <path d="M 58 54 L 95 56" stroke="#CBD5E1" strokeWidth="1.2" fill="none" />
                <path d="M 60 40 L 95 40" stroke="#E2E8F0" strokeWidth="1.0" fill="none" />

                {/* 170th Street West Industrial Corridor */}
                <path d="M 22 18 L 22 82" stroke="#E2E8F0" strokeWidth="1.1" fill="none" />

                {/* Live Route Polylines Between Techs and Assigned Tickets */}
                {showRoutes &&
                  technicians.map((tech) => {
                    const isSelected = selectedTechId === tech.id;
                    const techTickets = tickets
                      .filter((t) => tech.assignedTicketIds.includes(t.id))
                      .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));

                    if (techTickets.length === 0) return null;
                    if (selectedTechId && !isSelected) return null;

                    const techPos = projectCoords(tech.currentLocation.lat, tech.currentLocation.lng);
                    const depotPos = projectCoords(tech.depotLocation.lat, tech.depotLocation.lng);

                    let pathD = `M ${techPos.x} ${techPos.y}`;
                    techTickets.forEach((t) => {
                      const tPos = projectCoords(t.location.lat, t.location.lng);
                      pathD += ` L ${tPos.x} ${tPos.y}`;
                    });
                    pathD += ` L ${depotPos.x} ${depotPos.y}`;

                    return (
                      <g key={`route-${tech.id}`}>
                        <path
                          d={pathD}
                          stroke={tech.color || '#2563EB'}
                          strokeWidth={isSelected ? '2.5' : '1.2'}
                          strokeOpacity={isSelected ? 0.9 : 0.4}
                          strokeDasharray={isSelected ? '4,2' : '2,2'}
                          fill="none"
                        />
                      </g>
                    );
                  })}
              </svg>

              {/* Geographic Labels */}
              <div className="absolute top-[8%] left-[20%] text-[11px] font-extrabold text-slate-400 tracking-wider">ST. ALBERT</div>
              <div className="absolute top-[42%] left-[45%] text-xs font-black text-slate-600 tracking-widest bg-white/70 px-1.5 py-0.5 rounded shadow-2xs">DOWNTOWN / ICE DISTRICT</div>
              <div className="absolute top-[52%] left-[40%] text-[11px] font-bold text-slate-500">WHYTE AVE / U OF A</div>
              <div className="absolute top-[48%] left-[16%] text-[11px] font-bold text-slate-500">WEST EDMONTON / WEM</div>
              <div className="absolute top-[72%] left-[44%] text-[11px] font-bold text-slate-500">SOUTH EDMONTON COMMON</div>
              <div className="absolute top-[42%] left-[78%] text-[11px] font-extrabold text-slate-400 tracking-wider">SHERWOOD PARK</div>
              <div className="absolute top-[90%] left-[44%] text-[10px] font-bold text-slate-400">NISKU / YEG AIRPORT</div>

              {/* Regional Depots */}
              {showDepots &&
                HVAC_DEPOTS.map((depot) => {
                  const pos = projectCoords(depot.lat, depot.lng);
                  return (
                    <div
                      key={depot.id}
                      onClick={() =>
                        setActiveInfoWindow({
                          type: 'DEPOT',
                          id: depot.id,
                          position: { lat: depot.lat, lng: depot.lng },
                        })
                      }
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group"
                    >
                      <div className="px-2 py-0.5 bg-slate-900 text-white rounded text-[9px] font-bold shadow-md whitespace-nowrap mb-1">
                        🏢 {depot.name.split(' ')[0]}
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}

              {/* 2 Mobile Cleaning Service Vans */}
              {showVehicles &&
                technicians.map((tech) => {
                  const pos = projectCoords(tech.currentLocation.lat, tech.currentLocation.lng);
                  const isSelected = selectedTechId === tech.id;
                  const isOnSite = tech.status === 'ON_SITE';
                  const isEnRoute = tech.status === 'EN_ROUTE';
                  const isReturning = tech.status === 'RETURNING_DEPOT';

                  return (
                    <div
                      key={tech.id}
                      onClick={() => {
                        onSelectTech(tech.id);
                        setActiveInfoWindow({
                          type: 'TECH',
                          id: tech.id,
                          position: { lat: tech.currentLocation.lat, lng: tech.currentLocation.lng },
                        });
                      }}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-30 ${
                        isSelected ? 'scale-125 z-40' : 'hover:scale-115'
                      }`}
                    >
                      <div
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md border flex items-center gap-1 whitespace-nowrap mb-1 bg-white text-slate-900"
                        style={{ borderColor: tech.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tech.color }} />
                        <span>{tech.vanNumber}</span>
                        {isOnSite ? (
                          <span className="text-amber-600 font-bold text-[8px] flex items-center gap-0.5">
                            <Wrench className="w-2 h-2 animate-spin" /> On Site
                          </span>
                        ) : isEnRoute ? (
                          <span className="text-blue-600 font-semibold text-[8px]">En Route</span>
                        ) : isReturning ? (
                          <span className="text-indigo-600 font-semibold text-[8px]">Returning</span>
                        ) : (
                          <span className="text-slate-400 font-normal">({tech.assignedTicketIds.length})</span>
                        )}
                      </div>

                      <div
                        className="w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs relative"
                        style={{ backgroundColor: tech.color }}
                      >
                        {isOnSite ? (
                          <Wrench className="w-3.5 h-3.5 text-white animate-bounce" />
                        ) : (
                          <Truck className="w-3.5 h-3.5" />
                        )}
                        {isOnSite && (
                          <span className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-ping opacity-90" />
                        )}
                        {isSelected && !isOnSite && (
                          <span className="absolute -inset-1 rounded-full border-2 border-blue-500 animate-ping opacity-75" />
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* Service Tickets with Matching Van Colors */}
              {filteredTickets.map((ticket) => {
                const pos = projectCoords(ticket.location.lat, ticket.location.lng);
                const isSelected = selectedTicketId === ticket.id;
                const assignedTech = technicians.find((t) => t.id === ticket.assignedTechId);
                const isAssigned = !!assignedTech;
                const badge = getTicketBadge(ticket);
                const isCompleted = ticket.status === 'COMPLETED';
                const isInProgress = ticket.status === 'IN_PROGRESS';
                const vanColor = assignedTech?.color || '#64748B';

                return (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      onSelectTicket(ticket.id);
                      setActiveInfoWindow({
                        type: 'TICKET',
                        id: ticket.id,
                        position: { lat: ticket.location.lat, lng: ticket.location.lng },
                      });
                    }}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all z-20 flex flex-col items-center group ${
                      isSelected ? 'scale-130 z-40' : 'hover:scale-115'
                    } ${isCompleted ? 'opacity-85' : ''}`}
                  >
                    {/* Van Header Pill */}
                    <div
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold shadow-md border flex items-center gap-1 whitespace-nowrap mb-0.5 ${
                        isCompleted ? 'border-dashed' : ''
                      }`}
                      style={{
                        backgroundColor: isCompleted ? `${vanColor}25` : (isAssigned ? vanColor : '#334155'),
                        borderColor: isCompleted ? `${vanColor}70` : (isAssigned ? '#FFFFFF' : '#475569'),
                        color: isCompleted ? '#0F172A' : '#FFFFFF',
                      }}
                    >
                      {isAssigned ? (
                        <>
                          <Truck className={`w-2.5 h-2.5 ${isCompleted ? 'text-slate-700' : 'text-white/90'}`} />
                          <span>{assignedTech.vanNumber}</span>
                          <span className={`px-1 py-0.2 rounded text-[8px] font-mono ${isCompleted ? 'bg-black/10 text-slate-800' : 'bg-black/30'}`}>
                            #{ticket.stopSequence || 1}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300 text-[8px]">Unassigned</span>
                          <span className="font-mono text-amber-300">{ticket.ticketNumber}</span>
                        </>
                      )}

                      {isCompleted ? (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                      ) : isInProgress ? (
                        <Wrench className="w-2.5 h-2.5 text-amber-200 animate-spin" />
                      ) : ticket.urgency === 'EMERGENCY' ? (
                        <Flame className="w-2.5 h-2.5 text-white animate-pulse" />
                      ) : null}
                    </div>

                    {/* Marker Pin Body in Van's Color */}
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-xl border-2 shadow-lg flex items-center justify-center font-black text-[11px] ${
                          !isAssigned ? 'border-dashed' : ''
                        }`}
                        style={{
                          backgroundColor: isCompleted ? `${vanColor}30` : (isAssigned ? vanColor : '#475569'),
                          borderColor: isCompleted ? `${vanColor}90` : '#FFFFFF',
                          color: isCompleted ? '#0F172A' : '#FFFFFF',
                          boxShadow: isSelected ? `0 0 14px ${vanColor}` : isCompleted ? '0 2px 6px rgba(0,0,0,0.06)' : undefined,
                        }}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                        ) : isInProgress ? (
                          <Wrench className="w-3.5 h-3.5 text-white animate-spin" />
                        ) : isAssigned ? (
                          <span className="font-mono font-black">#{ticket.stopSequence || 1}</span>
                        ) : (
                          badge.icon
                        )}
                      </div>

                      {/* Pin Pointer Tip */}
                      <div
                        className="w-1.5 h-1.5 rotate-45 border-r-2 border-b-2 shadow-xs -mt-1"
                        style={{
                          backgroundColor: isCompleted ? `${vanColor}30` : (isAssigned ? vanColor : '#475569'),
                          borderColor: isCompleted ? `${vanColor}90` : '#FFFFFF',
                        }}
                      />

                      {/* Urgency Overlay */}
                      {ticket.urgency === 'EMERGENCY' && !isCompleted && !isInProgress && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 border border-white rounded-full flex items-center justify-center shadow-md animate-pulse">
                          <Flame className="w-2 h-2 text-white" />
                        </div>
                      )}
                      {ticket.urgency === 'SAME_DAY' && !isCompleted && !isInProgress && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 border border-white rounded-full flex items-center justify-center shadow-md">
                          <Clock className="w-2 h-2 text-white" />
                        </div>
                      )}
                      {isInProgress && (
                        <div className="absolute -inset-1 rounded-xl border-2 border-amber-400 animate-ping opacity-90 pointer-events-none" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Scheduled Calendar Cleaner Jobs on Vector Map */}
              {showScheduledJobs &&
                scheduledJobs.map((job) => {
                  const pos = projectCoords(job.lat, job.lng);
                  const isSelected = selectedScheduledJobId === job.id;
                  const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                  const cleanerColor = getCleanerColor(primaryCleaner);
                  const initials = getCleanerInitials(primaryCleaner);
                  const isCompleted = job.status === 'COMPLETED';

                  return (
                    <div
                      key={`vec-job-${job.id}`}
                      onClick={() => {
                        onSelectScheduledJob?.(job.id);
                        setActiveInfoWindow({
                          type: 'JOB',
                          id: job.id,
                          position: { lat: job.lat, lng: job.lng },
                        });
                      }}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all z-25 flex flex-col items-center group ${
                        isSelected ? 'scale-130 z-45' : 'hover:scale-115'
                      }`}
                    >
                      {/* Cleaner Header Pill */}
                      <div
                        className="px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold shadow-md border flex items-center gap-1 whitespace-nowrap mb-0.5 transition-all"
                        style={
                          isCompleted
                            ? {
                                backgroundColor: `${cleanerColor}25`,
                                borderColor: `${cleanerColor}70`,
                                color: '#0F172A',
                              }
                            : {
                                backgroundColor: cleanerColor,
                                borderColor: '#FFFFFF',
                                color: '#FFFFFF',
                                boxShadow: `0 2px 6px ${cleanerColor}60`,
                              }
                        }
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <span className="w-3 h-3 rounded-full text-[7.5px] font-black flex items-center justify-center shrink-0 border border-white/70 bg-black/25 text-white">
                            {initials}
                          </span>
                        )}
                        <span className="font-black truncate max-w-[85px]">{primaryCleaner}</span>
                        <span className={`px-1 rounded text-[8px] font-mono ${isCompleted ? 'bg-black/10 text-slate-800' : 'bg-black/25 text-white'}`}>
                          {job.visitNumber}
                        </span>
                      </div>

                      {/* Marker Pin Body */}
                      <div className="relative flex flex-col items-center">
                        <div
                          className="w-7 h-7 rounded-xl border-2 shadow-lg flex items-center justify-center font-black text-[11px] transition-all"
                          style={
                            isCompleted
                              ? {
                                  // Done jobs: shaded lighter color
                                  backgroundColor: `${cleanerColor}30`,
                                  borderColor: `${cleanerColor}90`,
                                  color: '#0F172A',
                                  boxShadow: isSelected ? `0 0 14px ${cleanerColor}` : '0 2px 6px rgba(0,0,0,0.06)',
                                }
                              : {
                                  // Open jobs: bright vibrant color
                                  backgroundColor: cleanerColor,
                                  borderColor: '#FFFFFF',
                                  color: '#FFFFFF',
                                  boxShadow: isSelected ? `0 0 16px ${cleanerColor}` : `0 3px 12px ${cleanerColor}80`,
                                }
                          }
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                          ) : (
                            <span className="font-mono text-[10px] font-black">{initials}</span>
                          )}
                        </div>

                        {/* Pointer Tip */}
                        <div
                          className="w-1.5 h-1.5 rotate-45 border-r-2 border-b-2 shadow-xs -mt-1"
                          style={{
                            backgroundColor: isCompleted ? `${cleanerColor}30` : cleanerColor,
                            borderColor: isCompleted ? `${cleanerColor}90` : '#FFFFFF',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Interactive Vector Overlay Info Card Modal */}
            {activeInfoWindow && (
              <div className="absolute top-16 right-4 z-40 bg-white border border-slate-200 rounded-xl shadow-2xl p-3.5 max-w-[310px] animate-fadeIn text-xs text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    {activeInfoWindow.type === 'TICKET'
                      ? 'Service Ticket Details'
                      : activeInfoWindow.type === 'JOB'
                      ? 'Scheduled Cleaner Job'
                      : activeInfoWindow.type === 'TECH'
                      ? 'Technician Profile'
                      : 'Regional Hub'}
                  </div>
                  <button
                    onClick={() => setActiveInfoWindow(null)}
                    className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {activeInfoWindow.type === 'JOB' && (() => {
                  const job = scheduledJobs?.find((j) => j.id === activeInfoWindow.id);
                  if (!job) return null;
                  const primaryCleaner = job.assignedCleaners[0] || 'Unassigned';
                  const cleanerColor = getCleanerColor(primaryCleaner);
                  const isCompleted = job.status === 'COMPLETED';

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cleanerColor }} />
                          <span className="font-mono font-bold text-xs text-slate-900">{job.visitNumber}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isCompleted ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-purple-50 text-purple-800 border-purple-300'
                          }`}
                        >
                          {isCompleted ? '✓ Done (Light Shaded)' : '● Open (Vibrant)'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-sm text-slate-900 leading-tight">{job.clientName}</h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {job.serviceType} • {formatDateTime(job.startAt).timeStr}
                        </div>
                      </div>

                      {/* Clickable Phone */}
                      <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200">
                        <div className="text-[9px] font-extrabold uppercase text-emerald-800 tracking-wider mb-0.5">
                          Client Phone (Clickable)
                        </div>
                        <a
                          href={`tel:${job.clientPhone}`}
                          className="flex items-center justify-between text-xs font-mono font-bold text-emerald-950 hover:text-emerald-700 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{job.clientPhone}</span>
                          </div>
                          <span className="text-[10px] bg-emerald-600 text-white font-sans font-bold px-2 py-0.5 rounded shadow-2xs">
                            Call
                          </span>
                        </a>
                      </div>

                      {/* Clickable Address */}
                      <div className="bg-purple-50 rounded-xl p-2 border border-purple-200">
                        <div className="text-[9px] font-extrabold uppercase text-purple-800 tracking-wider mb-0.5">
                          Service Address (Clickable)
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.serviceAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-1 text-xs font-semibold text-purple-950 hover:text-purple-700 transition-colors"
                        >
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{job.serviceAddress}</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        </a>
                      </div>

                      {/* Cleaner & Quick Status Toggle */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium text-[11px]">Cleaner:</span>
                          <div className="flex items-center gap-1 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cleanerColor }} />
                            <span style={{ color: cleanerColor }}>{primaryCleaner}</span>
                          </div>
                        </div>

                        {onToggleJobStatus && (
                          <button
                            type="button"
                            onClick={() => onToggleJobStatus(job.id, isCompleted ? 'SCHEDULED' : 'COMPLETED')}
                            className={`w-full py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                              isCompleted
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Re-open Job (Switch to Vibrant)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark as Done (Switch to Shaded)</span>
                              </>
                            )}
                          </button>
                        )}

                        {onNavigateToCalendar && (
                          <button
                            type="button"
                            onClick={() => onNavigateToCalendar(job.startAt.split('T')[0])}
                            className="w-full py-1 px-2 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3 text-purple-600" />
                            <span>View in Jobber Calendar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {activeInfoWindow.type === 'TICKET' && (() => {
                  const ticket = tickets.find((t) => t.id === activeInfoWindow.id);
                  if (!ticket) return null;
                  const assignedTech = technicians.find((t) => t.id === ticket.assignedTechId);
                  const badge = getUrgencyBadge(ticket.urgency);

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${badge.bg}`}>
                          {ticket.urgency}
                        </span>
                        <span className="font-mono font-bold text-slate-800">{ticket.ticketNumber}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">{ticket.customerName}</h4>
                      <p className="text-slate-600 text-xs mb-2">📍 {ticket.location.address}</p>

                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                        <div className="font-bold text-slate-800 text-[11px]">❄️ {ticket.equipmentType}</div>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{ticket.issueDescription}</p>
                        {ticket.faultCode && (
                          <div className="mt-1 font-mono text-[10px] font-bold text-red-600">
                            Fault Code: {ticket.faultCode}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {assignedTech ? (
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: assignedTech.color }} />
                            <span style={{ color: assignedTech.color }}>{assignedTech.vanNumber}</span>
                            <span className="text-slate-600 font-normal text-[11px]">({assignedTech.name})</span>
                            {ticket.stopSequence && (
                              <span
                                className="ml-1 px-1.5 py-0.5 rounded text-[9px] text-white font-mono font-bold"
                                style={{ backgroundColor: assignedTech.color }}
                              >
                                Stop #{ticket.stopSequence}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-700 font-bold">Unassigned in Queue</span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">SLA: {ticket.slaDeadline}</span>
                      </div>
                    </div>
                  );
                })()}

                {activeInfoWindow.type === 'TECH' && (() => {
                  const tech = technicians.find((t) => t.id === activeInfoWindow.id);
                  if (!tech) return null;

                  return (
                    <TechInfoWindowContent 
                      tech={tech} 
                      tickets={tickets} 
                      allowGeocoding={false} 
                      onEditVanHub={(t) => {
                        setEditingVanHubTech(t);
                        setIsVanHubModalOpen(true);
                      }}
                    />
                  );
                })()}

                {activeInfoWindow.type === 'DEPOT' && (() => {
                  const depot = HVAC_DEPOTS.find((d) => d.id === activeInfoWindow.id);
                  if (!depot) return null;

                  return (
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">🏢 {depot.name}</h4>
                      <p className="text-slate-600 text-xs mb-2">📍 {depot.address}</p>
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-[11px] mb-2.5">
                        Central Logistics, Cleaning Supplies &amp; Fleet Staging Hub.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (technicians.length > 0) {
                            setEditingVanHubTech(technicians[0]);
                            setIsVanHubModalOpen(true);
                          }
                        }}
                        className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Edit Hub &amp; Fleet Names</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Bottom-Right Zoom Controls */}
            <div className="absolute bottom-18 landscape:bottom-3 md:bottom-4 right-3 md:right-4 z-20 flex flex-col gap-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-1 shadow-md">
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors flex items-center justify-center cursor-pointer"
                title="Zoom In"
                aria-label="Zoom in on territory map"
              >
                <ZoomIn className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors flex items-center justify-center cursor-pointer"
                title="Zoom Out"
                aria-label="Zoom out on territory map"
              >
                <ZoomOut className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                onClick={resetView}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors border-t border-slate-100 flex items-center justify-center cursor-pointer"
                title="Reset View"
                aria-label="Reset territory map zoom and center"
              >
                <RotateCcw className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Universal Floating Live Fleet Summary Pill & Card (Desktop, Tablet, Mobile) */}
      <div className="absolute bottom-18 landscape:bottom-3 md:bottom-4 left-3 md:left-4 z-20 pointer-events-auto">
        {isSummaryMinimized ? (
          <button
            onClick={() => setIsSummaryMinimized(false)}
            className="min-h-[42px] px-3.5 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-all active:scale-95"
            aria-label="Open Live Fleet Summary"
            title="Open Live Fleet Summary"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fleet: 15 Vans</span>
            <span className="text-slate-500 text-[10px] font-normal">(Stats ↗)</span>
          </button>
        ) : (
          <div className="bg-white p-3.5 rounded-xl shadow-xl border border-slate-200 w-64 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Fleet Summary</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <button
                  onClick={() => setIsSummaryMinimized(true)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close summary card"
                  title="Minimize Summary"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Technicians Active</span>
                <span className="font-bold text-slate-900">15 / 15 Fleet</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-xs text-red-600 font-bold">{tickets.filter((t) => t.urgency === 'EMERGENCY').length}</p>
                  <p className="text-[10px] uppercase font-semibold text-slate-600">Emerg</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-amber-700 font-bold">{tickets.filter((t) => t.urgency === 'SAME_DAY').length}</p>
                  <p className="text-[10px] uppercase font-semibold text-slate-600">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-blue-700 font-bold">{tickets.filter((t) => t.urgency === 'ROUTINE').length}</p>
                  <p className="text-[10px] uppercase font-semibold text-slate-600">Routine</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Van & Hub Editor Modal */}
      <VanHubEditModal
        isOpen={isVanHubModalOpen}
        onClose={() => {
          setIsVanHubModalOpen(false);
          setEditingVanHubTech(null);
        }}
        technician={editingVanHubTech}
        onSave={(updatedTech) => {
          onUpdateTechnician?.(updatedTech);
          setIsVanHubModalOpen(false);
          setEditingVanHubTech(null);
        }}
      />
    </div>
  );
};
