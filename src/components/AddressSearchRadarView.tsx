import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Map, useMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Phone, 
  Copy, 
  Check, 
  ExternalLink, 
  Plus, 
  Filter, 
  Layers, 
  ChevronRight, 
  Clock, 
  Sparkles, 
  Car, 
  Home,
  User, 
  Users, 
  Building2, 
  Compass, 
  RotateCcw, 
  Crosshair, 
  Edit3, 
  Save, 
  X,
  CheckCircle2,
  Award,
  Calendar,
  ZoomIn,
  ZoomOut,
  Map as MapIcon,
  Radio,
  Eye,
  ArrowRightLeft,
  Wrench,
  Truck,
  Trash2,
  Maximize2,
  Route,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft
} from 'lucide-react';
import { Technician, ServiceTicket } from '../types/dispatch';
import { ScheduledJobItem } from '../data/jobberCalendarData';
import { AddressAutocompleteInput, AddressPrediction } from './AddressAutocompleteInput';
import { forwardGeocode, reverseGeocode, calculateDistanceKm, calculateDriveEstimates } from '../services/geocodingService';
import { MapErrorBoundary } from './MapErrorBoundary';

export type LocationToggleMode = 'HOME' | 'LIVE' | 'BOTH';
export type MapTypeMode = 'roadmap' | 'hybrid' | 'terrain';

export interface ClientStop {
  id: string;
  stopNumber: number; // 1, 2, 3...
  address: string;
  lat: number;
  lng: number;
  clientName: string;
  clientPhone: string;
  serviceType: string;
  notes: string;
}

export interface RouteLeg {
  fromLabel: string;
  toLabel: string;
  distanceKm: number;
  distanceMiles: number;
  driveMinutes: number;
}

export interface CleanerLocationPoint {
  type: 'HOME' | 'LIVE';
  lat: number;
  lng: number;
  address: string;
  name: string;
  subLabel?: string;
  straightDistanceKm: number;
  drivingDistanceKm: number;
  drivingDistanceMiles: number;
  driveMinutes: number;
}

export interface RankedCleanerProximity {
  technician: Technician;
  homePoint: CleanerLocationPoint;
  livePoint: CleanerLocationPoint;
  activePoint: CleanerLocationPoint;
  closerType: 'HOME' | 'LIVE';
  legs: RouteLeg[];
  totalRouteDistanceKm: number;
  totalRouteDistanceMiles: number;
  totalRouteDriveMinutes: number;
  rank: number;
}

interface AddressSearchRadarViewProps {
  technicians: Technician[];
  scheduledJobs?: ScheduledJobItem[];
  tickets?: ServiceTicket[];
  onBookCleaner?: (cleaner: Technician, clientAddress: string, clientName?: string, clientPhone?: string, serviceType?: string) => void;
  onUpdateCleanerHub?: (cleanerId: string, newAddress: string, hubName?: string, lat?: number, lng?: number) => void;
  googleMapsApiKey?: string;
  onNavigateToSchedule?: () => void;
}

// Popular Edmonton regional neighborhoods for rapid 1-click test intake
const EDMONTON_QUICK_PRESETS = [
  { label: 'Downtown (Jasper Ave)', address: '10405 Jasper Ave NW, Edmonton, AB T5J 3S2', lat: 53.5412, lng: -113.4988 },
  { label: 'Chappelle (South)', address: '7221 Chivers Pl SW, Edmonton, AB T6W 4L4', lat: 53.4150, lng: -113.5720 },
  { label: 'Mill Woods (South-East)', address: '740 Knottwood Rd S NW, Edmonton, AB T6K 1W5', lat: 53.4540, lng: -113.4350 },
  { label: 'West Edmonton Mall', address: '8882 170 St NW, Edmonton, AB T5T 4J2', lat: 53.5225, lng: -113.6242 },
  { label: 'Clareview (North-East)', address: '3751 139 Ave NW, Edmonton, AB T5Y 3J5', lat: 53.6025, lng: -113.4010 },
  { label: 'Oliver / 124th St', address: '10231 120 St NW, Edmonton, AB T5K 2A4', lat: 53.5435, lng: -113.5285 },
  { label: 'Callingwood (West)', address: '6612 177 St NW, Edmonton, AB T5T 4K6', lat: 53.5030, lng: -113.6260 },
  { label: 'Secord (Far West)', address: '9515 217 St NW, Edmonton, AB T5T 4X2', lat: 53.5350, lng: -113.6920 },
  { label: 'Old Strathcona / Whyte', address: '8440 112 St NW, Edmonton, AB T6G 2B7', lat: 53.5190, lng: -113.4980 },
  { label: 'The Hamptons', address: '19918 62 Ave NW, Edmonton, AB T6M 0L2', lat: 53.5030, lng: -113.6650 },
  { label: 'Sherwood Park', address: '2000 Premier Way, Sherwood Park, AB T8H 2G4', lat: 53.5320, lng: -113.3150 },
  { label: 'St. Albert', address: '201 Boudreau Rd, St. Albert, AB T8N 6C4', lat: 53.6300, lng: -113.6250 },
];

/**
 * Resolves each cleaner's live scheduled job location or active field van position
 */
function resolveCleanerLiveLocation(
  tech: Technician,
  scheduledJobs: ScheduledJobItem[] = [],
  tickets: ServiceTicket[] = []
): { lat: number; lng: number; address: string; name: string; subLabel: string } {
  const activeTicket = tickets.find(
    (t) => t.assignedTechId === tech.id && (t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED')
  );
  if (activeTicket) {
    return {
      lat: activeTicket.location.lat,
      lng: activeTicket.location.lng,
      address: activeTicket.location.address,
      name: `${activeTicket.equipmentType || 'Job'} (${activeTicket.customerName})`,
      subLabel: `${activeTicket.status === 'IN_PROGRESS' ? 'Currently Cleaning' : 'Assigned Stop'} • Job #${activeTicket.ticketNumber || activeTicket.id.slice(0, 6)}`,
    };
  }

  const techFirstName = tech.name.split(' ')[0].toLowerCase();
  const activeJob = scheduledJobs.find(
    (j) =>
      j.assignedCleaners?.some(
        (c) => c.toLowerCase().includes(techFirstName) || c.toLowerCase().includes(tech.name.toLowerCase())
      )
  );
  if (activeJob) {
    const timeStr = activeJob.startAt
      ? new Date(activeJob.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    return {
      lat: activeJob.lat,
      lng: activeJob.lng,
      address: activeJob.serviceAddress,
      name: `${activeJob.title} (${activeJob.clientName})`,
      subLabel: `${activeJob.status} ${timeStr ? `at ${timeStr}` : ''} • Jobber Visit`,
    };
  }

  return {
    lat: tech.currentLocation.lat,
    lng: tech.currentLocation.lng,
    address: tech.currentLocation.address,
    name: `${tech.vanNumber} Field Van Unit`,
    subLabel: 'Active Field Unit (GPS Telematics)',
  };
}

/**
 * Subcomponent to manage Google Maps Camera (pan/zoom), Radar rings, and Multi-Stop Polylines
 */
function RadarGoogleMapManager({
  clientStops,
  rankedCleaners,
  locationMode,
  showRings,
  showLines,
  cameraTarget,
  fitBoundsTrigger,
  selectedCleanerId,
  onMapClick,
}: {
  clientStops: ClientStop[];
  rankedCleaners: RankedCleanerProximity[];
  locationMode: LocationToggleMode;
  showRings: boolean;
  showLines: boolean;
  cameraTarget: { lat: number; lng: number; zoom?: number; timestamp: number } | null;
  fitBoundsTrigger: number;
  selectedCleanerId: string | null;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const circleRefs = useRef<google.maps.Circle[]>([]);
  const lineRefs = useRef<google.maps.Polyline[]>([]);

  // 1. Camera Pan & Zoom Handler: Smoothly animates when user clicks addresses or cleaner profiles
  useEffect(() => {
    if (!map || !cameraTarget) return;
    map.panTo({ lat: cameraTarget.lat, lng: cameraTarget.lng });
    if (cameraTarget.zoom) {
      map.setZoom(cameraTarget.zoom);
    }
  }, [map, cameraTarget]);

  // 2. Fit Bounds Handler: Fits all stops and selected cleaner in single view
  useEffect(() => {
    if (!map || fitBoundsTrigger === 0) return;
    const bounds = new google.maps.LatLngBounds();
    clientStops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
    if (selectedCleanerId) {
      const cleaner = rankedCleaners.find((c) => c.technician.id === selectedCleanerId);
      if (cleaner) {
        bounds.extend({ lat: cleaner.activePoint.lat, lng: cleaner.activePoint.lng });
      }
    }
    map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
  }, [map, fitBoundsTrigger, clientStops, selectedCleanerId, rankedCleaners]);

  // 3. Map Click Listener: Drops/moves active client stop pin
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onMapClick]);

  // 4. Radar concentric range rings around primary stop 1
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    circleRefs.current.forEach((c) => c.setMap(null));
    circleRefs.current = [];

    const primaryPin = clientStops[0];
    if (showRings && primaryPin) {
      const radiiMeters = [5000, 10000, 15000, 20000];
      radiiMeters.forEach((meters, idx) => {
        const circle = new google.maps.Circle({
          center: { lat: primaryPin.lat, lng: primaryPin.lng },
          radius: meters,
          strokeColor: '#9333EA',
          strokeOpacity: 0.35 + idx * 0.05,
          strokeWeight: 1.5,
          fillColor: '#9333EA',
          fillOpacity: 0.02,
          clickable: false,
          map,
        });
        circleRefs.current.push(circle);
      });
    }

    return () => {
      circleRefs.current.forEach((c) => c.setMap(null));
      circleRefs.current = [];
    };
  }, [map, clientStops, showRings]);

  // 5. Multi-Stop Route Polylines & Live Road Navigation
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!map || !window.google?.maps) return;

    lineRefs.current.forEach((l) => l.setMap(null));
    lineRefs.current = [];

    // Initialize or reset DirectionsRenderer for actual turn-by-turn road snapping
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true, // We provide custom styled markers
        polylineOptions: {
          strokeColor: '#7C3AED', // Deep violet for active road driving route
          strokeOpacity: 0.95,
          strokeWeight: 6,
        },
        map,
      });
    }

    if (showLines && clientStops.length > 0) {
      // Find the currently selected cleaner or the #1 closest cleaner to draw their real road route
      const activeCleaner = (selectedCleanerId 
        ? rankedCleaners.find((c) => c.technician.id === selectedCleanerId) 
        : null) || rankedCleaners[0];

      if (activeCleaner && window.google?.maps?.DirectionsService) {
        const directionsService = new google.maps.DirectionsService();
        const origin = { lat: activeCleaner.activePoint.lat, lng: activeCleaner.activePoint.lng };
        const destStop = clientStops[clientStops.length - 1];
        const waypoints = clientStops.slice(0, -1).map((s) => ({
          location: { lat: s.lat, lng: s.lng },
          stopover: true,
        }));

        directionsService.route(
          {
            origin,
            destination: { lat: destStop.lat, lng: destStop.lng },
            waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result && directionsRendererRef.current) {
              directionsRendererRef.current.setDirections(result);
            }
          }
        );
      }

      // Draw faint secondary vectors for all other units
      rankedCleaners.forEach((cleaner) => {
        const tech = cleaner.technician;
        const isSelected = (selectedCleanerId && selectedCleanerId === tech.id) || (!selectedCleanerId && cleaner.rank === 1);
        if (isSelected) return; // Handled by road DirectionsRenderer above

        const startPoint = cleaner.activePoint;
        const routeLine = new google.maps.Polyline({
          path: [
            { lat: startPoint.lat, lng: startPoint.lng },
            { lat: clientStops[0].lat, lng: clientStops[0].lng },
          ],
          strokeColor: tech.color || '#94A3B8',
          strokeOpacity: 0.35,
          strokeWeight: 1.5,
          map,
        });
        lineRefs.current.push(routeLine);
      });
    }

    return () => {
      lineRefs.current.forEach((l) => l.setMap(null));
      lineRefs.current = [];
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] } as any);
      }
    };
  }, [map, clientStops, rankedCleaners, locationMode, showLines, selectedCleanerId]);

  return null;
}

/**
 * Custom Zoom & Map Type Controls overlay
 */
function GoogleMapControlOverlay({
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitAll,
  onFocusClosest,
  mapType,
  onChangeMapType,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitAll: () => void;
  onFocusClosest: () => void;
  mapType: MapTypeMode;
  onChangeMapType: (t: MapTypeMode) => void;
}) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div className="absolute bottom-4 right-4 z-20 pointer-events-auto animate-fadeIn">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 border border-slate-300 shadow-md text-xs font-bold transition-all cursor-pointer backdrop-blur-md hover:scale-105 active:scale-95"
          title="Expand Map Layers & Controls"
        >
          <Layers className="w-3.5 h-3.5 text-purple-600" />
          <span className="capitalize">{mapType === 'roadmap' ? 'Streets' : mapType}</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto animate-fadeIn">
      {/* Map Type Switcher */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-1 shadow-lg flex items-center gap-1 text-[11px] font-bold text-slate-700">
        <button
          onClick={() => onChangeMapType('roadmap')}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
            mapType === 'roadmap' ? 'bg-purple-600 text-white shadow-2xs font-extrabold' : 'hover:bg-slate-100'
          }`}
          title="Roads, Streets & Highway Shields"
        >
          Streets
        </button>
        <button
          onClick={() => onChangeMapType('hybrid')}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
            mapType === 'hybrid' ? 'bg-purple-600 text-white shadow-2xs font-extrabold' : 'hover:bg-slate-100'
          }`}
          title="Satellite Imagery with Street Labels"
        >
          Satellite
        </button>
        <button
          onClick={() => onChangeMapType('terrain')}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
            mapType === 'terrain' ? 'bg-purple-600 text-white shadow-2xs font-extrabold' : 'hover:bg-slate-100'
          }`}
          title="Topographical Roads & River Valley"
        >
          Terrain
        </button>
        <button
          onClick={() => setIsMinimized(true)}
          className="flex items-center gap-1 px-1.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1 text-[10px] font-semibold border-l border-slate-200"
          title="Minimize map controls so it doesn't cover the map"
          aria-label="Minimize map controls"
        >
          <span>Hide</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-1 shadow-lg flex flex-col gap-1 items-center">
        <button
          onClick={onFocusClosest}
          className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
          title="Zoom & Pan to #1 Closest Cleaner"
        >
          <Award className="w-4 h-4" />
        </button>
        <button
          onClick={onFitAll}
          className="p-2 text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
          title="Fit All Route Stops on Map"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onResetView}
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Center on Stop 1"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <div className="w-full h-px bg-slate-200 my-0.5" />
        <button
          onClick={onZoomIn}
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export const AddressSearchRadarView: React.FC<AddressSearchRadarViewProps> = ({
  technicians,
  scheduledJobs = [],
  tickets = [],
  onBookCleaner,
  onUpdateCleanerHub,
  googleMapsApiKey,
  onNavigateToSchedule,
}) => {
  // Multi-Stop Client Inquiry list (Supports Stop 1, Stop 2, Stop 3...)
  const [clientStops, setClientStops] = useState<ClientStop[]>([
    {
      id: 'stop-1',
      stopNumber: 1,
      address: '10405 Jasper Ave NW, Edmonton, AB T5J 3S2',
      lat: 53.5412,
      lng: -113.4988,
      clientName: '',
      clientPhone: '',
      serviceType: 'Standard Cleaning',
      notes: '',
    },
  ]);

  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Core Toggle: HOME vs LIVE vs BOTH
  const [locationMode, setLocationMode] = useState<LocationToggleMode>('HOME');

  // Map Controls & Camera Navigation
  const [mapType, setMapType] = useState<MapTypeMode>('roadmap');
  const [showRadiusRings, setShowRadiusRings] = useState<boolean>(true);
  const [showConnectorLines, setShowConnectorLines] = useState<boolean>(true);
  const [selectedCleanerId, setSelectedCleanerId] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number; zoom?: number; timestamp: number } | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(0);
  const [isCleanersBoxMinimized, setIsCleanersBoxMinimized] = useState<boolean>(false);
  const [activeInfoWindow, setActiveInfoWindow] = useState<{
    id: string;
    type: 'CLIENT' | 'HOME' | 'LIVE';
    position: { lat: number; lng: number };
    title?: string;
    address?: string;
  } | null>(null);

  // Filters
  const [filterMode, setFilterMode] = useState<'ALL' | 'TOP_5' | 'AVAILABLE' | 'SOLO' | 'TEAM'>('ALL');
  const [skillFilter, setSkillFilter] = useState<'ALL' | 'Standard Cleaning' | 'Deep Cleaning' | 'Move-Out Cleaning'>('ALL');
  const [copiedCleanerId, setCopiedCleanerId] = useState<string | null>(null);

  // Edit cleaner home hub modal
  const [editingHubCleaner, setEditingHubCleaner] = useState<Technician | null>(null);
  const [editHubAddress, setEditHubAddress] = useState<string>('');
  const [editHubName, setEditHubName] = useState<string>('');
  const [isSavingHub, setIsSavingHub] = useState<boolean>(false);

  // Focus map camera on a specific coordinate with zoom
  const handleFocusLocation = useCallback((lat: number, lng: number, zoom = 15, title?: string, address?: string, id?: string, type?: 'CLIENT' | 'HOME' | 'LIVE') => {
    setCameraTarget({ lat, lng, zoom, timestamp: Date.now() });
    if (id && type) {
      setActiveInfoWindow({
        id,
        type,
        position: { lat, lng },
        title,
        address,
      });
    }
  }, []);

  // Compute multi-stop route metrics for every cleaner
  const rankedCleaners: RankedCleanerProximity[] = useMemo(() => {
    if (!technicians || technicians.length === 0 || clientStops.length === 0) return [];

    const primaryStop = clientStops[0];

    const list: RankedCleanerProximity[] = technicians.map((tech) => {
      // 1. Home Location
      const homeLat = tech.depotLocation?.lat || tech.currentLocation.lat;
      const homeLng = tech.depotLocation?.lng || tech.currentLocation.lng;
      const homeAddr = tech.depotLocation?.address || tech.homeAddress;
      const homeDistKm = calculateDistanceKm(primaryStop.lat, primaryStop.lng, homeLat, homeLng);
      const homeDrive = calculateDriveEstimates(homeDistKm);

      const homePoint: CleanerLocationPoint = {
        type: 'HOME',
        lat: homeLat,
        lng: homeLng,
        address: homeAddr,
        name: tech.depotLocation?.name || `${tech.name} Home Hub`,
        subLabel: 'Home Depot / Hub',
        straightDistanceKm: Math.round(homeDistKm * 10) / 10,
        drivingDistanceKm: homeDrive.drivingDistanceKm,
        drivingDistanceMiles: homeDrive.drivingDistanceMiles,
        driveMinutes: homeDrive.driveMinutes,
      };

      // 2. Live Location (Active Job or Current Field GPS)
      const liveResolved = resolveCleanerLiveLocation(tech, scheduledJobs, tickets);
      const liveDistKm = calculateDistanceKm(primaryStop.lat, primaryStop.lng, liveResolved.lat, liveResolved.lng);
      const liveDrive = calculateDriveEstimates(liveDistKm);

      const livePoint: CleanerLocationPoint = {
        type: 'LIVE',
        lat: liveResolved.lat,
        lng: liveResolved.lng,
        address: liveResolved.address,
        name: liveResolved.name,
        subLabel: liveResolved.subLabel,
        straightDistanceKm: Math.round(liveDistKm * 10) / 10,
        drivingDistanceKm: liveDrive.drivingDistanceKm,
        drivingDistanceMiles: liveDrive.drivingDistanceMiles,
        driveMinutes: liveDrive.driveMinutes,
      };

      // 3. Determine active point
      const closerType: 'HOME' | 'LIVE' =
        homePoint.drivingDistanceKm <= livePoint.drivingDistanceKm ? 'HOME' : 'LIVE';

      let activePoint: CleanerLocationPoint;
      if (locationMode === 'HOME') {
        activePoint = homePoint;
      } else if (locationMode === 'LIVE') {
        activePoint = livePoint;
      } else {
        activePoint = closerType === 'HOME' ? homePoint : livePoint;
      }

      // 4. Calculate sequential route legs:
      // Leg 0: Cleaner -> Stop 1
      const legs: RouteLeg[] = [];
      const leg0DistKm = calculateDistanceKm(activePoint.lat, activePoint.lng, primaryStop.lat, primaryStop.lng);
      const leg0Drive = calculateDriveEstimates(leg0DistKm);
      legs.push({
        fromLabel: activePoint.name,
        toLabel: `Stop 1: ${primaryStop.address.split(',')[0]}`,
        distanceKm: leg0Drive.drivingDistanceKm,
        distanceMiles: leg0Drive.drivingDistanceMiles,
        driveMinutes: leg0Drive.driveMinutes,
      });

      // Subsequent legs: Stop 1 -> Stop 2, Stop 2 -> Stop 3...
      let cumDistanceKm = leg0Drive.drivingDistanceKm;
      let cumDistanceMiles = leg0Drive.drivingDistanceMiles;
      let cumDriveMinutes = leg0Drive.driveMinutes;

      for (let i = 0; i < clientStops.length - 1; i++) {
        const fromStop = clientStops[i];
        const toStop = clientStops[i + 1];
        const stepDistKm = calculateDistanceKm(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng);
        const stepDrive = calculateDriveEstimates(stepDistKm);
        legs.push({
          fromLabel: `Stop ${i + 1}: ${fromStop.address.split(',')[0]}`,
          toLabel: `Stop ${i + 2}: ${toStop.address.split(',')[0]}`,
          distanceKm: stepDrive.drivingDistanceKm,
          distanceMiles: stepDrive.drivingDistanceMiles,
          driveMinutes: stepDrive.driveMinutes,
        });
        cumDistanceKm += stepDrive.drivingDistanceKm;
        cumDistanceMiles += stepDrive.drivingDistanceMiles;
        cumDriveMinutes += stepDrive.driveMinutes;
      }

      return {
        technician: tech,
        homePoint,
        livePoint,
        activePoint,
        closerType,
        legs,
        totalRouteDistanceKm: Math.round(cumDistanceKm * 10) / 10,
        totalRouteDistanceMiles: Math.round(cumDistanceMiles * 10) / 10,
        totalRouteDriveMinutes: Math.round(cumDriveMinutes),
        rank: 0,
      };
    });

    // Sort ascending by total route driving distance
    list.sort((a, b) => a.totalRouteDistanceKm - b.totalRouteDistanceKm);

    // Assign ranks
    return list.map((c, idx) => ({ ...c, rank: idx + 1 }));
  }, [technicians, scheduledJobs, tickets, clientStops, locationMode]);

  // Filtered cleaners
  const filteredCleaners = useMemo(() => {
    let list = [...rankedCleaners];
    if (filterMode === 'TOP_5') {
      list = list.slice(0, 5);
    } else if (filterMode === 'AVAILABLE') {
      list = list.filter((c) => c.technician.status === 'AVAILABLE');
    } else if (filterMode === 'SOLO') {
      list = list.filter((c) => !c.technician.name.includes('&') && !c.technician.role.toLowerCase().includes('team'));
    } else if (filterMode === 'TEAM') {
      list = list.filter((c) => c.technician.name.includes('&') || c.technician.role.toLowerCase().includes('team'));
    }
    if (skillFilter !== 'ALL') {
      list = list.filter((c) => c.technician.skills?.includes(skillFilter));
    }
    return list;
  }, [rankedCleaners, filterMode, skillFilter]);

  const closestCleaner = rankedCleaners[0];

  // Add another client stop to the route
  const handleAddStop = () => {
    const nextNum = clientStops.length + 1;
    // Default to a secondary preset or central point
    const preset = EDMONTON_QUICK_PRESETS[nextNum] || EDMONTON_QUICK_PRESETS[2];
    const newStop: ClientStop = {
      id: `stop-${Date.now()}`,
      stopNumber: nextNum,
      address: preset.address,
      lat: preset.lat,
      lng: preset.lng,
      clientName: '',
      clientPhone: '',
      serviceType: 'Standard Cleaning',
      notes: '',
    };
    setClientStops([...clientStops, newStop]);
    setActiveStopIndex(clientStops.length);
    handleFocusLocation(preset.lat, preset.lng, 14, `Stop ${nextNum}: Client Target`, preset.address);
  };

  // Remove a client stop
  const handleRemoveStop = (stopId: string) => {
    if (clientStops.length <= 1) return; // Keep at least Stop 1
    const updated = clientStops
      .filter((s) => s.id !== stopId)
      .map((s, idx) => ({ ...s, stopNumber: idx + 1 }));
    setClientStops(updated);
    setActiveStopIndex(0);
  };

  // Update a client stop address & geocode
  const handleUpdateStopAddress = async (index: number, newAddress: string) => {
    const updated = [...clientStops];
    updated[index].address = newAddress;
    setClientStops(updated);

    setIsGeocoding(true);
    try {
      const geo = await forwardGeocode(newAddress);
      updated[index].lat = geo.lat;
      updated[index].lng = geo.lng;
      updated[index].address = geo.formattedAddress;
      setClientStops([...updated]);
      handleFocusLocation(geo.lat, geo.lng, 15, `Stop ${index + 1}: ${geo.formattedAddress}`, geo.formattedAddress);
    } catch (e) {
      console.warn('Geocoding error:', e);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Select autocomplete prediction for active stop
  const handleStopAutocompleteSelect = async (prediction: AddressPrediction, index: number) => {
    // 1. Immediately update address text so it populates right away without delay
    const immediateUpdated = [...clientStops];
    if (immediateUpdated[index]) {
      immediateUpdated[index].address = prediction.description;
      setClientStops(immediateUpdated);
    }

    setIsGeocoding(true);
    try {
      const geo = await forwardGeocode(prediction.description);
      const updated = [...clientStops];
      if (updated[index]) {
        updated[index].address = geo.formattedAddress || prediction.description;
        updated[index].lat = geo.lat;
        updated[index].lng = geo.lng;
        setClientStops(updated);
        handleFocusLocation(geo.lat, geo.lng, 15, `Stop ${index + 1}: ${geo.formattedAddress}`, geo.formattedAddress);
      }
    } catch (e) {
      console.warn('Autocomplete select error:', e);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Quick preset click for active stop
  const handleSelectPreset = (preset: typeof EDMONTON_QUICK_PRESETS[0]) => {
    const updated = [...clientStops];
    if (updated[activeStopIndex]) {
      updated[activeStopIndex].address = preset.address;
      updated[activeStopIndex].lat = preset.lat;
      updated[activeStopIndex].lng = preset.lng;
      setClientStops(updated);
      handleFocusLocation(preset.lat, preset.lng, 15, `Stop ${activeStopIndex + 1}: ${preset.label}`, preset.address);
    }
  };

  // Map Click Handler: Drops/moves the currently selected client stop pin
  const handleMapCoordinateClick = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await reverseGeocode(lat, lng);
      const addr = res.formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}, Edmonton, AB`;
      setClientStops((prev) => {
        const next = [...prev];
        const targetIdx = activeStopIndex < next.length ? activeStopIndex : 0;
        next[targetIdx] = {
          ...next[targetIdx],
          address: addr,
          lat,
          lng,
        };
        return next;
      });
      handleFocusLocation(lat, lng, 15, `Stop ${activeStopIndex + 1}`, addr);
    } catch (err) {
      setClientStops((prev) => {
        const next = [...prev];
        const targetIdx = activeStopIndex < next.length ? activeStopIndex : 0;
        next[targetIdx] = { ...next[targetIdx], lat, lng };
        return next;
      });
    } finally {
      setIsGeocoding(false);
    }
  }, [activeStopIndex, handleFocusLocation]);

  // Copy full multi-stop route info
  const handleCopyDistance = (cleaner: RankedCleanerProximity) => {
    const stopsStr = clientStops.map((s, idx) => `Stop ${idx + 1}: ${s.address}`).join(' -> ');
    const text = `${cleaner.technician.name} (${cleaner.technician.vanNumber}) Multi-Stop Route: [Start: ${cleaner.activePoint.address}] -> ${stopsStr}. Total: ${cleaner.totalRouteDistanceKm} km (${cleaner.totalRouteDistanceMiles} mi • ~${cleaner.totalRouteDriveMinutes} mins total drive).`;
    navigator.clipboard.writeText(text);
    setCopiedCleanerId(cleaner.technician.id);
    setTimeout(() => setCopiedCleanerId(null), 2500);
  };

  // Edit cleaner home hub
  const handleOpenEditHub = (tech: Technician) => {
    setEditingHubCleaner(tech);
    setEditHubAddress(tech.depotLocation?.address || tech.currentLocation.address);
    setEditHubName(tech.depotLocation?.name || `${tech.name} Home Hub`);
  };

  const handleSaveEditHub = async () => {
    if (!editingHubCleaner || !editHubAddress.trim()) return;
    setIsSavingHub(true);
    try {
      const geo = await forwardGeocode(editHubAddress.trim());
      if (onUpdateCleanerHub) {
        onUpdateCleanerHub(editingHubCleaner.id, geo.formattedAddress, editHubName.trim(), geo.lat, geo.lng);
      }
      await fetch('/api/technicians/update-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanerId: editingHubCleaner.id,
          homeAddress: geo.formattedAddress,
          hubName: editHubName.trim(),
          lat: geo.lat,
          lng: geo.lng,
        }),
      });
      setEditingHubCleaner(null);
    } catch (e) {
      console.error('Failed to update hub:', e);
    } finally {
      setIsSavingHub(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-100 font-sans">
      {/* Top Banner & Multi-Stop Caller Intake Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 shadow-2xs z-10 shrink-0">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Title & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Compass className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Multi-Stop Address Radar &amp; Cleaner Proximity
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                  {clientStops.length} Client Stop{clientStops.length > 1 ? 's' : ''} Configured
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Drop multiple client pins to route from <strong className="text-purple-700">Home</strong> or <strong className="text-pink-700">Live Location</strong> to Client 1 &rarr; Client 2. Click any address to zoom in!
              </p>
            </div>
          </div>

          {/* Location Mode Toggle Switch (Home vs Live vs Both) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-300 flex items-center gap-1 shadow-inner">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase px-2 tracking-wider">
                Start From:
              </span>
              <button
                onClick={() => setLocationMode('HOME')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  locationMode === 'HOME'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Route from cleaner's Home Address"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home Hubs</span>
              </button>

              <button
                onClick={() => setLocationMode('LIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  locationMode === 'LIVE'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Route from cleaner's Live Scheduled Job / Van Location"
              >
                <Car className="w-3.5 h-3.5" />
                <span>Live / Job Sites</span>
              </button>

              <button
                onClick={() => setLocationMode('BOTH')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  locationMode === 'BOTH'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Display both Home and Live locations side-by-side with closest badge"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Compare Both</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            {closestCleaner && (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 shrink-0 shadow-2xs">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div className="text-xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Top Route Match:</span>
                  <span className="font-extrabold text-emerald-950 font-mono">
                    {closestCleaner.technician.name} • {closestCleaner.totalRouteDistanceKm} km total (~{closestCleaner.totalRouteDriveMinutes}m)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Stop Address Bars (Stop 1, Stop 2, Stop 3...) */}
        <div className="mt-3 space-y-2">
          {clientStops.map((stop, idx) => (
            <div
              key={stop.id}
              onClick={() => setActiveStopIndex(idx)}
              className={`p-2.5 rounded-2xl border transition-all ${
                activeStopIndex === idx
                  ? 'bg-purple-50/60 border-purple-400 shadow-xs ring-1 ring-purple-300'
                  : 'bg-slate-50/80 border-slate-200 hover:bg-white'
              }`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                {/* Stop Badge & Address Autocomplete */}
                <div className="lg:col-span-7 flex items-center gap-2">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFocusLocation(stop.lat, stop.lng, 16, `Stop ${stop.stopNumber}`, stop.address, stop.id, 'CLIENT');
                    }}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 cursor-pointer shadow-xs transition-transform hover:scale-110 ${
                      idx === 0 ? 'bg-pink-600 text-white' : idx === 1 ? 'bg-indigo-600 text-white' : 'bg-teal-600 text-white'
                    }`}
                    title={`Click to zoom directly to Stop ${stop.stopNumber}`}
                  >
                    {stop.stopNumber}
                  </div>

                  <div className="relative flex-1">
                    <AddressAutocompleteInput
                      value={stop.address}
                      onChange={(v) => {
                        const next = [...clientStops];
                        next[idx].address = v;
                        setClientStops(next);
                      }}
                      onSelect={(pred) => handleStopAutocompleteSelect(pred, idx)}
                      placeholder={`Enter Address for Stop ${stop.stopNumber} (Client ${String.fromCharCode(65 + idx)})...`}
                      className="w-full pl-8 pr-8 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    />
                    <MapPin className="w-3.5 h-3.5 text-pink-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {stop.address && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFocusLocation(stop.lat, stop.lng, 16, `Stop ${stop.stopNumber}`, stop.address, stop.id, 'CLIENT');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800 p-0.5 cursor-pointer"
                        title="Zoom in on Map"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Client Name & Phone */}
                <div className="lg:col-span-4 grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    placeholder={`Client ${String.fromCharCode(65 + idx)} Name...`}
                    value={stop.clientName}
                    onChange={(e) => {
                      const next = [...clientStops];
                      next[idx].clientName = e.target.value;
                      setClientStops(next);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                  />
                  <input
                    type="tel"
                    placeholder="Phone #..."
                    value={stop.clientPhone}
                    onChange={(e) => {
                      const next = [...clientStops];
                      next[idx].clientPhone = e.target.value;
                      setClientStops(next);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                  />
                </div>

                {/* Stop Action: Delete or Zoom */}
                <div className="lg:col-span-1 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleFocusLocation(stop.lat, stop.lng, 16, `Stop ${stop.stopNumber}`, stop.address, stop.id, 'CLIENT')}
                    className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                    title={`Zoom map into Stop ${stop.stopNumber}`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {clientStops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove this stop"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Stop Button + Quick Presets Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <button
              onClick={handleAddStop}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stop {clientStops.length + 1} (Multi-Client Route)</span>
            </button>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] shrink-0">
                Preset for Stop {activeStopIndex + 1}:
              </span>
              {EDMONTON_QUICK_PRESETS.slice(0, 6).map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT / CENTER: Interactive Google Maps Surface (Streets & Roads) */}
        <div className="flex-1 flex flex-col bg-slate-200 relative border-r border-slate-300 overflow-hidden">
          {/* Top Floating Map Info Bar */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-bold flex items-center gap-2 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
              <span>
                Active Target: <code className="text-purple-700 font-mono font-bold">Stop {activeStopIndex + 1}</code>
              </span>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-300 text-slate-700 text-xs shadow-lg">
              <button
                onClick={() => setFitBoundsTrigger((t) => t + 1)}
                className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all cursor-pointer flex items-center gap-1"
                title="Fit all stops and cleaner route in view"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fit Route</span>
              </button>
              <button
                onClick={() => setShowRadiusRings(!showRadiusRings)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                  showRadiusRings ? 'bg-purple-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Toggle 5km, 10km, 15km, 20km radar range circles"
              >
                Rings
              </button>
              <button
                onClick={() => setShowConnectorLines(!showConnectorLines)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                  showConnectorLines ? 'bg-pink-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Toggle route vector lines"
              >
                Route Lines
              </button>
            </div>
          </div>

          {/* Interactive Google Map with Streets, Roads, & Multi-Stop Pins */}
          <div className="w-full h-full relative overflow-hidden">
            <MapErrorBoundary
              fallback={
                <div className="w-full h-full relative bg-slate-100 flex items-center justify-center">
                  <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-300 max-w-sm text-center">
                    <Compass className="w-8 h-8 text-purple-600 mx-auto mb-2 animate-spin-slow" />
                    <h3 className="font-extrabold text-sm text-slate-900">Loading Edmonton Multi-Stop Radar</h3>
                    <p className="text-xs text-slate-500 mt-1">Calculating road distances &amp; route legs...</p>
                  </div>
                </div>
              }
            >
              <Map
                mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
                mapTypeId={mapType}
                defaultCenter={{ lat: 53.5461, lng: -113.4938 }}
                defaultZoom={11}
                gestureHandling="greedy"
                disableDefaultUI={true}
                className="w-full h-full"
                colorScheme="LIGHT"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              >
                {/* Manager for Camera Pan/Zoom, Circles, and Polylines */}
                <RadarGoogleMapManager
                  clientStops={clientStops}
                  rankedCleaners={rankedCleaners}
                  locationMode={locationMode}
                  showRings={showRadiusRings}
                  showLines={showConnectorLines}
                  cameraTarget={cameraTarget}
                  fitBoundsTrigger={fitBoundsTrigger}
                  selectedCleanerId={selectedCleanerId}
                  onMapClick={handleMapCoordinateClick}
                />

                {/* Multiple Client Stop Pins (Stop 1, Stop 2, Stop 3...) */}
                {clientStops.map((stop, idx) => (
                  <AdvancedMarker
                    key={stop.id}
                    position={{ lat: stop.lat, lng: stop.lng }}
                    onClick={() => {
                      setActiveStopIndex(idx);
                      handleFocusLocation(stop.lat, stop.lng, 16, `Stop ${stop.stopNumber}`, stop.address, stop.id, 'CLIENT');
                    }}
                  >
                    <div className="flex flex-col items-center group cursor-pointer">
                      <div className={`px-2.5 py-1 border rounded-lg text-[10px] font-extrabold text-white shadow-xl whitespace-nowrap mb-1 flex items-center gap-1 ${
                        idx === 0 ? 'bg-pink-700 border-pink-500' : idx === 1 ? 'bg-indigo-700 border-indigo-500' : 'bg-teal-700 border-teal-500'
                      }`}>
                        <MapPin className="w-3 h-3" />
                        <span>STOP {stop.stopNumber}: {stop.address.split(',')[0]}</span>
                      </div>
                      <div className={`w-8 h-8 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white font-black text-xs relative ${
                        idx === 0 ? 'bg-pink-600' : idx === 1 ? 'bg-indigo-600' : 'bg-teal-600'
                      }`}>
                        <span>{stop.stopNumber}</span>
                        <span className="absolute -inset-1.5 rounded-full border-2 border-pink-400 animate-ping opacity-90" />
                      </div>
                    </div>
                  </AdvancedMarker>
                ))}

                {/* Plot Cleaner Home Pins (if HOME or BOTH mode) */}
                {(locationMode === 'HOME' || locationMode === 'BOTH') &&
                  rankedCleaners.map((cleaner) => {
                    const tech = cleaner.technician;
                    const isTop1 = cleaner.rank === 1 && locationMode === 'HOME';
                    const isSelected = selectedCleanerId === tech.id;

                    return (
                      <AdvancedMarker
                        key={`home-${tech.id}`}
                        position={{ lat: cleaner.homePoint.lat, lng: cleaner.homePoint.lng }}
                        onClick={() => {
                          setSelectedCleanerId(tech.id);
                          handleFocusLocation(
                            cleaner.homePoint.lat,
                            cleaner.homePoint.lng,
                            15,
                            `${tech.name} (Home Hub)`,
                            cleaner.homePoint.address,
                            tech.id,
                            'HOME'
                          );
                        }}
                      >
                        <div className="flex flex-col items-center group cursor-pointer">
                          <div
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg border flex items-center gap-1 whitespace-nowrap mb-1 ${
                              isTop1 ? 'bg-emerald-600 text-white border-emerald-400 font-black' : 'bg-white text-slate-900 border-slate-300'
                            }`}
                          >
                            <Home className="w-2.5 h-2.5 text-purple-600" />
                            <span>{tech.name.split(' ')[0]}</span>
                            <span className="font-mono text-[9px] text-purple-700 bg-purple-100 px-1 rounded">
                              {cleaner.totalRouteDistanceKm}km
                            </span>
                            {isTop1 && <Award className="w-2.5 h-2.5 text-amber-300" />}
                          </div>

                          <div
                            className="w-7 h-7 rounded-xl border-2 border-white shadow-xl flex items-center justify-center text-white font-extrabold text-[11px] relative transition-transform group-hover:scale-125"
                            style={{ backgroundColor: tech.color || '#3B82F6' }}
                          >
                            <Home className="w-3.5 h-3.5" />
                            {isTop1 && (
                              <span className="absolute -inset-1 rounded-xl border-2 border-emerald-400 animate-ping opacity-75" />
                            )}
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                {/* Plot Cleaner Live / Job Pins (if LIVE or BOTH mode) */}
                {(locationMode === 'LIVE' || locationMode === 'BOTH') &&
                  rankedCleaners.map((cleaner) => {
                    const tech = cleaner.technician;
                    const isTop1 = cleaner.rank === 1 && locationMode === 'LIVE';
                    const isSelected = selectedCleanerId === tech.id;

                    return (
                      <AdvancedMarker
                        key={`live-${tech.id}`}
                        position={{ lat: cleaner.livePoint.lat, lng: cleaner.livePoint.lng }}
                        onClick={() => {
                          setSelectedCleanerId(tech.id);
                          handleFocusLocation(
                            cleaner.livePoint.lat,
                            cleaner.livePoint.lng,
                            15,
                            `${tech.name} (Live Job)`,
                            cleaner.livePoint.address,
                            tech.id,
                            'LIVE'
                          );
                        }}
                      >
                        <div className="flex flex-col items-center group cursor-pointer">
                          <div
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg border flex items-center gap-1 whitespace-nowrap mb-1 ${
                              isTop1 ? 'bg-emerald-600 text-white border-emerald-400 font-black' : 'bg-white text-slate-900 border-slate-300'
                            }`}
                          >
                            <Car className="w-2.5 h-2.5 text-pink-600" />
                            <span>{tech.name.split(' ')[0]} (Live)</span>
                            <span className="font-mono text-[9px] text-pink-700 bg-pink-100 px-1 rounded">
                              {cleaner.totalRouteDistanceKm}km
                            </span>
                            {isTop1 && <Award className="w-2.5 h-2.5 text-amber-300" />}
                          </div>

                          <div
                            className="w-7 h-7 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-extrabold text-[11px] relative transition-transform group-hover:scale-125"
                            style={{ backgroundColor: tech.color || '#EC4899' }}
                          >
                            <Car className="w-3.5 h-3.5" />
                            {isTop1 && (
                              <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                            )}
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                {/* Info Window for Selected Marker */}
                {activeInfoWindow && (
                  <InfoWindow
                    position={activeInfoWindow.position}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-2 max-w-[280px] font-sans text-slate-900">
                      {activeInfoWindow.type === 'CLIENT' ? (
                        <div>
                          <div className="flex items-center gap-1 text-pink-700 font-extrabold text-xs mb-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{activeInfoWindow.title || 'Client Stop'}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900">{activeInfoWindow.address}</p>
                          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Total Stops: {clientStops.length}</span>
                            <button
                              onClick={() => setFitBoundsTrigger((t) => t + 1)}
                              className="text-purple-600 font-bold hover:underline cursor-pointer"
                            >
                              Fit Entire Route
                            </button>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const cleaner = rankedCleaners.find((c) => c.technician.id === activeInfoWindow.id);
                          if (!cleaner) return null;
                          const isHome = activeInfoWindow.type === 'HOME';
                          const point = isHome ? cleaner.homePoint : cleaner.livePoint;

                          return (
                            <div>
                              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cleaner.technician.color }} />
                                  <span className="font-extrabold text-xs">{cleaner.technician.name}</span>
                                </div>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                                  isHome ? 'bg-purple-100 text-purple-800' : 'bg-pink-100 text-pink-800'
                                }`}>
                                  {isHome ? 'Home Hub' : 'Live Job Location'}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-slate-800">{point.name}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{point.address}</p>

                              <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                                  <span>Total Multi-Stop Route:</span>
                                  <span className="font-mono font-black">{cleaner.totalRouteDistanceKm} km</span>
                                </div>
                                <p className="text-[10px] text-purple-700 mt-0.5">
                                  ~{cleaner.totalRouteDriveMinutes} mins drive across {clientStops.length} stop{clientStops.length > 1 ? 's' : ''}
                                </p>
                              </div>

                              <div className="mt-2 flex items-center justify-end gap-1.5">
                                <a
                                  href={`tel:${cleaner.technician.phone}`}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>Call</span>
                                </a>
                                {onBookCleaner && (
                                  <button
                                    onClick={() =>
                                      onBookCleaner(
                                        cleaner.technician,
                                        clientStops[0]?.address || point.address,
                                        clientStops[0]?.clientName,
                                        clientStops[0]?.clientPhone,
                                        clientStops[0]?.serviceType
                                      )
                                    }
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Assign</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </MapErrorBoundary>

            {/* Custom Google Map Control Overlays */}
            <GoogleMapControlOverlay
              onZoomIn={() => {
                if (cameraTarget) {
                  setCameraTarget({ ...cameraTarget, zoom: Math.min((cameraTarget.zoom || 14) + 1, 18), timestamp: Date.now() });
                } else {
                  setCameraTarget({ lat: clientStops[0]?.lat || 53.5412, lng: clientStops[0]?.lng || -113.4988, zoom: 15, timestamp: Date.now() });
                }
              }}
              onZoomOut={() => {
                if (cameraTarget) {
                  setCameraTarget({ ...cameraTarget, zoom: Math.max((cameraTarget.zoom || 14) - 1, 9), timestamp: Date.now() });
                } else {
                  setCameraTarget({ lat: clientStops[0]?.lat || 53.5412, lng: clientStops[0]?.lng || -113.4988, zoom: 11, timestamp: Date.now() });
                }
              }}
              onResetView={() => {
                if (clientStops[0]) {
                  handleFocusLocation(clientStops[0].lat, clientStops[0].lng, 14, 'Stop 1: Primary Target', clientStops[0].address);
                }
              }}
              onFitAll={() => {
                setFitBoundsTrigger((t) => t + 1);
              }}
              onFocusClosest={() => {
                if (closestCleaner) {
                  setSelectedCleanerId(closestCleaner.technician.id);
                  handleFocusLocation(
                    closestCleaner.activePoint.lat,
                    closestCleaner.activePoint.lng,
                    15,
                    `Closest: ${closestCleaner.technician.name}`,
                    closestCleaner.activePoint.address,
                    closestCleaner.technician.id,
                    closestCleaner.activePoint.type
                  );
                }
              }}
              mapType={mapType}
              onChangeMapType={setMapType}
            />

            {/* Bottom Map Note & Instruction */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-[11px] flex items-center gap-2 pointer-events-none shadow-md">
              <Crosshair className="w-3.5 h-3.5 text-pink-600" />
              <span>Clicking on any address smoothly pans &amp; zooms the street map directly to that location!</span>
            </div>
          </div>
        </div>

        {/* RIGHT / SIDEBAR: Ranked Cleaner Multi-Stop Distance List */}
        {!isCleanersBoxMinimized ? (
          <div className="w-full lg:w-[490px] xl:w-[540px] flex flex-col bg-white overflow-hidden shadow-xl shrink-0 border-l border-slate-200 animate-fadeIn">
            {/* Header & Filter Controls */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {filteredCleaners.length}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Cleaners Ranked by Route Distance
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase bg-purple-100 text-purple-900 border border-purple-200">
                    {clientStops.length} Stop{clientStops.length > 1 ? 's' : ''} Route
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCleanersBoxMinimized(true)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                    title="Minimize this panel so the map is full-screen"
                    aria-label="Minimize cleaners box"
                  >
                    <span className="hidden sm:inline">Minimize</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                All (15)
              </button>
              <button
                onClick={() => setFilterMode('TOP_5')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'TOP_5'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                Top 5 Closest
              </button>
              <button
                onClick={() => setFilterMode('AVAILABLE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'AVAILABLE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                Available Only
              </button>
              <button
                onClick={() => setFilterMode('SOLO')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'SOLO'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                Solo Cleaners
              </button>
              <button
                onClick={() => setFilterMode('TEAM')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'TEAM'
                    ? 'bg-pink-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                Dual Teams
              </button>
            </div>
          </div>

          {/* Cleaner Cards Scrollable List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-slate-50/40">
            {filteredCleaners.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 bg-white rounded-2xl border border-dashed border-slate-300">
                <Filter className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-bold text-slate-700 text-xs">No cleaners match this filter</p>
                <button
                  onClick={() => {
                    setFilterMode('ALL');
                    setSkillFilter('ALL');
                  }}
                  className="mt-2 text-xs font-bold text-purple-600 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredCleaners.map((cleaner) => {
                const tech = cleaner.technician;
                const isTop1 = cleaner.rank === 1;
                const isTop3 = cleaner.rank <= 3 && !isTop1;
                const isSelected = selectedCleanerId === tech.id;
                const isCopied = copiedCleanerId === tech.id;

                const active = cleaner.activePoint;
                const home = cleaner.homePoint;
                const live = cleaner.livePoint;

                return (
                  <div
                    key={tech.id}
                    onClick={() => {
                      setSelectedCleanerId(tech.id);
                      // Clicking the card zooms in directly to the cleaner's location on the map!
                      handleFocusLocation(
                        active.lat,
                        active.lng,
                        15,
                        `${tech.name} (${active.name})`,
                        active.address,
                        tech.id,
                        active.type
                      );
                    }}
                    className={`rounded-2xl border p-3.5 transition-all cursor-pointer relative ${
                      isTop1
                        ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 border-emerald-300 shadow-sm ring-1 ring-emerald-300'
                        : isSelected
                        ? 'bg-purple-50/70 border-purple-300 shadow-xs ring-1 ring-purple-300'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Top Row: Rank, Identity & Total Route Distance */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-2xs relative"
                          style={{ backgroundColor: tech.color || '#3B82F6' }}
                        >
                          {tech.name
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')}
                          <span className="absolute -bottom-1 -right-1 text-[8px] font-black px-1 rounded-full bg-slate-900 text-white">
                            #{cleaner.rank}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                              {tech.name}
                            </h4>
                            {isTop1 && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                                <Award className="w-2.5 h-2.5" />
                                #1 CLOSEST
                              </span>
                            )}
                            {isTop3 && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                #{cleaner.rank} Closest
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {tech.vanNumber} • {tech.role}
                          </p>
                        </div>
                      </div>

                      {/* Total Route Distance & ETA Box */}
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline justify-end gap-1 font-mono">
                          <span className={`text-base font-black ${isTop1 ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {cleaner.totalRouteDistanceKm}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">km road drive</span>
                          <span className="text-[10px] text-slate-400">({cleaner.totalRouteDistanceMiles} mi)</span>
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-purple-700 mt-0.5">
                          <Car className="w-3 h-3 text-purple-600" />
                          <span>~{cleaner.totalRouteDriveMinutes} mins drive</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                          Edmonton road grid (vs {active.straightDistanceKm} km straight-line)
                        </div>
                      </div>
                    </div>

                    {/* Multi-Stop Route Legs Breakdown */}
                    {cleaner.legs.length > 1 && (
                      <div className="mt-2.5 p-2 bg-slate-100/70 rounded-xl border border-slate-200 text-[11px]">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Route className="w-3 h-3 text-purple-600" />
                          <span>Sequential Road Driving Legs ({cleaner.legs.length}):</span>
                        </div>
                        <div className="space-y-1">
                          {cleaner.legs.map((leg, lIdx) => (
                            <div key={lIdx} className="flex items-center justify-between text-slate-700">
                              <span className="truncate pr-2 font-medium">
                                <strong className="text-purple-900">Leg {lIdx + 1}:</strong> {leg.fromLabel.split('(')[0]} &rarr; {leg.toLabel}
                              </span>
                              <span className="font-mono font-bold shrink-0 text-slate-900">
                                {leg.distanceKm} km road drive (~{leg.driveMinutes}m)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dual Location Comparison Cards (Clicking either zooms to that location!) */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Home Address Card */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCleanerId(tech.id);
                          handleFocusLocation(home.lat, home.lng, 16, `${tech.name} (Home Hub)`, home.address, tech.id, 'HOME');
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer hover:shadow-xs ${
                          locationMode === 'HOME'
                            ? 'bg-purple-50/80 border-purple-300 ring-1 ring-purple-200'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                        }`}
                        title="Click to zoom directly to cleaner's Home Address"
                      >
                        <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
                          <span className="flex items-center gap-1 text-purple-800">
                            <Home className="w-3 h-3 text-purple-600" />
                            <span>HOME ADDRESS</span>
                          </span>
                          <span className="font-mono font-bold text-purple-900">
                            {home.drivingDistanceKm} km road drive (~{home.driveMinutes}m)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-medium truncate" title={home.address}>
                          <strong className="text-slate-900">{home.name}:</strong> {home.address}
                        </p>
                      </div>

                      {/* Live Scheduled Job Card */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCleanerId(tech.id);
                          handleFocusLocation(live.lat, live.lng, 16, `${tech.name} (Live Job)`, live.address, tech.id, 'LIVE');
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer hover:shadow-xs ${
                          locationMode === 'LIVE'
                            ? 'bg-pink-50/80 border-pink-300 ring-1 ring-pink-200'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                        }`}
                        title="Click to zoom directly to cleaner's Live Job Site"
                      >
                        <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
                          <span className="flex items-center gap-1 text-pink-800">
                            <Car className="w-3 h-3 text-pink-600" />
                            <span>LIVE JOB SITE</span>
                          </span>
                          <span className="font-mono font-bold text-pink-900">
                            {live.drivingDistanceKm} km road drive (~{live.driveMinutes}m)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-medium truncate" title={live.address}>
                          <strong className="text-slate-900">{live.name}:</strong> {live.address}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                          {live.subLabel}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${tech.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Call ${tech.name} at ${tech.phone}`}
                        >
                          <Phone className="w-3 h-3 text-slate-600" />
                          <span className="text-[11px]">{tech.phone}</span>
                        </a>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyDistance(cleaner);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Copy multi-stop route info to clipboard"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditHub(tech);
                          }}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit this cleaner's home address"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Dispatch / Assign Cleaner Button */}
                      {onBookCleaner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookCleaner(
                              tech,
                              clientStops[0]?.address || active.address,
                              clientStops[0]?.clientName,
                              clientStops[0]?.clientPhone,
                              clientStops[0]?.serviceType
                            );
                          }}
                          className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
                            isTop1
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 text-white" />
                          <span>Assign Cleaner</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        ) : (
          /* Floating expand button when Cleaners Box is minimized */
          <div className="absolute top-4 right-4 z-20 pointer-events-auto animate-fadeIn">
            <button
              type="button"
              onClick={() => setIsCleanersBoxMinimized(false)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/95 hover:bg-white text-slate-900 border border-slate-300 shadow-xl text-xs font-black backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Expand Cleaner Route Distance Box"
            >
              <Users className="w-4 h-4 text-purple-600" />
              <span>Show Cleaners Box ({filteredCleaners.length})</span>
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        )}
      </div>

      {/* Edit Cleaner Home Hub Modal */}
      {editingHubCleaner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-600" />
                <span>Edit Cleaner Home Hub</span>
              </h3>
              <button
                onClick={() => setEditingHubCleaner(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cleaner Name
                </label>
                <input
                  type="text"
                  disabled
                  value={`${editingHubCleaner.name} (${editingHubCleaner.vanNumber})`}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hub Label / Neighborhood
                </label>
                <input
                  type="text"
                  value={editHubName}
                  onChange={(e) => setEditHubName(e.target.value)}
                  placeholder="e.g. Chappelle Hub, Oliver Hub"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Home Street Address (Edmonton &amp; Area) *
                </label>
                <AddressAutocompleteInput
                  value={editHubAddress}
                  onChange={setEditHubAddress}
                  onSelect={(pred) => {
                    setEditHubAddress(pred.description);
                    if (!editHubName) {
                      setEditHubName(pred.mainText);
                    }
                  }}
                  placeholder="e.g. 7221 Chivers Pl SW, Edmonton, AB T6W 4L4"
                  className="w-full text-xs font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Coordinates will be automatically geocoded and saved to your persistent dispatcher store.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingHubCleaner(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditHub}
                disabled={isSavingHub || !editHubAddress.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingHub ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Home Hub</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
