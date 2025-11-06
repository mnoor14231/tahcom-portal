import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Building2, Package, Server, 
  Edit2, Plus, Trash2, Save, X, BarChart3,
  PieChart, Users, RefreshCw, TrendingUp, Sparkles, Brain,
  TrendingDown, Award, Target, Globe, Database, Cloud,
  Shield, Zap, Activity, ArrowUpRight, ArrowDownRight,
  CheckCircle2, AlertCircle, Info, ChevronRight, ChevronDown, Star,
  Lightbulb, Rocket, Layers, Eye, ExternalLink, Copy
} from 'lucide-react';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

// Theme colors - Tahcom brand
const THEME_COLORS = {
  brand1: '#8B4513', // Maroon
  brand2: '#FF8C00', // Orange
  brand3: '#FFA500', // Amber
};

// Use environment variable or detect the API URL
const getApiBase = () => {
  // List of known working backend URLs (most recent first)
  const knownWorkingBackends = [
    'https://tahcom-dpk99s20u-muneers-projects-276a49f7.vercel.app', // Working preview backend
    'https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-72tghbv3h-muneers-projects-276a49f7.vercel.app',
  ];
  
  // Old/broken backend URLs that should be ignored
  const brokenBackends = [
    'https://tahcom-c3m1ufewd-muneers-projects-276a49f7.vercel.app',
  ];
  
  // Check for environment variable first (set in Vercel)
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    console.log('[OurPartners] VITE_API_BASE_URL found:', envUrl);
    
    // If env var points to a broken backend, ignore it and use working backend
    const isBroken = brokenBackends.some(broken => envUrl.includes(broken));
    if (isBroken) {
      console.warn('[OurPartners] ⚠️ Env var points to broken backend, using working backend instead');
      return `${knownWorkingBackends[0]}/api/partners`;
    }
    
    // If env var points to a known working backend, use it
    const isWorking = knownWorkingBackends.some(working => envUrl.includes(working));
    if (isWorking) {
      console.log('[OurPartners] ✅ Using VITE_API_BASE_URL (points to working backend):', envUrl);
      return envUrl;
    }
    
    // If env var is set but unknown, still use it (might be a new backend)
    console.log('[OurPartners] Using VITE_API_BASE_URL (unknown backend, will retry if fails):', envUrl);
    return envUrl;
  }
  
  // In development, use localhost
  if (import.meta.env.DEV) {
    console.log('[OurPartners] Using localhost (dev mode)');
    return 'http://localhost:8787/api/partners';
  }
  
  // In production, try to intelligently detect the backend URL
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // List of known working backend URLs (most recent first)
  // NOTE: tahcom-c3m1ufewd is BROKEN and should NOT be in this list
  const knownBackendUrls = [
    'https://tahcom-dpk99s20u-muneers-projects-276a49f7.vercel.app', // Working preview backend
    'https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-72tghbv3h-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-jd6bzo23i-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-hhakuuyz7-muneers-projects-276a49f7.vercel.app',
  ];
  
  // Try to detect backend URL based on current domain
  let detectedBackendUrl: string | null = null;
  
  // If on production domain (tahcom-kpi-portal.vercel.app), use the most recent known backend
  if (currentHost === 'tahcom-kpi-portal.vercel.app' || currentHost.includes('tahcom-kpi-portal')) {
    // For production domain, use the first (most recent) backend URL
    detectedBackendUrl = knownBackendUrls[0];
    console.log('[OurPartners] Production domain detected, using most recent backend:', detectedBackendUrl);
  } else if (currentHost.includes('vercel.app')) {
    // For preview URLs, use the known working backend directly
    // Preview backends often don't match frontend preview IDs, so use proven working backend
    detectedBackendUrl = knownBackendUrls[0]; // Use the working backend (dpk99s20u)
    console.log('[OurPartners] Preview domain detected, using known working backend:', detectedBackendUrl);
    
    // Optional: Also try constructing backend URL from preview ID as a fallback
    // This will be handled by the retry mechanism in tryFetchWithFallbacks
    const match = currentHost.match(/tahcom-kpi-portal-([^-]+)-muneers-projects-276a49f7\.vercel\.app/);
    if (match) {
      const previewId = match[1];
      const constructedBackend = `https://tahcom-${previewId}-muneers-projects-276a49f7.vercel.app`;
      console.log('[OurPartners] Will also try constructed backend as fallback:', constructedBackend);
    }
  }
  
  // Use detected URL or fallback to most recent known backend
  const backendUrl = detectedBackendUrl || knownBackendUrls[0];
  const fallbackUrl = `${backendUrl}/api/partners`;
  
  console.log('[OurPartners] Using fallback URL:', fallbackUrl);
  console.log('[OurPartners] Environment:', {
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    currentHost,
    detectedBackendUrl
  });
  
  return fallbackUrl;
};

const API_BASE = getApiBase();
console.log('[OurPartners] Final API_BASE:', API_BASE);

// Helper function to try multiple backend URLs if the first one fails
const tryFetchWithFallbacks = async (endpoint: string, options: RequestInit = {}) => {
  // List of known working backend URLs (most recent first)
  // NOTE: tahcom-c3m1ufewd is BROKEN and should NOT be in this list
  const knownBackendUrls = [
    'https://tahcom-dpk99s20u-muneers-projects-276a49f7.vercel.app', // Working preview backend
    'https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-72tghbv3h-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-jd6bzo23i-muneers-projects-276a49f7.vercel.app',
    'https://tahcom-hhakuuyz7-muneers-projects-276a49f7.vercel.app',
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

export function OurPartnersPage() {
  const [showEntry, setShowEntry] = useState(true);
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
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Clear old Excel ID on mount
  useEffect(() => {
    const savedId = localStorage.getItem('partners_spreadsheet_id');
    if (savedId === '1eBTpXRU_uxc57f8Vhb9SzSnjHP0vNsPh') {
      localStorage.removeItem('partners_spreadsheet_id');
    }
  }, []);

  // Load available sheets when spreadsheet ID is provided
  useEffect(() => {
    if (spreadsheetId && !showEntry) {
      loadSheets();
    }
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

  const loadSheets = async () => {
    try {
      setLoading(true);
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}`;
      console.log('[OurPartners] Fetching from:', apiUrl);
      
      // Use retry helper to try multiple backends if needed
      const res = await tryFetchWithFallbacks(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[OurPartners] Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('[OurPartners] Received data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.sheets) {
        // Filter out "Match Level" description table - it's not for main data
        const filteredSheets = data.sheets.filter((s: any) => 
          !s.title.toLowerCase().includes('match level') && 
          !s.title.toLowerCase().includes('matchlevel')
        );
        setAvailableSheets(filteredSheets);
        if (filteredSheets.length > 0 && !sheetName) {
          const solutionsSheet = filteredSheets.find((s: any) => 
            s.title.toLowerCase().includes('solution') || s.title.toLowerCase().includes('system')
          );
          setSheetName(solutionsSheet?.title || filteredSheets[0].title);
        }
      }
    } catch (err: any) {
      console.error('Error loading sheets:', err);
      const errorMessage = err.message || 'Failed to load sheets';
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}`;
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
        console.error('[OurPartners] Full error details:', {
          message: err.message,
          stack: err.stack,
          apiUrl,
          API_BASE,
          env: {
            VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
            MODE: import.meta.env.MODE,
            DEV: import.meta.env.DEV
          }
        });
        alert(`❌ Connection Error\n\nCannot connect to the API server.\n\nAPI URL: ${apiUrl}\n\nCurrent API Base: ${API_BASE}\n\nPlease check:\n1. Backend server is deployed and running\n2. API URL is correct\n3. CORS is enabled on the backend\n4. Check browser console (F12) for detailed error logs\n\nTry refreshing the page or clearing cache.`);
      } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        alert(`Permission Error: ${errorMessage}\n\n🔐 Please share the spreadsheet with:\n\nsheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com\n\nGive it "Viewer" or "Editor" access.`);
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        alert(`Spreadsheet Not Found: ${errorMessage}\n\nPlease check:\n1. The spreadsheet ID is correct\n2. The spreadsheet exists and is accessible`);
      } else if (errorMessage.includes('not supported') || errorMessage.includes('Excel') || errorMessage.includes('Save as Google Sheets')) {
        alert(`⚠️ File Format Error\n\n${errorMessage}\n\nYour file needs to be converted to Google Sheets format.`);
      } else {
        alert(`Error: ${errorMessage}\n\nAPI URL: ${apiUrl}\n\nPlease check:\n1. Backend server is deployed\n2. Spreadsheet ID: ${spreadsheetId}\n3. Spreadsheet is shared with the service account`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSheetData = async () => {
    try {
      setLoading(true);
      
      // Prevent loading "Match Level" description table - it's not for main data
      if (sheetName && (sheetName.toLowerCase().includes('match level') || sheetName.toLowerCase().includes('matchlevel'))) {
        alert('⚠️ "Match Level" is a description table and cannot be used as main data.\n\nPlease select a different sheet (e.g., "solutions" or "services").');
        // Auto-select solutions sheet if available
        const solutionsSheet = availableSheets.find((s: any) => 
          s.title.toLowerCase().includes('solution') || s.title.toLowerCase().includes('system')
        );
        if (solutionsSheet) {
          setSheetName(solutionsSheet.title);
          return;
        }
        throw new Error('Cannot load Match Level sheet - please select a different sheet');
      }
      
      // Check if using old Excel ID
      if (spreadsheetId === '1eBTpXRU_uxc57f8Vhb9SzSnjHP0vNsPh') {
        const newId = '1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0';
        localStorage.setItem('partners_spreadsheet_id', newId);
        setSpreadsheetId(newId);
        throw new Error('Old Excel file ID detected. Please use the new Google Sheet ID. Clearing cache and reloading...');
      }
      
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}`;
      console.log('[OurPartners] loadSheetData - Fetching from:', apiUrl);
      console.log('[OurPartners] loadSheetData - API_BASE:', API_BASE);
      
      // Use retry helper to try multiple backends if needed
      const res = await tryFetchWithFallbacks(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[OurPartners] loadSheetData - Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.data || data.data.length === 0) {
        console.warn('Sheet loaded but contains no data rows');
      }
      
      setSheetData(data);
      setSolutions(data.data || []);
    } catch (err: any) {
      console.error('Error loading sheet data:', err);
      const errorMessage = err.message || 'Failed to load sheet data.';
      
      // More helpful error messages
      if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        alert(`Permission Error: ${errorMessage}\n\n🔐 Please share the spreadsheet with:\n\nsheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com\n\nGive it "Viewer" or "Editor" access.`);
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        alert(`Sheet Not Found: ${errorMessage}\n\nPlease check:\n1. The spreadsheet ID is correct\n2. The sheet name "${sheetName}" exists in the spreadsheet`);
      } else if (errorMessage.includes('not supported') || errorMessage.includes('Excel') || errorMessage.includes('FAILED_PRECONDITION')) {
        alert(`⚠️ File Format Error\n\nThis file is not a native Google Sheet. It appears to be an Excel file.\n\nPlease:\n1. Open the file in Google Drive\n2. Go to File → "Save as Google Sheets"\n3. Use the new Google Sheet's ID\n\nCurrent ID: ${spreadsheetId}`);
      } else if (errorMessage.includes('Old Excel file ID')) {
        // Auto-reload with new ID
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${sheetName}`;
        console.error('[OurPartners] Full error details (loadSheetData):', {
          message: err.message,
          stack: err.stack,
          apiUrl,
          API_BASE,
          spreadsheetId,
          sheetName,
          env: {
            VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
            MODE: import.meta.env.MODE,
            DEV: import.meta.env.DEV
          }
        });
        
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
          alert(`❌ Connection Error\n\nCannot connect to the API server.\n\nAPI URL: ${apiUrl}\n\nCurrent API Base: ${API_BASE}\n\nPlease check:\n1. Backend server is deployed and running\n2. API URL is correct\n3. CORS is enabled on the backend\n4. Check browser console (F12) for detailed error logs\n\nTry refreshing the page or clearing cache.`);
        } else {
          alert(`Error: ${errorMessage}\n\nAPI URL: ${apiUrl}\n\nPlease check:\n1. Backend server is deployed\n2. Spreadsheet ID: ${spreadsheetId}\n3. Spreadsheet is shared with: sheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com\n4. Sheet name "${sheetName}" is correct\n5. Check browser console (F12) for detailed logs`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const updateCell = async (cell: string, value: string) => {
    try {
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}/cell`;
      await tryFetchWithFallbacks(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cell, value }),
      });
      await loadSheetData(); // Reload to get updated data
    } catch (err) {
      console.error('Error updating cell:', err);
      alert('Failed to update cell.');
    }
  };

  const updateRow = async (rowIndex: number, values: string[]) => {
    try {
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}/row/${rowIndex}`;
      await tryFetchWithFallbacks(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
      await loadSheetData();
    } catch (err) {
      console.error('Error updating row:', err);
      alert('Failed to update row.');
    }
  };

  const addRow = async () => {
    if (!sheetData?.headers) return;
    const emptyRow = sheetData.headers.map(() => '');
    try {
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}/row`;
      await tryFetchWithFallbacks(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: emptyRow }),
      });
      await loadSheetData();
    } catch (err) {
      console.error('Error adding row:', err);
      alert('Failed to add row.');
    }
  };

  const deleteRow = async (rowIndex: number) => {
    if (!confirm('Delete this row?')) return;
    try {
      const apiUrl = `${API_BASE}/sheets/${spreadsheetId}/${encodeURIComponent(sheetName)}/row/${rowIndex}`;
      await tryFetchWithFallbacks(apiUrl, {
        method: 'DELETE',
      });
      await loadSheetData();
    } catch (err) {
      console.error('Error deleting row:', err);
      alert('Failed to delete row.');
    }
  };

  // Enhanced Analytics calculations
  const totalSolutions = solutions.length;
  const totalPartners = new Set(solutions.map(s => s['Partner / Company']).filter(Boolean)).size;
  const departments = Array.from(new Set(solutions.map(s => s.Department).filter(Boolean)));
  
  // AI Solutions detection
  const isAISolution = (solution: Solution) => {
    const category = (solution.Category || '').toLowerCase();
    const systemName = (solution['System Name'] || '').toLowerCase();
    const useCases = (solution['Use Cases'] || '').toLowerCase();
    return category.includes('ai') || category.includes('artificial intelligence') ||
           category.includes('machine learning') || category.includes('ml') ||
           systemName.includes('ai') || useCases.includes('ai') ||
           useCases.includes('artificial intelligence') || useCases.includes('machine learning');
  };
  
  const aiSolutions = solutions.filter(isAISolution);
  const aiSolutionsCount = aiSolutions.length;
  const aiPercentage = totalSolutions > 0 ? Math.round((aiSolutionsCount / totalSolutions) * 100) : 0;


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

  // Deployment type distribution
  const deploymentCounts = solutions.reduce((acc, solution) => {
    const type = solution['Deployment Type'] || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
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
  
  const matchLevelDistribution = matchLevelValues.reduce((acc, ml) => {
    const level = Math.floor(ml);
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

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

  // Category insights
  const categoryInsights = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count,
    percentage: totalSolutions > 0 ? Math.round((count / totalSolutions) * 100) : 0,
    isAI: isAISolution({ Category: category } as Solution),
  })).sort((a, b) => b.count - a.count);

  // Department coverage
  const departmentCoverage = Object.entries(departmentCounts).map(([dept, count]) => ({
    department: dept,
    count,
    percentage: totalSolutions > 0 ? Math.round((count / totalSolutions) * 100) : 0,
  })).sort((a, b) => b.count - a.count);


  const categoryChartData = {
    labels: Object.keys(categoryCounts),
    datasets: [{
      label: 'Solutions by Category',
      data: Object.values(categoryCounts),
      backgroundColor: Object.keys(categoryCounts).map((_, i) => 
        i % 2 === 0 ? `rgba(139, 69, 19, 0.8)` : `rgba(255, 140, 0, 0.8)`
      ),
      borderColor: Object.keys(categoryCounts).map((_, i) => 
        i % 2 === 0 ? THEME_COLORS.brand1 : THEME_COLORS.brand2
      ),
      borderWidth: 2,
    }],
  };

  const departmentChartData = {
    labels: Object.keys(departmentCounts),
    datasets: [{
      label: 'Solutions by Department',
      data: Object.values(departmentCounts),
      backgroundColor: `rgba(139, 69, 19, 0.8)`,
      borderColor: THEME_COLORS.brand1,
      borderWidth: 2,
    }],
  };

  const deploymentChartData = {
    labels: Object.keys(deploymentCounts),
    datasets: [{
      label: 'Solutions by Deployment Type',
      data: Object.values(deploymentCounts),
      backgroundColor: [
        `rgba(139, 69, 19, 0.8)`,
        `rgba(255, 140, 0, 0.8)`,
        `rgba(255, 165, 0, 0.8)`,
      ],
      borderColor: [
        THEME_COLORS.brand1,
        THEME_COLORS.brand2,
        THEME_COLORS.brand3,
      ],
      borderWidth: 2,
    }],
  };

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

  // Donut Chart: Top 5 Categories
  const top5Categories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topCategoriesDonutData = {
    labels: top5Categories.map(([cat]) => cat.length > 25 ? cat.substring(0, 25) + '...' : cat),
    datasets: [{
      data: top5Categories.map(([, count]) => count),
      backgroundColor: [
        'rgba(139, 69, 19, 0.8)',
        'rgba(255, 140, 0, 0.8)',
        'rgba(255, 165, 0, 0.8)',
        'rgba(139, 90, 43, 0.8)',
        'rgba(184, 115, 51, 0.8)',
      ],
      borderColor: [
        THEME_COLORS.brand1,
        THEME_COLORS.brand2,
        THEME_COLORS.brand3,
        '#8b5a2b',
        '#b87333',
      ],
      borderWidth: 2,
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

  // Filter solutions for cards/table view
  const filteredSolutions = solutions.filter(solution => {
    const matchesSearch = !searchTerm || 
      solution['System Name']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution.Description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution['Client challenges']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution['Use Cases']?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || solution.Department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  const getUniqueValues = (key: keyof Solution) => {
    // Exclude "Match Level" column from filter options - it's a description table, not for filtering
    if (key === 'Match Level ' || key.toString().toLowerCase().includes('match level')) {
      return [];
    }
    return Array.from(new Set(solutions.map(s => s[key]).filter(Boolean))) as string[];
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

  // Entry screen
  if (showEntry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.img
            src="/tahcomlogo.png"
            alt="Tahcom Logo"
            className="w-48 h-48 mx-auto mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          />
          <motion.button
            onClick={handleEntryClick}
            className="px-8 py-4 bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            See the Solutions
          </motion.button>
        </motion.div>
      </div>
    );
  }

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
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent mb-2">
              Our Partners & Solutions
            </h1>
            <p className="text-gray-600">Comprehensive analytics and management dashboard</p>
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
              onClick={loadSheetData}
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
                  <option value="all">All Departments</option>
                  {getUniqueValues('Department').map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
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
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
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
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Filter size={18} />
                  Filters
                </button>
                <button
                  onClick={addRow}
                  className="px-4 py-2 bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white rounded-lg hover:shadow-lg flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Row
                </button>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B4513]"
                    >
                      <option value="all">All Departments</option>
                      {getUniqueValues('Department').map(dept => (
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
                        const cellKey = `${rowIdx + 2}-${String.fromCharCode(65 + colIdx)}`;
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
                  <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={18} />
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B4513] focus:border-[#8B4513] bg-gray-50 focus:bg-white text-base transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">🏢 All Departments</option>
                    {getUniqueValues('Department').map(dept => (
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
                {filteredSolutions.map((solution, idx) => {
                  const challenges = parseBullets(solution['Client challenges'] || '');
                  const useCases = parseBullets(solution['Use Cases'] || '');
                  const description = solution.Description || '';

                  // Get department color
                  const getDepartmentColor = (dept: string) => {
                    const colors: Record<string, { bg: string; text: string; border: string }> = {
                      'AI': { bg: 'from-purple-50 to-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
                      'Data': { bg: 'from-blue-50 to-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
                      'Cybersecurity': { bg: 'from-red-50 to-red-100', text: 'text-red-700', border: 'border-red-200' },
                      'Cloud': { bg: 'from-cyan-50 to-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
                    };
                    return colors[dept] || { bg: 'from-[#8B4513]/10 to-[#FF8C00]/10', text: 'text-[#8B4513]', border: 'border-[#8B4513]/20' };
                  };

                  const deptColor = solution.Department ? getDepartmentColor(solution.Department) : null;

                  return (
                <motion.div
                  key={idx}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: idx * 0.03, type: "spring", stiffness: 100 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full group relative touch-manipulation"
                    >
                      {/* Enhanced Gradient Header with Pattern */}
                      <div className="relative h-2 bg-gradient-to-r from-[#8B4513] via-[#FF8C00] to-[#FFA500] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                      </div>

                      {/* Card Content */}
                      <div className="p-6 flex-1 flex flex-col relative">
                        {/* Floating Action Button - Copy */}
                        <button
                          onClick={() => {
                            const textToCopy = `${solution['System Name']}\n${solution.Description || ''}`;
                            navigator.clipboard.writeText(textToCopy);
                            setCopiedText(solution['System Name']);
                            setTimeout(() => setCopiedText(null), 2000);
                          }}
                          className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title="Copy system info"
                        >
                          {copiedText === solution['System Name'] ? (
                            <CheckCircle2 size={16} className="text-green-600" />
                          ) : (
                            <Copy size={16} className="text-gray-600" />
                          )}
                        </button>

                        {/* System Name - Enhanced Title */}
                        <div className="mb-4 pr-8">
                          <h3 className="text-2xl font-bold bg-gradient-to-r from-[#8B4513] to-[#FF8C00] bg-clip-text text-transparent mb-2 leading-tight group-hover:from-[#FF8C00] group-hover:to-[#FFA500] transition-all">
                            {solution['System Name'] || 'Unnamed System'}
                          </h3>
                          
                          {/* Department Tag - Enhanced */}
                          {solution.Department && deptColor && (
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${deptColor.bg} ${deptColor.text} border ${deptColor.border} shadow-sm`}>
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

                        {/* Description - Collapsible */}
                        {description && (() => {
                          const sectionKey = `description-${idx}`;
                          const isExpanded = expandedSections[sectionKey] || false;

                          return (
                            <div className="mb-5">
                              <button
                                onClick={() => {
                                  setExpandedSections(prev => ({
                                    ...prev,
                                    [sectionKey]: !prev[sectionKey]
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

                        {/* Client Challenges - Collapsible */}
                        {challenges.length > 0 && (() => {
                          const sectionKey = `challenges-${idx}`;
                          const isExpanded = expandedSections[sectionKey] || false;

                          return (
                            <div className="mb-5">
                              <button
                                onClick={() => {
                                  setExpandedSections(prev => ({
                                    ...prev,
                                    [sectionKey]: !prev[sectionKey]
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

                        {/* Use Cases - Collapsible */}
                        {useCases.length > 0 && (() => {
                          const sectionKey = `usecases-${idx}`;
                          const isExpanded = expandedSections[sectionKey] || false;

                          return (
                            <div className="mt-auto pt-4 border-t border-gray-200">
                              <button
                                onClick={() => {
                                  setExpandedSections(prev => ({
                                    ...prev,
                                    [sectionKey]: !prev[sectionKey]
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

                        {/* Additional Info Footer */}
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
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <PWAInstallPrompt />
    </div>
  );
}

