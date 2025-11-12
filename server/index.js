import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import crypto from 'crypto';
import XLSX from 'xlsx';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';
import { registerAdminUserRoutes } from './adminUsers.js';
import { registerAdminKpiRoutes } from './adminKpis.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const port = process.env.PORT || 8787;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!anthropicApiKey) {
  console.warn('[server] Missing ANTHROPIC_API_KEY in server/.env');
}

const anthropic = new Anthropic({ apiKey: anthropicApiKey });

// Azure/MSAL configuration (from .env)
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${port}/api/outlook/callback`;

if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_TENANT_ID) {
  console.warn('[server] Missing Azure credentials in server/.env');
  console.warn('[server] Please add AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID');
}

const msalConfig = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    clientSecret: AZURE_CLIENT_SECRET,
  },
};

const pca = new ConfidentialClientApplication(msalConfig);

// In-memory token storage (userId -> tokens)
// TODO: Move to database/encrypted storage in production
const userTokens = new Map(); // Outlook tokens: userId -> tokens
const gmailTokens = new Map(); // Gmail tokens: userId -> tokens

// Follow-up tracking: userId -> Map<email, {lastSent, threadId, followUpDate}>
const followUps = new Map();

// Simple in-memory cache for Google Sheets responses
const CACHE_TTL_MS = Number(process.env.SHEETS_CACHE_TTL_MS || 60000); // default 60s
const sheetMetaCache = new Map(); // spreadsheetId -> { value, expiresAt }
const sheetDataCache = new Map(); // `${spreadsheetId}::${sheetName}` -> { value, expiresAt }

const cacheKeyForSheet = (spreadsheetId, sheetName) => `${spreadsheetId}::${sheetName}`;

const getFromCache = (map, key) => {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.value;
};

const setCache = (map, key, value) => {
  map.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

const invalidateSheetCaches = (spreadsheetId, sheetName) => {
  sheetMetaCache.delete(spreadsheetId);
  if (sheetName) {
    sheetDataCache.delete(cacheKeyForSheet(spreadsheetId, sheetName));
  } else {
    for (const key of sheetDataCache.keys()) {
      if (key.startsWith(`${spreadsheetId}::`)) {
        sheetDataCache.delete(key);
      }
    }
  }
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_USERNAME_DOMAIN = process.env.SUPABASE_USERNAME_DOMAIN || 'tahcom.local';

const DEFAULT_VAPID_PUBLIC_KEY = 'BBS-5m8-nZLTjJDmWEgTi4o65N1c9_ezF4MJHt2BQsHOEPmLiBwXxo9sQjt3I_l_eL_DvukgLIV9lm_HCodv92c';
const DEFAULT_VAPID_PRIVATE_KEY = 'Oc7ILnd1PtIHQmKURfQ73J7WNJwNy58ng3qqOJJOLDs';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
const VAPID_CONTACT = process.env.VAPID_CONTACT_EMAIL || 'mailto:notifications@tahcom.com';

const PUSH_CONFIGURED = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (PUSH_CONFIGURED) {
  try {
    webPush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (error) {
    console.warn('[push] Failed to configure web-push VAPID keys', error);
  }
} else {
  console.warn('[push] VAPID keys missing. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable web push notifications.');
}

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[server] Supabase service role not configured. Admin user provisioning API will be disabled.');
}

function buildEmailFromUsername(username) {
  if (!username) return null;
  const value = String(username).trim();
  if (!value) return null;
  if (value.includes('@')) return value.toLowerCase();
  return `${value}@${SUPABASE_USERNAME_DOMAIN}`.toLowerCase();
}

async function requireSupabaseRole(req, res, allowedRoles = ['admin']) {
  if (!supabaseAdmin) {
    res.status(503).json({ ok: false, error: 'supabase_admin_unavailable' });
    return null;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!token) {
    res.status(401).json({ ok: false, error: 'missing_bearer_token' });
    return null;
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[requireSupabaseRole] Supabase getUser failed', userError);
      res.status(401).json({ ok: false, error: 'invalid_token', detail: userError?.message ?? null });
      return null;
    }

    const requesterId = userData.user.id;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, department_code')
      .eq('id', requesterId)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn('[server] Missing profile for authenticated user', requesterId, profileError);
      res.status(403).json({ ok: false, error: 'profile_missing' });
      return null;
    }

    if (!allowedRoles.includes(profile.role)) {
      res.status(403).json({ ok: false, error: 'insufficient_role', required: allowedRoles });
      return null;
    }

    return { requesterId, profile };
  } catch (err) {
    console.error('[server] Failed to validate auth token', err);
    res.status(500).json({ ok: false, error: 'role_validation_failed' });
    return null;
  }
}

// Gmail OAuth configuration (from .env)
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || `http://localhost:${port}/api/gmail/callback`;

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
  console.warn('[server] Missing Gmail credentials in server/.env');
  console.warn('[server] Please add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET');
}

// Gmail OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REDIRECT_URI
);

// Gmail scopes
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// Helper function to refresh access token
async function refreshAccessToken(userId, refreshToken) {
  try {
    const refreshResponse = await pca.acquireTokenByRefreshToken({
      scopes: ['Mail.Read', 'Mail.Send', 'User.Read', 'offline_access'],
      refreshToken: refreshToken,
    });

    if (refreshResponse && refreshResponse.account) {
      const tokens = userTokens.get(userId);
      if (tokens) {
        userTokens.set(userId, {
          ...tokens,
          accessToken: refreshResponse.accessToken,
          refreshToken: refreshResponse.refreshToken || tokens.refreshToken,
          expiresOn: refreshResponse.expiresOn,
        });
        return refreshResponse.accessToken;
      }
    }
    return null;
  } catch (err) {
    console.error('[refreshAccessToken] error', err);
    return null;
  }
}

// Helper function to get valid access token (refresh if needed)
async function getValidAccessToken(userId) {
  const tokens = userTokens.get(userId);
  if (!tokens || !tokens.accessToken) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresOn = tokens.expiresOn ? new Date(tokens.expiresOn) : null;
  const now = new Date();
  const bufferMinutes = 5;
  
  if (expiresOn && expiresOn < new Date(now.getTime() + bufferMinutes * 60000)) {
    // Token expired or about to expire, refresh it
    console.log(`[getValidAccessToken] Token expired for user ${userId}, refreshing...`);
    if (tokens.refreshToken) {
      const newAccessToken = await refreshAccessToken(userId, tokens.refreshToken);
      if (newAccessToken) {
        return newAccessToken;
      }
    }
    // Refresh failed, token is invalid
    return null;
  }

  return tokens.accessToken;
}

// CORS configuration - allow all origins for now (can be restricted in production)
app.use(cors({
  origin: '*', // Allow all origins explicitly
  credentials: false, // Set to false when using wildcard origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    backend: 'tahcom-api-server',
    googleSheets: {
      initialized: !!sheetsClient,
      serviceAccountEmail: serviceAccountEmail
    }
  });
});

app.post('/api/push/send', async (req, res) => {
  if (!supabaseAdmin) {
    res.status(503).json({ ok: false, error: 'supabase_admin_unavailable' });
    return;
  }

  if (!PUSH_CONFIGURED) {
    res.status(503).json({ ok: false, error: 'push_not_configured' });
    return;
  }

  const authContext = await requireSupabaseRole(req, res, ['admin', 'manager', 'member']);
  if (!authContext) return;

  const { userId, title, body, url, data } = req.body || {};

  if (!userId || !title || !body) {
    res.status(400).json({ ok: false, error: 'invalid_payload' });
    return;
  }

  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, subscription')
      .eq('user_id', userId);

    if (error) {
      console.error('[push] Failed to load subscriptions', error);
      res.status(500).json({ ok: false, error: 'push_fetch_failed' });
      return;
    }

    if (!subscriptions?.length) {
      res.json({ ok: true, sent: 0, removed: 0 });
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      data,
    });

    let sent = 0;
    let removed = 0;

    await Promise.allSettled(subscriptions.map(async (sub) => {
      const subscription = sub.subscription;
      if (!subscription?.endpoint) {
        removed += 1;
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id);
        return;
      }

      try {
        await webPush.sendNotification(subscription, payload);
        sent += 1;
      } catch (err) {
        const statusCode = err?.statusCode;
        const shouldRemove = statusCode === 404 || statusCode === 410;
        console.warn('[push] Failed to deliver notification', err?.message || err);
        if (shouldRemove) {
          removed += 1;
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
      }
    }));

    res.json({ ok: true, sent, removed });
  } catch (err) {
    console.error('[push] Unexpected failure', err);
    res.status(500).json({ ok: false, error: 'push_dispatch_failed' });
  }
});

// Test endpoint for partners API
app.get('/api/partners/test', (_req, res) => {
  res.json({ 
    ok: true, 
    message: 'Partners API is working',
    sheetsClient: !!sheetsClient,
    serviceAccountEmail: serviceAccountEmail,
    initError: sheetsInitError,
    timestamp: new Date().toISOString()
  });
});

// Diagnostic endpoint to check Google Sheets connection
app.get('/api/partners/diagnose', async (_req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    backend: {
      status: 'ok',
      hasEnvVar: !!process.env.GOOGLE_SERVICE_ACCOUNT,
      hasServiceAccountFile: fs.existsSync(path.join(__dirname, 'service-account.json')),
    },
    googleSheets: {
      initialized: !!sheetsClient,
      serviceAccountEmail: serviceAccountEmail,
      initError: sheetsInitError,
    },
    instructions: []
  };
  
  if (!sheetsClient) {
    diagnostics.instructions.push('❌ Google Sheets client is not initialized');
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      diagnostics.instructions.push('1. Add GOOGLE_SERVICE_ACCOUNT environment variable in Vercel');
      diagnostics.instructions.push('2. Copy the entire content of service-account.json (all on one line)');
    } else {
      diagnostics.instructions.push('⚠️ GOOGLE_SERVICE_ACCOUNT is set but initialization failed');
      diagnostics.instructions.push('Check the JSON format - make sure newlines are escaped as \\n');
    }
  } else {
    diagnostics.instructions.push('✅ Google Sheets client is initialized');
    diagnostics.instructions.push(`Service account: ${serviceAccountEmail}`);
    diagnostics.instructions.push('Make sure your spreadsheet is shared with this email address');
  }
  
  res.json(diagnostics);
});

// Lightweight key/quota check
app.get('/api/claude/check', async (_req, res) => {
  try {
    if (!anthropicApiKey) return res.status(400).json({ ok: false, error: 'missing_api_key' });
    const msg = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      temperature: 0,
      system: 'Return exactly OK.',
      messages: [{ role: 'user', content: 'Say OK' }],
    });
    res.json({ ok: true, model: msg.model });
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const data = err?.error || err?.response?.data || { message: String(err?.message || err) };
    console.error('[claude.check] error', status, data);
    res.status(200).json({ ok: false, status, error: data });
  }
});

// Load products/services from Excel for RAG
let cachedProducts = null;
const loadProductsFromExcel = () => {
  try {
    // Path to the Excel file in the public directory (relative to server/)
    const excelPath = path.join(process.cwd(), '..', 'public', 'System(solutions).xlsx');
    
    if (!fs.existsSync(excelPath)) {
      console.warn('[RAG] Excel file not found at:', excelPath);
      return null;
    }

    const workbook = XLSX.readFile(excelPath);
    const sheets = {};
    
    // Read all sheets
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      sheets[sheetName] = jsonData;
    });

    console.log('[RAG] Loaded Excel data from', workbook.SheetNames.length, 'sheets');
    return sheets;
  } catch (err) {
    console.error('[RAG] Error loading Excel file:', err.message);
    return null;
  }
};

// Cache products on server start
cachedProducts = loadProductsFromExcel();

// Initialize Google Sheets client
let sheetsClient = null;
let sheetsInitError = null;
let serviceAccountEmail = null;

const initGoogleSheets = () => {
  try {
    let serviceAccount;
    
    // Try environment variable first (for Vercel deployment)
    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        // Handle environment variable - might have escaped newlines
        let envValue = process.env.GOOGLE_SERVICE_ACCOUNT;
        
        // If it's a string with escaped newlines, parse it properly
        // Vercel stores JSON with \\n (double backslash) which JSON.parse treats as literal \n
        // We need to convert those to actual newlines after parsing
        if (typeof envValue === 'string') {
          // Parse the JSON
          serviceAccount = JSON.parse(envValue);
          
          // If private_key exists and has \\n (literal backslash-n), replace with actual newlines
          if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
            // Replace literal \n (backslash followed by n) with actual newline characters
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
        } else {
          serviceAccount = envValue;
        }
        
        console.log('[Google Sheets] ✅ Loaded service account from GOOGLE_SERVICE_ACCOUNT environment variable');
        console.log('[Google Sheets] Service account email:', serviceAccount.client_email);
      } catch (e) {
        console.error('[Google Sheets] ❌ Failed to parse GOOGLE_SERVICE_ACCOUNT env var:', e.message);
        console.error('[Google Sheets] Error details:', e);
        sheetsInitError = `Failed to parse GOOGLE_SERVICE_ACCOUNT: ${e.message}`;
        return;
      }
    }
    
    // Fallback to file if env var not set
    if (!serviceAccount) {
      const serviceAccountPath = path.join(__dirname, 'service-account.json');
      console.log('[Google Sheets] Looking for service account file at:', serviceAccountPath);
      
      if (!fs.existsSync(serviceAccountPath)) {
        console.warn('[Google Sheets] ⚠️ service-account.json not found at:', serviceAccountPath);
        console.warn('[Google Sheets] Set GOOGLE_SERVICE_ACCOUNT environment variable in Vercel with the JSON content');
        sheetsInitError = 'Service account file not found and GOOGLE_SERVICE_ACCOUNT env var not set';
        return;
      }
      
      try {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        console.log('[Google Sheets] ✅ Loaded service account from file');
      } catch (e) {
        console.error('[Google Sheets] ❌ Failed to parse service-account.json:', e.message);
        sheetsInitError = `Failed to parse service-account.json: ${e.message}`;
        return;
      }
    }
    
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      console.error('[Google Sheets] ❌ Service account is missing required fields (client_email or private_key)');
      sheetsInitError = 'Service account missing required fields: client_email or private_key';
      return;
    }
    
    // Ensure private key has proper newlines
    let privateKey = serviceAccount.private_key;
    if (privateKey && !privateKey.includes('\n')) {
      // Replace literal \n with actual newlines if needed
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    const jwtClient = new JWT({
      email: serviceAccount.client_email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    sheetsClient = google.sheets({ version: 'v4', auth: jwtClient });
    serviceAccountEmail = serviceAccount.client_email;
    sheetsInitError = null;
    console.log('[Google Sheets] ✅ Initialized successfully');
    console.log('[Google Sheets] Service account email:', serviceAccountEmail);
  } catch (err) {
    console.error('[Google Sheets] ❌ Failed to initialize:', err.message);
    console.error('[Google Sheets] Error details:', err);
    sheetsInitError = err.message || 'Unknown error during initialization';
  }
};

// Initialize on server start (wrapped to prevent crashes)
try {
  initGoogleSheets();
} catch (err) {
  console.error('[server] Failed to initialize Google Sheets on startup:', err.message);
  // Don't crash - allow server to start even without Google Sheets
}

// Endpoint to get products data
app.get('/api/products', async (_req, res) => {
  try {
    if (!cachedProducts) {
      cachedProducts = loadProductsFromExcel();
    }
    res.json({ products: cachedProducts || {} });
  } catch (err) {
    console.error('[products] error', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

app.post('/api/claude/generate', async (req, res) => {
  try {
    if (!anthropicApiKey) {
      return res.status(400).json({ error: 'Server missing ANTHROPIC_API_KEY' });
    }
    const { context, tone, recipientPosition, recipientName, recipientEmail, senderName, senderPosition } = req.body || {};
    if (!context || typeof context !== 'string') {
      return res.status(400).json({ error: 'context is required' });
    }

    // Check if context mentions a product/service that we need RAG data for
    let productKnowledge = '';
    if (cachedProducts && context) {
      const contextLower = context.toLowerCase();
      
      // Check if user is asking about a specific product/service
      for (const [sheetName, data] of Object.entries(cachedProducts)) {
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];
          // Check for System Name or Service Name fields
          const nameField = firstItem['System Name'] ? 'System Name' : (firstItem['Service Name'] ? 'Service Name' : null);
          
          if (nameField) {
            for (const item of data) {
              const itemName = item[nameField] || '';
              const itemNameLower = itemName.toLowerCase();
              // Check if context mentions this product/service by name
              if (itemNameLower && contextLower.includes(itemNameLower)) {
                // Found a match! Build knowledge string
                productKnowledge += `\n\nPRODUCT/SERVICE INFORMATION (${sheetName}):\n`;
                for (const [key, value] of Object.entries(item)) {
                  if (value && typeof value === 'string') {
                    productKnowledge += `- ${key}: ${value}\n`;
                  }
                }
              }
            }
          }
        }
      }
      
      // If no specific product match but user asked about products, include all data
      if (!productKnowledge && (contextLower.includes('product') || contextLower.includes('service') || 
          contextLower.includes('solution') || contextLower.includes('introduce'))) {
        productKnowledge = '\n\nAVAILABLE PRODUCTS AND SERVICES:\n';
        for (const [sheetName, data] of Object.entries(cachedProducts)) {
          if (Array.isArray(data) && data.length > 0) {
            productKnowledge += `\n${sheetName}:\n`;
            // Include first 10 items to avoid token limits
            const itemsToShow = data.slice(0, 10);
            for (const item of itemsToShow) {
              const nameField = item['System Name'] || item['Service Name'] || 'Name';
              const name = item[nameField] || 'Unknown';
              productKnowledge += `- ${name}\n`;
            }
            if (data.length > 10) {
              productKnowledge += `... and ${data.length - 10} more items\n`;
            }
          }
        }
      }
    }

    // Build position-aware system prompt
    let system = `You are a professional email assistant. Draft concise, polite, and clear emails with subject.
Tone: ${tone || 'neutral professional'}.`;

    if (recipientName) {
      system += `\n\nIMPORTANT: The recipient's name is ${recipientName}.`;
      system += `\n- MUST start the email with a personalized greeting using their name (e.g., "Dear ${recipientName}," or "Hello ${recipientName},").`;
      system += `\n- Use their name naturally throughout the email when appropriate.`;
    }

    if (recipientPosition) {
      system += `\n\nIMPORTANT: The recipient holds the position: ${recipientPosition}.`;
      system += `\n- Adjust the email style and content to match their role and level of seniority.`;
      system += `\n- Use appropriate terminology for someone in ${recipientPosition}.`;
      system += `\n- If they are a C-level executive, be concise and strategic.`;
      system += `\n- If they are a manager/director, be professional and detail-oriented.`;
      system += `\n- If they are a technical role, include relevant technical details.`;
      system += `\n- Reference their position naturally in the email when relevant.`;
    }

    if (productKnowledge) {
      system += `\n\nPRODUCT/SERVICE KNOWLEDGE BASE:${productKnowledge}`;
      system += `\n- Use this information to provide accurate details about our products/services when relevant.`;
      system += `\n- Customize the content based on the recipient's position and interests.`;
    }

    if (senderName) {
      system += `\nSender name: ${senderName}`;
    }
    if (senderPosition) {
      system += `\nSender position: ${senderPosition}`;
    }

    system += `\n\nReturn ONLY valid JSON with keys: subject, bodyHtml. No explanations, no introductory text, just the JSON object.`;
    system += `\n- The subject MUST be a relevant, professional subject line based on the context. Do NOT use generic subjects like "Draft email" or "Follow up".`;
    system += `\n- The bodyHtml should be complete HTML with proper formatting and MUST include a personalized greeting with the recipient's name.`;
    system += `\n- Do NOT include sender name or signature at the end - signature will be added automatically.`;
    system += `\n- Wrap all text content in HTML tags with inline styles to make text blue.`;
    system += `\n- CRITICAL: In the JSON, escape ALL newline characters in the bodyHtml value. Use \\n for line breaks inside the JSON string. The JSON must be valid JSON on a single line or with properly escaped strings.`;

    const msg = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.4,
      system,
      messages: [{ role: 'user', content: context }],
    });

    const text = (msg.content || [])
      .map(p => (p.type === 'text' ? p.text : ''))
      .join('\n');

    // Parse JSON more strictly - find the first complete JSON object
    let subject = 'Draft email';
    let bodyHtml = `<p>${context}</p>`;
    try {
      // Find JSON object boundaries more carefully
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        let jsonStr = text.substring(jsonStart, jsonEnd + 1);
        
        // Try to fix common JSON issues
        try {
          const parsed = JSON.parse(jsonStr);
          subject = parsed.subject || subject;
          bodyHtml = parsed.bodyHtml || bodyHtml;
        } catch (parseErr) {
          // If parsing fails, try to fix common issues
          // Fix mixed quotes in HTML attributes
          jsonStr = jsonStr.replace(/style='([^']*)'/g, 'style="$1"');
          
          // Fix unescaped newlines in JSON strings - more robust approach
          jsonStr = jsonStr.replace(/"bodyHtml"\s*:\s*"([^"]*(?:"[^"]*"[^"]*)*)"/gs, (match) => {
            // Find the content between the first " after bodyHtml: and the last " before the closing brace
            const valueMatch = match.match(/"bodyHtml"\s*:\s*"(.*)"/s);
            if (valueMatch && valueMatch[1]) {
              const content = valueMatch[1];
              // Escape all special characters properly
              const escaped = content
                .replace(/\\/g, '\\\\')  // Escape backslashes first
                .replace(/"/g, '\\"')    // Escape quotes
                .replace(/\n/g, '\\n')   // Escape newlines
                .replace(/\r/g, '\\r')   // Escape carriage returns
                .replace(/\t/g, '\\t');  // Escape tabs
              return `"bodyHtml": "${escaped}"`;
            }
            return match;
          });
          
          try {
            const parsed = JSON.parse(jsonStr);
            subject = parsed.subject || subject;
            bodyHtml = parsed.bodyHtml || bodyHtml;
          } catch (secondErr) {
            console.error('[claude.generate] Still failed to parse after fixes:', secondErr.message);
            console.error('[claude.generate] JSON string:', jsonStr.substring(0, 500));
            // If still failing, try a different approach
            bodyHtml = text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : bodyHtml;
          }
        }
      } else {
        // Fallback: try the old method
        const match = text.match(/\{[\s\S]*?\}/);
        if (match) {
          let jsonStr = match[0];
          try {
            const parsed = JSON.parse(jsonStr);
            subject = parsed.subject || subject;
            bodyHtml = parsed.bodyHtml || bodyHtml;
          } catch (parseErr) {
            // Try to fix common issues
            jsonStr = jsonStr.replace(/style='([^']*)'/g, 'style="$1"');
            
            // Fix unescaped newlines in JSON strings - more robust approach
            jsonStr = jsonStr.replace(/"bodyHtml"\s*:\s*"([^"]*(?:"[^"]*"[^"]*)*)"/gs, (match) => {
              const valueMatch = match.match(/"bodyHtml"\s*:\s*"(.*)"/s);
              if (valueMatch && valueMatch[1]) {
                const content = valueMatch[1];
                const escaped = content
                  .replace(/\\/g, '\\\\')
                  .replace(/"/g, '\\"')
                  .replace(/\n/g, '\\n')
                  .replace(/\r/g, '\\r')
                  .replace(/\t/g, '\\t');
                return `"bodyHtml": "${escaped}"`;
              }
              return match;
            });
            
            try {
              const parsed = JSON.parse(jsonStr);
              subject = parsed.subject || subject;
              bodyHtml = parsed.bodyHtml || bodyHtml;
            } catch (secondErr) {
              console.error('[claude.generate] Still failed to parse after fixes:', secondErr.message);
              bodyHtml = text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : bodyHtml;
            }
          }
        } else {
          bodyHtml = text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : bodyHtml;
        }
      }
    } catch (err) {
      console.error('[claude.generate] Failed to parse AI response as JSON:', err.message);
      console.error('[claude.generate] Raw response:', text);
      bodyHtml = text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : bodyHtml;
    }

    res.json({ subject, bodyHtml });
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const data = err?.error || err?.response?.data || { message: String(err?.message || err) };
    console.error('[claude.generate] error', status, data);
    res.status(status === 401 || status === 403 || status === 429 ? 200 : 500).json({
      error: 'generation_failed',
      status,
      details: data,
    });
  }
});

// ==========================================
// STEP 1: Outlook OAuth - Start flow
// ==========================================
app.get('/api/outlook/auth/start', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authCodeUrlParams = {
      scopes: ['Mail.Read', 'Mail.Send', 'User.Read', 'offline_access'],
      redirectUri: REDIRECT_URI,
      state: `${state}:${userId}`,
    };

    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParams);
    res.json({ authUrl, state });
  } catch (err) {
    console.error('[outlook.auth.start] error', err);
    res.status(500).json({ error: 'failed_to_start_auth' });
  }
});

// ==========================================
// STEP 2: Outlook OAuth - Handle callback
// ==========================================
app.get('/api/outlook/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`http://localhost:5173/agents/email-expert?error=auth_failed`);
    }

    const [authState, userId] = String(state).split(':');
    if (!userId) {
      return res.redirect(`http://localhost:5173/agents/email-expert?error=invalid_state`);
    }

    const tokenResponse = await pca.acquireTokenByCode({
      code: String(code),
      scopes: ['Mail.Read', 'Mail.Send', 'User.Read', 'offline_access'],
      redirectUri: REDIRECT_URI,
    });

    if (!tokenResponse?.account) {
      return res.redirect(`http://localhost:5173/agents/email-expert?error=no_account`);
    }

    // Store tokens (in production, encrypt and store in DB)
    userTokens.set(userId, {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresOn: tokenResponse.expiresOn,
      account: {
        username: tokenResponse.account.username,
        name: tokenResponse.account.name,
      },
    });

    res.redirect(`http://localhost:5173/agents/email-expert?connected=ok`);
  } catch (err) {
    console.error('[outlook.callback] error', err);
    res.redirect(`http://localhost:5173/agents/email-expert?error=callback_failed`);
  }
});

// ==========================================
// STEP 3: Check connection status
// ==========================================
app.get('/api/outlook/status', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const tokens = userTokens.get(userId);
    if (!tokens) {
      return res.json({ connected: false });
    }

    // Check if we can get a valid token (will refresh if needed)
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      // Token expired and refresh failed
      userTokens.delete(userId);
      return res.json({ connected: false, expired: true, message: 'Session expired. Please reconnect.' });
    }

    res.json({
      connected: true,
      account: tokens.account,
      expiresOn: tokens.expiresOn,
    });
  } catch (err) {
    console.error('[outlook.status] error', err);
    res.status(500).json({ error: 'status_check_failed' });
  }
});

// ==========================================
// STEP 4: Send Email via Outlook
// ==========================================
app.post('/api/outlook/send', async (req, res) => {
  try {
    const { userId, to, cc, bcc, subject, bodyHtml, bodyText, followUpDate: customFollowUpDate } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: 'to (array of emails) required' });
    }
    if (!subject) {
      return res.status(400).json({ error: 'subject required' });
    }
    if (!bodyHtml && !bodyText) {
      return res.status(400).json({ error: 'bodyHtml or bodyText required' });
    }

    const tokens = userTokens.get(userId);
    if (!tokens) {
      return res.status(401).json({ error: 'not_connected', message: 'Outlook account not connected. Please reconnect.' });
    }

    // Get valid access token (refresh if expired)
    let accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      // Token refresh failed, user needs to reconnect
      userTokens.delete(userId);
      return res.status(401).json({ 
        error: 'token_expired', 
        message: 'Your Outlook session expired. Please reconnect your account.' 
      });
    }

    // Create Microsoft Graph client
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    // Build message object
    const message = {
      message: {
        subject: subject,
        body: {
          contentType: bodyHtml ? 'HTML' : 'Text',
          content: bodyHtml || bodyText,
        },
        toRecipients: to.map(email => ({ emailAddress: { address: email } })),
        ...(cc && cc.length > 0 && { ccRecipients: cc.map(email => ({ emailAddress: { address: email } })) }),
        ...(bcc && bcc.length > 0 && { bccRecipients: bcc.map(email => ({ emailAddress: { address: email } })) }),
      },
    };

    // Send email
    const result = await client.api('/me/sendMail').post(message);

    // Track follow-up - add new entry ONLY if customFollowUpDate is provided
    if (to && to.length > 0 && customFollowUpDate) {
      if (!followUps.has(userId)) {
        followUps.set(userId, new Map());
      }
      const userFollowUps = followUps.get(userId);
      const now = new Date();
      const followUpDate = new Date(customFollowUpDate);
      to.forEach(email => {
        userFollowUps.set(email, {
          lastSent: now.toISOString(),
          threadId: result.id || null,
          followUpDate: followUpDate.toISOString(),
          subject,
          bodyHtml: bodyHtml || bodyText || '',
        });
      });
    }

    res.json({
      success: true,
      messageId: result.id || 'sent',
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[outlook.send] error', err);
    const status = err?.statusCode || err?.response?.status || 500;
    res.status(status).json({
      error: 'send_failed',
      message: err.message || 'Failed to send email',
      details: err.body || err.response?.data || err,
    });
  }
});

// ==========================================
// STEP 5: Quick Send (Generate + Send in one step)
// ==========================================
app.post('/api/outlook/quick-send', async (req, res) => {
  try {
    const { userId, to, context, tone, recipient, sender } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: 'to (array of emails) required' });
    }
    if (!context) {
      return res.status(400).json({ error: 'context required' });
    }

    // Check Outlook connection
    const tokens = userTokens.get(userId);
    if (!tokens) {
      return res.status(401).json({ error: 'not_connected', message: 'Outlook account not connected. Please reconnect.' });
    }

    // Get valid access token (refresh if expired)
    let accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      // Token refresh failed, user needs to reconnect
      userTokens.delete(userId);
      return res.status(401).json({ 
        error: 'token_expired', 
        message: 'Your Outlook session expired. Please reconnect your account.' 
      });
    }

    // Generate email with Claude
    const prefaceLines = [];
    if (recipient?.name) prefaceLines.push(`Recipient name: ${recipient.name}`);
    if (recipient?.position) prefaceLines.push(`Recipient position: ${recipient.position}`);
    if (recipient?.email) prefaceLines.push(`Recipient email: ${recipient.email}`);
    if (sender?.name) prefaceLines.push(`Sender name: ${sender.name}`);
    if (sender?.position) prefaceLines.push(`Sender position: ${sender.position}`);
    if (sender?.email) prefaceLines.push(`Sender email: ${sender.email}`);
    const preface = prefaceLines.length ? `Context for personalization:\n${prefaceLines.join('\n')}\n\n` : '';

    const system = `You are a professional email assistant. Draft concise, polite, and clear emails with subject.
Tone: ${tone || 'neutral professional'}.
Return JSON with keys: subject, bodyHtml.`;

    let subject, bodyHtml;
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 800,
        temperature: 0.4,
        system,
        messages: [{ role: 'user', content: `${preface}${context}` }],
      });

      const text = (msg.content || [])
        .map(p => (p.type === 'text' ? p.text : ''))
        .join('\n');

      subject = 'Draft email';
      bodyHtml = `<p>${context}</p>`;
      try {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          subject = parsed.subject || subject;
          bodyHtml = parsed.bodyHtml || bodyHtml;
        } else {
          bodyHtml = text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : bodyHtml;
        }
      } catch (_) {
        bodyHtml = text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : bodyHtml;
      }

      if (sender?.signatureHtml) {
        bodyHtml = `${bodyHtml}${sender.signatureHtml}`;
      }
    } catch (claudeErr) {
      return res.status(500).json({
        error: 'generation_failed',
        message: 'Failed to generate email with Claude',
        details: claudeErr.message,
      });
    }

    // Send email via Microsoft Graph
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    const message = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: bodyHtml,
        },
        toRecipients: to.map(email => ({ emailAddress: { address: email } })),
      },
    };

    await client.api('/me/sendMail').post(message);

    res.json({
      success: true,
      subject,
      sentTo: to,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[outlook.quick-send] error', err);
    const status = err?.statusCode || err?.response?.status || 500;
    res.status(status).json({
      error: 'quick_send_failed',
      message: err.message || 'Failed to send email',
      details: err.body || err.response?.data || err,
    });
  }
});

// ==========================================
// Gmail OAuth Endpoints
// ==========================================

// Gmail OAuth - Start flow
app.get('/api/gmail/auth/start', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Gmail not configured. Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in server/.env' });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMAIL_SCOPES,
      state: `${state}:${userId}`,
      prompt: 'consent', // Force consent screen to get refresh token
      redirect_uri: GMAIL_REDIRECT_URI, // Explicitly set redirect URI
    });

    res.json({ authUrl, state });
  } catch (err) {
    console.error('[gmail.auth.start] error', err);
    res.status(500).json({ error: 'failed_to_start_auth' });
  }
});

// Gmail OAuth - Handle callback
app.get('/api/gmail/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`http://localhost:5173/agents/email-expert?error=auth_failed&provider=gmail`);
    }

    const [authState, userId] = String(state).split(':');
    if (!userId) {
      return res.redirect(`http://localhost:5173/agents/email-expert?error=invalid_state&provider=gmail`);
    }

    const { tokens } = await oauth2Client.getToken({
      code: String(code),
      redirect_uri: GMAIL_REDIRECT_URI, // Explicitly set redirect URI
    });
    
    if (!tokens || !tokens.access_token) {
      return res.redirect(`http://localhost:5173/agents/email-expert?error=no_tokens&provider=gmail`);
    }

    // Get user info to get email address
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Store tokens (in production, encrypt and store in DB)
    gmailTokens.set(userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      account: {
        username: userInfo.data.email || '',
        name: userInfo.data.name || userInfo.data.email || '',
      },
    });

    res.redirect(`http://localhost:5173/agents/email-expert?connected=ok&provider=gmail`);
  } catch (err) {
    console.error('[gmail.callback] error', err);
    res.redirect(`http://localhost:5173/agents/email-expert?error=callback_failed&provider=gmail`);
  }
});

// Gmail - Check connection status
app.get('/api/gmail/status', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const tokens = gmailTokens.get(userId);
    if (!tokens || !tokens.accessToken) {
      return res.json({ connected: false });
    }

    // Check if token is expired
    const now = Date.now();
    if (tokens.expiryDate && tokens.expiryDate < now + 5 * 60000) {
      // Token expired or about to expire, try to refresh
      if (tokens.refreshToken) {
        try {
          oauth2Client.setCredentials({
            refresh_token: tokens.refreshToken,
          });
          const { credentials } = await oauth2Client.refreshAccessToken();
          
          gmailTokens.set(userId, {
            ...tokens,
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || tokens.refreshToken,
            expiryDate: credentials.expiry_date,
          });
        } catch (refreshErr) {
          console.error('[gmail.status] refresh error', refreshErr);
          gmailTokens.delete(userId);
          return res.json({ connected: false, expired: true, message: 'Session expired. Please reconnect.' });
        }
      } else {
        gmailTokens.delete(userId);
        return res.json({ connected: false, expired: true, message: 'Session expired. Please reconnect.' });
      }
    }

    // Get fresh tokens
    const updatedTokens = gmailTokens.get(userId);
    res.json({
      connected: true,
      account: updatedTokens.account,
      expiresOn: updatedTokens.expiryDate ? new Date(updatedTokens.expiryDate).toISOString() : null,
    });
  } catch (err) {
    console.error('[gmail.status] error', err);
    res.status(500).json({ error: 'status_check_failed' });
  }
});

// Gmail - Fetch Inbox
app.get('/api/gmail/inbox', async (req, res) => {
  try {
    const { userId, maxResults = 20 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const tokens = gmailTokens.get(userId);
    if (!tokens || !tokens.accessToken) {
      return res.status(401).json({ error: 'not_connected', message: 'Gmail account not connected. Please reconnect.' });
    }

    // Refresh token if needed
    const now = Date.now();
    if (tokens.expiryDate && tokens.expiryDate < now + 5 * 60000) {
      if (tokens.refreshToken) {
        try {
          oauth2Client.setCredentials({ refresh_token: tokens.refreshToken });
          const { credentials } = await oauth2Client.refreshAccessToken();
          gmailTokens.set(userId, {
            ...tokens,
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || tokens.refreshToken,
            expiryDate: credentials.expiry_date,
          });
        } catch (refreshErr) {
          gmailTokens.delete(userId);
          return res.status(401).json({ 
            error: 'token_expired', 
            message: 'Your Gmail session expired. Please reconnect your account.' 
          });
        }
      }
    }

    // Get fresh token
    const updatedTokens = gmailTokens.get(userId);
    oauth2Client.setCredentials({
      access_token: updatedTokens.accessToken,
      refresh_token: updatedTokens.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // List messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: parseInt(maxResults),
      q: 'in:inbox', // Only inbox messages
    });

    if (!listResponse.data.messages) {
      return res.json({ emails: [] });
    }

    // Fetch full message details for each message
    const emails = [];
    for (const msg of listResponse.data.messages) {
      try {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const headers = fullMsg.data.payload.headers;
        const from = headers.find(h => h.name === 'From')?.value || '';
        const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';
        
        // Extract snippet/preview
        const snippet = fullMsg.data.snippet || '';
        
        emails.push({
          id: fullMsg.data.id,
          threadId: fullMsg.data.threadId,
          from,
          to,
          subject,
          snippet,
          date,
          unread: fullMsg.data.labelIds?.includes('UNREAD') || false,
        });
      } catch (err) {
        console.error('[gmail.inbox] Error fetching message', msg.id, err);
      }
    }

    res.json({ emails });
  } catch (err) {
    console.error('[gmail.inbox] error', err);
    const status = err?.response?.status || 500;
    res.status(status).json({
      error: 'fetch_failed',
      message: err.message || 'Failed to fetch inbox',
      details: err.response?.data || err,
    });
  }
});

// Gmail - Fetch Sent Messages
app.get('/api/gmail/sent', async (req, res) => {
  try {
    const { userId, maxResults = 50 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const tokens = gmailTokens.get(userId);
    if (!tokens || !tokens.accessToken) {
      return res.status(401).json({ error: 'not_connected', message: 'Gmail account not connected. Please reconnect.' });
    }

    // Refresh token if needed
    const now = Date.now();
    if (tokens.expiryDate && tokens.expiryDate < now + 5 * 60000) {
      if (tokens.refreshToken) {
        try {
          oauth2Client.setCredentials({ refresh_token: tokens.refreshToken });
          const { credentials } = await oauth2Client.refreshAccessToken();
          gmailTokens.set(userId, {
            ...tokens,
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || tokens.refreshToken,
            expiryDate: credentials.expiry_date,
          });
        } catch (refreshErr) {
          gmailTokens.delete(userId);
          return res.status(401).json({ 
            error: 'token_expired', 
            message: 'Your Gmail session expired. Please reconnect your account.' 
          });
        }
      }
    }

    // Get fresh token
    const updatedTokens = gmailTokens.get(userId);
    oauth2Client.setCredentials({
      access_token: updatedTokens.accessToken,
      refresh_token: updatedTokens.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // List sent messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: parseInt(maxResults),
      q: 'in:sent', // Only sent messages
    });

    if (!listResponse.data.messages) {
      return res.json({ sentEmails: [] });
    }

    // Fetch full message details for each message
    const sentEmails = [];
    for (const msg of listResponse.data.messages) {
      try {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const headers = fullMsg.data.payload.headers;
        const from = headers.find(h => h.name === 'From')?.value || '';
        const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        const toHeader = headers.find(h => h.name === 'To')?.value || '';
        
        // Extract email address from header (e.g., "Name <email@example.com>" -> "email@example.com")
        const emailMatch = toHeader.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        const to = emailMatch ? emailMatch[0] : toHeader;
        
        // Extract body content
        let bodyHtml = '';
        let bodyText = '';
        
        const extractBody = (payload) => {
          if (payload.body?.data) {
            const text = Buffer.from(payload.body.data, 'base64').toString();
            if (payload.mimeType === 'text/html') {
              bodyHtml = text;
            } else if (payload.mimeType === 'text/plain') {
              bodyText = text;
            }
          }
          if (payload.parts) {
            payload.parts.forEach(extractBody);
          }
        };
        extractBody(fullMsg.data.payload);
        
        sentEmails.push({
          email: to,
          sentDate: date,
          subject,
          bodyHtml: bodyHtml || bodyText,
          threadId: fullMsg.data.threadId,
        });
      } catch (err) {
        console.error('[gmail.sent] Error fetching message', msg.id, err);
      }
    }

    // Sort by date, newest first
    sentEmails.sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());

    res.json({ sentEmails });
  } catch (err) {
    console.error('[gmail.sent] error', err);
    const status = err?.response?.status || 500;
    res.status(status).json({
      error: 'fetch_failed',
      message: err.message || 'Failed to fetch sent messages',
      details: err.response?.data || err,
    });
  }
});

// Gmail - Send Email
app.post('/api/gmail/send', async (req, res) => {
  try {
    const { userId, to, cc, bcc, subject, bodyHtml, bodyText, followUpDate: customFollowUpDate } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: 'to (array of emails) required' });
    }
    if (!subject) {
      return res.status(400).json({ error: 'subject required' });
    }
    if (!bodyHtml && !bodyText) {
      return res.status(400).json({ error: 'bodyHtml or bodyText required' });
    }

    const tokens = gmailTokens.get(userId);
    if (!tokens || !tokens.accessToken) {
      return res.status(401).json({ error: 'not_connected', message: 'Gmail account not connected. Please reconnect.' });
    }

    // Refresh token if needed
    const now = Date.now();
    if (tokens.expiryDate && tokens.expiryDate < now + 5 * 60000) {
      if (tokens.refreshToken) {
        try {
          oauth2Client.setCredentials({ refresh_token: tokens.refreshToken });
          const { credentials } = await oauth2Client.refreshAccessToken();
          gmailTokens.set(userId, {
            ...tokens,
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || tokens.refreshToken,
            expiryDate: credentials.expiry_date,
          });
        } catch (refreshErr) {
          gmailTokens.delete(userId);
          return res.status(401).json({ 
            error: 'token_expired', 
            message: 'Your Gmail session expired. Please reconnect your account.' 
          });
        }
      } else {
        gmailTokens.delete(userId);
        return res.status(401).json({ 
          error: 'token_expired', 
          message: 'Your Gmail session expired. Please reconnect your account.' 
        });
      }
    }

    // Get fresh token
    const updatedTokens = gmailTokens.get(userId);
    oauth2Client.setCredentials({
      access_token: updatedTokens.accessToken,
      refresh_token: updatedTokens.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build email message (RFC 5322 format)
    const emailBody = bodyHtml || bodyText.replace(/\n/g, '\r\n');
    const toHeader = to.join(', ');
    const ccHeader = cc && cc.length > 0 ? `Cc: ${cc.join(', ')}\r\n` : '';
    const bccHeader = bcc && bcc.length > 0 ? `Bcc: ${bcc.join(', ')}\r\n` : '';
    
    const rawMessage = [
      `To: ${toHeader}\r\n`,
      ccHeader,
      bccHeader,
      `Subject: ${subject}\r\n`,
      `Content-Type: ${bodyHtml ? 'text/html' : 'text/plain'}; charset=utf-8\r\n`,
      '\r\n',
      emailBody,
    ].join('');

    // Encode message in base64url format
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    // Track follow-up - add new entry ONLY if customFollowUpDate is provided
    if (to && to.length > 0 && customFollowUpDate) {
      if (!followUps.has(userId)) {
        followUps.set(userId, new Map());
      }
      const userFollowUps = followUps.get(userId);
      const now = new Date();
      const followUpDate = new Date(customFollowUpDate);
      to.forEach(email => {
        userFollowUps.set(email, {
          lastSent: now.toISOString(),
          threadId: result.data.threadId || result.data.id,
          followUpDate: followUpDate.toISOString(),
          subject,
          bodyHtml: bodyHtml || bodyText || '',
        });
      });
    }

    res.json({
      success: true,
      messageId: result.data.id || 'sent',
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[gmail.send] error', err);
    const status = err?.response?.status || 500;
    res.status(status).json({
      error: 'send_failed',
      message: err.message || 'Failed to send email',
      details: err.response?.data || err,
    });
  }
});

// Get Follow-ups
app.get('/api/followups', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const userFollowUps = followUps.get(userId);
    if (!userFollowUps) {
      return res.json({ followUps: [] });
    }

    const now = new Date();
    const dueFollowUps = [];
    userFollowUps.forEach((data, email) => {
      const followUpDate = new Date(data.followUpDate);
      if (followUpDate <= now) {
        dueFollowUps.push({
          email,
          lastSent: data.lastSent,
          followUpDate: data.followUpDate,
          subject: data.subject,
          threadId: data.threadId,
          bodyHtml: data.bodyHtml || '',
        });
      }
    });

    res.json({ followUps: dueFollowUps });
  } catch (err) {
    console.error('[followups] error', err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Get All Sent Emails
app.get('/api/sent-emails', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const userFollowUps = followUps.get(userId);
    if (!userFollowUps) {
      return res.json({ sentEmails: [] });
    }

    const allSentEmails = [];
    userFollowUps.forEach((data, email) => {
      allSentEmails.push({
        email,
        sentDate: data.lastSent,
        subject: data.subject,
        bodyHtml: data.bodyHtml || '',
        threadId: data.threadId,
        followUpDate: data.followUpDate,
      });
    });

    // Sort by date, newest first
    allSentEmails.sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());

    res.json({ sentEmails: allSentEmails });
  } catch (err) {
    console.error('[sent-emails] error', err);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

// Delete Follow-up
app.delete('/api/followups', async (req, res) => {
  try {
    const { userId, email, subject } = req.query;
    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email required' });
    }

    const userFollowUps = followUps.get(userId);
    if (userFollowUps) {
      // Delete exact match if subject provided, otherwise delete all for that email
      if (subject) {
        const existing = userFollowUps.get(email);
        if (existing && existing.subject === subject) {
          userFollowUps.delete(email);
        }
      } else {
        userFollowUps.delete(email);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[followups.delete] error', err);
    res.status(500).json({ error: 'delete_failed' });
  }
});

// Update Follow-up Date
app.put('/api/followups', async (req, res) => {
  try {
    const { userId, email, subject, followUpDate, sentDate, bodyHtml } = req.body;
    if (!userId || !email || !followUpDate) {
      return res.status(400).json({ error: 'userId, email, and followUpDate required' });
    }

    if (!followUps.has(userId)) {
      followUps.set(userId, new Map());
    }
    const userFollowUps = followUps.get(userId);
    
    const existing = userFollowUps.get(email);
    if (existing && (!subject || existing.subject === subject)) {
      // Update existing entry
      userFollowUps.set(email, {
        ...existing,
        followUpDate: followUpDate,
        ...(bodyHtml && { bodyHtml }),
        ...(sentDate && { lastSent: sentDate }),
      });
    } else {
      // Create new entry for email not in our tracking (e.g., Gmail sent email)
      userFollowUps.set(email, {
        lastSent: sentDate || new Date().toISOString(),
        threadId: null,
        followUpDate: followUpDate,
        subject: subject || '',
        bodyHtml: bodyHtml || '',
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[followups.update] error', err);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Parse Excel file for bulk contacts
app.post('/api/parse-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Parse contacts from Excel
    const contacts = data.map(row => ({
      name: row.Name || row.name || '',
      email: row.Email || row.email || '',
      position: row.Position || row.position || row.Title || row.title || '',
    })).filter(c => c.email); // Only include rows with email

    res.json({ contacts });
  } catch (err) {
    console.error('[parse-excel] error', err);
    res.status(500).json({ error: 'Failed to parse Excel file', details: err.message });
  }
});

// Get Outlook signature
app.get('/api/outlook/signature', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const tokens = userTokens.get(userId);
    if (!tokens) {
      return res.status(401).json({ error: 'not_connected' });
    }

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      userTokens.delete(userId);
      return res.status(401).json({ error: 'token_expired' });
    }

    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    // Get mailbox settings which includes signature
    const mailboxSettings = await client.api('/me/mailboxSettings').get();
    
    res.json({
      signature: mailboxSettings.automaticRepliesSetting?.internalReplyMessage || '',
      hasSignature: !!mailboxSettings.automaticRepliesSetting?.internalReplyMessage,
    });
  } catch (err) {
    console.error('[outlook.signature] error', err);
    res.status(500).json({ error: 'Failed to fetch signature', details: err.message });
  }
});

// Google Sheets API Routes for Partners
// Get all sheets in a spreadsheet
app.get('/api/partners/sheets/:spreadsheetId', async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const skipCache = req.query.refresh === 'true';
    if (!sheetsClient) {
      return res.status(500).json({ error: 'Google Sheets not initialized. Check service-account.json file.' });
    }

    if (!skipCache) {
      const cached = getFromCache(sheetMetaCache, spreadsheetId);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    }
    
    // First, try to get spreadsheet metadata to check if it's a valid Google Sheet
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties',
    });
    
    const sheets = response.data.sheets.map(sheet => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title,
    }));

    const payload = { sheets, title: response.data.properties?.title };
    setCache(sheetMetaCache, spreadsheetId, payload);
    res.set('X-Cache', skipCache ? 'BYPASS' : 'MISS');
    res.json(payload);
  } catch (err) {
    console.error('[partners/sheets] error', err);
    
    // Provide more specific error messages
    let errorMessage = err.message || 'Unknown error';
    let statusCode = 500;
    
    if (!sheetsClient) {
      statusCode = 503;
      errorMessage = `Google Sheets not initialized. ${serviceAccountEmail ? `Service account: ${serviceAccountEmail}. ` : ''}${sheetsInitError ? `Error: ${sheetsInitError}` : 'Check GOOGLE_SERVICE_ACCOUNT environment variable in Vercel.'}`;
    } else if (err.code === 403 || errorMessage.includes('permission') || errorMessage.includes('access')) {
      statusCode = 403;
      errorMessage = `Permission denied. Please share the spreadsheet "${spreadsheetId}" with the service account email: ${serviceAccountEmail || 'sheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com'}`;
    } else if (err.code === 404 || errorMessage.includes('not found')) {
      statusCode = 404;
      errorMessage = `Spreadsheet not found. Check the spreadsheet ID: ${spreadsheetId}. Make sure the spreadsheet exists and is accessible.`;
    } else if (errorMessage.includes('not supported') || errorMessage.includes('FAILED_PRECONDITION')) {
      statusCode = 400;
      errorMessage = `This file is not a native Google Sheet. It appears to be an Excel file (.xlsx). Please convert it to Google Sheets format:\n\n1. Open the file in Google Drive\n2. Right-click → "Open with" → "Google Sheets"\n3. Or go to File → "Save as Google Sheets"\n\nThen use the new Google Sheet's ID.`;
    } else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      statusCode = 500;
      errorMessage = `Google Sheets API authentication failed. Service account: ${serviceAccountEmail || 'not configured'}. Check GOOGLE_SERVICE_ACCOUNT environment variable.`;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      spreadsheetId,
      serviceAccountEmail,
      code: err.code,
    });
  }
});

// Get data from a specific sheet
app.get('/api/partners/sheets/:spreadsheetId/:sheetName', async (req, res) => {
  try {
    const { spreadsheetId, sheetName } = req.params;
    const skipCache = req.query.refresh === 'true';
    
    if (!sheetsClient) {
      return res.status(500).json({ error: 'Google Sheets not initialized. Check service-account.json file.' });
    }

    const dataCacheKey = cacheKeyForSheet(spreadsheetId, sheetName);
    if (!skipCache) {
      const cached = getFromCache(sheetDataCache, dataCacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    }
    
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
    });
    
    const rows = response.data.values || [];
    const headers = rows[0] || [];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });
    
    const payload = { headers, data, rawRows: rows };
    setCache(sheetDataCache, dataCacheKey, payload);
    res.set('X-Cache', skipCache ? 'BYPASS' : 'MISS');
    res.json(payload);
  } catch (err) {
    console.error('[partners/get] error', err);
    
    // Provide more specific error messages
    let errorMessage = err.message || 'Unknown error';
    let statusCode = 500;
    
    if (!sheetsClient) {
      statusCode = 503;
      errorMessage = `Google Sheets not initialized. ${serviceAccountEmail ? `Service account: ${serviceAccountEmail}. ` : ''}${sheetsInitError ? `Error: ${sheetsInitError}` : 'Check GOOGLE_SERVICE_ACCOUNT environment variable in Vercel.'}`;
    } else if (err.code === 403 || errorMessage.includes('permission') || errorMessage.includes('access')) {
      statusCode = 403;
      errorMessage = `Permission denied. Please share the spreadsheet with the service account: ${serviceAccountEmail || 'sheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com'}`;
    } else if (err.code === 404 || errorMessage.includes('not found')) {
      statusCode = 404;
      errorMessage = `Sheet "${sheetName}" not found in spreadsheet "${spreadsheetId}". Check the sheet name and make sure it exists.`;
    } else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      statusCode = 500;
      errorMessage = `Google Sheets API authentication failed. Service account: ${serviceAccountEmail || 'not configured'}. Check GOOGLE_SERVICE_ACCOUNT environment variable.`;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      spreadsheetId,
      sheetName,
      serviceAccountEmail,
      code: err.code,
    });
  }
});

// Update a cell
app.put('/api/partners/sheets/:spreadsheetId/:sheetName/cell', async (req, res) => {
  try {
    const { spreadsheetId, sheetName } = req.params;
    const { cell, value } = req.body; // e.g., cell: "A2"
    
    if (!sheetsClient) {
      return res.status(500).json({ error: 'Google Sheets not initialized' });
    }
    
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${cell}`,
      valueInputOption: 'RAW',
      resource: { values: [[value]] },
    });
    
    invalidateSheetCaches(spreadsheetId, sheetName);
    res.json({ success: true });
  } catch (err) {
    console.error('[partners/update-cell] error', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a row
app.put('/api/partners/sheets/:spreadsheetId/:sheetName/row/:rowIndex', async (req, res) => {
  try {
    const { spreadsheetId, sheetName, rowIndex } = req.params;
    const { values } = req.body; // Array of values
    
    if (!sheetsClient) {
      return res.status(500).json({ error: 'Google Sheets not initialized' });
    }
    
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex}:ZZ${rowIndex}`,
      valueInputOption: 'RAW',
      resource: { values: [values] },
    });
    
    invalidateSheetCaches(spreadsheetId, sheetName);
    res.json({ success: true });
  } catch (err) {
    console.error('[partners/update-row] error', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new row
app.post('/api/partners/sheets/:spreadsheetId/:sheetName/row', async (req, res) => {
  try {
    const { spreadsheetId, sheetName } = req.params;
    const { values } = req.body;
    
    if (!sheetsClient) {
      return res.status(500).json({ error: 'Google Sheets not initialized' });
    }
    
    const response = await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [values] },
    });

    invalidateSheetCaches(spreadsheetId, sheetName);
    res.json({ success: true, updatedRange: response.data.updates?.updatedRange });
  } catch (err) {
    console.error('[partners/append-row] error', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a row
app.delete('/api/partners/sheets/:spreadsheetId/:sheetName/row/:rowIndex', async (req, res) => {
  try {
    const { spreadsheetId, sheetName, rowIndex } = req.params;
    
    if (!sheetsClient) {
      return res.status(500).json({ error: 'Google Sheets not initialized' });
    }
    
    const spreadsheet = await sheetsClient.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: parseInt(rowIndex) - 1,
              endIndex: parseInt(rowIndex),
            },
          },
        }],
      },
    });

    invalidateSheetCaches(spreadsheetId, sheetName);
    res.json({ success: true });
  } catch (err) {
    console.error('[partners/delete-row] error', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a catch-all route for debugging
app.get('*', (req, res) => {
  if (req.path === '/health' || req.path.startsWith('/api/')) {
    // Let other routes handle these
    return;
  }
  res.json({ 
    message: 'Tahcom API Server',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      test: '/api/partners/test',
      sheets: '/api/partners/sheets/:spreadsheetId'
    }
  });
});

// Export for Vercel serverless (must be at the end)
// Only listen if not in Vercel (local development)
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`[server] Email Agent server listening on :${port}`);
    console.log(`[server] Outlook OAuth redirect URI: ${REDIRECT_URI}`);
    console.log(`[server] Gmail OAuth redirect URI: ${GMAIL_REDIRECT_URI}`);
    console.log(`[server] Google Sheets API: ${sheetsClient ? '✅ Initialized' : '❌ Not initialized'}`);
    if (!sheetsClient) {
      console.log(`[server] ⚠️  Make sure service-account.json exists in the server directory`);
    }
  });
}

// Export for Vercel serverless functions
export default app;

registerAdminUserRoutes(app, { supabaseAdmin, requireSupabaseRole, buildEmailFromUsername });
registerAdminKpiRoutes(app, { supabaseAdmin, requireSupabaseRole });


