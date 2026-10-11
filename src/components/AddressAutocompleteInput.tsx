import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Check, ArrowRight } from 'lucide-react';

export interface AddressPrediction {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface AddressAutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (address: string) => void;
  onSelect?: (prediction: AddressPrediction) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  autoFocus?: boolean;
}

// Common Edmonton streets and corridors for 0ms instant typing suggestions
const EDMONTON_INSTANT_CORRIDORS = [
  "10405 Jasper Ave NW, Edmonton, AB",
  "Whyte Ave (82 Ave NW), Edmonton, AB",
  "10920 84 Ave NW, Edmonton, AB",
  "12420 102 Ave NW, Edmonton, AB",
  "10540 85 Ave NW, Edmonton, AB",
  "3112 119 St NW, Edmonton, AB",
  "14102 102 Ave NW, Edmonton, AB",
  "4904 141 Ave NW, Edmonton, AB",
  "9632 142 St NW, Edmonton, AB",
  "2045 111A St NW, Edmonton, AB",
  "7221 Chivers Pl SW, Edmonton, AB",
  "8306 Chappelle Way SW, Edmonton, AB",
  "574 Saddleback Rd NW, Edmonton, AB",
  "10231 120 St NW, Edmonton, AB",
  "3751 139 Ave NW, Edmonton, AB",
  "740 Knottwood Rd S NW, Edmonton, AB",
  "10740 109 St NW, Edmonton, AB",
  "9434 208 St NW, Edmonton, AB",
  "17115 61 Ave NW, Edmonton, AB",
  "17908 61 Ave NW, Edmonton, AB",
  "12219 103 St NW, Edmonton, AB",
  "10408 155 Ave NW, Edmonton, AB",
  "20123 58 Ave NW, Edmonton, AB",
  "9722 154 St NW, Edmonton, AB",
  "10180 104 St NW, Edmonton, AB",
  "6812 112 Ave NW, Edmonton, AB",
  "4310 114a St NW, Edmonton, AB",
  "12411 106 Ave NW, Edmonton, AB",
  "8910 148 St NW, Edmonton, AB",
  "8310 160 St NW, Edmonton, AB",
  "5110 122 St NW, Edmonton, AB",
  "9812 144 St NW, Edmonton, AB",
  "15403 75 Ave NW, Edmonton, AB",
  "Gateway Blvd NW, Edmonton, AB",
  "Calgary Trail NW, Edmonton, AB",
  "Anthony Henday Dr, Edmonton, AB",
  "Whitemud Dr NW, Edmonton, AB",
  "Yellowhead Trail NW, Edmonton, AB",
  "St. Albert Trail, St. Albert, AB",
  "Sherwood Dr, Sherwood Park, AB",
];

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  id,
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing address in Edmonton & area...',
  required = false,
  className = '',
  autoFocus = false,
}) => {
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Fetch address predictions as user types using client Google Maps SDK or proxy
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    const trimmed = value.trim();

    // 1. Instant local matching for zero-latency feedback (number matching, corridor, street)
    const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    const quickLocal: AddressPrediction[] = EDMONTON_INSTANT_CORRIDORS
      .filter((s) => {
        const sLower = s.toLowerCase();
        return terms.every((t) => sLower.includes(t));
      })
      .slice(0, 6)
      .map((s, idx) => ({
        description: s,
        placeId: `local-${idx}`,
        mainText: s.split(',')[0],
        secondaryText: s.split(',').slice(1).join(',').trim(),
      }));

    if (quickLocal.length > 0) {
      setPredictions(quickLocal);
      setIsOpen(true);
      setSelectedIndex(0);
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      setIsLoading(true);

      const fetchFallback = async () => {
        try {
          const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(trimmed)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.predictions) && data.predictions.length > 0) {
              setPredictions(data.predictions);
              setIsOpen(true);
              setSelectedIndex(0); // Auto-focus top prediction for quick Enter/Tab population
            }
          }
        } catch (err) {
          console.warn('Address autocomplete fallback error:', err);
        } finally {
          setIsLoading(false);
        }
      };

      // Try Google Maps JavaScript Places SDK directly in browser (instant response)
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.AutocompleteService) {
        try {
          const service = new (window as any).google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: trimmed,
              componentRestrictions: { country: 'ca' },
              locationBias: new (window as any).google.maps.Circle({
                center: { lat: 53.5461, lng: -113.4938 },
                radius: 45000,
              }),
            },
            (results: any[], status: any) => {
              setIsLoading(false);
              const PlacesServiceStatus = (window as any).google?.maps?.places?.PlacesServiceStatus;
              if ((status === 'OK' || status === PlacesServiceStatus?.OK) && results && results.length > 0) {
                const formatted: AddressPrediction[] = results.map((r) => ({
                  description: r.description,
                  placeId: r.place_id,
                  mainText: r.structured_formatting?.main_text || r.description,
                  secondaryText: r.structured_formatting?.secondary_text || 'Edmonton, AB',
                }));
                setPredictions(formatted);
                setIsOpen(true);
                setSelectedIndex(0);
              } else {
                fetchFallback();
              }
            }
          );
          return;
        } catch {
          fetchFallback();
        }
      } else {
        fetchFallback();
      }
    }, 40);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPrediction = (prediction: AddressPrediction) => {
    onChange(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onSelect) {
      onSelect(prediction);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      // Auto-populate immediately upon Enter or Tab
      const target = selectedIndex >= 0 ? predictions[selectedIndex] : predictions[0];
      if (target) {
        if (e.key === 'Enter') e.preventDefault();
        handleSelectPrediction(target);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // When input is blurred, if there is a matching prediction, auto-populate right away
  const handleBlur = () => {
    // Delay slightly to allow click event to register
    setTimeout(() => {
      if (predictions.length > 0 && selectedIndex >= 0) {
        const target = predictions[selectedIndex];
        if (target && value.length > 3) {
          handleSelectPrediction(target);
        }
      }
      setIsOpen(false);
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="w-4 h-4 text-pink-600 absolute left-3 top-3 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => {
            if (predictions.length > 0) {
              setIsOpen(true);
            } else if (!value || value.trim().length === 0) {
              // Show top Edmonton corridors immediately on focus
              const initialDefaults = EDMONTON_INSTANT_CORRIDORS.slice(0, 5).map((s, idx) => ({
                description: s,
                placeId: `default-${idx}`,
                mainText: s.split(',')[0],
                secondaryText: s.split(',').slice(1).join(',').trim(),
              }));
              setPredictions(initialDefaults);
              setIsOpen(true);
              setSelectedIndex(0);
            }
          }}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-medium ${className}`}
        />
        {isLoading && (
          <div className="absolute right-3 top-3 pointer-events-none">
            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown with Instant Auto-Fill */}
      {isOpen && predictions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 text-xs animate-fadeIn"
        >
          {predictions.map((p, idx) => (
            <li
              key={p.placeId || idx}
              role="option"
              aria-selected={selectedIndex === idx}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevents input blur before select executes
                handleSelectPrediction(p);
              }}
              onClick={() => handleSelectPrediction(p)}
              className={`p-2.5 cursor-pointer flex items-start gap-2.5 transition-colors ${
                selectedIndex === idx ? 'bg-purple-100/90 text-purple-950 font-semibold' : 'hover:bg-purple-50/70 text-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 leading-snug truncate">
                  {p.mainText}
                </div>
                {p.secondaryText && (
                  <div className="text-[11px] text-slate-500 truncate">
                    {p.secondaryText}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-auto mt-0.5 text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                <span>Auto-Fill</span>
                <ArrowRight className="w-3 h-3 text-purple-600" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
