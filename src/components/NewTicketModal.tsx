import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EquipmentType, ServiceTicket, UrgencyLevel } from '../types/dispatch';
import { parseLeadOrRawText, ParsedLeadData } from '../services/leadTextParser';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { 
  Flame, 
  Clock, 
  Wrench, 
  Plus, 
  X, 
  Mic, 
  MicOff, 
  Sparkles, 
  Check, 
  AlertCircle, 
  RotateCcw,
  Volume2,
  History,
  Copy,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste
} from 'lucide-react';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTicket: (ticket: ServiceTicket) => void;
  initialAddress?: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialAssignedTechId?: string;
  initialServiceType?: string;
}

export interface RecentVoiceCommand {
  id: string;
  text: string;
  timestamp: string;
  urgency: UrgencyLevel;
  equipmentType: EquipmentType;
  faultCode?: string;
  customerName?: string;
}

const RECENT_VOICE_STORAGE_KEY = 'hvac_dispatch_recent_voice_commands_v1';

const EDMONTON_PRESET_LOCATIONS = [
  { address: '10220 104 Ave NW, Edmonton, AB T5J 0H6', lat: 53.5469, lng: -113.4975, city: 'Downtown Edmonton' },
  { address: '8440 112 St NW, Edmonton, AB T6G 2B7', lat: 53.5208, lng: -113.5245, city: 'Old Strathcona / U of A' },
  { address: '8882 170 St NW, Edmonton, AB T5T 4J2', lat: 53.5225, lng: -113.6242, city: 'West Edmonton' },
  { address: '2003 91 St SW, Edmonton, AB T6X 0W8', lat: 53.4445, lng: -113.4760, city: 'South Edmonton Common' },
  { address: '2000 Premier Way, Sherwood Park, AB T8H 2G4', lat: 53.5495, lng: -113.3080, city: 'Sherwood Park' },
  { address: '201 Boudreau Rd, St. Albert, AB T8N 6C4', lat: 53.6492, lng: -113.6185, city: 'St. Albert' },
];

const DEFAULT_RECENT_VOICE_COMMANDS: RecentVoiceCommand[] = [];

// Play subtle auditory chime for mic start/stop
function playChime(type: 'start' | 'stop') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);

    if (type === 'start') {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

// Client-side fallback NLP parser for voice dictation
function parseVoiceTranscriptLocally(text: string) {
  const t = text.trim();
  const lower = t.toLowerCase();

  // Urgency
  let urgency: UrgencyLevel = 'SAME_DAY';
  if (
    lower.includes('emergency') ||
    lower.includes('critical') ||
    lower.includes('urgent') ||
    lower.includes('alarm') ||
    lower.includes('burning') ||
    lower.includes('asap') ||
    lower.includes('immediately') ||
    lower.includes('overheating') ||
    lower.includes('overflow') ||
    lower.includes('leak')
  ) {
    urgency = 'EMERGENCY';
  } else if (
    lower.includes('routine') ||
    lower.includes('maintenance') ||
    lower.includes('preventative') ||
    lower.includes('filter') ||
    lower.includes('inspection') ||
    lower.includes('pm ')
  ) {
    urgency = 'ROUTINE';
  }

  // Equipment / Cleaning Service Type (3 core services: Standard, Deep, Move-Out)
  let equipmentType: EquipmentType = 'Standard Cleaning';
  if (
    lower.includes('move-out') ||
    lower.includes('move out') ||
    lower.includes('movein') ||
    lower.includes('move-in') ||
    lower.includes('move in') ||
    lower.includes('turnover') ||
    lower.includes('vacate') ||
    lower.includes('lease end') ||
    lower.includes('landlord inspection') ||
    lower.includes('deposit') ||
    lower.includes('empty home')
  ) {
    equipmentType = 'Move-Out Cleaning';
  } else if (
    lower.includes('deep') ||
    lower.includes('heavy scrub') ||
    lower.includes('baseboards') ||
    lower.includes('inside oven') ||
    lower.includes('fridge interior') ||
    lower.includes('grout') ||
    lower.includes('detail scrub') ||
    lower.includes('spring clean') ||
    lower.includes('intensive')
  ) {
    equipmentType = 'Deep Cleaning';
  } else {
    equipmentType = 'Standard Cleaning';
  }

  // Fault / Jobber Code
  let faultCode = 'JOBBER-SYNC';
  const faultMatch = t.match(/\b(?:job|jobber|visit|ticket|code|ref)[\s:-]+([A-Z0-9_-]{2,16})\b/i) ||
                    t.match(/\b(JOB-[A-Z0-9_-]+)\b/i) ||
                    t.match(/\b(CLN-[0-9]{2,4})\b/i);
  if (faultMatch) {
    faultCode = faultMatch[1].toUpperCase();
  }

  // Phone
  let phone = '(780) 555-0199';
  const phoneMatch = t.match(/\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/);
  if (phoneMatch) {
    phone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
  }

  // Location / Corridor preset matching for Greater Edmonton Area (YEG)
  let presetIdx = 0;
  if (lower.includes('strathcona') || lower.includes('112 st') || lower.includes('u of a') || lower.includes('university') || lower.includes('whyte') || lower.includes('83 ave')) {
    presetIdx = 1;
  } else if (lower.includes('west edmonton') || lower.includes('170 st') || lower.includes('wem') || lower.includes('meadowlark') || lower.includes('87 ave')) {
    presetIdx = 2;
  } else if (lower.includes('south edmonton') || lower.includes('91 st') || lower.includes('common') || lower.includes('gateway') || lower.includes('mill woods') || lower.includes('23 ave')) {
    presetIdx = 3;
  } else if (lower.includes('sherwood park') || lower.includes('premier') || lower.includes('broadmoor') || lower.includes('baseline')) {
    presetIdx = 4;
  } else if (lower.includes('st. albert') || lower.includes('st albert') || lower.includes('boudreau') || lower.includes('bellerose') || lower.includes('sturgeon')) {
    presetIdx = 5;
  } else if (lower.includes('downtown') || lower.includes('104 ave') || lower.includes('ice district') || lower.includes('jasper') || lower.includes('oliver') || lower.includes('103 ave')) {
    presetIdx = 0;
  }

  // Customer / Resident / Client Name
  let customerName = 'Residential Client';
  const facilityMatch = t.match(/(?:at|from|customer|client|resident|realtor|for|tenant)\s+([A-Z0-9][A-Za-z0-9\s'&.-]{2,32}?)(?=[,.]|\s+(?:at|phone|call|with|unit|lockbox|code|cleaning|address)|$)/i);
  if (facilityMatch && facilityMatch[1]) {
    const candidate = facilityMatch[1].trim();
    if (candidate.length > 2 && !candidate.toLowerCase().startsWith('the ')) {
      customerName = candidate;
    }
  } else if (lower.includes('jasper tower') || lower.includes('jasper')) {
    customerName = 'Jasper Tower Condo';
  } else if (lower.includes('whyte ave loft') || lower.includes('strathcona')) {
    customerName = 'Strathcona Brownstone';
  } else if (lower.includes('re/max') || lower.includes('remax') || lower.includes('realtor')) {
    customerName = 'RE/MAX Realty Partner';
  } else if (lower.includes('ice district') || lower.includes('fox two')) {
    customerName = 'Fox Two Tower Residence';
  }

  // Access notes
  let accessNotes = '';
  const accessMatch = t.match(/(?:access|dock|gate|security|enter|key|code|entrance)[\s:-]+([^.]+)/i);
  if (accessMatch) {
    accessNotes = accessMatch[0].trim();
  }

  return {
    customerName,
    phone,
    urgency,
    equipmentType,
    faultCode,
    issueDescription: t,
    accessNotes,
    selectedPresetIdx: presetIdx,
    durationMinutes: urgency === 'EMERGENCY' ? 90 : urgency === 'SAME_DAY' ? 120 : 60,
  };
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  onCreateTicket,
  initialAddress,
  initialCustomerName,
  initialCustomerPhone,
  initialAssignedTechId,
  initialServiceType,
}) => {
  // Form state
  const [customerName, setCustomerName] = useState(initialCustomerName || '');
  const [phone, setPhone] = useState(initialCustomerPhone || '(780) 555-0199');
  const [email, setEmail] = useState('');
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [customAddress, setCustomAddress] = useState(initialAddress || '');
  const [urgency, setUrgency] = useState<UrgencyLevel>('SAME_DAY');
  const [equipmentType, setEquipmentType] = useState<EquipmentType>(
    (initialServiceType as EquipmentType) || 'Standard Cleaning'
  );
  const [equipmentModel, setEquipmentModel] = useState('Residential Home');
  const [faultCode, setFaultCode] = useState('JOBBER-READY');
  const [issueDescription, setIssueDescription] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);

  useEffect(() => {
    if (isOpen) {
      if (initialAddress) setCustomAddress(initialAddress);
      if (initialCustomerName) setCustomerName(initialCustomerName);
      if (initialCustomerPhone) setPhone(initialCustomerPhone);
      if (initialServiceType) setEquipmentType(initialServiceType as EquipmentType);
      if (initialAssignedTechId) {
        setFaultCode(`ASSIGNED:${initialAssignedTechId}`);
      }
    }
  }, [isOpen, initialAddress, initialCustomerName, initialCustomerPhone, initialServiceType, initialAssignedTechId]);

  // Microphone and Voice-to-Text State
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'full' | 'description'>('full');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0-100 for live visualizer
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [voiceAppliedNotice, setVoiceAppliedNotice] = useState<string | null>(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [highlightField, setHighlightField] = useState(false);

  // Marketing & Facebook Lead Text Paste State
  const [rawLeadText, setRawLeadText] = useState('');
  const [isLeadBoxOpen, setIsLeadBoxOpen] = useState(false);
  const [leadParsedSuccess, setLeadParsedSuccess] = useState<string | null>(null);

  // Recent Voice Commands State (Last 5)
  const [recentVoiceCommands, setRecentVoiceCommands] = useState<RecentVoiceCommand[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_VOICE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 5);
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_RECENT_VOICE_COMMANDS;
  });
  const [isRecentCommandsExpanded, setIsRecentCommandsExpanded] = useState(true);
  const [copiedCmdId, setCopiedCmdId] = useState<string | null>(null);

  // Refs for audio stream and speech recognition
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Clean up all audio hardware connections and recognition engines
  const stopMicrophoneTracks = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch {
        // Ignore
      }
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    setAudioLevel(0);
    setIsListening(false);
  }, []);

  // Save new successful voice command into recent list (max 5)
  const addRecentVoiceCommand = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean || clean.length < 5) return;

    const parsed = parseVoiceTranscriptLocally(clean);
    const newCmd: RecentVoiceCommand = {
      id: `voice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: clean,
      timestamp: 'Just now',
      urgency: parsed.urgency,
      equipmentType: parsed.equipmentType,
      faultCode: parsed.faultCode || undefined,
      customerName: parsed.customerName !== 'Commercial Facility' ? parsed.customerName : undefined,
    };

    setRecentVoiceCommands((prev) => {
      // Deduplicate identical texts, place at start, cap to 5
      const filtered = prev.filter((cmd) => cmd.text.toLowerCase() !== clean.toLowerCase());
      const updated = [newCmd, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_VOICE_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage quota
      }
      return updated;
    });
  }, []);

  // Delete a specific recent command
  const handleDeleteRecentCommand = (cmdId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentVoiceCommands((prev) => {
      const updated = prev.filter((c) => c.id !== cmdId);
      try {
        localStorage.setItem(RECENT_VOICE_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Clear all recent commands
  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentVoiceCommands([]);
    try {
      localStorage.removeItem(RECENT_VOICE_STORAGE_KEY);
    } catch {}
  };

  // Restore sample commands
  const handleRestoreSampleCommands = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentVoiceCommands(DEFAULT_RECENT_VOICE_COMMANDS);
    try {
      localStorage.setItem(RECENT_VOICE_STORAGE_KEY, JSON.stringify(DEFAULT_RECENT_VOICE_COMMANDS));
    } catch {}
  };

  // Keyboard navigation: Escape key closes modal (WCAG 2.1.2)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopMicrophoneTracks();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopMicrophoneTracks();
    };
  }, [isOpen, onClose, stopMicrophoneTracks]);

  // Audio level animation loop using AnalyserNode
  const monitorAudioVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVolume = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      // Scale average 0-128 to 0-100 percentage
      const normalized = Math.min(100, Math.round((average / 64) * 100));
      setAudioLevel(normalized);
      animFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }, []);

  // Apply parsed ticket data to form state with visual feedback
  const applyParsedData = useCallback((data: {
    customerName?: string;
    phone?: string;
    urgency?: UrgencyLevel;
    equipmentType?: EquipmentType;
    equipmentModel?: string;
    faultCode?: string;
    issueDescription?: string;
    accessNotes?: string;
    selectedPresetIdx?: number;
    durationMinutes?: number;
  }) => {
    if (data.customerName) setCustomerName(data.customerName);
    if (data.phone) setPhone(data.phone);
    if (data.urgency) setUrgency(data.urgency);
    if (data.equipmentType) setEquipmentType(data.equipmentType);
    if (data.equipmentModel) setEquipmentModel(data.equipmentModel);
    if (data.faultCode) setFaultCode(data.faultCode);
    if (data.issueDescription) setIssueDescription(data.issueDescription);
    if (data.accessNotes) setAccessNotes(data.accessNotes);
    if (typeof data.selectedPresetIdx === 'number' && EDMONTON_PRESET_LOCATIONS[data.selectedPresetIdx]) {
      setSelectedPresetIdx(data.selectedPresetIdx);
      setCustomAddress(EDMONTON_PRESET_LOCATIONS[data.selectedPresetIdx].address);
    }
    if (data.durationMinutes) setDurationMinutes(data.durationMinutes);

    setHighlightField(true);
    setTimeout(() => setHighlightField(false), 2000);
    setVoiceAppliedNotice('Voice dictation structured and applied to ticket fields successfully!');
    setTimeout(() => setVoiceAppliedNotice(null), 6000);
  }, []);

  // Parse voice text using server AI endpoint with client fallback
  const processVoiceTranscript = useCallback(async (transcriptText: string, shouldSaveRecent: boolean = true) => {
    const cleaned = transcriptText.trim();
    if (!cleaned) return;

    if (shouldSaveRecent) {
      addRecentVoiceCommand(cleaned);
    }

    setIsParsingVoice(true);
    try {
      const response = await fetch('/api/dispatch/parse-voice-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: cleaned }),
      });

      if (response.ok) {
        const data = await response.json();
        applyParsedData(data);
      } else {
        const fallback = parseVoiceTranscriptLocally(cleaned);
        applyParsedData(fallback);
      }
    } catch {
      const fallback = parseVoiceTranscriptLocally(cleaned);
      applyParsedData(fallback);
    } finally {
      setIsParsingVoice(false);
    }
  }, [addRecentVoiceCommand, applyParsedData]);

  // Start microphone access and speech recognition
  const startListening = useCallback(async (targetMode: 'full' | 'description' = 'full') => {
    setMicPermissionDenied(false);
    setMicErrorMessage(null);
    setVoiceMode(targetMode);
    setShowVoicePanel(true);
    setInterimTranscript('');

    // 1. Request real microphone hardware access via getUserMedia
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Set up AudioContext for real-time waveform visualization
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;
        monitorAudioVolume();
      }

      playChime('start');
    } catch (err: unknown) {
      console.warn('Microphone stream access error:', err);
      const error = err as { name?: string; message?: string };
      setMicPermissionDenied(true);
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        setMicErrorMessage('Microphone permission was denied. Please allow microphone access in your browser address bar.');
      } else if (error?.name === 'NotFoundError') {
        setMicErrorMessage('No microphone device found on your system. Please connect a microphone and try again.');
      } else {
        setMicErrorMessage('Unable to access microphone. Please verify browser permissions.');
      }
      return;
    }

    // 2. Initialize Web Speech API for voice-to-text
    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setMicErrorMessage('Speech recognition is not natively supported in this browser. Microphone audio was detected; you can also type manually.');
      setIsListening(true);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += trans + ' ';
          } else {
            currentInterim += trans;
          }
        }

        if (currentFinal) {
          setVoiceTranscript((prev) => {
            const updated = (prev + ' ' + currentFinal).trim();
            if (targetMode === 'description') {
              setIssueDescription((desc) => (desc + ' ' + currentFinal).trim());
            }
            return updated;
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setMicPermissionDenied(true);
          setMicErrorMessage('Microphone access blocked. Please enable microphone permissions in your browser.');
          stopMicrophoneTracks();
        } else if (event.error === 'no-speech') {
          // User paused speaking; keep active
        }
      };

      recognition.onend = () => {
        // If still listening and not explicitly stopped, restart continuous recognition
        if (mediaStreamRef.current && isListening) {
          try {
            recognition.start();
          } catch {
            // Already started or terminated
          }
        }
      };

      recognition.start();
      setIsListening(true);
    } catch (recErr) {
      console.warn('Recognition start exception:', recErr);
    }
  }, [monitorAudioVolume, stopMicrophoneTracks, isListening]);

  // Stop recording and process transcript
  const handleStopAndProcess = useCallback(async () => {
    playChime('stop');
    stopMicrophoneTracks();

    const fullText = (voiceTranscript + ' ' + interimTranscript).trim();
    if (!fullText) return;

    if (voiceMode === 'description') {
      setIssueDescription((prev) => (prev ? `${prev} ${fullText}` : fullText));
      addRecentVoiceCommand(fullText);
      setVoiceAppliedNotice('Dictation appended to issue description.');
      setTimeout(() => setVoiceAppliedNotice(null), 4000);
    } else {
      await processVoiceTranscript(fullText, true);
    }
  }, [stopMicrophoneTracks, voiceTranscript, interimTranscript, voiceMode, addRecentVoiceCommand, processVoiceTranscript]);

  // Reset voice transcription
  const handleClearTranscript = useCallback(() => {
    setVoiceTranscript('');
    setInterimTranscript('');
    setVoiceAppliedNotice(null);
  }, []);

  // Parse and Apply Lead Raw Text (Facebook Ads, Web Form, or SMS copy)
  const handleParseAndApplyLeadText = useCallback((textToParse?: string) => {
    const text = textToParse !== undefined ? textToParse : rawLeadText;
    if (!text.trim()) return;

    try {
      const parsed = parseLeadOrRawText(text);

      if (parsed.customerName) setCustomerName(parsed.customerName);
      if (parsed.phone) setPhone(parsed.phone);
      if (parsed.email) setEmail(parsed.email);
      if (parsed.address) setCustomAddress(parsed.address);
      if (parsed.urgency) setUrgency(parsed.urgency);
      if (parsed.equipmentType) setEquipmentType(parsed.equipmentType);
      if (parsed.equipmentModel) setEquipmentModel(parsed.equipmentModel);
      if (parsed.faultCode) setFaultCode(parsed.faultCode);
      if (parsed.issueDescription) setIssueDescription(parsed.issueDescription);
      if (parsed.durationMinutes) setDurationMinutes(parsed.durationMinutes);

      // Match closest Edmonton corridor preset if postal code or street matches
      const lower = text.toLowerCase();
      if (lower.includes('west') || lower.includes('170 st') || lower.includes('t5t') || lower.includes('t5r')) {
        setSelectedPresetIdx(2);
      } else if (lower.includes('strathcona') || lower.includes('whyte') || lower.includes('t6e') || lower.includes('t6g')) {
        setSelectedPresetIdx(1);
      } else if (lower.includes('south') || lower.includes('common') || lower.includes('t6x') || lower.includes('t6w')) {
        setSelectedPresetIdx(3);
      } else if (lower.includes('sherwood') || lower.includes('t8h') || lower.includes('t8a')) {
        setSelectedPresetIdx(4);
      } else if (lower.includes('st. albert') || lower.includes('st albert') || lower.includes('t8n')) {
        setSelectedPresetIdx(5);
      } else {
        setSelectedPresetIdx(0);
      }

      setLeadParsedSuccess(
        `Lead parsed: ${parsed.customerName} • ${parsed.equipmentType} (${parsed.bedrooms} Bed/${parsed.bathrooms} Bath) • ${parsed.phone}`
      );
      setIsLeadBoxOpen(false);
      setTimeout(() => setLeadParsedSuccess(null), 6000);
    } catch (err: any) {
      console.warn('Error parsing lead text:', err);
    }
  }, [rawLeadText]);

  // Re-use an existing recent voice command
  const handleUseRecentCommand = useCallback((cmd: RecentVoiceCommand) => {
    setVoiceTranscript(cmd.text);
    setShowVoicePanel(true);
    playChime('start');
    processVoiceTranscript(cmd.text, false);
    setVoiceAppliedNotice(`Re-used command: "${cmd.text.slice(0, 48)}..."`);
    setTimeout(() => setVoiceAppliedNotice(null), 5000);
  }, [processVoiceTranscript]);

  // Copy command text to clipboard
  const handleCopyCommand = useCallback((cmd: RecentVoiceCommand, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cmd.text);
      setCopiedCmdId(cmd.id);
      setTimeout(() => setCopiedCmdId(null), 2000);
    }
  }, []);

  // Insert command text directly into issue description
  const handleInsertInDescription = useCallback((cmd: RecentVoiceCommand, e: React.MouseEvent) => {
    e.stopPropagation();
    setIssueDescription((prev) => (prev ? `${prev} ${cmd.text}` : cmd.text));
    setVoiceAppliedNotice('Inserted voice command into issue description.');
    setTimeout(() => setVoiceAppliedNotice(null), 3000);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stopMicrophoneTracks();

    const locPreset = EDMONTON_PRESET_LOCATIONS[selectedPresetIdx] || EDMONTON_PRESET_LOCATIONS[0];
    const finalAddress = customAddress.trim() || locPreset.address;
    const finalLat = locPreset.lat + (Math.random() - 0.5) * 0.02;
    const finalLng = locPreset.lng + (Math.random() - 0.5) * 0.02;

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newTicket: ServiceTicket = {
      id: `ticket-${Date.now()}`,
      ticketNumber: `CLN-${randomDigits}`,
      customerName: customerName.trim() || 'Residential Client',
      customerPhone: phone.trim() || '(780) 555-0199',
      customerEmail: email.trim() || 'client@cleaningserviceyeg.ca',
      location: {
        lat: finalLat,
        lng: finalLng,
        address: finalAddress,
        city: locPreset.city,
      },
      urgency,
      status: 'UNASSIGNED',
      equipmentType,
      equipmentModel: equipmentModel.trim() || `${equipmentType} Home`,
      equipmentSerial: `JOB-${Date.now().toString().slice(-4)}`,
      faultCode: faultCode.trim() || undefined,
      issueDescription: issueDescription.trim() || `Service booking for ${equipmentType}.`,
      accessNotes: accessNotes.trim() || undefined,
      requiredSkills: [equipmentType],
      requiredParts: [],
      slaDeadline: urgency === 'EMERGENCY' ? '1h 30m remaining (SLA: 2h)' : urgency === 'SAME_DAY' ? '5h remaining (SLA: 6h)' : '24h (SLA: 48h)',
      estimatedDurationMinutes: Number(durationMinutes) || 120,
      createdAt: new Date().toISOString(),
    };

    onCreateTicket(newTicket);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-ticket-modal-title"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 font-sans max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200" aria-hidden="true">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="new-ticket-modal-title" className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Create New Cleaning Service Booking</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200 hidden sm:inline-flex items-center gap-1">
                  <Mic className="w-2.5 h-2.5" /> Voice Ready
                </span>
              </h2>
              <p className="text-[11px] text-slate-600">Dictate by voice, select from recent commands, or type manually.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Voice Intake Header Toggle */}
            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  handleStopAndProcess();
                } else {
                  startListening('full');
                }
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
              title={isListening ? 'Stop recording & auto-fill' : 'Start voice dictation'}
              aria-label={isListening ? 'Stop voice recording' : 'Start voice intake'}
            >
              <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce' : 'text-rose-600'}`} />
              <span className="hidden sm:inline">{isListening ? 'Stop & Fill' : 'Voice Intake'}</span>
            </button>

            <button
              ref={closeBtnRef}
              onClick={() => {
                stopMicrophoneTracks();
                onClose();
              }}
              className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Close new ticket dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs bg-white overflow-y-auto flex-1">
          {/* Voice-to-Text Dictation Banner / Control Studio */}
          <div className="border border-slate-200 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
                  {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <span>Voice-to-Text Dispatch Intake</span>
                    {isListening && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                        Listening Live
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Dictate caller details over your microphone to instantly auto-populate the ticket.
                  </p>
                </div>
              </div>

              {!isListening ? (
                <button
                  type="button"
                  onClick={() => startListening('full')}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start Dictation</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleStopAndProcess}
                    disabled={isParsingVoice}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done &amp; Apply</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopMicrophoneTracks}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                    title="Stop listening without processing"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Microphone Permission Error Notice */}
            {micPermissionDenied && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-[11px] flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Microphone Access Denied:</span>
                  <p>{micErrorMessage || 'Please allow microphone access in your browser URL bar or system settings to enable voice dictation.'}</p>
                </div>
              </div>
            )}

            {/* Active Recording State: Live Equalizer Waveform & Real-Time Transcript */}
            {isListening && (
              <div className="mt-3 p-3 bg-white border border-rose-200 rounded-xl shadow-xs space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold">
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    <span>Microphone Input Level:</span>
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-rose-500 transition-all duration-75 rounded-full"
                        style={{ width: `${Math.max(8, audioLevel)}%` }}
                      />
                    </div>
                  </div>

                  {/* Animated Waveform Bars */}
                  <div className="flex items-center gap-0.5 h-4" aria-hidden="true">
                    {[30, 60, 95, 45, 80, 100, 75, 40, 85, 50, 30].map((h, idx) => (
                      <span
                        key={idx}
                        className="w-1 bg-rose-500 rounded-full transition-all duration-100"
                        style={{
                          height: `${Math.max(4, (h * audioLevel) / 100)}px`,
                          opacity: audioLevel > 5 ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div 
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs min-h-[48px] max-h-24 overflow-y-auto leading-relaxed select-text"
                  aria-live="polite"
                >
                  {voiceTranscript || interimTranscript ? (
                    <>
                      <span className="font-medium text-slate-900">{voiceTranscript}</span>
                      <span className="text-slate-500 italic"> {interimTranscript}</span>
                    </>
                  ) : (
                    <span className="text-slate-400 italic">
                      Listening... Speak ticket details (e.g. &quot;Emergency at Baylor Pavilion, Rooftop unit trip, code ERR-COMP...&quot;)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Inactive with Dictated Transcript Review */}
            {!isListening && (voiceTranscript || showVoicePanel) && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-[11px]">Current Transcribed Voice Input:</span>
                  <div className="flex items-center gap-1.5">
                    {voiceTranscript && (
                      <>
                        <button
                          type="button"
                          onClick={() => processVoiceTranscript(voiceTranscript, true)}
                          disabled={isParsingVoice}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>{isParsingVoice ? 'Structuring...' : 'Re-Parse & Apply'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearTranscript}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Clear transcript"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {voiceTranscript ? (
                  <p className="p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-[11px] leading-relaxed">
                    &ldquo;{voiceTranscript}&rdquo;
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Example: &ldquo;Emergency call for Mazankowski Alberta Heart Institute at 8440 112 St NW Edmonton. Commercial Chiller high pressure fault code ERR-HP-99. Temperature rising rapidly.&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Success Applied Banner */}
            {voiceAppliedNotice && (
              <div className="mt-2.5 p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] flex items-center gap-2 animate-fadeIn font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{voiceAppliedNotice}</span>
              </div>
            )}
          </div>

          {/* Facebook / Marketing Ad Lead Raw Text Parser */}
          <div className="border border-indigo-200 rounded-xl bg-gradient-to-r from-indigo-50/60 to-purple-50/40 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <ClipboardPaste className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <span>Facebook Lead &amp; Ad Intake Parser</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200">
                      Copy &amp; Paste
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Paste raw lead copy from Facebook Ads, Web Forms, or SMS to auto-extract client, bedrooms, address, and service.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLeadBoxOpen((prev) => !prev)}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>{isLeadBoxOpen ? 'Hide Box' : 'Paste Lead'}</span>
              </button>
            </div>

            {/* Lead Paste Area */}
            {isLeadBoxOpen && (
              <div className="mt-3 p-3 bg-white border border-indigo-200 rounded-xl shadow-xs space-y-2.5 animate-fadeIn">
                <label htmlFor="raw-lead-paste-box" className="font-semibold text-slate-800 text-xs block">
                  Paste Raw Lead Text Below:
                </label>
                <textarea
                  id="raw-lead-paste-box"
                  rows={5}
                  placeholder={`Facebook Lead via 833Tidyups\nCampaign: Aug 11th Engage-RP\nStreet Address: 144 roaeland village\nPost Code: T5e5r6\nPhone Number: +16478602343\nHow Many Bedrooms Do You Have..❓: 2\n✨Service✨: ♦️move-out_cleaning\nFirst Name: Nick\nLast Name: Jonk\nEmail: nickjonk@outlook.com\nHow Many Bathrooms: 1.5`}
                  value={rawLeadText}
                  onChange={(e) => setRawLeadText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-indigo-500 focus:bg-white"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-500 italic">
                    Detects Name, Phone, Email, Address, Postal Code, Beds/Baths, and Service Type automatically.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sample = `Facebook Lead via 833Tidyups\nCampaign: Aug 11th Engage-RP\nStreet Address: 144 roaeland village\nPost Code: T5e5r6\nPhone Number: +16478602343\nHow Many Bedrooms Do You Have..❓: 2\nBest Date For Service..❓: Asap\n✨Service Your Interested In✨: ♦️move-out_cleaning\nCity: Edmonton\nFirst Name: Nick\nLast Name: Jonk\nEmail: nickjonk@outlook.com\nHow Many Bathrooms Do You Have..❓: 1.5`;
                        setRawLeadText(sample);
                        handleParseAndApplyLeadText(sample);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Fill Sample Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => handleParseAndApplyLeadText()}
                      disabled={!rawLeadText.trim()}
                      className="min-h-[34px] px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Extract &amp; Populate Ticket</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lead Parse Success Banner */}
            {leadParsedSuccess && (
              <div className="mt-2.5 p-2 rounded-lg bg-indigo-50 border border-indigo-300 text-indigo-950 text-[11px] flex items-center gap-2 animate-fadeIn font-semibold">
                <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{leadParsedSuccess}</span>
              </div>
            )}
          </div>

          {/* Recent Voice Commands Section (Last 5) */}
          <div className="border border-slate-200 rounded-xl bg-slate-50/70 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsRecentCommandsExpanded((prev) => !prev)}
                className="flex items-center gap-2 text-left font-bold text-slate-800 text-xs hover:text-slate-950 transition-colors cursor-pointer"
                aria-expanded={isRecentCommandsExpanded}
                aria-controls="recent-voice-commands-list"
              >
                <History className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Recent Voice Commands</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {recentVoiceCommands.length}
                </span>
                {isRecentCommandsExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              <div className="flex items-center gap-2 text-[10px]">
                {recentVoiceCommands.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllRecent}
                    className="text-slate-500 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1"
                    title="Clear voice command history"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Voice Commands List */}
            {isRecentCommandsExpanded && (
              <div id="recent-voice-commands-list" className="p-3 space-y-2">
                {recentVoiceCommands.length === 0 ? (
                  <div className="text-center py-3 text-slate-500 text-[11px]">
                    <p>No recent voice commands logged yet. Dictate caller details above to record command history.</p>
                  </div>
                ) : (
                  recentVoiceCommands.slice(0, 5).map((cmd, idx) => {
                    const isCopied = copiedCmdId === cmd.id;
                    const urgencyBadge =
                      cmd.urgency === 'EMERGENCY'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : cmd.urgency === 'SAME_DAY'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200';

                    return (
                      <div
                        key={cmd.id}
                        className="group relative bg-white border border-slate-200 rounded-xl p-2.5 hover:border-blue-300 hover:shadow-xs transition-all"
                      >
                        {/* Top Metadata Badges & Timestamp */}
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              #{idx + 1}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${urgencyBadge} flex items-center gap-1`}>
                              {cmd.urgency === 'EMERGENCY' && <Flame className="w-2.5 h-2.5 text-red-600" />}
                              {cmd.urgency === 'SAME_DAY' && <Clock className="w-2.5 h-2.5 text-amber-600" />}
                              {cmd.urgency === 'ROUTINE' && <Wrench className="w-2.5 h-2.5 text-blue-600" />}
                              <span>{cmd.urgency}</span>
                            </span>

                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {cmd.equipmentType}
                            </span>

                            {cmd.faultCode && (
                              <span className="px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {cmd.faultCode}
                              </span>
                            )}

                            {cmd.customerName && (
                              <span className="text-[10px] font-semibold text-slate-800 truncate max-w-[130px] hidden sm:inline">
                                {cmd.customerName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                              {cmd.timestamp}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRecentCommand(cmd.id, e)}
                              className="text-slate-300 hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                              title="Delete from recent commands"
                              aria-label="Delete this command"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Spoken Command Transcript */}
                        <p className="text-[11px] text-slate-700 leading-snug line-clamp-2 select-text font-normal italic mb-2">
                          &ldquo;{cmd.text}&rdquo;
                        </p>

                        {/* Action Buttons Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-[9px] text-slate-400 hidden sm:inline">
                            Quick Actions
                          </span>
                          <div className="flex items-center gap-1.5 ml-auto">
                            {/* Copy Command Text */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyCommand(cmd, e)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Copy command text to clipboard"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-slate-500" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Insert into Description */}
                            <button
                              type="button"
                              onClick={(e) => handleInsertInDescription(cmd, e)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Append this text to the Issue Description field"
                            >
                              <FileText className="w-3 h-3 text-slate-500" />
                              <span>To Notes</span>
                            </button>

                            {/* Use / Re-apply Command to Form */}
                            <button
                              type="button"
                              onClick={() => handleUseRecentCommand(cmd)}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Auto-fill ticket fields with this command"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Use Command</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Urgency Selector */}
          <div className={highlightField ? 'transition-all ring-2 ring-blue-400 rounded-xl p-1' : ''}>
            <span id="urgency-group-label" className="font-bold text-slate-700 mb-1.5 block">Urgency Level &amp; SLA</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-labelledby="urgency-group-label">
              <button
                type="button"
                role="radio"
                aria-checked={urgency === 'EMERGENCY'}
                onClick={() => {
                  setUrgency('EMERGENCY');
                  setDurationMinutes(90);
                }}
                className={`min-h-[44px] p-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                  urgency === 'EMERGENCY'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-400 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Flame className="w-4 h-4 text-rose-600 flex-shrink-0" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs">Emergency (&lt;2h)</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={urgency === 'HIGH'}
                onClick={() => {
                  setUrgency('HIGH');
                  setDurationMinutes(90);
                }}
                className={`min-h-[44px] p-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                  urgency === 'HIGH'
                    ? 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-400 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs">High (&lt;4h)</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={urgency === 'MEDIUM' || urgency === 'SAME_DAY'}
                onClick={() => {
                  setUrgency('MEDIUM');
                  setDurationMinutes(120);
                }}
                className={`min-h-[44px] p-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                  urgency === 'MEDIUM' || urgency === 'SAME_DAY'
                    ? 'bg-sky-50 border-sky-300 text-sky-700 ring-2 ring-sky-400 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs">Medium (&lt;8h)</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={urgency === 'LOW' || urgency === 'ROUTINE'}
                onClick={() => {
                  setUrgency('LOW');
                  setDurationMinutes(60);
                }}
                className={`min-h-[44px] p-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                  urgency === 'LOW' || urgency === 'ROUTINE'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-400 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs">Low / Routine</span>
              </button>
            </div>
          </div>

          {/* Customer & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ticket-customer-name" className="font-semibold text-slate-700 mb-1 block">Client / Resident / Business</label>
              <input
                id="ticket-customer-name"
                type="text"
                required
                placeholder="e.g. Sarah Miller (Jasper Tower Condo)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="ticket-contact-phone" className="font-semibold text-slate-700 mb-1 block">Contact Phone</label>
              <input
                id="ticket-contact-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Location Picker & Address Auto-Complete */}
          <div className="space-y-2">
            <label htmlFor="ticket-preset-location" className="font-semibold text-slate-700 block text-xs">
              Service Address (Live Auto-Complete or Quick Corridor) *
            </label>
            
            <AddressAutocompleteInput
              id="ticket-custom-address"
              value={customAddress}
              onChange={(newAddr) => {
                setCustomAddress(newAddr);
                // Auto-match corridor if matches any known preset
                const lower = newAddr.toLowerCase();
                const matchedIdx = EDMONTON_PRESET_LOCATIONS.findIndex(
                  (p) => lower.includes(p.city.toLowerCase()) || lower.includes(p.address.toLowerCase().slice(0, 10))
                );
                if (matchedIdx !== -1) {
                  setSelectedPresetIdx(matchedIdx);
                }
              }}
              onSelect={(pred) => {
                setCustomAddress(pred.description);
                const lower = pred.description.toLowerCase();
                const matchedIdx = EDMONTON_PRESET_LOCATIONS.findIndex(
                  (p) => lower.includes(p.city.toLowerCase()) || lower.includes(p.address.toLowerCase().slice(0, 10))
                );
                if (matchedIdx !== -1) {
                  setSelectedPresetIdx(matchedIdx);
                }
              }}
              placeholder="Search Edmonton street address, postal code, or condo..."
            />

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">Or Quick Select:</span>
              <select
                id="ticket-preset-location"
                value={selectedPresetIdx}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setSelectedPresetIdx(idx);
                  setCustomAddress(EDMONTON_PRESET_LOCATIONS[idx].address);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                {EDMONTON_PRESET_LOCATIONS.map((loc, i) => (
                  <option key={i} value={i}>
                    {loc.city}: {loc.address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cleaning Service Type & Property Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ticket-equipment-type" className="font-semibold text-slate-700 mb-1 block">
                Cleaning Service Type (3 Core Services)
              </label>
              <select
                id="ticket-equipment-type"
                value={equipmentType}
                onChange={(e) => {
                  const val = e.target.value as EquipmentType;
                  setEquipmentType(val);
                  if (val === 'Move-Out Cleaning') setDurationMinutes(210);
                  else if (val === 'Deep Cleaning') setDurationMinutes(240);
                  else setDurationMinutes(120);
                }}
                className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              >
                <option value="Standard Cleaning">✨ Standard Cleaning (Routine ~2 hrs)</option>
                <option value="Deep Cleaning">🧼 Deep Cleaning (Detail Scrub ~4 hrs)</option>
                <option value="Move-Out Cleaning">📦 Move-Out Cleaning (Turnover ~3.5 hrs)</option>
              </select>
            </div>
            <div>
              <label htmlFor="ticket-home-details" className="font-semibold text-slate-700 mb-1 block">
                Property / Jobber Tag
              </label>
              <input
                id="ticket-home-details"
                type="text"
                placeholder="e.g. 3 Bed / 2 Bath Condo (JOBBER-101)"
                value={equipmentModel}
                onChange={(e) => setEquipmentModel(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Cleaning Tasks & Rooms with Inline Microphone Dictate Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="ticket-issue-desc" className="font-semibold text-slate-700 block">
                Cleaning Instructions &amp; Rooms
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isListening && voiceMode === 'description') {
                    stopMicrophoneTracks();
                  } else {
                    startListening('description');
                  }
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  isListening && voiceMode === 'description'
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Dictate directly into this description field"
              >
                <Mic className="w-3 h-3 text-rose-600" />
                <span>{isListening && voiceMode === 'description' ? 'Listening...' : 'Dictate Notes'}</span>
              </button>
            </div>
            <textarea
              id="ticket-issue-desc"
              rows={2}
              placeholder="Describe bedrooms, bathrooms, inside oven/fridge, baseboards, or special requests..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white leading-relaxed"
            />
          </div>

          {/* Access & Entry Notes */}
          <div>
            <label htmlFor="ticket-access-notes" className="font-semibold text-slate-700 mb-1 block">
              Access &amp; Entry Notes (Lockbox / Keypad / Pets)
            </label>
            <input
              id="ticket-access-notes"
              type="text"
              placeholder="e.g. Lockbox code 4492 on porch. Dogs will be in backyard kennel."
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                stopMicrophoneTracks();
                onClose();
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Create &amp; Enqueue Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
