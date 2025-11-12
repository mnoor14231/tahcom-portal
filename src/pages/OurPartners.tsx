import { useState, useEffect, useMemo } from 'react';
import type { JSX, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Building2, Package, Server, 
  Plus, Trash2, X, BarChart3,
  Users, RefreshCw, TrendingUp, Sparkles,
  Award, Target, Database, Cloud,
  Zap, CheckCircle2, AlertCircle, Info, HelpCircle, ChevronRight, ChevronDown, Star,
  Lightbulb, Rocket, Layers, Copy,
  Lock, Unlock, KeyRound, ClipboardList, ClipboardCheck, History, ListChecks, ChevronLeft, ArrowLeft, LogIn
} from 'lucide-react';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

// Theme colors - Tahcom brand
const THEME_COLORS = {
  brand1: '#8B4513', // Maroon
  brand2: '#FF8C00', // Orange
  brand3: '#FFA500', // Amber
};

// Use environment variable or detect the API URL
const getApiBase = () => {
  // Use stable production domain first (tahcom-api.vercel.app) - ALWAYS PRIORITIZE THIS
  const stableBackend = 'https://tahcom-api.vercel.app';
  const stableBackendUrl = `${stableBackend}/api/partners`;
  
  // List of known working backend URLs (as fallbacks)
  const knownWorkingBackends = [
    stableBackend, // Stable production domain (BEST)
    'https://tahcom-ftq4hgz3j-muneers-projects-276a49f7.vercel.app', // Latest deployment
    'https://tahcom-cnqgse1cq-muneers-projects-276a49f7.vercel.app', // Working deployment
  ];
  
  // Old/broken/dead backend URLs that should be ignored
  const brokenBackends = [
    'https://tahcom-c3m1ufewd-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-dpk99s20u-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-72tghbv3h-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-jd6bzo23i-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-hhakuuyz7-muneers-projects-276a49f7.vercel.app',
  ];
  
  // ALWAYS use stable backend in production (it always works, no CORS issues)
  // Only check env var in development or if explicitly set to stable backend
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    console.log('[OurPartners] VITE_API_BASE_URL found:', envUrl);
    
    // If env var points to stable backend, use it
    if (envUrl.includes(stableBackend)) {
      console.log('[OurPartners] ✅ Using stable backend from env var:', envUrl);
      return envUrl;
    }
    
    // If env var points to a broken/dead backend, ignore it and use stable backend
    const isBroken = brokenBackends.some(broken => envUrl.includes(broken));
    if (isBroken) {
      console.warn('[OurPartners] ⚠️ Env var points to broken/dead backend, using stable backend instead');
      return stableBackendUrl;
    }
    
    // In production, always prefer stable backend over any other env var
    if (!import.meta.env.DEV) {
      console.log('[OurPartners] Production mode: Using stable backend instead of env var');
      return stableBackendUrl;
    }
    
    // In development, allow env var if it points to a known working backend
    const isWorking = knownWorkingBackends.some(working => envUrl.includes(working));
    if (isWorking) {
      console.log('[OurPartners] ✅ Using VITE_API_BASE_URL (points to working backend):', envUrl);
      return envUrl;
    }
  }
  
  // In development, use localhost
  if (import.meta.env.DEV) {
    console.log('[OurPartners] Using localhost (dev mode)');
    return 'http://localhost:8787/api/partners';
  }
  
  // In production, ALWAYS use stable backend (tahcom-api.vercel.app)
  // It's reliable, has CORS configured, and always works
  console.log('[OurPartners] Production mode: Using stable backend:', stableBackendUrl);
  console.log('[OurPartners] Environment:', {
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  });
  
  return stableBackendUrl;
};

const API_BASE = getApiBase();
console.log('[OurPartners] Final API_BASE:', API_BASE);

// Helper function to try multiple backend URLs if the first one fails
const tryFetchWithFallbacks = async (endpoint: string, options: RequestInit = {}) => {
  // Use stable production domain (tahcom-api.vercel.app) - always works, no CORS issues!
  const stableBackendFallback = 'https://tahcom-api.vercel.app';
  const knownBackendUrls = [
    stableBackendFallback, // Stable production domain (BEST)
    'https://tahcom-ftq4hgz3j-muneers-projects-276a49f7.vercel.app', // Latest deployment
    'https://tahcom-cnqgse1cq-muneers-projects-276a49f7.vercel.app', // Working deployment
  ];
  
  // Extract the endpoint path (everything after /api/partners)
  const endpointPath = endpoint.replace(API_BASE, '').replace('/api/partners', '');
  
  // For write operations (POST, PUT, DELETE), only use primary backend to avoid duplicates
  const isWriteOperation = options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase());
  
  // Build list of URLs to try
  // CRITICAL: Always prioritize working backend first, even if API_BASE is broken
  const workingBackend = `${knownBackendUrls[0]}/api/partners`;
  const isBrokenBackend = API_BASE.includes('tahcom-c3m1ufewd');
  
  let urlsToTry: string[] = [];
  
  // If API_BASE is broken, start with working backend first
  if (isBrokenBackend && !isWriteOperation) {
    console.warn('[OurPartners] ⚠️ API_BASE is broken, prioritizing working backend first');
    urlsToTry.push(workingBackend);
    urlsToTry.push(API_BASE); // Still try it, but after working one
  } else {
    urlsToTry.push(API_BASE);
    // Add working backend early if it's different
    if (workingBackend !== API_BASE && !isWriteOperation) {
      urlsToTry.push(workingBackend);
    }
  }
  
  // For preview URLs, also try constructing backend from preview ID
  if (!isWriteOperation) {
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const match = currentHost.match(/tahcom-kpi-portal-([^-]+)-muneers-projects-276a49f7\.vercel\.app/);
    if (match) {
      const previewId = match[1];
      const constructedBackend = `https://tahcom-${previewId}-muneers-projects-276a49f7.vercel.app/api/partners`;
      // Add constructed backend if different
      if (constructedBackend !== API_BASE && constructedBackend !== workingBackend) {
        urlsToTry.push(constructedBackend);
      }
    }
    
    // Always add all known working backend URLs as fallbacks (only for read operations)
    // This ensures production works even if env var points to wrong/old backend
    const fallbackBases = knownBackendUrls.map(url => `${url}/api/partners`);
    urlsToTry = [...urlsToTry, ...fallbackBases];
  }
  
  // Remove duplicates while preserving order (keep first occurrence)
  urlsToTry = Array.from(new Set(urlsToTry));
  
  console.log('[OurPartners] URLs to try (in order):', urlsToTry);
  
  let lastError: Error | null = null;
  
  for (let i = 0; i < urlsToTry.length; i++) {
    const baseUrl = urlsToTry[i];
    const fullUrl = `${baseUrl}${endpointPath}`;
    
    try {
      console.log(`[OurPartners] Trying backend ${i + 1}/${urlsToTry.length}: ${fullUrl}`);
      
      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Bypass service worker completely for API calls
      // Add cache: 'no-store' to prevent service worker from intercepting
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        cache: 'no-store', // Bypass service worker and browser cache
        credentials: 'omit', // Don't send cookies
      };
      
      const response = await fetch(fullUrl, fetchOptions);
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[OurPartners] ✅ Success with backend ${i + 1}: ${baseUrl}`);
        return response;
      } else if (response.status >= 400 && response.status < 500) {
        // Client errors (4xx) - don't retry, return the error
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      } else {
        // Server errors (5xx) - try next backend
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        console.warn(`[OurPartners] ⚠️ Backend ${i + 1} returned ${response.status}, trying next...`);
        continue;
      }
    } catch (err: any) {
      lastError = err;
      // Network errors, timeouts, etc. - try next backend
      if (err.name === 'AbortError' || err.name === 'TimeoutError' || 
          err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        console.warn(`[OurPartners] ⚠️ Backend ${i + 1} failed (${err.message}), trying next...`);
        continue;
      } else {
        // Other errors (like JSON parse errors) - don't retry
        throw err;
      }
    }
  }
  
  // All backends failed
  throw lastError || new Error('All backend URLs failed');
};

interface SheetData {
  headers: string[];
  data: Record<string, any>[];
  rawRows: any[][];
}

interface Solution {
  Department: string;
  'System Name': string;
  'Partner / Company': string;
  Category: string;
  Description: string;
  'Client challenges': string;
  'Key Features': string;
  'Use Cases': string;
  'Target Sector': string;
  'Deployment Type': string;
  'Match Level ': string;
  [key: string]: any;
}

type WizardSubmission = {
  timestamp: number;
  sheetName: string;
  values: Record<string, string>;
};

type SectionConfig = {
  key: string;
  title: string;
  icon: JSX.Element;
  iconGradient: string;
  buttonGradient: string;
  buttonBorder: string;
  contentGradient: string;
  hint: string;
  body?: string;
  bullets?: string[];
  bulletGradient: string;
};

type SectorGroup = {
  key: string;
  targetSector: string;
  departments: Array<{ name: string; solution: Solution }>;
};

type PartnerGroup = {
  key: string;
  partnerName: string;
  solutions: Array<{
    key: string;
    label: string;
    solution: Solution;
  }>;
};

const CORE_FIELD_PRIORITY = [
  'Target Sector',
  'Department',
  'System Name',
  'Service Name',
  'Partner / Company',
  'Category',
  'Deployment Type',
  'Sub sector',
  'Solution Type'
];

const NARRATIVE_FIELD_PRIORITY = [
  'Description/Client challenges',
  'Description',
  'Client challenges',
  'Use Cases',
  'Benefits',
  'Key Features',
  'Value Proposition',
  'Highlights'
];

const DROPDOWN_FIELDS = new Set<string>([
  'Department',
  'Target Sector',
  'Category',
  'Deployment Type',
  'Partner / Company',
  'Service Name',
  'Sub sector'
]);

const FIELD_HINTS: Record<string, string> = {
  'System Name': 'Official name that will appear on the card.',
  Department: 'Which team, ministry, or division owns this entry?',
  'Target Sector': 'Primary sector or industry this solution serves.',
  'Partner / Company': 'Who provides or supports this solution?',
  Category: 'Group similar solutions together (e.g., Analytics, AI, ERP).',
  'Deployment Type': 'Cloud, On-Prem, Hybrid, or other deployment model.',
  'Description/Client challenges': 'Summarize the problem statement in 2-3 sentences.',
  'Client challenges': 'List the main pain points the client is facing.',
  'Use Cases': 'Outline scenarios where this solution is applied (one per line).',
  Benefits: 'Highlight measurable outcomes or advantages.',
  'Key Features': 'List standout capabilities or modules.',
  'Sub sector': 'Add a more granular sector if applicable.',
  'Service Name': 'Name of the service as employees recognize it.'
};

export function OurPartnersPage() {
  const navigate = useNavigate();
  const [showEntry, setShowEntry] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [availableSheets, setAvailableSheets] = useState<{id: number; title: string}[]>([]);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{row: number; col: string} | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'table' | 'cards'>('cards');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [tableUnlocked, setTableUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [showRowWizard, setShowRowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [rowDraft, setRowDraft] = useState<Record<string, string>>({});
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({});
  const [wizardStatus, setWizardStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [wizardMessage, setWizardMessage] = useState<string | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<WizardSubmission[]>([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mobileAssistantOpen, setMobileAssistantOpen] = useState(false);
  const [sectorSelections, setSectorSelections] = useState<Record<string, string>>({});
  const [partnerSelections, setPartnerSelections] = useState<Record<string, string>>({});
  const [visibleDepartmentMenu, setVisibleDepartmentMenu] = useState<string | null>(null);

  const PASSCODE = '1234';

  const unlockTable = () => {
    setTableUnlocked(true);
    setPasscodeError(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('tahcom_table_unlocked', 'true');
    }
  };

  const handleLockTable = () => {
    setTableUnlocked(false);
    setPasscodeInput('');
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('tahcom_table_unlocked');
    }
  };

  const handlePasscodeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passcodeInput.trim() === PASSCODE) {
      unlockTable();
    } else {
      setPasscodeError('Incorrect passcode. Please try again.');
    }
  };

  const buildInitialDraft = () => {
    const draft: Record<string, string> = {};
    sheetHeaders.forEach(header => {
      let defaultValue = '';
      if (header === 'Department' && selectedDepartment !== 'all' && !isSectorsSheet) {
        defaultValue = selectedDepartment;
      }
      if (header === 'Target Sector' && isSectorsSheet && selectedDepartment !== 'all') {
        defaultValue = selectedDepartment;
      }
      draft[header] = defaultValue;
    });
    return draft;
  };

  const openRowWizard = () => {
    setRowDraft(buildInitialDraft());
    setWizardStep(0);
    setWizardErrors({});
    setWizardStatus('idle');
    setWizardMessage(null);
    setFocusedField(null);
    setShowRowWizard(true);
  };

  const closeRowWizard = () => {
    setShowRowWizard(false);
    setWizardStep(0);
    setWizardErrors({});
    setWizardStatus('idle');
    setWizardMessage(null);
    setFocusedField(null);
  };

  const collectStepErrors = (step: number) => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      requiredFields.forEach(field => {
        if (coreFields.includes(field) && !(rowDraft[field] || '').toString().trim()) {
          errors[field] = 'Required field';
        }
      });
    }
    if (step === 2 && narrativeFields.length > 0) {
      const hasNarrativeContent = narrativeFields.some(field => (rowDraft[field] || '').toString().trim().length > 0);
      if (!hasNarrativeContent) {
        errors.__narrative = 'Add at least one detail to help others understand this entry.';
      }
    }
    if (step === 3) {
      additionalFields.forEach(field => {
        if (requiredFields.includes(field) && !(rowDraft[field] || '').toString().trim()) {
          errors[field] = 'Required field';
        }
      });
    }
    return errors;
  };

  const validateStep = (step: number) => {
    const errors = collectStepErrors(step);
    setWizardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBeforeSubmit = () => {
    const combinedErrors = {
      ...collectStepErrors(1),
      ...collectStepErrors(2),
      ...collectStepErrors(3),
    };
    setWizardErrors(combinedErrors);
    return Object.keys(combinedErrors).length === 0;
  };

  const handleWizardNext = () => {
    if (wizardStep === 0 || validateStep(wizardStep)) {
      setWizardErrors({});
      setWizardStep(prev => Math.min(prev + 1, wizardSteps.length - 1));
      setFocusedField(null);
    }
  };

  const handleWizardBack = () => {
    setWizardErrors({});
    setWizardStep(prev => Math.max(prev - 1, 0));
    setFocusedField(null);
  };

  const handleFieldChange = (field: string, value: string) => {
    setRowDraft(prev => ({ ...prev, [field]: value }));
    setWizardErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const applySuggestion = (field: string, value: string) => {
    setRowDraft(prev => ({ ...prev, [field]: value }));
    setWizardErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const isLongTextField = (header: string) =>
    /(description|challenge|use\\s*cases?|benefit|feature|notes|summary|detail|overview|insight|impact)/i.test(header);

  const renderFieldInput = (
    header: string,
    options: { multiline?: boolean; placeholder?: string } = {}
  ) => {
    const value = rowDraft[header] ?? '';
    const error = wizardErrors[header];
    const isRequired = requiredFields.includes(header);
    const shouldUseSelect = DROPDOWN_FIELDS.has(header);
    let selectOptions: string[] = [];

    if (shouldUseSelect) {
      if (header === 'Department') {
        selectOptions = getUniqueValues('Department');
      } else if (header === 'Target Sector') {
        selectOptions = targetSectorOptions;
      } else if (header === 'Category') {
        selectOptions = getUniqueValues('Category');
      } else if (header === 'Deployment Type') {
        selectOptions = getUniqueValues('Deployment Type' as keyof Solution);
      } else {
        selectOptions = getUniqueValues(header as keyof Solution);
      }
    }

    const suggestions = getTopSuggestions(header, 3).filter(suggestion => suggestion && suggestion !== value);
    const hint = FIELD_HINTS[header] ?? options.placeholder ?? '';
    const inputClass =
      'w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#8B4513] focus:border-[#8B4513] transition-all bg-white';
    const datalistId = shouldUseSelect ? `wizard-options-${header.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined;

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleFieldChange(header, event.target.value);

    const commonHandlers = {
      value,
      onFocus: () => setFocusedField(header),
      onBlur: () => setFocusedField(prev => (prev === header ? null : prev)),
    } as const;

    return (
      <div key={header} className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            {header}
            {isRequired && <span className="text-xs text-red-600 font-semibold">Required</span>}
          </label>
          <span className="text-xs text-gray-400">
            {typeof value === 'string' ? value.length : 0}
            {options.multiline ? '/600' : ''}
          </span>
        </div>
        {hint && <p className="text-xs text-gray-500 leading-relaxed">{hint}</p>}
        {shouldUseSelect ? (
          <>
            <input
              {...commonHandlers}
              onChange={handleChange}
              className={inputClass}
              type="text"
              list={datalistId}
              placeholder={hint || `Type or choose ${header.toLowerCase()}`}
            />
            {datalistId && (
              <datalist id={datalistId}>
                {selectOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            )}
          </>
        ) : options.multiline || isLongTextField(header) ? (
          <textarea
            {...commonHandlers}
            onChange={handleChange}
            rows={5}
            maxLength={600}
            className={`${inputClass} min-h-[140px] resize-y`}
            placeholder={hint || `Enter ${header.toLowerCase()}`}
          />
        ) : (
          <input
            {...commonHandlers}
            onChange={handleChange}
            className={inputClass}
            type="text"
            placeholder={hint || `Enter ${header.toLowerCase()}`}
          />
        )}
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${header}-suggestion-${index}`}
                type="button"
                onClick={() => applySuggestion(header, suggestion)}
                className="px-3 py-1 rounded-full text-xs bg-orange-50 text-[#8B4513] border border-orange-100 hover:bg-orange-100 transition-colors"
              >
                {suggestion.length > 60 ? `${suggestion.slice(0, 57)}…` : suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderWizardContent = () => {
    if (wizardStep === 0) {
      const highlightFields = [...coreFields, ...narrativeFields].slice(0, 6);
      return (
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-[#8B4513]">
              <ListChecks size={22} />
              <div>
                <h4 className="text-base font-semibold">What we capture</h4>
                <p className="text-sm text-gray-600">
                  We’ll walk you through the key information, then save everything straight into Google Sheets.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {highlightFields.map(field => (
              <div key={`preview-${field}`} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-gray-800">{field}</h5>
                <p className="text-xs text-gray-500 mt-2">
                  {FIELD_HINTS[field] || 'We’ll collect a short value for this column.'}
                </p>
              </div>
            ))}
            {highlightFields.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-gray-800">All columns</h5>
                <p className="text-xs text-gray-500 mt-2">
                  We’ll guide you through each column defined in this sheet.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (wizardStep === 1) {
      const fields = coreFields.length > 0 ? coreFields : sheetHeaders.slice(0, 5);
      return (
        <div className="space-y-6">
          {fields.map(field => renderFieldInput(field))}
          {fields.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              This sheet doesn’t have obvious “core” columns. We’ll capture everything in the next steps.
            </p>
          )}
        </div>
      );
    }

    if (wizardStep === 2) {
      return (
        <div className="space-y-6">
          {narrativeFields.length > 0 ? (
            narrativeFields.map(field => renderFieldInput(field, { multiline: true }))
          ) : (
            <p className="text-sm text-gray-500 italic">
              This sheet doesn&apos;t contain narrative columns. You can still add details in the next step.
            </p>
          )}
          {wizardErrors.__narrative && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={12} />
              {wizardErrors.__narrative}
            </p>
          )}
        </div>
      );
    }

    if (wizardStep === 3) {
      return (
        <div className="space-y-6">
          {additionalFields.length > 0 ? (
            additionalFields.map(field =>
              renderFieldInput(field, { multiline: isLongTextField(field) })
            )
          ) : (
            <p className="text-sm text-gray-500 italic">
              There are no extra columns on this sheet. You&apos;re ready to review.
            </p>
          )}
        </div>
      );
    }

    const missingRequired = requiredFields.filter(field => !(rowDraft[field] || '').toString().trim());
    return (
      <div className="space-y-4">
        {wizardStatus === 'success' && wizardMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={18} />
            <span>{wizardMessage}</span>
          </div>
        )}
        {wizardStatus === 'error' && wizardMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={18} />
            <span>{wizardMessage}</span>
          </div>
        )}
        {missingRequired.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-xl p-3 text-sm">
            <span className="font-semibold">Missing required fields:</span> {missingRequired.join(', ')}
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#8B4513] font-semibold text-sm uppercase tracking-wide">
            <ClipboardCheck size={16} />
            Review summary
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sheetHeaders.map(header => (
              <div key={`review-${header}`} className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">{header}</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">
                  {(rowDraft[header] || '').toString().trim() || (
                    <span className="text-gray-400 italic">Will remain blank</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleWizardSubmit = async () => {
    if (!validateBeforeSubmit()) {
      setWizardStep(1);
      return;
    }

    setWizardStatus('saving');
    setWizardMessage('Saving your entry…');

    try {
      const success = await addRow(rowDraft, { silent: true });
      if (!success) {
        throw new Error('Failed to add row. Please try again.');
      }
      const submission: WizardSubmission = {
        timestamp: Date.now(),
        sheetName: sheetName || 'Unknown',
        values: { ...rowDraft },
      };
      setRecentSubmissions(prev => [submission, ...prev].slice(0, 5));
      setWizardStatus('success');
      setWizardMessage('Row added successfully!');
      setWizardErrors({});
      setWizardStep(3);
      setRowDraft(buildInitialDraft());
    } catch (error) {
      console.error('[wizard] submit error', error);
      setWizardStatus('error');
      setWizardMessage(error instanceof Error ? error.message : 'Failed to add row. Please try again.');
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetries = async (
    endpoint: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<Response> => {
    let attempt = 0;
    let lastThrown: unknown = null;
    while (attempt <= retries) {
      try {
        return await tryFetchWithFallbacks(endpoint, options);
      } catch (err) {
        lastThrown = err;
        if (attempt === retries) {
          throw err;
        }
        const delay = Math.min(4000, 1000 * Math.pow(2, attempt));
        setStatusMessage(`Retrying… (${attempt + 2}/${retries + 1})`);
        await sleep(delay);
      }
      attempt += 1;
    }
    throw lastThrown ?? new Error('Unknown fetch error');
  };

  const readMetaCache = (spreadsheet: string) => readCache<SheetMetaCache>(buildMetaCacheKey(spreadsheet));
  const readSheetCache = (spreadsheet: string, sheet: string) => readCache<SheetDataCache>(buildSheetCacheKey(spreadsheet, sheet));
  const writeMetaCache = (spreadsheet: string, data: SheetMetaCache) => writeCache(buildMetaCacheKey(spreadsheet), data);
  const writeSheetCache = (spreadsheet: string, sheet: string, data: SheetDataCache) => writeCache(buildSheetCacheKey(spreadsheet, sheet), data);
  const clearSheetCache = (spreadsheet: string, sheet?: string) => {
    removeCacheKey(buildMetaCacheKey(spreadsheet));
    if (sheet) {
      removeCacheKey(buildSheetCacheKey(spreadsheet, sheet));
    }
  };
  const [visibleSubSector, setVisibleSubSector] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlocked = window.sessionStorage.getItem('tahcom_table_unlocked') === 'true';
    setTableUnlocked(unlocked);
    const storedSubmissions = window.localStorage.getItem('partners_recent_submissions');
    if (storedSubmissions) {
      try {
        const parsed = JSON.parse(storedSubmissions) as WizardSubmission[];
        setRecentSubmissions(parsed);
      } catch (error) {
        console.warn('[OurPartners] Failed to parse recent submissions', error);
      }
    }
  }, []);

  // Clear old Excel ID on mount
  useEffect(() => {
    const savedId = localStorage.getItem('partners_spreadsheet_id');
    if (savedId === '1eBTpXRU_uxc57f8Vhb9SzSnjHP0vNsPh') {
      localStorage.removeItem('partners_spreadsheet_id');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('partners_recent_submissions', JSON.stringify(recentSubmissions.slice(0, 5)));
  }, [recentSubmissions]);

  // Test backend connection before loading sheets
  const testBackendConnection = async (): Promise<boolean> => {
    try {
      const testUrl = API_BASE.replace('/api/partners', '/health');
      console.log('[OurPartners] Testing backend connection:', testUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[OurPartners] ✅ Backend is accessible:', data);
        
        // Check if Google Sheets is initialized
        if (data.googleSheets && !data.googleSheets.initialized) {
          console.warn('[OurPartners] ⚠️ Backend is running but Google Sheets not initialized');
          alert(`⚠️ Backend Configuration Issue\n\nThe backend server is running, but Google Sheets is not configured.\n\nPlease:\n1. Go to Vercel Dashboard → Backend Project → Settings → Environment Variables\n2. Add GOOGLE_SERVICE_ACCOUNT environment variable\n3. Copy the entire content of service-account.json (all on one line)\n4. Redeploy the backend\n\nService Account Email: sheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com`);
          return false;
        }
        
        return true;
      } else {
        console.error('[OurPartners] ❌ Backend health check failed:', response.status);
        return false;
      }
    } catch (err: any) {
      console.error('[OurPartners] ❌ Backend connection test failed:', err);
      
      if (err.name === 'AbortError') {
        alert(`⏱️ Backend Connection Timeout\n\nThe backend server did not respond in time.\n\nPossible issues:\n1. Backend URL might be incorrect: ${API_BASE}\n2. Backend might not be deployed\n3. Network connectivity issues\n\nPlease check:\n- Go to Vercel Dashboard and verify the backend is deployed\n- Check the latest deployment URL\n- Update VITE_API_BASE_URL environment variable if needed`);
      } else {
        alert(`❌ Cannot Connect to Backend\n\nFailed to reach the backend server.\n\nCurrent API Base: ${API_BASE}\n\nPlease check:\n1. Backend is deployed on Vercel\n2. Backend URL is correct\n3. Go to Vercel Dashboard → Backend Project → Deployments\n4. Copy the latest deployment URL\n5. Update VITE_API_BASE_URL in frontend environment variables\n6. Redeploy frontend after updating`);
      }
      
      return false;
    }
  };

  // Load available sheets when spreadsheet ID is provided
  useEffect(() => {
    if (spreadsheetId && !showEntry) {
      // Test backend connection first, then load sheets
      const init = async () => {
        const isConnected = await testBackendConnection();
        if (isConnected) {
      loadSheets();
    }
      };
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadsheetId, showEntry]);

  // Load data when sheet name is selected
  useEffect(() => {
    if (spreadsheetId && sheetName && !showEntry) {
      loadSheetData();
    }
  }, [spreadsheetId, sheetName, showEntry]);

  const handleEntryClick = () => {
    setShowEntry(false);
    // Use default spreadsheet ID or saved one
    const defaultSpreadsheetId = '1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0';
    // Clear old Excel file ID if it exists
    const savedId = localStorage.getItem('partners_spreadsheet_id');
    if (savedId === '1eBTpXRU_uxc57f8Vhb9SzSnjHP0vNsPh') {
      localStorage.removeItem('partners_spreadsheet_id');
      setSpreadsheetId(defaultSpreadsheetId);
      localStorage.setItem('partners_spreadsheet_id', defaultSpreadsheetId);
    } else {
      const finalId = savedId || defaultSpreadsheetId;
      setSpreadsheetId(finalId);
      localStorage.setItem('partners_spreadsheet_id', finalId);
    }
  };

  useEffect(() => {
    if (!showEntry && !spreadsheetId) {
      handleEntryClick();
    }
  }, [showEntry, spreadsheetId]);

  const loadSheets = async ({ bypassCache = false }: { bypassCache?: boolean } = {}) => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      setStatusMessage(bypassCache ? 'Refreshing spreadsheet…' : 'Loading spreadsheet…');
      setLastError(null);

      if (!bypassCache) {
        const cached = readMetaCache(spreadsheetId);
        if (cached) {
          const filteredSheets = cached.data.sheets.filter((s: any) =>
        !s.title.toLowerCase().includes('match level') && 
        !s.title.toLowerCase().includes('matchlevel')
          );
          setAvailableSheets(filteredSheets);
          if (filteredSheets.length > 0 && (!sheetName || !filteredSheets.some(s => s.title === sheetName))) {
            const solutionsSheet = filteredSheets.find((s: any) =>
              s.title.toLowerCase().includes('solution') || s.title.toLowerCase().includes('system')
            );
            setSheetName(solutionsSheet?.title || filteredSheets[0].title);
          }
          setLastUpdatedAt(cached.updatedAt);
          setStatusMessage('Showing saved data… checking for updates');
        }
      }

      const query = bypassCache ? '?refresh=true' : '';
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}${query}`;
      const res = await fetchWithRetries(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const payloadJson = await res.json();
      if (payloadJson.error) {
        throw new Error(payloadJson.error);
      }

      const sheetPayload: SheetMetaCache = {
        sheets: payloadJson.sheets || [],
        title: payloadJson.title,
      };

      const filteredSheets = sheetPayload.sheets.filter((s: any) =>
          !s.title.toLowerCase().includes('match level') && 
          !s.title.toLowerCase().includes('matchlevel')
        );
        setAvailableSheets(filteredSheets);
      if (filteredSheets.length > 0 && (!sheetName || !filteredSheets.some(s => s.title === sheetName))) {
          const solutionsSheet = filteredSheets.find((s: any) => 
            s.title.toLowerCase().includes('solution') || s.title.toLowerCase().includes('system')
          );
          setSheetName(solutionsSheet?.title || filteredSheets[0].title);
        }

      writeMetaCache(spreadsheetId, sheetPayload);
      setLastUpdatedAt(Date.now());
      setStatusMessage(null);
      setLastError(null);
    } catch (err: any) {
      console.error('Error loading sheets:', err);
      if (!availableSheets.length) {
        setLastError('Unable to load spreadsheet metadata. Check your connection and try again.');
      } else {
        setLastError('Unable to refresh spreadsheet metadata. Showing previously saved data.');
      }
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const loadSheetData = async ({ bypassCache = false }: { bypassCache?: boolean } = {}) => {
    if (!spreadsheetId || !sheetName) return;
    let cachedBeforeFetch: CacheEnvelope<SheetDataCache> | null = null;
    try {
      setLoading(true);
      setStatusMessage(bypassCache ? `Refreshing "${sheetName}"…` : `Loading "${sheetName}"…`);
      setLastError(null);
      
      // Prevent loading "Match Level" description table - it's not for main data
      if (sheetName.toLowerCase().includes('match level') || sheetName.toLowerCase().includes('matchlevel')) {
        alert('⚠️ "Match Level" is a description table and cannot be used as main data.\n\nPlease select a different sheet (e.g., "solutions" or "services").');
        const solutionsSheet = availableSheets.find((s: any) => 
          s.title.toLowerCase().includes('solution') || s.title.toLowerCase().includes('system')
        );
        if (solutionsSheet) {
          setSheetName(solutionsSheet.title);
          return;
        }
        throw new Error('Cannot load Match Level sheet - please select a different sheet');
      }
      
      if (spreadsheetId === '1eBTpXRU_uxc57f8Vhb9SzSnjHP0vNsPh') {
        const newId = '1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0';
        localStorage.setItem('partners_spreadsheet_id', newId);
        setSpreadsheetId(newId);
        throw new Error('Old Excel file ID detected. Please use the new Google Sheet ID. Clearing cache and reloading...');
      }
      
      if (!bypassCache) {
        cachedBeforeFetch = readSheetCache(spreadsheetId, sheetName);
        if (cachedBeforeFetch) {
          setSheetData(cachedBeforeFetch.data);
          setSolutions((cachedBeforeFetch.data.data || []) as Solution[]);
          setLastUpdatedAt(cachedBeforeFetch.updatedAt);
          setStatusMessage('Showing saved data… checking for updates');
        }
      }

      const query = bypassCache ? '?refresh=true' : '';
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}${query}`;
      const res = await fetchWithRetries(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const payloadJson = await res.json();
      if (payloadJson.error) {
        throw new Error(payloadJson.error);
      }

      if (!payloadJson.data || payloadJson.data.length === 0) {
        console.warn('Sheet loaded but contains no data rows');
      }
      
      const payload: SheetDataCache = {
        headers: payloadJson.headers || [],
        data: payloadJson.data || [],
        rawRows: payloadJson.rawRows || [],
      };

      setSheetData(payload);
      setSolutions((payload.data || []) as Solution[]);
      writeSheetCache(spreadsheetId, sheetName, payload);
      setLastUpdatedAt(Date.now());
      setStatusMessage(null);
      setLastError(null);
    } catch (err: any) {
      console.error('Error loading sheet data:', err);
      const errorMessage = err.message || 'Failed to load sheet data.';
      
      if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        alert(`Permission Error: ${errorMessage}\n\n🔐 Please share the spreadsheet with:\n\nsheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com\n\nGive it "Viewer" or "Editor" access.`);
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        alert(`Sheet Not Found: ${errorMessage}\n\nPlease check:\n1. The spreadsheet ID is correct\n2. The sheet name "${sheetName}" exists in the spreadsheet`);
      } else if (errorMessage.includes('not supported') || errorMessage.includes('Excel') || errorMessage.includes('FAILED_PRECONDITION')) {
        alert(`⚠️ File Format Error\n\nThis file is not a native Google Sheet. It appears to be an Excel file.\n\nPlease:\n1. Open the file in Google Drive\n2. Go to File → "Save as Google Sheets"\n3. Use the new Google Sheet's ID\n\nCurrent ID: ${spreadsheetId}`);
      } else if (errorMessage.includes('Old Excel file ID')) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        if (!cachedBeforeFetch) {
          setLastError('Unable to load solutions from Google Sheets. Check your connection and try again.');
        } else {
          setLastError('Unable to refresh Google Sheets. Showing most recent saved data.');
        }
      }
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const handleManualRetry = () => {
    setLastError(null);
    setStatusMessage('Retrying…');
    loadSheets({ bypassCache: true });
    if (sheetName) {
      loadSheetData({ bypassCache: true });
    }
  };

  const updateCell = async (cell: string, value: string) => {
    try {
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}/cell`;
      await fetchWithRetries(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cell, value }),
      });
      clearSheetCache(spreadsheetId, sheetName);
      await loadSheetData({ bypassCache: true });
    } catch (err) {
      console.error('Error updating cell:', err);
      alert('Failed to update cell.');
    }
  };

  const addRow = async (
    rowValues?: Record<string, string>,
    options: { silent?: boolean } = {}
  ) => {
    if (!sheetData?.headers) {
      if (!options.silent) {
        alert('Sheet headers are not loaded yet. Please try again.');
      }
      return false;
    }

    const values = sheetData.headers.map(header => {
      const raw = rowValues?.[header];
      if (raw === undefined || raw === null) return '';
      return typeof raw === 'string' ? raw : String(raw);
    });

    try {
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}/row`;
      await fetchWithRetries(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
      clearSheetCache(spreadsheetId, sheetName);
      await loadSheetData({ bypassCache: true });
      return true;
    } catch (err) {
      console.error('Error adding row:', err);
      if (!options.silent) {
      alert('Failed to add row.');
      }
      return false;
    }
  };

  const deleteRow = async (rowIndex: number) => {
    if (!confirm('Delete this row?')) return;
    try {
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}/row/${rowIndex}`;
      await fetchWithRetries(apiUrl, {
        method: 'DELETE',
      });
      clearSheetCache(spreadsheetId, sheetName);
      await loadSheetData({ bypassCache: true });
    } catch (err) {
      console.error('Error deleting row:', err);
      alert('Failed to delete row.');
    }
  };

  // Enhanced Analytics calculations
  const totalSolutions = solutions.length;
  const totalPartners = new Set(solutions.map(s => s['Partner / Company']).filter(Boolean)).size;
  // Category distribution - split categories that contain multiple values
  const categoryCounts = solutions.reduce((acc, solution) => {
    const category = solution.Category || 'Unknown';
    // Split by comma, semicolon, or pipe, and also handle "&" and "/"
    const categories = category
      .split(/[,;|&/]/)
      .map(c => c.trim())
      .filter(c => c.length > 0 && c !== 'Unknown');
    
    if (categories.length === 0) {
      acc['Unknown'] = (acc['Unknown'] || 0) + 1;
    } else {
      categories.forEach(cat => {
        acc[cat] = (acc[cat] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  // Department distribution
  const departmentCounts = solutions.reduce((acc, solution) => {
    const dept = solution.Department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Enhanced metrics
  const cloudSolutions = solutions.filter(s => 
    (s['Deployment Type'] || '').toLowerCase().includes('cloud')
  ).length;
  const onPremSolutions = solutions.filter(s => 
    (s['Deployment Type'] || '').toLowerCase().includes('on-prem') || 
    (s['Deployment Type'] || '').toLowerCase().includes('on prem')
  ).length;
  const hybridSolutions = solutions.filter(s => 
    (s['Deployment Type'] || '').toLowerCase().includes('hybrid')
  ).length;

  // Match Level Analytics
  const matchLevelValues = solutions
    .map(s => {
      const ml = (s['Match Level '] || '').toString().trim();
      return ml ? parseFloat(ml) : null;
    })
    .filter((ml): ml is number => ml !== null && !isNaN(ml) && ml >= 0);
  
  const avgMatchLevel = matchLevelValues.length > 0
    ? (matchLevelValues.reduce((a, b) => a + b, 0) / matchLevelValues.length).toFixed(2)
    : '0.00';

  // Match Level by Department
  const matchLevelByDept = solutions.reduce((acc, s) => {
    const dept = s.Department || 'Unknown';
    const ml = parseFloat((s['Match Level '] || '').toString().trim()) || 0;
    if (!acc[dept]) {
      acc[dept] = { total: 0, sum: 0, count: 0 };
    }
    acc[dept].total += 1;
    if (ml > 0) {
      acc[dept].sum += ml;
      acc[dept].count += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; sum: number; count: number }>);

  const deptMatchLevelAvg = Object.entries(matchLevelByDept).map(([dept, data]) => ({
    department: dept,
    avgMatchLevel: data.count > 0 ? (data.sum / data.count).toFixed(2) : '0.00',
    totalSystems: data.total,
    systemsWithMatchLevel: data.count,
  })).sort((a, b) => parseFloat(b.avgMatchLevel) - parseFloat(a.avgMatchLevel));

  // Partner vs Match Level (for bubble chart)
  const partnerMatchLevel = solutions.reduce((acc, s) => {
    const partner = s['Partner / Company'] || 'Unknown';
    const ml = parseFloat((s['Match Level '] || '').toString().trim()) || 0;
    if (partner !== 'Unknown' && ml > 0) {
      if (!acc[partner]) {
        acc[partner] = { systems: 0, totalML: 0, avgML: 0 };
      }
      acc[partner].systems += 1;
      acc[partner].totalML += ml;
      acc[partner].avgML = acc[partner].totalML / acc[partner].systems;
    }
    return acc;
  }, {} as Record<string, { systems: number; totalML: number; avgML: number }>);


  // Partner strength analysis
  const partnerSolutions = solutions.reduce((acc, solution) => {
    const partner = solution['Partner / Company'] || 'Unknown';
    if (partner !== 'Unknown') {
      if (!acc[partner]) {
        acc[partner] = {
          count: 0,
          departments: new Set(),
          categories: new Set(),
        };
      }
      acc[partner].count++;
      if (solution.Department) acc[partner].departments.add(solution.Department);
      if (solution.Category) acc[partner].categories.add(solution.Category);
    }
    return acc;
  }, {} as Record<string, { count: number; departments: Set<string>; categories: Set<string> }>);

  const topPartnersDetailed = Object.entries(partnerSolutions)
    .map(([partner, data]) => ({
      partner,
      count: data.count,
      departments: data.departments.size,
      categories: data.categories.size,
      coverage: data.departments.size + data.categories.size,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  // Advanced Chart Data
  // Department colors mapping
  const getDeptColor = (dept: string) => {
    const colors: Record<string, string> = {
      'AI': '#6366f1', // indigo
      'Data': '#10b981', // green
      'Cybersecurity': '#ef4444', // red
      'Cyber Security': '#ef4444',
      'Governance': '#a855f7', // purple
      'Archive': '#f59e0b', // amber
      'Internal Communication': '#3b82f6', // blue
      'Project Management': '#ec4899', // pink
      'Research & Innovation': '#14b8a6', // teal
      'ERP System': '#8b5cf6', // violet
      'Multi-Cloud': '#06b6d4', // cyan
    };
    return colors[dept] || '#8B4513';
  };

  // Department analysis - identify which need market attention
  const departmentAnalysis = Object.entries(departmentCounts).map(([dept, count]) => {
    const avgCount = Object.values(departmentCounts).reduce((a, b) => a + b, 0) / Object.keys(departmentCounts).length;
    const needsAttention = count < avgCount * 0.5; // Less than 50% of average
    const isLow = count <= 1; // Very low count
    return {
      department: dept,
      count,
      needsAttention,
      isLow,
      priority: isLow ? 'high' : needsAttention ? 'medium' : 'low',
    };
  }).sort((a, b) => a.count - b.count); // Sort by count ascending to show low ones first

  // Partner vs Match Level (Bar chart with size encoding)
  const topPartnersByML = Object.entries(partnerMatchLevel)
    .sort((a, b) => b[1].avgML - a[1].avgML)
    .slice(0, 10);
  const partnerMLChartData = {
    labels: topPartnersByML.map(([p]) => p.length > 20 ? p.substring(0, 20) + '...' : p),
    datasets: [{
      label: 'Avg Match Level',
      data: topPartnersByML.map(([, data]) => data.avgML),
      backgroundColor: topPartnersByML.map(([, data]) => {
        const intensity = Math.min(data.avgML / 5, 1);
        return `rgba(139, 69, 19, ${0.5 + intensity * 0.5})`;
      }),
      borderColor: THEME_COLORS.brand1,
      borderWidth: 2,
    }],
  };

  // Line Chart: Match Level by Department
  const matchLevelLineData = {
    labels: deptMatchLevelAvg.map(d => d.department),
    datasets: [{
      label: 'Average Match Level',
      data: deptMatchLevelAvg.map(d => parseFloat(d.avgMatchLevel)),
      borderColor: '#8B4513',
      backgroundColor: 'rgba(139, 69, 19, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: '#8B4513',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }],
  };

  // Auto-generated Insights
  const topDeptByML = deptMatchLevelAvg.slice(0, 3);
  const lowMLHighCount = deptMatchLevelAvg
    .filter(d => parseFloat(d.avgMatchLevel) < 2.0 && d.totalSystems > 2)
    .slice(0, 2);
  const departmentsNeedingAttention = departmentAnalysis.filter(d => d.needsAttention || d.isLow);

  // Identify needed departments - standard departments that should exist but don't have systems
  // Group related departments together - if one exists, don't suggest others in the same group
  const departmentGroups = [
    ['AI', 'Artificial Intelligence', 'Machine Learning', 'ML'],
    ['Data', 'Data Analytics', 'Data Science', 'Business Intelligence', 'BI'],
    ['Cybersecurity', 'Cyber Security', 'Security', 'Information Security'],
    ['Governance', 'Compliance', 'Risk Management'],
    ['Cloud', 'Cloud Services', 'Infrastructure', 'DevOps', 'Multi-Cloud', 'Hybrid Cloud'],
    ['Sales', 'Business Development', 'CRM'],
    ['Marketing', 'Digital Marketing'],
    ['Customer Success', 'Support', 'Customer Service'],
    ['Finance', 'Accounting', 'Financial Management'],
    ['HR', 'Human Resources', 'Talent Management'],
    ['Legal', 'Legal & Compliance'],
    ['Product Management', 'Product Development'],
    ['Research & Development', 'R&D', 'Innovation'],
    ['Project Management', 'PMO'],
    ['Quality Assurance', 'QA', 'Testing'],
    ['Operations', 'Business Operations'],
    ['IT', 'Information Technology'],
    ['Communication', 'Internal Communication'],
    ['Archive', 'Document Management'],
    ['ERP System', 'Enterprise Resource Planning']
  ];

  // Normalize department names for comparison
  const normalizeDeptName = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const existingDepts = new Set(Object.keys(departmentCounts).map(normalizeDeptName));
  
  // Check if any department in a group already exists
  const isGroupAlreadyCovered = (group: string[]) => {
    return group.some(dept => {
      const normalized = normalizeDeptName(dept);
      // Check exact match or if existing dept contains/is contained by this dept
      return Array.from(existingDepts).some(existing => {
        if (existing === normalized) return true;
        // Check if they're similar (one contains the other or they share significant words)
        const existingWords = existing.split(/\s+/).filter(w => w.length > 2);
        const deptWords = normalized.split(/\s+/).filter(w => w.length > 2);
        // If they share significant words, consider them the same
        if (existingWords.length > 0 && deptWords.length > 0) {
          const sharedWords = existingWords.filter(w => deptWords.includes(w));
          if (sharedWords.length > 0 && sharedWords.length >= Math.min(existingWords.length, deptWords.length) * 0.5) {
            return true;
          }
        }
        // Check substring match for abbreviations (e.g., "ai" matches "artificialintelligence")
        if (normalized.length <= 3 && existing.includes(normalized)) return true;
        if (existing.length <= 3 && normalized.includes(existing)) return true;
        return false;
      });
    });
  };
  
  // Find missing departments - only suggest if the entire group is missing
  const neededDepartments = departmentGroups
    .filter(group => !isGroupAlreadyCovered(group))
    .map(group => group[0]) // Take the first/main department name from each group
    .slice(0, 10); // Limit to top 10 most relevant

  const normalizedSheetName = sheetName ? sheetName.toLowerCase() : '';
  const isSectorsSheet = normalizedSheetName.includes('sector');

  const getUniqueValues = (key: keyof Solution) => {
    // Exclude "Match Level" column from filter options - it's a description table, not for filtering
    if (key === 'Match Level ' || key.toString().toLowerCase().includes('match level')) {
      return [];
    }
    return Array.from(new Set(solutions.map(s => s[key]).filter(Boolean))) as string[];
  };

  const getTopSuggestions = (header: string, limit = 3) => {
    const counts = new Map<string, number>();
    solutions.forEach(solution => {
      const raw = (solution[header] ?? '').toString().trim();
      if (raw.length > 0) {
        counts.set(raw, (counts.get(raw) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => value)
      .slice(0, limit);
  };

  const sheetHeaders = useMemo(() => sheetData?.headers ?? [], [sheetData?.headers]);
  const isSimpleSectorSheet =
    isSectorsSheet &&
    sheetHeaders.includes('Department') &&
    sheetHeaders.includes('Use Cases') &&
    sheetHeaders.includes('Benefits') &&
    !sheetHeaders.includes('Target Sector');

  const targetSectorOptions = (isSimpleSectorSheet
    ? Array.from(
        new Set(
          solutions
            .map(s => (s.Department || '').toString().trim())
            .filter(value => value.length > 0)
        )
      )
    : Array.from(
        new Set(
    solutions
      .map(s => (s['Target Sector'] || '').toString().trim())
      .filter(value => value.length > 0)
        )
  )) as string[];

  const coreFields = useMemo(() => {
    return sheetHeaders
      .filter(header => CORE_FIELD_PRIORITY.includes(header))
      .sort((a, b) => CORE_FIELD_PRIORITY.indexOf(a) - CORE_FIELD_PRIORITY.indexOf(b));
  }, [sheetHeaders]);

  const narrativeFields = useMemo(() => {
    return sheetHeaders
      .filter(header => NARRATIVE_FIELD_PRIORITY.includes(header))
      .sort((a, b) => NARRATIVE_FIELD_PRIORITY.indexOf(a) - NARRATIVE_FIELD_PRIORITY.indexOf(b));
  }, [sheetHeaders]);

  const additionalFields = useMemo(() => {
    return sheetHeaders.filter(header =>
      !CORE_FIELD_PRIORITY.includes(header) && !NARRATIVE_FIELD_PRIORITY.includes(header)
    );
  }, [sheetHeaders]);

  const wizardSteps = ['Welcome', 'Key details', 'Narrative', 'Additional data', 'Review'];
  const wizardStepDescriptions = [
    'Preview what information we capture before creating a new row.',
    'Fill in the key identifiers so the card displays in the right place.',
    'Add the narrative details that help teams understand the offer.',
    'Capture any remaining columns to keep the sheet complete.',
    'Review everything one last time before saving to Google Sheets.'
  ];

  const wizardProgress = wizardSteps.length > 1 ? (wizardStep / (wizardSteps.length - 1)) * 100 : 100;

  const sheetRecentSubmissions = useMemo(() => {
    const currentSheet = sheetName || 'Unknown';
    return recentSubmissions.filter(submission => submission.sheetName === currentSheet).slice(0, 3);
  }, [recentSubmissions, sheetName]);

  const requiredFields = useMemo(() => {
    const required = new Set<string>();
    if (sheetHeaders.includes('System Name')) required.add('System Name');
    if (sheetHeaders.includes('Service Name') && normalizedSheetName.includes('service')) required.add('Service Name');
    if (sheetHeaders.includes('Department')) required.add('Department');
    if (isSectorsSheet && sheetHeaders.includes('Target Sector')) required.add('Target Sector');
    if (isSectorsSheet && sheetHeaders.includes('Department')) required.add('Department');
    return Array.from(required);
  }, [sheetHeaders, isSectorsSheet, normalizedSheetName]);

  const departmentFilterLabel = isSimpleSectorSheet ? 'Department' : isSectorsSheet ? 'Target Sector' : 'Department';
  const departmentPlaceholder = isSimpleSectorSheet ? 'All Departments' : isSectorsSheet ? 'All Target Sectors' : 'All Departments';
  const departmentFilterOptions = isSimpleSectorSheet ? targetSectorOptions : isSectorsSheet ? targetSectorOptions : getUniqueValues('Department');

  // Filter solutions for cards/table view (sector sheets search by target sector)
  const filteredSolutions = solutions.filter(solution => {
    const lowerSearch = searchTerm.toLowerCase();
    let matchesSearch = true;

    if (searchTerm) {
      if (isSectorsSheet) {
        if (isSimpleSectorSheet) {
          matchesSearch =
            (solution.Department || '').toString().toLowerCase().includes(lowerSearch) ||
            (solution['Use Cases'] || '').toString().toLowerCase().includes(lowerSearch) ||
            (solution['Benefits'] || '').toString().toLowerCase().includes(lowerSearch);
        } else {
          matchesSearch =
            (solution['Target Sector'] || '').toString().toLowerCase().includes(lowerSearch) ||
            (solution['Sub sector'] || solution['Sub Sector'] || '').toString().toLowerCase().includes(lowerSearch);
        }
      } else {
        matchesSearch =
          (solution['System Name'] || '').toString().toLowerCase().includes(lowerSearch) ||
          (solution.Description || '').toString().toLowerCase().includes(lowerSearch) ||
          (solution['Client challenges'] || '').toString().toLowerCase().includes(lowerSearch) ||
          (solution['Use Cases'] || '').toString().toLowerCase().includes(lowerSearch) ||
          (solution['Benefits'] || '').toString().toLowerCase().includes(lowerSearch);
      }
    }

    const solutionDepartment = isSectorsSheet
      ? isSimpleSectorSheet
        ? (solution.Department || '')
        : (solution['Target Sector'] || '')
      : (solution.Department || '');

    const matchesDepartment = selectedDepartment === 'all' || solutionDepartment === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  const sectorGroups = useMemo<SectorGroup[]>(() => {
    if (!isSectorsSheet || isSimpleSectorSheet) return [];

    const map = new Map<string, { targetSector: string; entries: Solution[] }>();

    filteredSolutions.forEach(solution => {
      const rawTarget = (solution['Target Sector'] || '').toString().trim();
      const targetSector = rawTarget.length > 0 ? rawTarget : 'Unnamed Sector';
      if (!map.has(targetSector)) {
        map.set(targetSector, { targetSector, entries: [] });
      }
      map.get(targetSector)!.entries.push(solution);
    });

    let sectorCounter = 0;
    const groups = Array.from(map.values()).map(({ targetSector, entries }) => {
      const departmentMap = new Map<string, Solution>();
      entries.forEach(entry => {
        const rawDept = (entry.Department || '').toString().trim();
        const departmentName = rawDept.length > 0 ? rawDept : 'Department';
        if (!departmentMap.has(departmentName)) {
          departmentMap.set(departmentName, entry);
        } else {
          const existing = departmentMap.get(departmentName)!;
          const existingName = (existing['System Name'] || '').toString();
          const incomingName = (entry['System Name'] || '').toString();
          if (incomingName.localeCompare(existingName, undefined, { sensitivity: 'base' }) < 0) {
            departmentMap.set(departmentName, entry);
          }
        }
      });

      const departments = Array.from(departmentMap.entries())
        .map(([name, solution]) => ({ name, solution }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      const sanitizedKey =
        targetSector.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `sector-${sectorCounter++}`;

      return {
        key: sanitizedKey,
        targetSector,
        departments,
      };
    });

    return groups.sort((a, b) =>
      a.targetSector.localeCompare(b.targetSector, undefined, { sensitivity: 'base' })
    );
  }, [filteredSolutions, isSectorsSheet]);

  const simpleSectorGroups = useMemo(() => {
    if (!isSimpleSectorSheet) return [];

    const normalizeCell = (value: unknown) => {
      if (!value) return null;
      const trimmed = value.toString().trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const map = new Map<string, { useCases: string[]; benefits: string[] }>();

    filteredSolutions.forEach(solution => {
      const dept = (solution.Department || 'Department').toString().trim() || 'Department';
      if (!map.has(dept)) {
        map.set(dept, { useCases: [], benefits: [] });
      }
      const entry = map.get(dept)!;

      const useCasesRaw = normalizeCell(solution['Use Cases']);
      if (useCasesRaw && !entry.useCases.includes(useCasesRaw)) {
        entry.useCases.push(useCasesRaw);
      }

      const benefitsRaw = normalizeCell(solution['Benefits']);
      if (benefitsRaw && !entry.benefits.includes(benefitsRaw)) {
        entry.benefits.push(benefitsRaw);
      }
    });

    return Array.from(map.entries())
      .map(([department, data]) => ({
        department,
        useCases: data.useCases,
        benefits: data.benefits,
      }))
      .sort((a, b) => a.department.localeCompare(b.department, undefined, { sensitivity: 'base' }));
  }, [filteredSolutions, isSimpleSectorSheet]);

const partnerGroups = useMemo<PartnerGroup[]>(() => {
  if (isSectorsSheet) return [];

  let groupIndex = 0;
  const map = new Map<string, { key: string; solutions: PartnerGroup['solutions'] }>();

  filteredSolutions.forEach(solution => {
    const rawPartner = (solution['Partner / Company'] || '').toString().trim();
    const partnerName = rawPartner.length > 0 ? rawPartner : 'Unnamed Partner';
    if (!map.has(partnerName)) {
      const sanitized = partnerName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'partner';
      const groupKey = `${sanitized}-${groupIndex}`;
      map.set(partnerName, { key: groupKey, solutions: [] });
      groupIndex += 1;
    }

    const group = map.get(partnerName)!;
    const rawLabel =
      (solution['System Name'] ||
        solution['Service Name'] ||
        solution['Solution Name'] ||
        solution['Product Name'] ||
        '').toString().trim();
    const label = rawLabel.length > 0 ? rawLabel : `Solution ${group.solutions.length + 1}`;
    group.solutions.push({
      key: `${group.key}-solution-${group.solutions.length}`,
      label,
      solution,
    });
  });

  return Array.from(map.entries())
    .map(([partnerName, value]) => ({
      key: value.key,
      partnerName,
      solutions: value.solutions,
    }))
    .sort((a, b) => a.partnerName.localeCompare(b.partnerName, undefined, { sensitivity: 'base' }));
  }, [filteredSolutions, isSectorsSheet]);

  useEffect(() => {
    if (!isSectorsSheet) {
      setSectorSelections({});
      setVisibleDepartmentMenu(null);
    }
  }, [isSectorsSheet]);

useEffect(() => {
  if (isSectorsSheet) {
    setPartnerSelections({});
    return;
  }

  setPartnerSelections(prev => {
    const next = { ...prev };
    let changed = false;
    const validGroupKeys = new Set<string>();

    partnerGroups.forEach(group => {
      validGroupKeys.add(group.key);
      const existingSelection = next[group.key];
      const hasExisting = group.solutions.some(entry => entry.key === existingSelection);
      if (!hasExisting) {
        const fallback = group.solutions[0]?.key;
        if (fallback) {
          next[group.key] = fallback;
          changed = true;
        }
      }
    });

    Object.keys(next).forEach(key => {
      if (!validGroupKeys.has(key)) {
        delete next[key];
        changed = true;
      }
    });

    return changed ? { ...next } : prev;
  });
}, [isSectorsSheet, partnerGroups]);

  useEffect(() => {
    if (!isSectorsSheet) return;

    setSectorSelections(prev => {
      const next = { ...prev };
      let changed = false;
      const validKeys = new Set<string>();

      sectorGroups.forEach(group => {
        validKeys.add(group.key);
        const defaultDepartment = group.departments[0]?.name;
        if (defaultDepartment && !next[group.key]) {
          next[group.key] = defaultDepartment;
          changed = true;
        }
      });

      Object.keys(next).forEach(key => {
        if (!validKeys.has(key)) {
          delete next[key];
          changed = true;
        }
      });

      return changed ? { ...next } : prev;
    });
  }, [isSectorsSheet, sectorGroups]);

  useEffect(() => {
    if (!showRowWizard) {
      setMobileAssistantOpen(false);
    }
  }, [showRowWizard]);

  const renderSolutionCard = (
    solution: Solution,
    cardKey: string,
    animationIndex: number,
    options?: {
      partnerName?: string;
      solutionSwitcher?: React.ReactNode;
    }
  ): JSX.Element => {
    const description = solution.Description || '';
    const challenges = parseBullets(solution['Client challenges'] || '');
    const keyFeatures = parseBullets(solution['Key Features'] || '');
    const useCases = parseBullets(solution['Use Cases'] || '');
    const deptColor = solution.Department ? getDepartmentBadgeColor(solution.Department) : null;
    const partnerLabel =
      (options?.partnerName || '').toString().trim() ||
      (solution['Partner / Company'] || '').toString().trim();
    const solutionName =
      (solution['System Name'] || '').toString().trim() ||
      (solution['Service Name'] || '').toString().trim() ||
      (solution['Solution Name'] || '').toString().trim() ||
      (solution['Product Name'] || '').toString().trim() ||
      partnerLabel ||
      'Unnamed Solution';
    const showPartnerBadge = Boolean(partnerLabel);

    const getSectionKey = (suffix: string) => `${cardKey}-${suffix}`;

    return (
      <motion.div
        key={cardKey}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: animationIndex * 0.03, type: 'spring', stiffness: 100 }}
        whileHover={{ y: -4, scale: 1.02 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full group relative touch-manipulation"
      >
        <div className="relative h-2 bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>

        <div className="p-6 flex-1 flex flex-col relative">
          {showPartnerBadge && (
            <div className="mb-3">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-[#8B4513]/10 text-[#8B4513]">
                {partnerLabel}
              </span>
            </div>
          )}

          <button
            onClick={() => {
              const textToCopy = `${solutionName}\n${description}`;
              navigator.clipboard.writeText(textToCopy);
              setCopiedText(solutionName);
              setTimeout(() => setCopiedText(null), 2000);
            }}
            className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Copy system info"
          >
            {copiedText === solutionName ? (
              <CheckCircle2 size={16} className="text-green-600" />
            ) : (
              <Copy size={16} className="text-gray-600" />
            )}
          </button>

          <div className="mb-4 pr-8">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#8B4513] to-[#FF8C00] bg-clip-text text-transparent mb-2 leading-tight group-hover:from-[#FF8C00] group-hover:to-[#FFA500] transition-all">
              {solutionName}
            </h3>

            {solution.Department && deptColor && (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${deptColor.bg} ${deptColor.text} border ${deptColor.border} shadow-sm`}
                >
                  <Building2 size={12} />
                  {solution.Department}
                </span>
                {solution.Category && (
                  <span className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded-md">
                    {solution.Category}
                  </span>
                )}
              </div>
            )}
          </div>

          {options?.solutionSwitcher}

          {description && (() => {
            const sectionKey = getSectionKey('description');
            const isExpanded = expandedSections[sectionKey] || false;

            return (
              <div className="mb-5">
                <button
                  onClick={() => {
                    setExpandedSections(prev => ({
                      ...prev,
                      [sectionKey]: !prev[sectionKey],
                    }));
                  }}
                  className="w-full p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-[#8B4513] to-[#FF8C00] rounded-lg group-hover:scale-110 transition-transform">
                        <Info size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">Description</span>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-gray-500 text-left mt-1">
                      Click to read the full description
                    </p>
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-2 bg-gradient-to-br from-gray-50/50 to-gray-100/50 rounded-b-xl">
                        <p className="text-sm text-gray-700 leading-relaxed" dir="auto" style={{ lineHeight: '1.7' }}>
                          {description}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}

          {challenges.length > 0 && (() => {
            const sectionKey = getSectionKey('challenges');
            const isExpanded = expandedSections[sectionKey] || false;

            return (
              <div className="mb-5">
                <button
                  onClick={() => {
                    setExpandedSections(prev => ({
                      ...prev,
                      [sectionKey]: !prev[sectionKey],
                    }));
                  }}
                  className="w-full p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100 hover:border-orange-200 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-[#FF8C00] to-[#FFA500] rounded-lg group-hover:scale-110 transition-transform">
                        <AlertCircle size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">Client Challenges</span>
                      <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full">
                        {challenges.length}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-gray-500 text-left mt-1">
                      Click to see all {challenges.length} challenges
                    </p>
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-2 bg-gradient-to-br from-orange-50/50 to-amber-50/50 rounded-b-xl">
                        <ul className="space-y-2.5" dir="auto">
                          {challenges.map((challenge, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="text-sm text-gray-700 flex items-start gap-3 group/item"
                              style={{ lineHeight: '1.6' }}
                            >
                              <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br from-[#FF8C00] to-[#FFA500] group-hover/item:scale-125 transition-transform"></div>
                              <span className="flex-1" dir="auto">{challenge}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}

          {keyFeatures.length > 0 && (() => {
            const sectionKey = getSectionKey('features');
            const isExpanded = expandedSections[sectionKey] || false;

            return (
              <div className="mb-5">
                <button
                  onClick={() => {
                    setExpandedSections(prev => ({
                      ...prev,
                      [sectionKey]: !prev[sectionKey],
                    }));
                  }}
                  className="w-full p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl border border-violet-100 hover:border-violet-200 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg group-hover:scale-110 transition-transform">
                        <Sparkles size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">Key Features</span>
                      <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full">
                        {keyFeatures.length}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-gray-500 text-left mt-1">
                      Click to explore key capabilities
                    </p>
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-2 bg-gradient-to-br from-violet-50/50 to-fuchsia-50/50 rounded-b-xl">
                        <ul className="space-y-2.5" dir="auto">
                          {keyFeatures.map((feature, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="text-sm text-gray-700 flex items-start gap-3 group/item"
                              style={{ lineHeight: '1.6' }}
                            >
                              <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 group-hover/item:scale-125 transition-transform"></div>
                              <span className="flex-1" dir="auto">{feature}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}

          {useCases.length > 0 && (() => {
            const sectionKey = getSectionKey('usecases');
            const isExpanded = expandedSections[sectionKey] || false;

            return (
              <div className="mt-auto pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setExpandedSections(prev => ({
                      ...prev,
                      [sectionKey]: !prev[sectionKey],
                    }));
                  }}
                  className="w-full p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg group-hover:scale-110 transition-transform">
                        <Rocket size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">Use Cases</span>
                      <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full">
                        {useCases.length}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-gray-500 text-left mt-1">
                      Click to see all {useCases.length} use cases
                    </p>
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-2 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 rounded-b-xl">
                        <ul className="space-y-2.5" dir="auto">
                          {useCases.map((useCase, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="text-sm text-gray-700 flex items-start gap-3 group/item"
                              style={{ lineHeight: '1.6' }}
                            >
                              <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 group-hover/item:scale-125 transition-transform"></div>
                              <span className="flex-1" dir="auto">{useCase}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}

          {(solution['Target Sector'] || solution['Deployment Type']) && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
              {solution['Target Sector'] && (
                <div className="flex items-center gap-1.5">
                  <Target size={12} />
                  <span>{solution['Target Sector']}</span>
                </div>
              )}
              {solution['Deployment Type'] && (
                <div className="flex items-center gap-1.5">
                  <Cloud size={12} />
                  <span>{solution['Deployment Type']}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderSimpleSectorCard = (
    entry: { department: string; useCases: string[]; benefits: string[] },
    idx: number
  ) => {
    const cardKey =
      entry.department.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
      `simple-sector-${idx}`;
    const useCaseSectionKey = `${cardKey}-usecases`;
    const benefitSectionKey = `${cardKey}-benefits`;
    const departmentColors = getDepartmentBadgeColor(entry.department);
    const copyKey = `simple-sector-copy-${cardKey}`;

    const copySummary = () => {
      const lines = [
        entry.department,
        entry.useCases.length
          ? `Use cases:\n${entry.useCases.join('\n')}`
          : '',
        entry.benefits.length
          ? `Benefits:\n${entry.benefits.join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');
      navigator.clipboard.writeText(lines.trim());
      setCopiedText(copyKey);
      setTimeout(() => setCopiedText(null), 2000);
    };

    return (
      <motion.div
        key={cardKey}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: idx * 0.03, type: 'spring', stiffness: 100 }}
        whileHover={{ y: -4, scale: 1.02 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full group relative"
      >
        <div className="relative h-2 bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-2 pr-8">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${departmentColors.bg} ${departmentColors.text} border ${departmentColors.border} shadow-sm`}
              >
                <Building2 size={12} />
                Department
              </span>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-[#8B4513] to-[#FF8C00] bg-clip-text text-transparent leading-tight">
                {entry.department}
              </h3>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Rocket size={12} className="text-blue-500" />
                  {entry.useCases.length} use case{entry.useCases.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles size={12} className="text-emerald-500" />
                  {entry.benefits.length} benefit{entry.benefits.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <button
              onClick={copySummary}
              className="p-2 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 transition-colors text-gray-600 shadow-sm"
              title="Copy summary"
            >
              {copiedText === copyKey ? (
                <CheckCircle2 size={16} className="text-green-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>

          {entry.useCases.length > 0 && (
            <div className="mb-5">
              <button
                onClick={() =>
                  setExpandedSections(prev => ({
                    ...prev,
                    [useCaseSectionKey]: !prev[useCaseSectionKey],
                  }))
                }
                className="w-full p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg group-hover:scale-110 transition-transform">
                      <Rocket size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      Use Cases
                    </span>
                    <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full">
                      {entry.useCases.length}
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-gray-500 transition-transform duration-300 ${expandedSections[useCaseSectionKey] ? 'rotate-90' : ''}`}
                  />
                </div>
                {!expandedSections[useCaseSectionKey] && (
                  <p className="text-xs text-gray-500 text-left mt-1">
                    Click to see use cases for {entry.department}
                  </p>
                )}
              </button>
              <AnimatePresence>
                {expandedSections[useCaseSectionKey] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                      <div className="p-4 pt-2 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 rounded-b-xl">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line" dir="auto">
                          {entry.useCases.join('\n\n')}
                        </p>
                      </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {entry.benefits.length > 0 && (
            <div className="mt-auto pt-4 border-t border-gray-200">
              <button
                onClick={() =>
                  setExpandedSections(prev => ({
                    ...prev,
                    [benefitSectionKey]: !prev[benefitSectionKey],
                  }))
                }
                className="w-full p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:border-emerald-200 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg group-hover:scale-110 transition-transform">
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      Benefits
                    </span>
                    <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full">
                      {entry.benefits.length}
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-gray-500 transition-transform duration-300 ${expandedSections[benefitSectionKey] ? 'rotate-90' : ''}`}
                  />
                </div>
                {!expandedSections[benefitSectionKey] && (
                  <p className="text-xs text-gray-500 text-left mt-1">
                    Click to review benefits delivered
                  </p>
                )}
              </button>
              <AnimatePresence>
                {expandedSections[benefitSectionKey] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                      <div className="p-4 pt-2 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-b-xl">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line" dir="auto">
                          {entry.benefits.join('\n\n')}
                        </p>
                      </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderPartnerCard = (group: PartnerGroup, idx: number): JSX.Element | null => {
    if (group.solutions.length === 0) return null;

    const selectedKey = partnerSelections[group.key];
    const activeEntry =
      group.solutions.find(entry => entry.key === selectedKey) ?? group.solutions[0];

    if (!activeEntry) return null;

    const hasMultipleSolutions = group.solutions.length > 1;

    const solutionSwitcher = hasMultipleSolutions ? (
      <div className="flex flex-wrap gap-2 mb-4">
        {group.solutions.map(entry => {
          const isActive = entry.key === activeEntry.key;
          return (
            <button
              key={entry.key}
              onClick={() =>
                setPartnerSelections(prev => ({
                  ...prev,
                  [group.key]: entry.key,
                }))
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
    ) : null;

    return renderSolutionCard(activeEntry.solution, `${group.key}-${activeEntry.key}`, idx, {
      partnerName: group.partnerName,
      solutionSwitcher,
    });
  };

  const renderSectorCard = (group: SectorGroup, idx: number) => {
    if (group.departments.length === 0) {
      return null;
    }

    const selectedDepartment =
      sectorSelections[group.key] || group.departments[0].name;
    const activeEntry =
      group.departments.find(dep => dep.name === selectedDepartment) ??
      group.departments[0];

    if (!activeEntry) {
      return null;
    }

    const {
      systemName,
      departmentName,
      targetSector,
      sections,
      subSector,
      subSectorLines,
      deploymentType,
    } = buildSectorDetails(activeEntry.solution);

    const sectionPrefix = `${group.key}-${departmentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-${idx}`;
    const departmentColors = getDepartmentBadgeColor(departmentName);
    const isMultiDepartment = group.departments.length > 1;
    const subSectorKey = `${sectionPrefix}-subsector`;

    return (
      <motion.div
        key={`${group.key}-${idx}`}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: idx * 0.03, type: 'spring', stiffness: 100 }}
        whileHover={{ y: -4, scale: 1.02 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full group relative"
      >
        <div className="relative h-2 bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isMultiDepartment && (
              <div className="relative">
                <button
                  onClick={() =>
                    setVisibleDepartmentMenu(prev =>
                      prev === group.key ? null : group.key
                    )
                  }
                  className="px-3 py-1.5 rounded-full bg-gradient-to-br from-[#8B4513]/10 to-[#FF8C00]/10 text-[#8B4513] hover:from-[#8B4513]/20 hover:to-[#FF8C00]/20 shadow-sm transition-all text-xs font-semibold flex items-center gap-1"
                  aria-label="Choose department"
                >
                  <Layers size={16} />
                  <span>{group.departments.length}</span>
                </button>
                {visibleDepartmentMenu === group.key && (
                  <div
                    className="absolute right-0 mt-3 w-56 rounded-2xl border border-orange-200 bg-white shadow-2xl p-3 text-sm z-30"
                    onMouseLeave={() => setVisibleDepartmentMenu(null)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                        Departments
                      </span>
                      <button
                        onClick={() => setVisibleDepartmentMenu(null)}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close department menu"
                      >
                        <X size={12} className="text-gray-500" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {group.departments.map(dep => {
                        const isActive = dep.name === departmentName;
                        return (
                          <button
                            key={`${group.key}-${dep.name}`}
                            type="button"
                            onClick={() => {
                              setSectorSelections(prev => ({
                                ...prev,
                                [group.key]: dep.name,
                              }));
                              setVisibleDepartmentMenu(null);
                              setExpandedSections({});
                              setCopiedText(null);
                            }}
                            className={`w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                              isActive
                                ? 'border-[#FF8C00] bg-orange-50 text-[#8B4513]'
                                : 'border-transparent hover:bg-gray-100'
                            }`}
                          >
                            <span>{dep.name}</span>
                            {isActive && (
                              <CheckCircle2 size={14} className="text-[#8B4513]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {subSector && (
              <div
                className="relative"
                onMouseEnter={() => setVisibleSubSector(subSectorKey)}
                onMouseLeave={() =>
                  setVisibleSubSector(prev => (prev === subSectorKey ? null : prev))
                }
              >
                <button
                  onClick={() =>
                    setVisibleSubSector(prev =>
                      prev === subSectorKey ? null : subSectorKey
                    )
                  }
                  className="p-2 rounded-full bg-gradient-to-br from-[#8B4513]/10 to-[#FF8C00]/10 text-[#8B4513] hover:from-[#8B4513]/20 hover:to-[#FF8C00]/20 shadow-sm transition-all"
                  aria-label="View sub sector"
                >
                  <HelpCircle size={16} />
                </button>
                {visibleSubSector === subSectorKey && (
                  <div className="absolute right-0 mt-3 w-72 z-20">
                    <div className="absolute -top-2 right-8 w-4 h-4 bg-white border-t border-l border-orange-200 rotate-45" />
                    <div className="relative rounded-2xl border border-orange-200 bg-white shadow-2xl px-5 py-4 text-xs text-gray-700">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-gradient-to-br from-[#8B4513] to-[#FF8C00] text-white">
                            <Layers size={12} />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            Sub Sector
                          </span>
                        </div>
                        <button
                          onClick={() => setVisibleSubSector(null)}
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                          aria-label="Close sub sector detail"
                        >
                          <X size={12} className="text-gray-500" />
                        </button>
                      </div>
                      {subSectorLines.length > 1 ? (
                        <ul className="space-y-1.5" dir="auto">
                          {subSectorLines.map((line: string, lineIdx: number) => (
                            <li key={lineIdx} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#8B4513] to-[#FF8C00]" />
                              <span className="flex-1 text-gray-700">{line}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p dir="auto" className="leading-relaxed text-gray-700">
                          {subSector}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => {
                const textToCopy = `${targetSector}${departmentName ? ` - ${departmentName}` : ''}\n${sections
                  .map(section => {
                    const lines = [section.title];
                    if (section.body) lines.push(section.body);
                    if (section.bullets) lines.push(section.bullets.join('\n'));
                    return lines.join('\n');
                  })
                  .join('\n\n')}`;
                navigator.clipboard.writeText(textToCopy.trim());
                setCopiedText(`${group.key}-${departmentName}`);
                setTimeout(() => setCopiedText(null), 2000);
              }}
              className="p-2 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 transition-colors text-gray-600 shadow-sm"
              title="Copy summary"
            >
              {copiedText === `${group.key}-${departmentName}` ? (
                <CheckCircle2 size={16} className="text-green-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>

          <div className="mb-4 pr-12">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#8B4513] to-[#FF8C00] bg-clip-text text-transparent leading-tight">
              {targetSector}
            </h3>
            <span
              className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${departmentColors.bg} ${departmentColors.text} border ${departmentColors.border} shadow-sm`}
            >
              <Building2 size={12} />
              {departmentName}
            </span>
            {isMultiDepartment && (
              <div className="mt-3 flex flex-wrap gap-2">
                {group.departments.map(dep => {
                  const isActive = dep.name === departmentName;
                  return (
                    <button
                      key={`${group.key}-chip-${dep.name}`}
                      type="button"
                      onClick={() => {
                        setSectorSelections(prev => ({
                          ...prev,
                          [group.key]: dep.name,
                        }));
                        setVisibleDepartmentMenu(null);
                        setExpandedSections({});
                        setCopiedText(null);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        isActive
                          ? 'border-[#8B4513] bg-[#8B4513]/10 text-[#8B4513]'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {dep.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            {sections.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No details provided.</div>
            ) : (
              sections.map((section, sectionIndex) => {
                const sectionKey = `${sectionPrefix}-${section.key}-${sectionIndex}`;
                const isExpanded = expandedSections[sectionKey] || false;
                const isLast = sectionIndex === sections.length - 1;

                return (
                  <div
                    key={sectionKey}
                    className={isLast ? 'mt-auto pt-4 border-t border-gray-200' : 'mb-5'}
                  >
                    <button
                      onClick={() => {
                        setExpandedSections(prev => ({
                          ...prev,
                          [sectionKey]: !prev[sectionKey],
                        }));
                      }}
                      className={`w-full p-4 bg-gradient-to-br ${section.buttonGradient} rounded-xl border ${section.buttonBorder} hover:border-gray-300 transition-all group cursor-pointer`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 bg-gradient-to-br ${section.iconGradient} rounded-lg group-hover:scale-110 transition-transform`}>
                            {section.icon}
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {section.title}
                          </span>
                        </div>
                        <ChevronRight
                          size={16}
                          className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                      {!isExpanded && section.hint && (
                        <p className="text-xs text-gray-500 text-left mt-1">{section.hint}</p>
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className={`p-4 pt-2 bg-gradient-to-br ${section.contentGradient} rounded-b-xl`}>
                            {section.body && (
                              <p className="text-sm text-gray-700 leading-relaxed mb-2" dir="auto">
                                {section.body}
                              </p>
                            )}
                            {section.bullets && (
                              <ul className="space-y-2.5" dir="auto">
                                {section.bullets.map((item, i) => (
                                  <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="text-sm text-gray-700 flex items-start gap-3 group/item"
                                    style={{ lineHeight: '1.6' }}
                                  >
                                    <div className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br ${section.bulletGradient} group-hover/item:scale-125 transition-transform`} />
                                    <span className="flex-1" dir="auto">{item}</span>
                                  </motion.li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[#8B4513]" />
              <span className="font-semibold text-gray-800">{systemName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud size={16} className="text-[#FF8C00]" />
              <span>{deploymentType}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };
  // Helper function to parse bullet points - handles multiple formats
  const parseBullets = (text: string) => {
    if (!text) return [];
    
    // First, try splitting by newlines
    let items = text.split(/\n+/);
    
    // If no newlines, try other separators
    if (items.length === 1) {
      // Try splitting by bullets, dashes, or semicolons
      items = text.split(/[•\-\*;]/);
    }
    
    // Clean and filter
    return items
      .map(item => item.trim())
      .filter(item => item.length > 2) // Filter out very short items
      .slice(0, 10); // Limit to 10 bullets max
  };

  const getDepartmentBadgeColor = (dept: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'AI': { bg: 'from-purple-50 to-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
      'Data': { bg: 'from-blue-50 to-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
      'Cybersecurity': { bg: 'from-red-50 to-red-100', text: 'text-red-700', border: 'border-red-200' },
      'Cyber Security': { bg: 'from-red-50 to-red-100', text: 'text-red-700', border: 'border-red-200' },
      'Cloud': { bg: 'from-cyan-50 to-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
      'Archive': { bg: 'from-amber-50 to-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
      'Internal Communication': { bg: 'from-orange-50 to-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    };
    return colors[dept] || { bg: 'from-[#8B4513]/10 to-[#FF8C00]/10', text: 'text-[#8B4513]', border: 'border-[#8B4513]/20' };
  };

  const buildSectorDetails = (solution: Solution) => {
    const systemName = solution['System Name'] || 'Unnamed System';
    const departmentName = solution.Department || 'Department';
    const targetSector = solution['Target Sector'] || 'Unnamed Sector';
    const descriptionText =
      solution['Description/Client challenges'] || solution.Description || '';
    const challenges = parseBullets(solution['Client challenges'] || '');
    const useCases = parseBullets(solution['Use Cases'] || '');
    const benefits = parseBullets(solution['Benefits'] || '');
    const deploymentType = solution['Deployment Type'] || 'Not specified';
    const subSector = solution['Sub sector'] || solution['Sub Sector'] || '';
    const subSectorLines = subSector
      ? subSector
          .split(/\n+/)
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
      : [];

    const sections: SectionConfig[] = [];

    if (descriptionText || challenges.length > 0) {
      sections.push({
        key: 'description',
        title: 'Description / Client Challenges',
        icon: <Info size={14} className="text-white" />,
        iconGradient: 'from-[#8B4513] to-[#FF8C00]',
        buttonGradient: 'from-gray-50 to-gray-100',
        buttonBorder: 'border-gray-200',
        contentGradient: 'from-gray-50/50 to-gray-100/50',
        hint: descriptionText
          ? 'Click to read the full description'
          : challenges.length > 0
            ? `Click to see all ${challenges.length} items`
            : '',
        body: descriptionText,
        bullets: challenges.length > 0 ? challenges : undefined,
        bulletGradient: 'from-[#FF8C00] to-[#FFA500]',
      });
    }

    if (useCases.length > 0) {
      sections.push({
        key: 'usecases',
        title: 'Use Cases',
        icon: <Rocket size={14} className="text-white" />,
        iconGradient: 'from-blue-500 to-cyan-500',
        buttonGradient: 'from-blue-50 to-cyan-50',
        buttonBorder: 'border-blue-100',
        contentGradient: 'from-blue-50/50 to-cyan-50/50',
        hint: `Click to see all ${useCases.length} use cases`,
        bullets: useCases,
        bulletGradient: 'from-blue-500 to-cyan-500',
      });
    }

    if (benefits.length > 0) {
      sections.push({
        key: 'benefits',
        title: 'Benefits',
        icon: <Sparkles size={14} className="text-white" />,
        iconGradient: 'from-emerald-500 to-teal-500',
        buttonGradient: 'from-emerald-50 to-teal-50',
        buttonBorder: 'border-emerald-100',
        contentGradient: 'from-emerald-50/50 to-teal-50/50',
        hint: `Click to see all ${benefits.length} benefits`,
        bullets: benefits,
        bulletGradient: 'from-emerald-500 to-teal-500',
      });
    }

    return {
      systemName,
      departmentName,
      targetSector,
      descriptionText,
      challenges,
      useCases,
      benefits,
      deploymentType,
      subSector,
      subSectorLines,
      sections,
    };
  };

const LOCAL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEnvelope<T> = {
  data: T;
  updatedAt: number;
  expiresAt: number;
};

type SheetMetaCache = {
  sheets: { id: number; title: string }[];
  title?: string;
};

type SheetDataCache = {
  headers: string[];
  data: Record<string, any>[];
  rawRows: any[][];
};

const buildMetaCacheKey = (spreadsheetId: string) => `partners_meta_${spreadsheetId}`;
const buildSheetCacheKey = (spreadsheetId: string, sheetName: string) => `partners_sheet_${spreadsheetId}_${sheetName}`;

const readCache = <T,>(key: string): CacheEnvelope<T> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed !== 'object') {
      window.localStorage.removeItem(key);
      return null;
    }
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[OurPartners] Failed to read cache', error);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
    return null;
  }
};

const writeCache = <T,>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = {
      data,
      updatedAt: Date.now(),
      expiresAt: Date.now() + LOCAL_CACHE_TTL_MS,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    console.warn('[OurPartners] Failed to write cache', error);
  }
};

const removeCacheKey = (key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
  };

  // Entry screen
  if (loading && !sheetData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-[#8B4513] border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 font-medium">Loading data from Google Sheets...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no data

  // Show empty state if no data
  if (!loading && sheetData && solutions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        <div className="container-wide mx-auto px-4 py-8">
          <div className="bg-white rounded-xl p-12 shadow-lg border border-gray-200 text-center">
            <Package className="text-gray-400 mx-auto mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Found</h2>
            <p className="text-gray-600 mb-6">The sheet "{sheetName}" appears to be empty or has no data rows.</p>
            <button
              onClick={() => {
                setShowEntry(true);
                setSheetData(null);
                setSolutions([]);
              }}
              className="px-6 py-3 bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white rounded-lg hover:shadow-lg transition-all"
            >
              Try Different Sheet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="container-wide mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 hover:border-[#8B4513] transition-all shadow-sm text-gray-700 hover:text-[#8B4513] font-medium"
              title="Return to Login"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Return to Login</span>
              <LogIn size={18} className="sm:hidden" />
            </button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent mb-2">
                Our Partners & Solutions
              </h1>
              <p className="text-gray-600">Comprehensive analytics and management dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {availableSheets.length > 0 && (
              <select
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B4513] bg-white"
              >
                {availableSheets
                  .filter(sheet => 
                    !sheet.title.toLowerCase().includes('match level') && 
                    !sheet.title.toLowerCase().includes('matchlevel')
                  )
                  .map(sheet => (
                  <option key={sheet.id} value={sheet.title}>{sheet.title}</option>
                ))}
              </select>
            )}
              <button
              onClick={() => loadSheetData({ bypassCache: true })}
                className="px-4 py-2 bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} />
                Refresh
            </button>
            <button
              onClick={() => {
                const newId = prompt('Enter Google Sheets Spreadsheet ID:', spreadsheetId);
                if (newId && newId !== spreadsheetId) {
                  setSpreadsheetId(newId);
                  localStorage.setItem('partners_spreadsheet_id', newId);
                  setSheetName('');
                  setSheetData(null);
                  setSolutions([]);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 text-sm"
            >
              Change Spreadsheet
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('partners_spreadsheet_id');
                setSpreadsheetId('1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0');
                setSheetName('');
                setSheetData(null);
                setSolutions([]);
                alert('Cache cleared! Please refresh the page.');
              }}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all flex items-center gap-2 text-sm"
              title="Clear cached spreadsheet ID"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {['dashboard', 'table', 'cards'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-6 py-3 font-medium capitalize transition-all ${
                viewMode === mode
                  ? 'text-[#8B4513] border-b-2 border-[#8B4513]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode === 'dashboard' && <BarChart3 className="inline mr-2" size={18} />}
              {mode === 'table' && <Package className="inline mr-2" size={18} />}
              {mode === 'cards' && <Server className="inline mr-2" size={18} />}
              {mode}
            </button>
          ))}
        </div>

        {/* Dashboard View - Advanced Analytics */}
        {viewMode === 'dashboard' && (
          <div className="space-y-6">
            {/* Interactive Filters */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-4 shadow-lg border border-gray-200"
            >
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Filter size={16} />
                  Filters:
                </span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B4513]"
                >
                  <option value="all">{departmentPlaceholder}</option>
                  {departmentFilterOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {selectedDepartment !== 'all' && (
                  <button
                    onClick={() => {
                      setSelectedDepartment('all');
                    }}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </motion.div>

            {/* Top KPI Summary Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#8B4513]/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium mb-1">Total Solutions</p>
                    <p className="text-4xl font-bold text-[#8B4513] mb-1">{totalSolutions}</p>
                    <p className="text-xs text-gray-500">Active solutions portfolio</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-[#8B4513]/10 to-[#FF8C00]/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Package className="text-[#8B4513]" size={32} />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FF8C00]/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium mb-1">Strategic Partners</p>
                    <p className="text-4xl font-bold text-[#FF8C00] mb-1">{totalPartners}</p>
                    <p className="text-xs text-gray-500">Partner ecosystem</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-[#FF8C00]/10 to-[#FFA500]/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Users className="text-[#FF8C00]" size={32} />
                  </div>
                </div>
              </motion.div>


              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium mb-1">Avg Match Level</p>
                    <p className="text-4xl font-bold text-purple-600 mb-1">{avgMatchLevel}</p>
                    <p className="text-xs text-gray-500">Out of 5.0 scale</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Star className="text-purple-600" size={32} />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium mb-1">Cloud %</p>
                    <p className="text-4xl font-bold text-cyan-600 mb-1">
                      {totalSolutions > 0 ? Math.round((cloudSolutions / totalSolutions) * 100) : 0}%
                    </p>
                    <p className="text-xs text-gray-500">vs On-Prem</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Cloud className="text-cyan-600" size={32} />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Deployment Type Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium mb-1">Cloud Solutions</p>
                    <p className="text-3xl font-bold text-blue-900">{cloudSolutions}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {totalSolutions > 0 ? Math.round((cloudSolutions / totalSolutions) * 100) : 0}% of portfolio
                    </p>
                  </div>
                  <Cloud className="text-blue-600" size={32} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium mb-1">On-Premise</p>
                    <p className="text-3xl font-bold text-purple-900">{onPremSolutions}</p>
                    <p className="text-xs text-purple-600 mt-1">
                      {totalSolutions > 0 ? Math.round((onPremSolutions / totalSolutions) * 100) : 0}% of portfolio
                    </p>
                  </div>
                  <Database className="text-purple-600" size={32} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium mb-1">Hybrid Solutions</p>
                    <p className="text-3xl font-bold text-green-900">{hybridSolutions}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {totalSolutions > 0 ? Math.round((hybridSolutions / totalSolutions) * 100) : 0}% of portfolio
                    </p>
                  </div>
                  <Zap className="text-green-600" size={32} />
                </div>
              </motion.div>
            </div>

            {/* Advanced Analytics Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Enhanced Systems per Department with Attention Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-[#8B4513]/10 to-[#FF8C00]/10 rounded-lg">
                      <BarChart3 className="text-[#8B4513]" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Systems per Department</h3>
                      <p className="text-xs text-gray-500">Department activity & market attention needed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-gray-600">Needs Attention</span>
                  </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-600">Low Activity</span>
                </div>
                  </div>
                </div>
                <div className="h-80">
                  <Bar 
                    data={{
                      labels: departmentAnalysis.map(d => d.department),
                      datasets: [{
                        label: 'Number of Systems',
                        data: departmentAnalysis.map(d => d.count),
                        backgroundColor: departmentAnalysis.map(d => {
                          if (d.isLow) return 'rgba(239, 68, 68, 0.8)'; // Red for very low
                          if (d.needsAttention) return 'rgba(245, 158, 11, 0.8)'; // Yellow/Orange for needs attention
                          return getDeptColor(d.department) + 'CC'; // Normal color
                        }),
                        borderColor: departmentAnalysis.map(d => {
                          if (d.isLow) return '#ef4444';
                          if (d.needsAttention) return '#f59e0b';
                          return getDeptColor(d.department);
                        }),
                        borderWidth: 2,
                      }],
                    }} 
                    options={{ 
                      maintainAspectRatio: false, 
                      responsive: true,
                      scales: {
                        y: { 
                          beginAtZero: true,
                          ticks: { font: { size: 11 }, stepSize: 1 },
                          grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                          ticks: { font: { size: 11, weight: 'bold' } },
                          grid: { display: false }
                        }
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              const dept = departmentAnalysis[context.dataIndex];
                              const percentage = ((dept.count / totalSolutions) * 100).toFixed(1);
                              let status = '';
                              if (dept.isLow) status = ' ⚠️ Very Low - Needs Immediate Attention';
                              else if (dept.needsAttention) status = ' ⚠️ Low - Needs Market Focus';
                              return `${dept.count} systems (${percentage}%)${status}`;
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
                {/* Departments Needing Attention List */}
                {departmentsNeedingAttention.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="text-red-600" size={18} />
                      <h4 className="font-semibold text-gray-900 text-sm">Departments Needing Market Attention:</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {departmentsNeedingAttention.map((dept, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            dept.isLow
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                          }`}
                        >
                          {dept.department} ({dept.count} system{dept.count !== 1 ? 's' : ''})
                          {dept.isLow && ' 🔴 Critical'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* 2. Partner vs Match Level (Strength of Collaboration) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-[#8B4513]/10 to-[#FF8C00]/10 rounded-lg">
                      <Users className="text-[#8B4513]" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Partner Match Level</h3>
                      <p className="text-xs text-gray-500">Collaboration strength</p>
                    </div>
                  </div>
                  </div>
                <div className="h-80">
                  <Bar 
                    data={partnerMLChartData} 
                    options={{ 
                      maintainAspectRatio: false, 
                      responsive: true,
                      indexAxis: 'y',
                      scales: {
                        x: { 
                          beginAtZero: true,
                          max: 4,
                          ticks: { font: { size: 11 }, stepSize: 1 },
                          grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        y: {
                          ticks: { font: { size: 10, weight: 'bold' } },
                          grid: { display: false }
                        }
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              return `Avg Match Level: ${context.parsed.x.toFixed(2)}/4.0`;
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </motion.div>

              {/* 3. Line Chart: Match Level Trend by Department */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-lg">
                      <TrendingUp className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Match Level by Department</h3>
                      <p className="text-xs text-gray-500">Maturity analysis</p>
                    </div>
                  </div>
                  </div>
                <div className="h-80">
                  <Line 
                    data={matchLevelLineData} 
                    options={{ 
                      maintainAspectRatio: false, 
                      responsive: true,
                      scales: {
                        y: { 
                          beginAtZero: true,
                          max: 4,
                          ticks: { font: { size: 11 }, stepSize: 1 },
                          grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                          ticks: { font: { size: 11, weight: 'bold' } },
                          grid: { display: false }
                        }
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              return `Avg: ${context.parsed.y.toFixed(2)}/4.0`;
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </motion.div>

            </div>

            {/* Category Analysis Section */}
            {Object.keys(categoryCounts).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg">
                      <Package className="text-indigo-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Category Analysis</h3>
                      <p className="text-sm text-gray-500">Solution distribution by category</p>
                    </div>
                  </div>
                  </div>

                {/* Top Categories - Horizontal Bar Chart */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Top Categories by Count</h4>
                  <div className="h-80">
                    {(() => {
                      // Get top categories, group small ones into "Others"
                      const sortedCategories = Object.entries(categoryCounts)
                        .sort((a, b) => b[1] - a[1]);
                      
                      const topCategories = sortedCategories.slice(0, 10);
                      const othersCount = sortedCategories.slice(10).reduce((sum, [, count]) => sum + count, 0);
                      
                      const chartData = {
                        labels: [...topCategories.map(([cat]) => cat), ...(othersCount > 0 ? ['Others'] : [])],
                        datasets: [{
                          label: 'Number of Solutions',
                          data: [...topCategories.map(([, count]) => count), ...(othersCount > 0 ? [othersCount] : [])],
                          backgroundColor: [
                            'rgba(99, 102, 241, 0.8)',  // indigo
                            'rgba(139, 69, 19, 0.8)',   // brand1
                            'rgba(255, 140, 0, 0.8)',   // brand2
                            'rgba(16, 185, 129, 0.8)',  // green
                            'rgba(239, 68, 68, 0.8)',   // red
                            'rgba(168, 85, 247, 0.8)',  // purple
                            'rgba(245, 158, 11, 0.8)',  // amber
                            'rgba(236, 72, 153, 0.8)',  // pink
                            'rgba(14, 165, 233, 0.8)',  // sky
                            'rgba(34, 197, 94, 0.8)',   // emerald
                            'rgba(107, 114, 128, 0.8)', // gray for Others
                          ],
                          borderColor: [
                            'rgba(99, 102, 241, 1)',
                            'rgba(139, 69, 19, 1)',
                            'rgba(255, 140, 0, 1)',
                            'rgba(16, 185, 129, 1)',
                            'rgba(239, 68, 68, 1)',
                            'rgba(168, 85, 247, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(236, 72, 153, 1)',
                            'rgba(14, 165, 233, 1)',
                            'rgba(34, 197, 94, 1)',
                            'rgba(107, 114, 128, 1)',
                          ],
                          borderWidth: 2,
                        }],
                      };

                      return (
                        <Bar
                          data={chartData}
                          options={{
                            indexAxis: 'y',
                            maintainAspectRatio: false,
                            responsive: true,
                            scales: {
                              x: {
                                beginAtZero: true,
                                ticks: { font: { size: 11 }, stepSize: 1 },
                                grid: { color: 'rgba(0,0,0,0.05)' }
                              },
                              y: {
                                ticks: { font: { size: 11, weight: 'bold' } },
                                grid: { display: false }
                              }
                            },
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: (context: any) => {
                                    const percentage = ((context.parsed.x / totalSolutions) * 100).toFixed(1);
                                    return `${context.parsed.x} solutions (${percentage}%)`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      );
                    })()}
                </div>
                </div>

                {/* Category by Department - Cross Analysis */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Category Distribution by Department</h4>
                  {(() => {
                    // Calculate category by department matrix
                    const categoryByDept = solutions.reduce((acc, s) => {
                      const dept = s.Department || 'Unknown';
                      const categories = (s.Category || '').split(/[,;|&/]/).map(c => c.trim()).filter(Boolean);
                      categories.forEach(cat => {
                        if (!acc[cat]) acc[cat] = {};
                        acc[cat][dept] = (acc[cat][dept] || 0) + 1;
                      });
                      return acc;
                    }, {} as Record<string, Record<string, number>>);

                    const topCategories = Object.entries(categoryCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([cat]) => cat);

                    const allDepts = Object.keys(departmentCounts);

                    const stackedData = {
                      labels: allDepts,
                      datasets: topCategories.map((cat, idx) => ({
                        label: cat,
                        data: allDepts.map(dept => categoryByDept[cat]?.[dept] || 0),
                        backgroundColor: [
                          'rgba(99, 102, 241, 0.7)',
                          'rgba(139, 69, 19, 0.7)',
                          'rgba(255, 140, 0, 0.7)',
                          'rgba(16, 185, 129, 0.7)',
                          'rgba(239, 68, 68, 0.7)',
                        ][idx],
                        borderColor: [
                          'rgba(99, 102, 241, 1)',
                          'rgba(139, 69, 19, 1)',
                          'rgba(255, 140, 0, 1)',
                          'rgba(16, 185, 129, 1)',
                          'rgba(239, 68, 68, 1)',
                        ][idx],
                        borderWidth: 1,
                      })),
                    };

                    return (
                      <div className="h-80">
                        <Bar
                          data={stackedData}
                    options={{ 
                      maintainAspectRatio: false, 
                      responsive: true,
                            scales: {
                              x: {
                                stacked: true,
                                ticks: { font: { size: 10, weight: 'bold' } },
                                grid: { display: false }
                              },
                              y: {
                                stacked: true,
                                beginAtZero: true,
                                ticks: { font: { size: 11 }, stepSize: 1 },
                                grid: { color: 'rgba(0,0,0,0.05)' }
                              }
                            },
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                                  padding: 10,
                                  font: { size: 10, weight: 'bold' },
                                  boxWidth: 12,
                                  boxHeight: 12
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                                    return `${context.dataset.label}: ${context.parsed.y} solutions`;
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
                    );
                  })()}
            </div>

                {/* Category Summary Cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Total Categories</p>
                        <p className="text-2xl font-bold text-indigo-700 mt-1">
                          {Object.keys(categoryCounts).length}
                        </p>
                      </div>
                      <Package className="text-indigo-500" size={32} />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Most Popular</p>
                        <p className="text-sm font-bold text-amber-700 mt-1 truncate">
                          {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} solutions
                        </p>
                      </div>
                      <Star className="text-amber-500" size={32} />
                    </div>
                    </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Avg per Category</p>
                        <p className="text-2xl font-bold text-green-700 mt-1">
                          {Object.keys(categoryCounts).length > 0 
                            ? Math.round(totalSolutions / Object.keys(categoryCounts).length)
                            : 0}
                        </p>
                        <p className="text-xs text-gray-500">solutions</p>
                  </div>
                      <TrendingUp className="text-green-500" size={32} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Auto-Generated Insights Section */}
                      <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 shadow-lg border-2 border-blue-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <Lightbulb className="text-white" size={24} />
                        </div>
                      <div>
                  <h3 className="text-xl font-bold text-gray-900">Key Insights</h3>
                  <p className="text-sm text-gray-600">Auto-generated analytics summary</p>
                      </div>
                    </div>
              <div className="space-y-3" dir="auto">
                {topDeptByML.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold text-blue-700">Top Performing Departments:</span>{' '}
                      {topDeptByML.map((d, i) => (
                        <span key={i}>
                          <span className="font-semibold">{d.department}</span> (Match Level: {d.avgMatchLevel}/4.0)
                          {i < topDeptByML.length - 1 ? ', ' : ''}
                            </span>
                      ))} show the strongest activity and maturity.
                    </p>
                        </div>
                )}
                {lowMLHighCount.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-orange-100">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold text-orange-700">Growth Opportunities:</span>{' '}
                      {lowMLHighCount.map((d, i) => (
                        <span key={i}>
                          <span className="font-semibold">{d.department}</span>
                          {i < lowMLHighCount.length - 1 ? ' and ' : ''}
                        </span>
                      ))} have {lowMLHighCount.map(d => d.totalSystems).join(' and ')} systems respectively but lower Match Levels — potential areas for partnership expansion and maturity improvement.
                    </p>
                        </div>
                )}
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold text-purple-700">Overall Portfolio Health:</span>{' '}
                    Average Match Level of <span className="font-semibold">{avgMatchLevel}/4.0</span> across {matchLevelValues.length} systems with Match Level data. 
                    {parseFloat(avgMatchLevel) >= 3.0 ? ' Strong portfolio maturity.' : parseFloat(avgMatchLevel) >= 2.0 ? ' Moderate maturity with room for improvement.' : ' Opportunity to strengthen partnerships and alignment.'}
                      </p>
                    </div>
                {neededDepartments.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500 rounded-lg flex-shrink-0">
                        <Rocket className="text-white" size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-amber-900 mb-2">Recommended Departments to Consider:</p>
                        <p className="text-xs text-amber-800 mb-3">
                          The following departments are commonly found in tech companies but don't currently have systems in your portfolio. Consider exploring solutions for these areas:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {neededDepartments.map((dept, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors shadow-sm"
                            >
                              {dept}
                            </span>
                    ))}
                  </div>
                        <p className="text-xs text-amber-700 mt-3 italic">
                          💡 Tip: These departments can help expand your solution portfolio and address new market opportunities.
                        </p>
                      </div>
                    </div>
                    </div>
                  )}
                </div>
              </motion.div>


            {/* Enhanced Top Partners Analysis */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Award className="text-[#8B4513]" size={24} />
                  <h3 className="text-xl font-bold text-gray-900">Top Strategic Partners</h3>
                </div>
                <span className="text-sm text-gray-500">Ranked by solution count & coverage</span>
              </div>
              <div className="space-y-4">
                {topPartnersDetailed.map((partner, idx) => (
                  <motion.div
                    key={partner.partner}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-[#FF8C00] hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                          idx === 0 ? 'from-yellow-400 to-yellow-600' :
                          idx === 1 ? 'from-gray-300 to-gray-500' :
                          idx === 2 ? 'from-orange-300 to-orange-500' :
                          'from-[#8B4513] to-[#FF8C00]'
                        } flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg mb-1">{partner.partner}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Package size={14} />
                              {partner.count} solutions
                            </span>
                            <span className="flex items-center gap-1">
                              <Building2 size={14} />
                              {partner.departments} depts
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#8B4513]">{partner.count}</div>
                        <div className="text-xs text-gray-500">solutions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">Coverage Score</span>
                          <span className="font-semibold text-[#FF8C00]">{partner.coverage}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((partner.coverage / 20) * 100, 100)}%` }}
                            transition={{ delay: idx * 0.1 + 0.3, duration: 0.8 }}
                            className="h-2 bg-gradient-to-r from-[#8B4513] to-[#FF8C00] rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>


          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="relative">
            <AnimatePresence>
              {!tableUnlocked && (
                <motion.div
                  key="table-lock"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex items-center justify-center px-4"
                >
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-2xl" />
                  <motion.form
                    onSubmit={handlePasscodeSubmit}
                    initial={{ opacity: 0, scale: 0.9, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                    transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                    className="relative z-10 w-full max-w-sm bg-white/95 border border-orange-100 rounded-3xl shadow-2xl px-8 py-10 flex flex-col gap-6 text-center"
                  >
                    <div className="flex justify-center">
                      <div className="p-4 rounded-full bg-gradient-to-br from-[#8B4513] via-[#FF8C00] to-[#FFA500] text-white shadow-lg">
                        <Lock size={26} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Protected Table</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Enter the 4-digit code to unlock editing for this sheet.
                      </p>
                    </div>
                    <div className="text-left space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
                        <KeyRound size={14} className="text-[#8B4513]" />
                        Passcode
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        autoFocus
                        value={passcodeInput}
                        onChange={(e) => {
                          setPasscodeInput(e.target.value);
                          if (passcodeError) setPasscodeError(null);
                        }}
                        className="w-full px-4 py-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-[#8B4513] tracking-[0.6em] text-center text-lg font-semibold"
                        placeholder="••••"
                        aria-label="Enter passcode"
                      />
                      {passcodeError && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {passcodeError}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Unlock size={18} />
                      Unlock table
                    </button>
                    <p className="text-xs text-gray-500">
                      Need help? Contact the Tahcom data team for the latest access code.
                    </p>
                  </motion.form>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className={`space-y-4 transition-all duration-300 ${tableUnlocked ? '' : 'pointer-events-none select-none opacity-30 blur-[1px]'}`}
              aria-hidden={!tableUnlocked}
            >
            {/* Search and Filters */}
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search solutions, partners, use cases..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B4513]"
                  />
                </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Filter size={18} />
                  Filters
                </button>
                    {tableUnlocked && (
                <button
                        onClick={handleLockTable}
                        className="px-4 py-2 border border-orange-200 rounded-lg text-[#8B4513] bg-orange-50/60 hover:bg-orange-100 flex items-center gap-2 transition-colors"
                      >
                        <Lock size={18} />
                        Lock Table
                      </button>
                    )}
                    <button
                      onClick={openRowWizard}
                      className="px-4 py-2 bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white rounded-lg hover:shadow-lg flex items-center gap-2"
                >
                  <Plus size={18} />
                      Guided add
                </button>
                  </div>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{departmentFilterLabel}</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B4513]"
                    >
                        <option value="all">{departmentPlaceholder}</option>
                        {departmentFilterOptions.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B4513]"
                    >
                      <option value="all">All Categories</option>
                      {getUniqueValues('Category').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white">
                  <tr>
                    {sheetData?.headers.map((header, idx) => (
                      <th key={idx} className="px-4 py-3 text-left text-sm font-semibold">
                        {header}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSolutions.map((solution, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-gray-200 hover:bg-gray-50">
                      {sheetData?.headers.map((header, colIdx) => {
                        const isEditing = editingCell?.row === rowIdx && editingCell?.col === header;
                        const value = solution[header] || '';

                        return (
                          <td key={colIdx} className="px-4 py-2">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={async () => {
                                  const cellRef = `${String.fromCharCode(65 + colIdx)}${rowIdx + 2}`;
                                  await updateCell(cellRef, editingValue);
                                  setEditingCell(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  } else if (e.key === 'Escape') {
                                    setEditingCell(null);
                                  }
                                }}
                                className="w-full px-2 py-1 border border-[#8B4513] rounded focus:ring-2 focus:ring-[#8B4513]"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingCell({ row: rowIdx, col: header });
                                  setEditingValue(value);
                                }}
                                className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[32px] flex items-center"
                              >
                                {value || <span className="text-gray-400 italic">Click to edit</span>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2">
                        <button
                          onClick={() => deleteRow(rowIdx + 2)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* Cards View - Clean Dashboard */}
        {viewMode === 'cards' && (
          <div className="space-y-6">
            {/* Enhanced Search and Filters */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#8B4513] transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="🔍 Search by system name, description, challenges, or use cases..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-[#8B4513] text-base transition-all bg-gray-50 focus:bg-white"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X size={16} className="text-gray-500" />
                    </button>
                  )}
                </div>
                <div className="sm:w-64 relative">
                  {(isSectorsSheet ? <Target className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={18} /> : <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={18} />)}
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-[#8B4513] bg-gray-50 focus:bg-white text-base transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">{isSectorsSheet ? '🎯 All Target Sectors' : '🏢 All Departments'}</option>
                    {departmentFilterOptions.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>
              {filteredSolutions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200"
                >
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-bold text-[#8B4513] text-base">{filteredSolutions.length}</span> system{filteredSolutions.length !== 1 ? 's' : ''} 
                    {searchTerm && (
                      <span className="ml-2 text-xs text-gray-500">
                        matching "<span className="font-medium">{searchTerm}</span>"
                      </span>
                    )}
                  </p>
                  {(searchTerm || selectedDepartment !== 'all') && (
                <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedDepartment('all');
                      }}
                      className="text-xs font-medium text-[#8B4513] hover:text-[#FF8C00] flex items-center gap-1 transition-colors"
                    >
                      <X size={14} />
                      Clear filters
                </button>
                  )}
                </motion.div>
              )}
            </motion.div>

            {statusMessage && (
              <div className="mt-4 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 shadow-sm text-sm flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}
            {lastError && (
              <div className="mt-4 px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 shadow-sm text-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{lastError}</span>
                </div>
                <button
                  onClick={handleManualRetry}
                  className="px-3 py-1.5 bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white rounded-lg text-xs font-semibold hover:shadow-md transition-all"
                >
                  Retry now
                </button>
              </div>
            )}
            {lastUpdatedAt && (
              <div className="mt-2 text-xs text-gray-500">
                Last updated {new Date(lastUpdatedAt).toLocaleString()}
              </div>
            )}

            {/* Quick Stats Bar */}
            {filteredSolutions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                <div className="bg-gradient-to-br from-[#8B4513]/10 to-[#8B4513]/5 rounded-xl p-4 border border-[#8B4513]/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Package size={16} className="text-[#8B4513]" />
                    <span className="text-xs font-medium text-gray-600">Total Systems</span>
              </div>
                  <p className="text-2xl font-bold text-[#8B4513]">{filteredSolutions.length}</p>
            </div>
                <div className="bg-gradient-to-br from-[#FF8C00]/10 to-[#FF8C00]/5 rounded-xl p-4 border border-[#FF8C00]/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={16} className="text-[#FF8C00]" />
                    <span className="text-xs font-medium text-gray-600">Departments</span>
                  </div>
                  <p className="text-2xl font-bold text-[#FF8C00]">
                    {new Set(filteredSolutions.map(s => s.Department).filter(Boolean)).size}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Rocket size={16} className="text-blue-600" />
                    <span className="text-xs font-medium text-gray-600">Use Cases</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredSolutions.reduce((sum, s) => sum + parseBullets(s['Use Cases'] || '').length, 0)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-xl p-4 border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={16} className="text-orange-600" />
                    <span className="text-xs font-medium text-gray-600">Challenges</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {filteredSolutions.reduce((sum, s) => sum + parseBullets(s['Client challenges'] || '').length, 0)}
                  </p>
                </div>
              </motion.div>
            )}

            {/* External CTA */}
            <div className="flex justify-end">
              <a
                href="https://tahcom.com/ar/web/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500] text-white rounded-xl shadow-md hover:shadow-xl transition-all text-sm font-semibold"
              >
                thank you please update
              </a>
            </div>

            {/* System Cards Grid */}
            {filteredSolutions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-12 shadow-xl border border-gray-200 text-center"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
                  <Search className="text-gray-400" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No systems found</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {searchTerm || selectedDepartment !== 'all'
                    ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                    : 'No systems available. Check back later or contact support.'}
                </p>
                {(searchTerm || selectedDepartment !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedDepartment('all');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white rounded-xl hover:shadow-lg transition-all font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
              </motion.div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {isSimpleSectorSheet
                  ? simpleSectorGroups.map((entry, idx) => renderSimpleSectorCard(entry, idx))
                  : isSectorsSheet
                  ? sectorGroups.map((group, idx) => renderSectorCard(group, idx))
                  : partnerGroups.map((group, idx) => renderPartnerCard(group, idx))}
                      </div>
            )}
          </div>
        )}
      </div>
      <AnimatePresence>
        {showRowWizard && (
          <motion.div
            key="row-wizard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end md:items-center justify-center md:px-4 px-0 md:py-6"
          >
            <div
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
              onClick={closeRowWizard}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 160, damping: 20 }}
              className="relative z-10 w-full md:max-w-6xl max-h-[100vh] md:max-h-[90vh] bg-white md:rounded-3xl rounded-t-3xl shadow-2xl border-t border-orange-100 md:border md:border-orange-100 overflow-hidden flex flex-col"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50 to-white px-4 md:px-8 py-5 md:py-6 shrink-0">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-[#8B4513]/80 font-semibold">
                    Step {wizardStep + 1} of {wizardSteps.length}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{wizardSteps[wizardStep]}</h3>
                  <p className="text-sm text-gray-600 max-w-xl">{wizardStepDescriptions[wizardStep]}</p>
                  <div className="hidden md:block w-full max-w-xl h-1.5 bg-white/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500]"
                      style={{ width: `${wizardProgress}%` }}
                    />
                  </div>
                  <div className="md:hidden w-full h-1.5 bg-white/60 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500]"
                      style={{ width: `${wizardProgress}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={closeRowWizard}
                  className="self-end md:self-auto p-2 rounded-full bg-white/85 hover:bg-white shadow-sm border border-orange-100 transition-all"
                  aria-label="Close wizard"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
                <div className="md:hidden mb-4">
                  <button
                    onClick={() => setMobileAssistantOpen(prev => !prev)}
                    className="w-full flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#8B4513] shadow-sm transition-all hover:bg-orange-100"
                    aria-expanded={mobileAssistantOpen}
                    aria-controls="wizard-assistant-panel"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles size={16} />
                      Assistant & tips
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${mobileAssistantOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                  <div className="space-y-6">
                    {renderWizardContent()}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={wizardStep === 0 ? closeRowWizard : handleWizardBack}
                        className="w-full md:w-auto px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center md:justify-start gap-2 text-sm font-medium"
                      >
                        {wizardStep === 0 ? (
                          <>
                            <X size={16} />
                            Cancel
                          </>
                        ) : (
                          <>
                            <ChevronLeft size={16} />
                            Back
                          </>
                        )}
                      </button>
                      {wizardStep < wizardSteps.length - 1 ? (
                        <button
                          onClick={handleWizardNext}
                          className="w-full md:w-auto px-5 py-2 rounded-lg bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                        >
                          Next step
                          <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={handleWizardSubmit}
                          disabled={wizardStatus === 'saving'}
                          className="w-full md:w-auto px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {wizardStatus === 'saving' ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <ClipboardCheck size={16} />
                              Save row
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <aside
                    id="wizard-assistant-panel"
                    className={`space-y-4 ${mobileAssistantOpen ? 'block' : 'hidden'} md:block`}
                  >
                    <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-[#8B4513] font-semibold text-sm uppercase tracking-wide">
                        <ClipboardList size={16} />
                        Assistant panel
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Required fields: {requiredFields.length ? requiredFields.join(', ') : 'None'}
                      </p>
                      {neededDepartments.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Teams we still need</p>
                          <div className="flex flex-wrap gap-2">
                            {neededDepartments.slice(0, 6).map(dept => (
                              <button
                                key={`needed-${dept}`}
                                type="button"
                                onClick={() => applySuggestion(isSectorsSheet ? 'Target Sector' : 'Department', dept)}
                                className="px-3 py-1 rounded-full text-xs bg-white text-[#8B4513] border border-orange-200 hover:bg-orange-100 transition-colors"
                              >
                                {dept}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {focusedField && getTopSuggestions(focusedField, 5).length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-[#8B4513] font-semibold text-sm uppercase tracking-wide">
                          <Sparkles size={16} />
                          Suggestions for {focusedField}
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                          {getTopSuggestions(focusedField, 5).map((suggestion, index) => (
                            <button
                              key={`focus-${index}`}
                              type="button"
                              onClick={() => applySuggestion(focusedField, suggestion)}
                              className="text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
                            >
                              {suggestion.length > 100 ? `${suggestion.slice(0, 97)}…` : suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {sheetRecentSubmissions.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-[#8B4513] font-semibold text-sm uppercase tracking-wide">
                          <History size={16} />
                          Recent submissions
                        </div>
                        <ul className="mt-3 space-y-3 text-sm text-gray-600">
                          {sheetRecentSubmissions.map(submission => {
                            const label =
                              submission.values['System Name'] ||
                              submission.values['Target Sector'] ||
                              submission.values['Service Name'] ||
                              'Unnamed entry';
                            return (
                              <li key={`recent-${submission.timestamp}`} className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                                <div className="font-semibold text-gray-800">{label}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(submission.timestamp).toLocaleString()} • {submission.sheetName}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </aside>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PWAInstallPrompt />
    </div>
  );
}

