import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Mail, Send, CheckCircle2, Inbox, Clock, Zap, RefreshCw, Bell, 
  ChevronRight, User, Briefcase, AtSign, Sparkles, Upload, Download, 
  Edit3, Eye, AlertCircle, Check, X, Palette, Image, Bold, Italic, 
  History, Users, AlignLeft, AlignCenter, UserCheck, FileSpreadsheet, MessageSquare, Calendar, Type
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

type Tab = 'compose' | 'inbox' | 'followups' | 'excel';
type FollowUpTab = 'due' | 'sent';

interface ExcelContact {
  name: string;
  email: string;
  position: string;
}

interface ContactDraft {
  contact: ExcelContact;
  subject: string;
  bodyHtml: string;
  approved: boolean;
  edited: boolean;
}

export function EmailExpertPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('compose');
  const [followUpTab, setFollowUpTab] = useState<FollowUpTab>('due');
  
  // Connection states
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookAccount, setOutlookAccount] = useState<{ username?: string; name?: string } | null>(null);
  const [checkingOutlook, setCheckingOutlook] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailAccount, setGmailAccount] = useState<{ username?: string; name?: string } | null>(null);
  const [checkingGmail, setCheckingGmail] = useState(true);
  
  // Compose states
  const [emailProvider, setEmailProvider] = useState<'outlook' | 'gmail'>('gmail');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('neutral professional');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; bodyHtml: string } | null>(null);
  const [toEmail, setToEmail] = useState('');
  const [toName, setToName] = useState('');
  const [toPosition, setToPosition] = useState('');
  const [manualSubject, setManualSubject] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [manualBodyHtml, setManualBodyHtml] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  
  // Identity
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [customSignature, setCustomSignature] = useState('');
  const [editingSignature, setEditingSignature] = useState(false);
  
  // Excel upload & draft review
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelContacts, setExcelContacts] = useState<ExcelContact[]>([]);
  const [contactDrafts, setContactDrafts] = useState<ContactDraft[]>([]);
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [sendingApproved, setSendingApproved] = useState(false);
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  
  // Inbox states
  const [inboxEmails, setInboxEmails] = useState<Array<{
    id: string;
    threadId: string;
    from: string;
    to: string;
    subject: string;
    snippet: string;
    date: string;
    unread: boolean;
  }>>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  
  // Follow-ups states
  const [followUps, setFollowUps] = useState<Array<{
    email: string;
    lastSent: string;
    followUpDate: string;
    subject: string;
    threadId?: string;
    bodyHtml?: string;
  }>>([]);
  const [sentEmails, setSentEmails] = useState<Array<{
    email: string;
    sentDate: string;
    subject: string;
  }>>([]);
  const [sentEmailsWithDetails, setSentEmailsWithDetails] = useState<Array<{
    email: string;
    sentDate: string;
    subject: string;
    bodyHtml: string;
    threadId?: string;
    followUpDate: string;
  }>>([]);
  const [expandedSentEmail, setExpandedSentEmail] = useState<string | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<number | null>(null);
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [editingFollowUpDate, setEditingFollowUpDate] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const draftEditorRef = useRef<HTMLDivElement>(null);
  const manualEditorRef = useRef<HTMLDivElement>(null);
  const excelEditorRef = useRef<HTMLDivElement>(null);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [fontSizePickerPosition, setFontSizePickerPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('emailExpert.identity');
    if (saved) {
      try {
        const v = JSON.parse(saved);
        setFullName(v.fullName || '');
        setPosition(v.position || '');
        setEmail(v.email || '');
        setIncludeSignature(v.includeSignature !== false);
        setCustomSignature(v.customSignature || '');
      } catch {}
    }
  }, []);

  useEffect(() => {
    const payload = { fullName, position, email, includeSignature, customSignature };
    localStorage.setItem('emailExpert.identity', JSON.stringify(payload));
  }, [fullName, position, email, includeSignature, customSignature]);

  // Check connection statuses
  useEffect(() => {
    if (!user?.id) return;
    const checkStatuses = async () => {
      // Outlook
      try {
        const res = await fetch(`http://localhost:8787/api/outlook/status?userId=${user.id}`);
        const data = await res.json();
        if (data.connected) {
          setOutlookConnected(true);
          setOutlookAccount(data.account || null);
        }
      } catch (e) {
        console.error('Failed to check Outlook status', e);
      } finally {
        setCheckingOutlook(false);
      }
      
      // Gmail
      try {
        const res = await fetch(`http://localhost:8787/api/gmail/status?userId=${user.id}`);
        const data = await res.json();
        if (data.connected) {
          setGmailConnected(true);
          setGmailAccount(data.account || null);
          if (data.connected) setEmailProvider('gmail');
        }
      } catch (e) {
        console.error('Failed to check Gmail status', e);
      } finally {
        setCheckingGmail(false);
      }
    };
    checkStatuses();
  }, [user?.id]);

  // Handle OAuth callback
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    const provider = searchParams.get('provider') || 'outlook';
    
    if (connected === 'ok') {
      if (provider === 'gmail') {
        setGmailConnected(true);
        if (user?.id) {
          fetch(`http://localhost:8787/api/gmail/status?userId=${user.id}`)
            .then(r => r.json())
            .then(data => {
              if (data.connected) setGmailAccount(data.account || null);
            });
        }
      } else {
      setOutlookConnected(true);
      if (user?.id) {
        fetch(`http://localhost:8787/api/outlook/status?userId=${user.id}`)
          .then(r => r.json())
          .then(data => {
            if (data.connected) setOutlookAccount(data.account || null);
          });
        }
      }
      navigate('/agents/email-expert', { replace: true });
    } else if (error) {
      alert(`Connection failed: ${error}`);
      navigate('/agents/email-expert', { replace: true });
    }
  }, [searchParams, user?.id, navigate]);

  // Fetch functions
  const fetchInbox = useCallback(async () => {
    if (!user?.id || !gmailConnected) return;
    setLoadingInbox(true);
    try {
      const res = await fetch(`http://localhost:8787/api/gmail/inbox?userId=${user.id}&maxResults=20`);
      const data = await res.json();
      setInboxEmails(data.emails || []);
    } catch (e) {
      console.error('Failed to fetch inbox', e);
      alert('Failed to fetch inbox');
    } finally {
      setLoadingInbox(false);
    }
  }, [user?.id, gmailConnected]);

  const fetchFollowUps = useCallback(async () => {
    if (!user?.id) return;
    setLoadingFollowUps(true);
    
    const allFollowUps = [];
    
    try {
      // Get follow-ups from internal tracking ONLY
      // Follow-ups are now ONLY those with an explicit followUpDate set by the user
      const res = await fetch(`http://localhost:8787/api/followups?userId=${user.id}`);
      const data = await res.json();
      allFollowUps.push(...(data.followUps || []));
    } catch (e) {
      console.error('Failed to fetch internal follow-ups', e);
    }
      
    // Remove duplicates and filter by date
      const now = new Date();
    const uniqueFollowUps = allFollowUps.filter((followUp, index, self) => {
      // Check if we already have this email/subject combo
      const isDuplicate = index !== self.findIndex((f) => 
        f.email === followUp.email && f.subject === followUp.subject
      );
      if (isDuplicate) return false;
      
      // Check if follow-up is due
      const followUpDate = new Date(followUp.followUpDate);
      return followUpDate <= now;
    });
    
    setFollowUps(uniqueFollowUps);
      setLoadingFollowUps(false);
  }, [user?.id, gmailConnected]);

  const fetchAllSentEmails = useCallback(async () => {
    if (!user?.id) return;
    
    // Combine sent emails from our tracking + Gmail API
    const allSent = [];
    
    try {
      // Get emails from our internal tracking
      const res = await fetch(`http://localhost:8787/api/sent-emails?userId=${user.id}`);
      const data = await res.json();
      allSent.push(...(data.sentEmails || []));
    } catch (e) {
      console.error('Failed to fetch internal sent emails', e);
    }
    
    // Also fetch from Gmail API if connected
    if (gmailConnected) {
      try {
        const res = await fetch(`http://localhost:8787/api/gmail/sent?userId=${user.id}`);
        const data = await res.json();
        allSent.push(...(data.sentEmails || []));
      } catch (e) {
        console.error('Failed to fetch Gmail sent emails', e);
      }
    }
    
    // Remove duplicates - prefer entries with followUpDate or bodyHtml (internal tracking)
    const emailMap = new Map<string, any>();
    allSent.forEach(email => {
      const key = `${email.email}|${email.subject}`;
      const existing = emailMap.get(key);
      // Prefer internal tracking (has followUpDate or bodyHtml) over Gmail API entries
      if (!existing || 
          (email.followUpDate && !existing.followUpDate) ||
          (email.bodyHtml && !existing.bodyHtml && !existing.followUpDate)) {
        emailMap.set(key, email);
      }
    });
    
    const uniqueSent = Array.from(emailMap.values());
    
    // Sort by date, newest first
    uniqueSent.sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());
    
    // Full details for expansion
    setSentEmailsWithDetails(uniqueSent);
    
    // Simple list for tab counter
    setSentEmails(uniqueSent.map((s: any) => ({
      email: s.email,
      sentDate: s.sentDate,
      subject: s.subject,
    })));
  }, [user?.id, gmailConnected]);

  // Initial load only
  useEffect(() => {
    if (!initialLoadDone && user?.id) {
    if (activeTab === 'inbox' && gmailConnected) {
      fetchInbox();
    }
    if (activeTab === 'followups') {
      fetchFollowUps();
        fetchAllSentEmails();
      }
      setInitialLoadDone(true);
    }
  }, [initialLoadDone, user?.id, fetchInbox, fetchFollowUps, fetchAllSentEmails]);
  
  // Only reload when manually switching tabs after initial load
  useEffect(() => {
    if (initialLoadDone && user?.id) {
      if (activeTab === 'inbox' && gmailConnected) {
        fetchInbox();
      }
      if (activeTab === 'followups') {
        fetchFollowUps();
        fetchAllSentEmails();
      }
    }
  }, [activeTab, gmailConnected]);

  // Close color picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColorPicker && !(event.target as Element).closest('.color-picker-container')) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  // Update countdown timer every minute
  useEffect(() => {
    if (activeTab === 'followups' && followUpTab === 'sent') {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [activeTab, followUpTab]);

  const signatureHtml = useMemo(() => {
    if (customSignature) return customSignature;
    if (!fullName && !position && !email) return '';
    return `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <div style="font-weight:600;color:#111827;">${fullName || ''}</div>
        ${position ? `<div style=\"color:#374151;\">${position}</div>` : ''}
        ${email ? `<div style=\"color:#6b7280;\">${email}</div>` : ''}
      </div>`;
  }, [fullName, position, email, customSignature]);
  
  // Excel upload handler
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setUploadingExcel(true);
    try {
      const res = await fetch('http://localhost:8787/api/parse-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.contacts) {
        setExcelContacts(data.contacts);
        setContactDrafts([]);
        setActiveTab('excel');
      }
    } catch (err) {
      alert('Failed to parse Excel file');
    } finally {
      setUploadingExcel(false);
    }
  };

  // Update draft editor when draft is newly generated (only set if different)
  useEffect(() => {
    if (draftEditorRef.current && draft && draft.bodyHtml) {
      if (draftEditorRef.current.innerHTML !== draft.bodyHtml) {
        draftEditorRef.current.innerHTML = draft.bodyHtml;
      }
    }
  }, [draft?.subject]);

  // Update Excel editor when current draft changes
  useEffect(() => {
    if (excelEditorRef.current && contactDrafts.length > 0 && currentDraftIndex >= 0 && contactDrafts[currentDraftIndex]) {
      const currentDraft = contactDrafts[currentDraftIndex];
      if (excelEditorRef.current.innerHTML !== currentDraft.bodyHtml) {
        excelEditorRef.current.innerHTML = currentDraft.bodyHtml || '';
      }
    }
  }, [currentDraftIndex, contactDrafts]);

  // Generate drafts for all contacts - One by one with personalization
  const generateAllDrafts = async () => {
    if (!context.trim()) {
      alert('Please provide email context first');
                    return;
                  }
    
    setGeneratingDrafts(true);
    const drafts: ContactDraft[] = [];
    
    // Generate first 10 contacts, one by one
    const contactsToProcess = excelContacts.slice(0, 10);
    setGenerationProgress({ current: 0, total: contactsToProcess.length });
    
    for (let i = 0; i < contactsToProcess.length; i++) {
      const contact = contactsToProcess[i];
      setGenerationProgress({ current: i + 1, total: contactsToProcess.length });
      
      try {
        // Create personalized context for each contact
        let personalizedContext = context;
        
        // Add contact's name to context if not already included
        if (contact.name && !context.toLowerCase().includes(contact.name.toLowerCase())) {
          personalizedContext = `Message for ${contact.name}: ${context}`;
        }
        
        // The API will use recipientName and recipientPosition for personalization
        const res = await fetch('http://localhost:8787/api/claude/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
            context: personalizedContext,
            tone,
            recipientPosition: contact.position || '',
            recipientName: contact.name || '',
            recipientEmail: contact.email,
            senderName: fullName,
            senderPosition: position,
                        }),
                    });
        
        if (res.ok) {
          const emailData = await res.json();
          const bodyWithSig = includeSignature && signatureHtml 
            ? `${emailData.bodyHtml}${signatureHtml}`
            : emailData.bodyHtml;
          
          drafts.push({
            contact,
            subject: emailData.subject,
            bodyHtml: bodyWithSig,
            approved: false,
            edited: false,
          });
          
          // Update drafts array progressively so user can see them
          setContactDrafts([...drafts]);
          setCurrentDraftIndex(drafts.length - 1);
          
          // Small delay between generations for better UX
          await new Promise(resolve => setTimeout(resolve, 800));
        } else {
          const errorData = await res.json();
          console.error('Failed to generate for:', contact.email, errorData);
        }
      } catch (e) {
        console.error('Failed to generate for:', contact.email, e);
        // Continue with next contact even if one fails
      }
    }
    
    setGeneratingDrafts(false);
    setGenerationProgress({ current: 0, total: 0 });
    
    if (drafts.length > 0) {
      alert(`✅ Generated ${drafts.length} personalized email drafts! Each message is tailored to the recipient's name and position.`);
    }
  };
  
  // Import Outlook signature
  const importOutlookSignature = async () => {
    if (!user?.id || !outlookConnected) return;
    try {
      const res = await fetch(`http://localhost:8787/api/outlook/signature?userId=${user.id}`);
      const data = await res.json();
      if (data.signature) {
        setCustomSignature(data.signature);
        alert('✅ Outlook signature imported!');
      } else {
        alert('No signature found in Outlook');
      }
    } catch (err) {
      alert('Failed to import signature');
    }
  };

  const generateEmail = async () => {
    if (!context.trim()) {
      alert('Please provide email context');
      return;
    }
    
                    setLoading(true);
                    setDraft(null);
                    try {
                      const res = await fetch('http://localhost:8787/api/claude/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          tone,
          recipientPosition: toPosition,
          recipientName: toName,
          recipientEmail: toEmail,
          senderName: fullName,
          senderPosition: position,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        const errorMsg = errorData.details?.error?.message || errorData.error || errorData.message || 'Generation failed';
        console.error('API Error:', errorData);
        throw new Error(errorMsg);
      }
                      const data = await res.json();
                      const baseHtml = data.bodyHtml || '';
                      const withSig = includeSignature && signatureHtml
                        ? `${baseHtml}${signatureHtml}`
                        : baseHtml;
                      setDraft({ subject: data.subject, bodyHtml: withSig });
    } catch (e: any) {
      console.error('Generation error:', e);
      const errorMsg = e.message || 'Failed to generate email. Please check your API key and try again.';
      alert(`❌ ${errorMsg}`);
                    } finally {
                      setLoading(false);
                    }
  };

  const generateFollowUpAI = async (originalSubject: string, originalBodyHtml: string, recipientEmail: string) => {
    setGeneratingFollowUp(true);
    try {
      // Extract recipient name from the original message
      // Look for common greeting patterns: "Dear [Name]", "Hello [Name]", etc.
      const plainText = originalBodyHtml.replace(/<[^>]*>/g, '');
      let recipientName = '';
      const nameMatches = plainText.match(/(?:Dear|Hello|Hi)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (nameMatches && nameMatches[1]) {
        recipientName = nameMatches[1];
      }

      const context = `Generate a friendly, professional follow-up email based on this original message I sent:

Subject: ${originalSubject}

Original Message Content:
${plainText}

The follow-up should be concise, check if they have any questions or need clarification, and encourage a response. Keep it warm and professional.`;

      const res = await fetch('http://localhost:8787/api/claude/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          tone: 'friendly professional',
          recipientName: recipientName,
          recipientEmail,
          senderName: fullName,
          senderPosition: position,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await res.json();
      const withSig = includeSignature && signatureHtml
        ? `${data.bodyHtml}${signatureHtml}`
        : data.bodyHtml;
      
      setToEmail(recipientEmail);
      setActiveTab('compose');
      setDraft({ subject: data.subject, bodyHtml: withSig });
    } catch (e: any) {
      console.error('Follow-up generation error:', e);
      alert(`❌ Failed to generate follow-up: ${e.message || 'Unknown error'}`);
    } finally {
      setGeneratingFollowUp(false);
    }
  };

  const updateFollowUpDate = useCallback(async (sentIdx: number, newDate: string) => {
    if (!user?.id) return;
    const sent = sentEmailsWithDetails[sentIdx];
    if (!sent) return;
    
    try {
      const res = await fetch('http://localhost:8787/api/followups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: sent.email,
          subject: sent.subject,
          followUpDate: newDate,
          sentDate: sent.sentDate,
          bodyHtml: sent.bodyHtml,
        }),
      });
      
      if (res.ok) {
        await fetchAllSentEmails();
        setEditingFollowUpDate(null);
      }
    } catch (e) {
      console.error('Failed to update follow-up date', e);
      alert('Failed to update follow-up date');
    }
  }, [user?.id, sentEmailsWithDetails, fetchAllSentEmails]);

  const deleteFollowUpDate = useCallback(async (sentIdx: number) => {
    if (!user?.id) return;
    const sent = sentEmailsWithDetails[sentIdx];
    if (!sent) return;
    
    try {
      const res = await fetch('http://localhost:8787/api/followups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: sent.email,
          subject: sent.subject,
          followUpDate: new Date(0).toISOString(), // Set to epoch to disable follow-up
        }),
      });
      
      if (res.ok) {
        await fetchAllSentEmails();
      }
    } catch (e) {
      console.error('Failed to delete follow-up date', e);
      alert('Failed to delete follow-up date');
    }
  }, [user?.id, sentEmailsWithDetails, fetchAllSentEmails]);

  const getFollowUpCountdown = useCallback((followUpDate: string) => {
    const now = currentTime.getTime();
    const target = new Date(followUpDate).getTime();
    const diff = target - now;
    
    if (diff <= 0) return 'Due';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, [currentTime]);

  const sendDirectEmail = async () => {
                    if (!user?.id) {
                      alert('Please log in first');
                      return;
                    }
    if (!toEmail || !manualSubject || (!manualBody.trim() && !manualBodyHtml.trim())) {
      alert('Please fill in recipient email, subject, and message');
                      return;
                    }
    
    const isConnected = emailProvider === 'outlook' ? outlookConnected : gmailConnected;
    const providerName = emailProvider === 'outlook' ? 'Outlook' : 'Gmail';
    
    if (!isConnected) {
      alert(`Please connect your ${providerName} account first`);
                      return;
                    }
    
                    setLoading(true);
                    try {
      const emailBody = manualBodyHtml.trim() || `<p>${manualBody}</p>`;
      const bodyWithSig = includeSignature && signatureHtml 
        ? `${emailBody}${signatureHtml}`
        : emailBody;
      
      const apiEndpoint = emailProvider === 'outlook' 
        ? 'http://localhost:8787/api/outlook/send'
        : 'http://localhost:8787/api/gmail/send';
      
      const res = await fetch(apiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: user.id,
                          to: [toEmail],
          subject: manualSubject,
          bodyHtml: bodyWithSig,
                        }),
                      });
                      if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.message || 'Send failed');
                      }
                      await res.json();
      alert(`✅ Email sent successfully to ${toEmail} via ${providerName}!`);
      setToEmail('');
      setToName('');
      setToPosition('');
      setManualSubject('');
      setManualBody('');
      setContext('');
      if (activeTab === 'followups') {
        fetchFollowUps();
      }
    } catch (e: any) {
      alert(`Failed to send: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (subject: string, bodyHtml: string, recipientEmail: string) => {
    if (!user?.id) {
      alert('Please log in first');
      return;
    }
    const isConnected = emailProvider === 'outlook' ? outlookConnected : gmailConnected;
    const providerName = emailProvider === 'outlook' ? 'Outlook' : 'Gmail';
    
    if (!isConnected) {
      alert(`Please connect your ${providerName} account first`);
      return;
    }
    setLoading(true);
    try {
      const apiEndpoint = emailProvider === 'outlook' 
        ? 'http://localhost:8787/api/outlook/send'
        : 'http://localhost:8787/api/gmail/send';
      
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          to: [recipientEmail],
          subject,
          bodyHtml,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Send failed');
      }
      await res.json();
      
      // Remove this follow-up from list since it was sent
      try {
        await fetch(`http://localhost:8787/api/followups?userId=${user.id}&email=${encodeURIComponent(recipientEmail)}&subject=${encodeURIComponent(subject)}`, {
          method: 'DELETE',
        });
      } catch (e) {
        // Ignore delete errors, just refresh
      }
      
      // Refresh both lists
      if (activeTab === 'followups') {
        fetchFollowUps();
        fetchAllSentEmails();
      }
      
      alert(`✅ Email sent successfully to ${recipientEmail} via ${providerName}!`);
                      setDraft(null);
      setToEmail('');
      setToName('');
      setToPosition('');
      setContext('');
                    } catch (e: any) {
                      alert(`Failed to send: ${e.message || 'Unknown error'}`);
                    } finally {
                      setLoading(false);
                    }
  };

  const connectProvider = async (provider: 'gmail' | 'outlook') => {
    if (!user?.id) {
      alert('Please log in first');
      return;
    }
    try {
      const endpoint = provider === 'gmail' 
        ? `http://localhost:8787/api/gmail/auth/start?userId=${user.id}`
        : `http://localhost:8787/api/outlook/auth/start?userId=${user.id}`;
      
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.authUrl) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.authUrl,
          `${provider}Auth`,
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no`
        );
        
        const checkInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(
              `http://localhost:8787/api/${provider}/status?userId=${user.id}`
            );
            const statusData = await statusRes.json();
            if (statusData.connected) {
              if (provider === 'gmail') {
                setGmailConnected(true);
                setGmailAccount(statusData.account || null);
              } else {
                setOutlookConnected(true);
                setOutlookAccount(statusData.account || null);
              }
              clearInterval(checkInterval);
              if (popup && !popup.closed) popup.close();
            }
          } catch (e) {
            // Continue polling
          }
        }, 1000);
        
        setTimeout(() => clearInterval(checkInterval), 120000);
      }
    } catch (e) {
      alert('Failed to connect');
    }
  };

  // Send approved drafts
  const sendApprovedDrafts = async () => {
    const approvedDrafts = contactDrafts.filter(draft => draft.approved);
    if (approvedDrafts.length === 0) {
      alert('No drafts approved for sending');
      return;
    }
    
    setSendingApproved(true);
    let sent = 0;
    
    for (const draft of approvedDrafts) {
      try {
        const apiEndpoint = emailProvider === 'outlook' 
          ? 'http://localhost:8787/api/outlook/send'
          : 'http://localhost:8787/api/gmail/send';
        
        await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            to: [draft.contact.email],
            subject: draft.subject,
            bodyHtml: draft.bodyHtml,
          }),
        });
        sent++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.error('Failed to send to:', draft.contact.email, e);
      }
    }
    
    setSendingApproved(false);
    alert(`✅ Sent ${sent} of ${approvedDrafts.length} approved emails!`);
    setContactDrafts([]);
    setExcelContacts([]);
  };

  // Tahcom brand colors
  const tahcomColors = [
    { name: 'Tahcom Maroon', value: '#8B1538' },
    { name: 'Tahcom Orange', value: '#FF8C00' },
    { name: 'Tahcom Amber', value: '#FFA500' },
    { name: 'Black', value: '#000000' },
    { name: 'Dark Gray', value: '#333333' },
    { name: 'Gray', value: '#666666' },
    { name: 'Blue', value: '#0066CC' },
    { name: 'Green', value: '#008000' },
    { name: 'Red', value: '#DC143C' },
    { name: 'Teal', value: '#008080' },
  ];

  const applyColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    setShowColorPicker(false);
  };

  const applyFontSize = (size: string) => {
    document.execCommand('fontSize', false, size);
    setShowFontSizePicker(false);
  };

  const tabs = [
    { id: 'compose' as Tab, label: 'Compose', icon: Send, color: 'text-blue-600' },
    { id: 'inbox' as Tab, label: 'Inbox', icon: Inbox, color: 'text-blue-600' },
    { id: 'followups' as Tab, label: 'Follow-ups', icon: Clock, color: 'text-orange-600' },
    { id: 'excel' as Tab, label: 'Excel Campaign', icon: FileSpreadsheet, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient - Matching Agents Page */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-brand p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Mail className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Email Expert</h1>
                <p className="text-white/95 text-base leading-relaxed">AI-powered email assistant with smart follow-ups and personalized campaigns</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {gmailConnected && gmailAccount && (
                <div className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center gap-2.5 shadow-md">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse shadow-sm"></div>
                  <div>
                    <div className="text-sm font-bold text-white leading-tight">{gmailAccount.name || 'Gmail'}</div>
                    <div className="text-xs text-white/90 leading-tight">{gmailAccount.username}</div>
                  </div>
                </div>
              )}
              {outlookConnected && outlookAccount && (
                <div className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center gap-2.5 shadow-md">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse shadow-sm"></div>
                  <div>
                    <div className="text-sm font-bold text-white leading-tight">{outlookAccount.name || 'Outlook'}</div>
                    <div className="text-xs text-white/90 leading-tight">{outlookAccount.username}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="flex gap-2 p-2 bg-white rounded-2xl shadow-lg border border-gray-100">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-bold text-sm rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-brand text-white shadow-xl transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
              {tab.id === 'followups' && followUps.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white/30 text-white shadow-sm">
                  {followUps.length}
                </span>
              )}
              {tab.id === 'excel' && excelContacts.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white/30 text-white shadow-sm">
                  {excelContacts.length}
                </span>
              )}
                </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          {activeTab === 'compose' && (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <Zap size={24} className="text-yellow-500" />
                  <h3 className="text-xl font-bold text-gray-900">Choose Email Provider</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setEmailProvider('gmail')}
                    className={`p-6 rounded-2xl border-3 transition-all duration-300 ${
                      emailProvider === 'gmail'
                        ? 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50 shadow-xl scale-105'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                        emailProvider === 'gmail' ? 'bg-red-500 text-white shadow-xl' : 'bg-gray-100'
                      }`}>
                        <Mail size={24} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg">Gmail</div>
                        <div className={`text-sm ${emailProvider === 'gmail' ? 'text-red-600' : 'text-gray-500'}`}>
                          {gmailConnected ? '● Connected' : '○ Not connected'}
                        </div>
                      </div>
                    </div>
                    {emailProvider === 'gmail' && (
                      <div className="flex items-center gap-2 text-sm font-bold text-red-600">
                        <Check size={16} />
                        <span>Selected Provider</span>
                      </div>
                    )}
                </button>

                  <button
                    onClick={() => setEmailProvider('outlook')}
                    className={`p-6 rounded-2xl border-3 transition-all duration-300 ${
                      emailProvider === 'outlook'
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl scale-105'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                        emailProvider === 'outlook' ? 'bg-blue-500 text-white shadow-xl' : 'bg-gray-100'
                      }`}>
                        <Mail size={24} />
              </div>
                      <div className="text-left">
                        <div className="font-bold text-lg">Outlook</div>
                        <div className={`text-sm ${emailProvider === 'outlook' ? 'text-blue-600' : 'text-gray-500'}`}>
                          {outlookConnected ? '● Connected' : '○ Not connected'}
                        </div>
                      </div>
                    </div>
                    {emailProvider === 'outlook' && (
                      <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                        <Check size={16} />
                        <span>Selected Provider</span>
              </div>
            )}
                  </button>
                </div>
          </div>

              {/* Compose Forms */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-brand flex items-center justify-center text-white">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Compose Email</h3>
                    <p className="text-gray-600">Send directly or use AI to generate drafts</p>
          </div>
        </div>

                {/* Recipient Details */}
                <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <UserCheck size={20} className="text-brand-1" />
                    <h4 className="font-bold text-gray-900">Recipient Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <User size={16} className="text-brand-1" />
                        Full Name
                      </label>
                      <input
                        className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-brand-1 focus:ring-4 focus:ring-orange-100 text-sm font-medium transition-all"
                        value={toName}
                        onChange={(e) => setToName(e.target.value)}
                        placeholder="e.g., Hassan Ali"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Briefcase size={16} className="text-brand-2" />
                        Position/Title
                      </label>
                      <input
                        className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-brand-1 focus:ring-4 focus:ring-orange-100 text-sm font-medium transition-all"
                        value={toPosition}
                        onChange={(e) => setToPosition(e.target.value)}
                        placeholder="e.g., CEO, Manager, Director"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <AtSign size={16} className="text-brand-3" />
                        Email Address *
                      </label>
                      <input
                        className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-brand-1 focus:ring-4 focus:ring-orange-100 text-sm font-medium transition-all"
                        type="email"
                        value={toEmail}
                        onChange={(e) => setToEmail(e.target.value)}
                        placeholder="hassan@tahcom.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Two Methods */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Direct Send */}
                  <div className="p-6 rounded-2xl border-2 border-brand-1/30 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-brand text-white flex items-center justify-center shadow-lg">
                        <Send size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">Direct Send</h4>
                        <p className="text-sm text-gray-600">Write and send immediately</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <input
                        className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-brand-1 focus:ring-4 focus:ring-orange-100 text-sm font-medium"
                        placeholder="Email subject..."
                        value={manualSubject}
                        onChange={(e) => setManualSubject(e.target.value)}
                      />
                      {/* Rich Text Editor for Manual Email */}
                      <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                        {/* Toolbar */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300 p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Formatting */}
                            <div className="flex gap-1 bg-white rounded-lg p-1 border-2 border-gray-300 shadow-sm">
                              <button
                                onClick={() => document.execCommand('bold')}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all text-gray-700 hover:scale-110"
                                title="Bold"
                              >
                                <Bold size={18} className="font-bold" />
                              </button>
                              <button
                                onClick={() => document.execCommand('italic')}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all text-gray-700 hover:scale-110"
                                title="Italic"
                              >
                                <Italic size={18} className="font-bold" />
                              </button>
                            </div>
                            {/* Alignment */}
                            <div className="flex gap-1 bg-white rounded-lg p-1 border-2 border-gray-300 shadow-sm">
                              <button
                                onClick={() => document.execCommand('justifyLeft')}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all text-gray-700 hover:scale-110"
                                title="Align Left"
                              >
                                <AlignLeft size={18} />
                              </button>
                              <button
                                onClick={() => document.execCommand('justifyCenter')}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all text-gray-700 hover:scale-110"
                                title="Align Center"
                              >
                                <AlignCenter size={18} />
                              </button>
                            </div>
                            {/* Font Size Picker */}
                            <div className="relative color-picker-container">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setFontSizePickerPosition({ x: rect.left, y: rect.bottom + 5 });
                                  setShowFontSizePicker(!showFontSizePicker);
                                  setShowColorPicker(false);
                                }}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all bg-white border-2 border-gray-300 shadow-sm hover:scale-110 text-gray-700"
                                title="Font Size"
                              >
                                <Type size={18} />
                              </button>
                              {showFontSizePicker && (
                                <div 
                                  className="absolute z-50 bg-white border-2 border-brand-1 rounded-xl shadow-2xl p-4 color-picker-container"
                                  style={{ 
                                    left: `${fontSizePickerPosition.x}px`, 
                                    top: `${fontSizePickerPosition.y}px`,
                                    transform: 'translateX(-50%)'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="mb-2 text-xs font-bold text-gray-700 text-center">Choose Font Size</div>
                                  <div className="flex flex-col gap-2">
                                    {[
                                      { label: 'Tiny', value: '1' },
                                      { label: 'Small', value: '2' },
                                      { label: 'Normal', value: '3' },
                                      { label: 'Medium', value: '4' },
                                      { label: 'Large', value: '5' },
                                      { label: 'X-Large', value: '6' },
                                      { label: 'XX-Large', value: '7' },
                                    ].map((size) => (
                                      <button
                                        key={size.value}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          applyFontSize(size.value);
                                        }}
                                        className="px-4 py-2 text-sm font-bold rounded-lg border-2 border-gray-300 hover:border-brand-1 hover:bg-brand-1/10 transition-all text-gray-700"
                                      >
                                        {size.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Color Picker */}
                            <div className="relative color-picker-container">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setColorPickerPosition({ x: rect.left, y: rect.bottom + 5 });
                                  setShowColorPicker(!showColorPicker);
                                  setShowFontSizePicker(false);
                                }}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all bg-white border-2 border-gray-300 shadow-sm hover:scale-110 text-gray-700"
                                title="Text Color - Click to choose"
                              >
                                <Palette size={18} />
                </button>
                              {showColorPicker && (
                                <div 
                                  className="absolute z-50 bg-white border-2 border-brand-1 rounded-xl shadow-2xl p-4 color-picker-container"
                                  style={{ 
                                    left: `${colorPickerPosition.x}px`, 
                                    top: `${colorPickerPosition.y}px`,
                                    transform: 'translateX(-50%)'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="mb-2 text-xs font-bold text-gray-700 text-center">Choose Text Color</div>
                                  <div className="grid grid-cols-5 gap-2">
                                    {tahcomColors.map((color, idx) => (
                                      <button
                                        key={idx}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          applyColor(color.value);
                                        }}
                                        className="h-10 w-10 rounded-lg border-2 border-gray-300 hover:border-brand-1 hover:scale-110 transition-all shadow-sm"
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                      />
                                    ))}
                                  </div>
                                  <div className="mt-3 text-xs text-gray-500 text-center">
                                    Click a color to apply
              </div>
              </div>
            )}
                            </div>
                          </div>
                        </div>
                        {/* Editor */}
                        <div
                          ref={manualEditorRef}
                          contentEditable
                          className="p-4 min-h-[140px] focus:outline-none text-sm"
                          onInput={(e) => {
                            const html = e.currentTarget.innerHTML;
                            setManualBodyHtml(html);
                            setManualBody(e.currentTarget.innerText);
                          }}
                          onBlur={(e) => {
                            setManualBodyHtml(e.currentTarget.innerHTML);
                          }}
                          style={{ minHeight: '140px', color: '#0066CC' }}
                        />
                      </div>
                      <button
                        className="w-full h-12 bg-gradient-brand hover:shadow-lg text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                        onClick={sendDirectEmail}
                        disabled={loading || !toEmail || !manualSubject || (!manualBody.trim() && !manualBodyHtml.trim())}
                      >
                        <Send size={18} />
                        {loading ? 'Sending...' : 'Send Now'}
                      </button>
                    </div>
          </div>

                  {/* AI Draft */}
                  <div className="p-6 rounded-2xl border-2 border-brand-2/30 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-brand text-white flex items-center justify-center shadow-lg">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">AI Assistant</h4>
                        <p className="text-sm text-gray-600">Generate smart, personalized drafts</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <textarea
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-2 focus:ring-4 focus:ring-red-100 min-h-[120px] text-sm resize-none"
                        placeholder="Describe what you want to communicate... (e.g., Introduce our new product, Request a meeting, Follow up on proposal)"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                      />
                      {toPosition && (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-brand-1 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-brand-1">AI Personalization Active</p>
                              <p className="text-xs text-gray-700">Email will be tailored for: <strong>{toPosition}</strong></p>
                            </div>
                          </div>
                        </div>
                      )}
                      <select 
                        className="w-full h-12 px-4 rounded-xl border-2 border-gray-300 focus:border-brand-1 focus:ring-4 focus:ring-orange-100 text-sm font-bold bg-white shadow-sm hover:border-brand-1 transition-all"
                        value={tone} 
                        onChange={(e) => setTone(e.target.value)}
                      >
                        <option value="neutral professional">Professional (Recommended)</option>
                        <option value="friendly">Friendly & Warm</option>
                        <option value="formal">Formal & Corporate</option>
                        <option value="concise">Brief & Direct</option>
                        <option value="persuasive">Persuasive & Engaging</option>
                      </select>
                      <button
                        className="w-full h-12 bg-gradient-brand hover:shadow-xl text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:transform-none"
                        onClick={generateEmail}
                        disabled={loading || !context.trim() || !toEmail.trim()}
                      >
                        <Sparkles size={18} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Generating...' : 'Generate Draft'}
                      </button>
                    </div>
          </div>
        </div>

                {/* Draft Preview */}
                {draft && (
                  <div className="p-6 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <Eye size={20} className="text-green-600" />
                      <h4 className="font-bold text-green-900 text-lg">Generated Draft - Edit & Customize</h4>
                    </div>
        <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-white border-2 border-green-100">
                        <label className="text-xs font-bold text-gray-500 mb-2 block">SUBJECT</label>
                        <input
                          className="w-full text-base font-bold text-gray-900 border-0 focus:outline-none bg-transparent"
                          value={draft.subject}
                          onChange={(e) => setDraft({...draft, subject: e.target.value})}
                        />
            </div>
                      {/* Rich Text Editor for Draft */}
                      <div className="border-2 border-green-100 rounded-xl overflow-hidden bg-white">
                        {/* Toolbar */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300 p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Formatting */}
                            <div className="flex gap-1 bg-white rounded-lg p-1 border-2 border-gray-300 shadow-sm">
                              <button
                                onClick={() => document.execCommand('bold')}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all text-gray-700 hover:scale-110"
                                title="Bold"
                              >
                                <Bold size={18} className="font-bold" />
                              </button>
                              <button
                                onClick={() => document.execCommand('italic')}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all text-gray-700 hover:scale-110"
                                title="Italic"
                              >
                                <Italic size={18} className="font-bold" />
                              </button>
                </div>
                            {/* Alignment */}
                            <div className="flex gap-1 bg-white rounded-lg p-1 border-2 border-gray-300 shadow-sm">
                              <button
                                onClick={() => document.execCommand('justifyLeft')}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all text-gray-700 hover:scale-110"
                                title="Align Left"
                              >
                                <AlignLeft size={18} />
                              </button>
                              <button
                                onClick={() => document.execCommand('justifyCenter')}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all text-gray-700 hover:scale-110"
                                title="Align Center"
                              >
                                <AlignCenter size={18} />
                              </button>
                </div>
                            {/* Font Size Picker */}
                            <div className="relative color-picker-container">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setFontSizePickerPosition({ x: rect.left, y: rect.bottom + 5 });
                                  setShowFontSizePicker(!showFontSizePicker);
                                  setShowColorPicker(false);
                                }}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all bg-white border-2 border-gray-300 shadow-sm hover:scale-110 text-gray-700"
                                title="Font Size"
                              >
                                <Type size={18} />
                              </button>
                              {showFontSizePicker && (
                                <div 
                                  className="absolute z-50 bg-white border-2 border-brand-1 rounded-xl shadow-2xl p-4 color-picker-container"
                                  style={{ 
                                    left: `${fontSizePickerPosition.x}px`, 
                                    top: `${fontSizePickerPosition.y}px`,
                                    transform: 'translateX(-50%)'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="mb-2 text-xs font-bold text-gray-700 text-center">Choose Font Size</div>
                                  <div className="flex flex-col gap-2">
                                    {[
                                      { label: 'Tiny', value: '1' },
                                      { label: 'Small', value: '2' },
                                      { label: 'Normal', value: '3' },
                                      { label: 'Medium', value: '4' },
                                      { label: 'Large', value: '5' },
                                      { label: 'X-Large', value: '6' },
                                      { label: 'XX-Large', value: '7' },
                                    ].map((size) => (
                                      <button
                                        key={size.value}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          applyFontSize(size.value);
                                        }}
                                        className="px-4 py-2 text-sm font-bold rounded-lg border-2 border-gray-300 hover:border-brand-1 hover:bg-brand-1/10 transition-all text-gray-700"
                                      >
                                        {size.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Color Picker */}
                            <div className="relative color-picker-container">
                <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setColorPickerPosition({ x: rect.left, y: rect.bottom + 5 });
                                  setShowColorPicker(!showColorPicker);
                                  setShowFontSizePicker(false);
                                }}
                                className="p-2.5 rounded-lg hover:bg-brand-1/20 hover:text-brand-1 transition-all bg-white border-2 border-gray-300 shadow-sm hover:scale-110 text-gray-700"
                                title="Text Color - Click to choose"
                              >
                                <Palette size={18} />
                </button>
                              {showColorPicker && (
                                <div 
                                  className="absolute z-50 bg-white border-2 border-brand-1 rounded-xl shadow-2xl p-4 color-picker-container"
                                  style={{ 
                                    left: `${colorPickerPosition.x}px`, 
                                    top: `${colorPickerPosition.y}px`,
                                    transform: 'translateX(-50%)'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="mb-2 text-xs font-bold text-gray-700 text-center">Choose Text Color</div>
                                  <div className="grid grid-cols-5 gap-2">
                                    {tahcomColors.map((color, idx) => (
                <button
                                        key={idx}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          applyColor(color.value);
                                        }}
                                        className="h-10 w-10 rounded-lg border-2 border-gray-300 hover:border-brand-1 hover:scale-110 transition-all shadow-sm"
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                      />
                                    ))}
              </div>
                                  <div className="mt-3 text-xs text-gray-500 text-center">
                                    Click a color to apply
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Editor */}
                        <div className="p-4">
                          <label className="text-xs font-bold text-gray-500 mb-2 block">MESSAGE BODY</label>
                          <div 
                            ref={draftEditorRef}
                            className="prose prose-sm max-w-none min-h-[200px] focus:outline-none"
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => {
                              setDraft({...draft, bodyHtml: e.currentTarget.innerHTML});
                            }}
                            onBlur={(e) => setDraft({...draft, bodyHtml: e.currentTarget.innerHTML})}
                            style={{ color: '#0066CC' }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          className="flex-1 h-14 bg-gradient-brand hover:shadow-xl text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:transform-none"
                          onClick={() => sendEmail(draft.subject, draft.bodyHtml, toEmail)}
                          disabled={loading}
                        >
                          <Send size={20} />
                          {loading ? 'Sending...' : 'Send Email'}
                </button>
                        <button
                          className="h-14 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl flex items-center justify-center transition-all"
                          onClick={() => setDraft(null)}
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
            )}
          </div>
            </div>
          )}

          {activeTab === 'excel' && (
            <div className="space-y-6">
              {/* Excel Upload Section */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-xl">
                    <FileSpreadsheet size={32} />
              </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Excel Campaign Manager</h3>
                    <p className="text-gray-600">Upload contacts, review AI-generated drafts, and send personalized emails</p>
              </div>
              </div>

                {/* Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                    <div className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">1</span>
                      Upload Excel
                    </div>
                    <p className="text-sm text-blue-800">Required columns: <strong>Name, Email, Position</strong></p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-brand-1/10 via-brand-2/10 to-brand-3/10 border border-brand-1/30">
                    <div className="font-bold text-brand-1 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-brand text-white text-sm flex items-center justify-center font-bold">2</span>
                      Generate Drafts
                    </div>
                    <p className="text-sm text-brand-1 font-semibold">✨ AI creates <strong>unique personalized</strong> message for each contact</p>
                    <p className="text-xs text-gray-700 mt-1">Each email uses recipient's name and position</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                    <div className="font-bold text-green-900 mb-2 flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center">3</span>
                      Review & Send
                    </div>
                    <p className="text-sm text-green-800">Review each draft, edit if needed, then send approved emails</p>
                  </div>
                </div>

                {/* Upload Area */}
                <label className="block">
              <input
                type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                  <div className="border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-brand-1 hover:bg-gradient-to-br hover:from-orange-50 hover:to-amber-50 transition-all group">
                    <Upload size={48} className="mx-auto mb-4 text-gray-400 group-hover:text-brand-1 transition-colors" />
                    <div className="text-xl font-bold text-gray-700 mb-2">
                      {uploadingExcel ? (
                        <span className="flex items-center justify-center gap-3">
                          <RefreshCw size={24} className="animate-spin text-brand-1" />
                          Processing Excel file...
                        </span>
                      ) : (
                        'Drop Excel file here or click to browse'
                      )}
                    </div>
                    <p className="text-gray-500 mb-2">Maximum 10 contacts will be processed per batch</p>
                    <p className="text-sm text-gray-400">Supports .xlsx and .xls files</p>
                  </div>
                </label>

                {/* Context Input for Excel Campaign */}
                {excelContacts.length > 0 && (
                  <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-brand-1/10 via-brand-2/10 to-brand-3/10 border-2 border-brand-1/30">
                    <div className="flex items-center gap-3 mb-4">
                      <MessageSquare size={24} className="text-brand-1" />
                      <h4 className="text-xl font-bold text-gray-900">Campaign Message</h4>
                    </div>
                    <textarea
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-1 focus:ring-4 focus:ring-orange-100 min-h-[100px] text-sm resize-none"
                      placeholder="Describe what you want to communicate in this campaign... (e.g., Introduce our new service, Invite to webinar, Follow up on proposal)"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                    />
                    <div className="flex items-center gap-4 mt-4">
                      <select 
                        className="h-12 px-4 rounded-xl border-2 border-gray-300 focus:border-brand-1 focus:ring-4 focus:ring-orange-100 text-sm font-bold bg-white min-w-[200px] shadow-sm hover:border-brand-1 transition-all"
                        value={tone} 
                        onChange={(e) => setTone(e.target.value)}
                      >
                        <option value="neutral professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="formal">Formal</option>
                        <option value="concise">Brief</option>
                        <option value="persuasive">Persuasive</option>
                      </select>
                <button
                        onClick={generateAllDrafts}
                        disabled={generatingDrafts || !context.trim()}
                        className="h-12 px-6 bg-gradient-brand hover:shadow-xl text-white font-bold rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:transform-none"
                      >
                        <Sparkles size={18} className={generatingDrafts ? 'animate-spin' : ''} />
                        {generatingDrafts 
                          ? `Generating ${generationProgress.current}/${generationProgress.total}...` 
                          : 'Generate Personalized Drafts'}
                </button>
                    </div>
                    
                    {/* Generation Progress */}
                    {generatingDrafts && generationProgress.total > 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-brand-1/10 to-brand-2/10 border border-brand-1/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-bold text-brand-1">
                            Generating personalized drafts...
                          </div>
                          <div className="text-sm font-bold text-brand-1">
                            {generationProgress.current} of {generationProgress.total}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-gradient-brand h-2.5 rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          ⚡ Each message is personalized with recipient's name and position
                        </div>
                      </div>
            )}
          </div>
                )}

                {/* Contacts List */}
                {excelContacts.length > 0 && (
                  <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Users size={24} className="text-green-600" />
                        <h4 className="text-xl font-bold text-green-900">{excelContacts.length} Contacts Loaded</h4>
              </div>
                      {contactDrafts.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle2 size={16} />
                          <span>{contactDrafts.filter(d => d.approved).length} approved for sending</span>
              </div>
                      )}
              </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {excelContacts.slice(0, 10).map((contact, idx) => (
                        <div key={idx} className="p-4 rounded-xl border-2 border-green-200 bg-white hover:shadow-md transition-all">
                          <div className="font-bold text-sm text-gray-900 mb-1">{contact.name}</div>
                          <div className="text-xs text-brand-1 font-semibold mb-1">{contact.position}</div>
                          <div className="text-xs text-gray-500">{contact.email}</div>
              </div>
                      ))}
                    </div>
                </div>
              )}

                {/* Draft Review Section */}
                {contactDrafts.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Eye size={24} className="text-brand-1" />
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">Review Personalized Drafts</h4>
                          <p className="text-xs text-brand-1 font-semibold mt-0.5">✨ Each message is uniquely tailored to the recipient</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 font-semibold">
                          {currentDraftIndex + 1} of {contactDrafts.length}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentDraftIndex(Math.max(0, currentDraftIndex - 1))}
                            disabled={currentDraftIndex === 0}
                            className="h-10 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentDraftIndex(Math.min(contactDrafts.length - 1, currentDraftIndex + 1))}
                            disabled={currentDraftIndex === contactDrafts.length - 1}
                            className="h-10 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
            </div>
          </div>

                    {/* Current Draft */}
                    {contactDrafts[currentDraftIndex] && (
                      <div className="p-6 rounded-2xl border-2 border-brand-1/30 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-bold text-lg text-gray-900">{contactDrafts[currentDraftIndex].contact.name}</h5>
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-brand text-white">
                                Personalized
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{contactDrafts[currentDraftIndex].contact.position} • {contactDrafts[currentDraftIndex].contact.email}</p>
                          </div>
                          <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                            contactDrafts[currentDraftIndex].approved 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {contactDrafts[currentDraftIndex].approved ? '✓ Approved' : 'Not Approved'}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-white border-2 border-gray-200">
                            <label className="text-xs font-bold text-gray-500 mb-2 block">SUBJECT</label>
              <input
                              className="w-full text-base font-semibold text-gray-900 border-0 focus:outline-none bg-transparent"
                              value={contactDrafts[currentDraftIndex].subject}
                onChange={(e) => {
                                const newDrafts = [...contactDrafts];
                                newDrafts[currentDraftIndex] = {
                                  ...newDrafts[currentDraftIndex],
                                  subject: e.target.value,
                                  edited: true
                                };
                                setContactDrafts(newDrafts);
                              }}
                            />
                          </div>
                          {/* Rich Text Editor for Excel Draft */}
                          <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                            {/* Toolbar */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Formatting */}
                                <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
                                  <button
                                    onClick={() => document.execCommand('bold')}
                                    className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                                    title="Bold"
                                  >
                                    <Bold size={16} />
                                  </button>
                                  <button
                                    onClick={() => document.execCommand('italic')}
                                    className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                                    title="Italic"
                                  >
                                    <Italic size={16} />
                                  </button>
                                </div>
                                {/* Alignment */}
                                <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
                                  <button
                                    onClick={() => document.execCommand('justifyLeft')}
                                    className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                                    title="Align Left"
                                  >
                                    <AlignLeft size={16} />
                                  </button>
                                  <button
                                    onClick={() => document.execCommand('justifyCenter')}
                                    className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                                    title="Align Center"
                                  >
                                    <AlignCenter size={16} />
                                  </button>
                                </div>
                                {/* Font Size Picker */}
                                <div className="relative color-picker-container">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setFontSizePickerPosition({ x: rect.left, y: rect.bottom + 5 });
                                      setShowFontSizePicker(!showFontSizePicker);
                                      setShowColorPicker(false);
                                    }}
                                    className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors bg-white border border-gray-200"
                                    title="Font Size"
                                  >
                                    <Type size={16} />
                                  </button>
                                  {showFontSizePicker && (
                                    <div 
                                      className="absolute z-50 bg-white border-2 border-brand-1 rounded-xl shadow-2xl p-4 color-picker-container"
                                      style={{ 
                                        left: `${fontSizePickerPosition.x}px`, 
                                        top: `${fontSizePickerPosition.y}px`,
                                        transform: 'translateX(-50%)'
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="mb-2 text-xs font-bold text-gray-700 text-center">Choose Font Size</div>
                                      <div className="flex flex-col gap-2">
                                        {[
                                          { label: 'Tiny', value: '1' },
                                          { label: 'Small', value: '2' },
                                          { label: 'Normal', value: '3' },
                                          { label: 'Medium', value: '4' },
                                          { label: 'Large', value: '5' },
                                          { label: 'X-Large', value: '6' },
                                          { label: 'XX-Large', value: '7' },
                                        ].map((size) => (
                                          <button
                                            key={size.value}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              applyFontSize(size.value);
                                            }}
                                            className="px-4 py-2 text-sm font-bold rounded-lg border-2 border-gray-300 hover:border-brand-1 hover:bg-brand-1/10 transition-all text-gray-700"
                                          >
                                            {size.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {/* Color Picker */}
                                <div className="relative color-picker-container">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setColorPickerPosition({ x: rect.left, y: rect.bottom + 5 });
                                      setShowColorPicker(!showColorPicker);
                                      setShowFontSizePicker(false);
                                    }}
                                    className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors bg-white border border-gray-200"
                                    title="Text Color - Click to choose"
                                  >
                                    <Palette size={16} />
                                  </button>
                                  {showColorPicker && (
                                    <div 
                                      className="absolute z-50 bg-white border-2 border-brand-1 rounded-xl shadow-2xl p-4 color-picker-container"
                                      style={{ 
                                        left: `${colorPickerPosition.x}px`, 
                                        top: `${colorPickerPosition.y}px`,
                                        transform: 'translateX(-50%)'
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="mb-2 text-xs font-bold text-gray-700 text-center">Choose Text Color</div>
                                      <div className="grid grid-cols-5 gap-2">
                                        {tahcomColors.map((color, idx) => (
                                          <button
                                            key={idx}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              applyColor(color.value);
                                            }}
                                            className="h-10 w-10 rounded-lg border-2 border-gray-300 hover:border-brand-1 hover:scale-110 transition-all shadow-sm"
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                          />
                                        ))}
                                      </div>
                                      <div className="mt-3 text-xs text-gray-500 text-center">
                                        Click a color to apply
                                      </div>
                                    </div>
              )}
            </div>
                              </div>
                            </div>
                            {/* Editor */}
                            <div className="p-4">
                              <label className="text-xs font-bold text-gray-500 mb-2 block">MESSAGE BODY</label>
                              <div 
                                ref={excelEditorRef}
                                className="prose prose-sm max-w-none min-h-[200px] focus:outline-none"
                                contentEditable
                                suppressContentEditableWarning
                                onInput={(e) => {
                                  const newDrafts = [...contactDrafts];
                                  newDrafts[currentDraftIndex] = {
                                    ...newDrafts[currentDraftIndex],
                                    bodyHtml: e.currentTarget.innerHTML,
                                    edited: true
                                  };
                                  setContactDrafts(newDrafts);
                                }}
                                onBlur={(e) => {
                                  const newDrafts = [...contactDrafts];
                                  newDrafts[currentDraftIndex] = {
                                    ...newDrafts[currentDraftIndex],
                                    bodyHtml: e.currentTarget.innerHTML,
                                    edited: true
                                  };
                                  setContactDrafts(newDrafts);
                                }}
                                style={{ color: '#0066CC' }}
                              />
                            </div>
                          </div>

                          <div className="flex gap-3">
              <button
                              onClick={() => {
                                const newDrafts = [...contactDrafts];
                                newDrafts[currentDraftIndex] = {
                                  ...newDrafts[currentDraftIndex],
                                  approved: !newDrafts[currentDraftIndex].approved
                                };
                                setContactDrafts(newDrafts);
                              }}
                              className={`flex-1 h-12 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg ${
                                contactDrafts[currentDraftIndex].approved
                                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                  : 'bg-gradient-brand hover:shadow-xl text-white transform hover:scale-105'
                              }`}
                            >
                              <Check size={18} />
                              {contactDrafts[currentDraftIndex].approved ? 'Remove Approval' : 'Approve for Sending'}
              </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Send All Approved */}
                    <div className="mt-6 flex justify-center">
              <button
                        onClick={sendApprovedDrafts}
                        disabled={sendingApproved || contactDrafts.filter(d => d.approved).length === 0}
                        className="h-14 px-8 bg-gradient-brand hover:shadow-xl text-white font-bold rounded-2xl flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:transform-none"
                      >
                        <Send size={20} />
                        {sendingApproved ? 'Sending...' : `Send ${contactDrafts.filter(d => d.approved).length} Approved Emails`}
                      </button>
            </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other tabs remain the same... */}
          {activeTab === 'inbox' && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Inbox size={24} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Gmail Inbox</h3>
                </div>
              <button
                  className="h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all"
                  onClick={fetchInbox}
                  disabled={loadingInbox || !gmailConnected}
                >
                  <RefreshCw size={18} className={loadingInbox ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
              {!gmailConnected ? (
                <div className="text-center py-16">
                  <Mail size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 font-medium text-lg">Connect Gmail to view inbox</p>
                </div>
              ) : loadingInbox ? (
                <div className="text-center py-16">
                  <RefreshCw size={48} className="mx-auto mb-4 text-brand-1 animate-spin" />
                  <p className="text-gray-600">Loading inbox...</p>
                </div>
              ) : inboxEmails.length === 0 ? (
                <div className="text-center py-16">
                  <Inbox size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600">No emails in inbox</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inboxEmails.map((email) => (
                    <div
                      key={email.id}
                      className={`p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                        email.unread 
                          ? 'bg-blue-50 border-blue-200 hover:border-blue-300' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                onClick={() => {
                        setToEmail(email.from.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] || email.from);
                        setContext(`Reply to: ${email.subject}`);
                        setActiveTab('compose');
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {email.unread && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                            <span className="font-bold text-sm text-gray-900">{email.from}</span>
                          </div>
                          <div className="font-semibold text-base text-gray-900 mb-1">{email.subject}</div>
                          <div className="text-sm text-gray-600 line-clamp-2">{email.snippet}</div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400 flex-shrink-0 ml-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'followups' && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Clock size={24} className="text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Follow-ups & History</h3>
                </div>
                <button
                  className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all"
                  onClick={() => { fetchFollowUps(); fetchAllSentEmails(); }}
                  disabled={loadingFollowUps}
                >
                  <RefreshCw size={18} className={loadingFollowUps ? 'animate-spin' : ''} />
                  Refresh
              </button>
            </div>

              {/* Sub-tabs */}
              <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
              <button
                  onClick={() => setFollowUpTab('due')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold text-sm rounded-lg transition-all ${
                    followUpTab === 'due'
                      ? 'bg-white text-orange-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bell size={16} />
                  <span>Due for Follow-up</span>
                  {followUps.length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-500 text-white">
                      {followUps.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setFollowUpTab('sent')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold text-sm rounded-lg transition-all ${
                    followUpTab === 'sent'
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <History size={16} />
                  <span>All Sent Emails</span>
                  {sentEmails.length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gray-400 text-white">
                      {sentEmails.length}
                    </span>
                  )}
                </button>
              </div>

              {loadingFollowUps ? (
                <div className="text-center py-16">
                  <RefreshCw size={48} className="mx-auto mb-4 text-brand-1 animate-spin" />
                  <p className="text-gray-600">Loading...</p>
                </div>
              ) : followUpTab === 'due' ? (
                followUps.length === 0 ? (
                  <div className="text-center py-16">
                    <Bell size={64} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600 font-medium text-lg">No follow-ups due</p>
                    <p className="text-sm text-gray-500 mt-2">Set a follow-up date on any sent email to track it here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {followUps.map((followUp, idx) => (
                      <div key={idx} className="p-5 rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Bell size={16} className="text-orange-600" />
                              <span className="font-bold text-sm text-gray-900">{followUp.email}</span>
                            </div>
                            <div className="text-sm text-gray-700 mb-1">
                              <strong>Subject:</strong> {followUp.subject}
                            </div>
                            <div className="text-xs text-gray-600">
                              Sent: {new Date(followUp.lastSent).toLocaleDateString()} • 
                              Follow-up due: {new Date(followUp.followUpDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        {selectedFollowUp === idx ? (
                          <div className="mt-4 pt-4 border-t border-orange-300">
                            <div className="mb-4">
                              <div className="text-xs font-bold text-orange-700 mb-2">ORIGINAL MESSAGE</div>
                              <div className="text-sm text-gray-700 prose prose-sm max-w-none bg-white p-4 rounded-lg border border-orange-200" dangerouslySetInnerHTML={{ __html: followUp.bodyHtml || 'No content available' }} />
                            </div>
                            <div className="flex gap-2">
                          <button
                                className="flex-1 h-11 bg-gradient-brand hover:shadow-xl text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                                onClick={() => generateFollowUpAI(followUp.subject, followUp.bodyHtml || '', followUp.email)}
                                disabled={generatingFollowUp}
                              >
                                {generatingFollowUp ? (
                                  <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={16} />
                                    Follow-up by AI
                                  </>
                                )}
                              </button>
                              <button
                                className="h-11 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
                                onClick={() => setSelectedFollowUp(null)}
                              >
                                Hide
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              className="flex-1 h-11 bg-gradient-brand hover:shadow-xl text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg"
                            onClick={() => {
                              setToEmail(followUp.email);
                              setContext(`Follow up on: ${followUp.subject}`);
                              setActiveTab('compose');
                            }}
                          >
                            <Send size={16} />
                            Follow Up
                          </button>
                            <button
                              className="h-11 px-4 bg-orange-200 hover:bg-orange-300 text-orange-900 font-bold rounded-xl transition-all"
                              onClick={() => setSelectedFollowUp(idx)}
                            >
                              <Eye size={16} />
                          </button>
            </div>
                        )}
                  </div>
                ))}
                  </div>
                )
              ) : (
                sentEmailsWithDetails.length === 0 ? (
                  <div className="text-center py-16">
                    <History size={64} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600">No sent emails yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentEmailsWithDetails.map((sent, idx) => {
                      const hasFollowUp = sent.followUpDate && new Date(sent.followUpDate).getTime() > 0;
                      const isExpanded = expandedSentEmail === `${idx}`;
                      const isEditingDate = editingFollowUpDate === idx;
                      const countdown = hasFollowUp ? getFollowUpCountdown(sent.followUpDate) : null;
                      const isDue = countdown === 'Due';
                      
                      return (
                        <div key={idx} className={`relative p-4 rounded-xl border-2 bg-white hover:border-gray-300 transition-all overflow-hidden ${
                          hasFollowUp ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50' : 'border-gray-200'
                        }`}>
                          {hasFollowUp && !isExpanded && (
                            <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">
                              ✓ Follow-up Set
                            </div>
                          )}
                          <div 
                            className="cursor-pointer"
                            onClick={() => setExpandedSentEmail(expandedSentEmail === `${idx}` ? null : `${idx}`)}
                          >
                        <div className="flex items-center gap-2 mb-1">
                              {hasFollowUp && (
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                                  isDue ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                                }`}>
                                  <Clock size={12} />
                                  {isDue ? 'Due' : countdown}
                                </div>
                              )}
                          <CheckCircle2 size={16} className="text-green-600" />
                          <span className="font-semibold text-sm text-gray-900">{sent.email}</span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">{sent.subject}</div>
                        <div className="text-xs text-gray-500">
                          Sent: {new Date(sent.sentDate).toLocaleString()}
                        </div>
                      </div>
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="mb-3">
                                <div className="text-xs font-bold text-gray-500 mb-2">MESSAGE CONTENT</div>
                                <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sent.bodyHtml }} />
                              </div>
                              
                              {/* Follow-up Date Section */}
                              <div className="mt-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-orange-600" />
                                    <span className="text-xs font-bold text-orange-900">Schedule Follow-up</span>
                                  </div>
                                  {hasFollowUp && !isEditingDate && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteFollowUpDate(idx);
                                      }}
                                      className="text-xs text-red-600 hover:text-red-800 font-bold"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                                
                                {isEditingDate ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="datetime-local"
                                      defaultValue={hasFollowUp ? new Date(sent.followUpDate).toISOString().slice(0, 16) : ''}
                                      className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                                      onClick={(e) => e.stopPropagation()}
                                      ref={(input) => {
                                        if (input) {
                                          const handler = (e: KeyboardEvent) => {
                                            if (e.key === 'Enter') {
                                              const value = input.value;
                                              if (value) {
                                                updateFollowUpDate(idx, new Date(value).toISOString());
                                              }
                                            }
                                          };
                                          input.addEventListener('keypress', handler);
                                          return () => input.removeEventListener('keypress', handler);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                                        if (input && input.value) {
                                          updateFollowUpDate(idx, new Date(input.value).toISOString());
                                        }
                                      }}
                                      className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingFollowUpDate(null);
                                      }}
                                      className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-400 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {hasFollowUp ? (
                                      <>
                                        <span className="text-sm text-orange-900">
                                          Follow-up: {new Date(sent.followUpDate).toLocaleString()}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingFollowUpDate(idx);
                                          }}
                                          className="ml-auto text-orange-600 hover:text-orange-800"
                                        >
                                          <Edit3 size={14} />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingFollowUpDate(idx);
                                        }}
                                        className="w-full px-3 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                                      >
                                        <Calendar size={14} />
                                        Set Follow-up Date
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!hasFollowUp) {
                                      alert('Please set a follow-up date first!');
                                    } else if (!isDue) {
                                      alert('Follow-up not due yet!');
                                    } else {
                                      setToEmail(sent.email);
                                      setContext(`Follow up on: ${sent.subject}`);
                                      setActiveTab('compose');
                                    }
                                  }}
                                  className="flex-1 h-10 bg-gradient-brand hover:shadow-lg text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                  disabled={!hasFollowUp || !isDue}
                                >
                                  <Send size={14} />
                                  Follow Up Now
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    generateFollowUpAI(sent.subject, sent.bodyHtml, sent.email);
                                  }}
                                  className="flex-1 h-10 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                                >
                                  <Sparkles size={14} />
                                  AI Follow-up
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
                )}
              </div>
            )}
          </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Connections */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Account Connections</h3>
            <div className="space-y-4">
              {/* Gmail */}
              <div className="p-4 rounded-xl border-2 border-gray-200 hover:border-red-200 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                    <Mail size={20} className="text-red-600" />
        </div>
                  <div className="flex-1">
                    <div className="font-bold text-base">Gmail</div>
                    <div className="text-sm text-gray-500">
                      {checkingGmail ? 'Checking...' : gmailConnected ? '● Connected' : '○ Not connected'}
      </div>
    </div>
                </div>
                {gmailConnected && gmailAccount ? (
                  <div className="text-sm text-gray-600 p-2 bg-green-50 rounded-lg">
                    <div className="font-medium">{gmailAccount.name}</div>
                    <div className="text-xs">{gmailAccount.username}</div>
                  </div>
                ) : (
                  <button
                    className="w-full h-10 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                    onClick={() => connectProvider('gmail')}
                  >
                    <Mail size={16} />
                    Connect Gmail
                  </button>
                )}
              </div>

              {/* Outlook */}
              <div className="p-4 rounded-xl border-2 border-gray-200 hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Mail size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base">Outlook</div>
                    <div className="text-sm text-gray-500">
                      {checkingOutlook ? 'Checking...' : outlookConnected ? '● Connected' : '○ Not connected'}
                    </div>
                  </div>
                </div>
                {outlookConnected && outlookAccount ? (
                  <div className="text-sm text-gray-600 p-2 bg-green-50 rounded-lg">
                    <div className="font-medium">{outlookAccount.name}</div>
                    <div className="text-xs">{outlookAccount.username}</div>
                  </div>
                ) : (
                  <button
                    className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                    onClick={() => connectProvider('outlook')}
                  >
                    <Mail size={16} />
                    Connect Outlook
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Email Signature */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Email Signature</h3>
              <button
                onClick={() => setEditingSignature(!editingSignature)}
                className="text-sm font-bold text-brand-1 hover:text-brand-2 flex items-center gap-2 transition-colors"
              >
                {editingSignature ? <Eye size={16} /> : <Edit3 size={16} />}
                {editingSignature ? 'Preview' : 'Edit'}
              </button>
            </div>
            
            {editingSignature ? (
              <div className="space-y-4">
                {/* Rich Text Editor */}
                <div className="border-2 border-brand-1/30 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 p-3">
                    <div className="flex flex-wrap gap-2">
                      {/* Formatting */}
                      <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
                        <button
                          onClick={() => document.execCommand('bold')}
                          className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                          title="Bold"
                        >
                          <Bold size={16} />
                        </button>
                        <button
                          onClick={() => document.execCommand('italic')}
                          className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                          title="Italic"
                        >
                          <Italic size={16} />
                        </button>
                      </div>
                      
                      {/* Alignment */}
                      <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
                        <button
                          onClick={() => document.execCommand('justifyLeft')}
                          className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                          title="Align Left"
                        >
                          <AlignLeft size={16} />
                        </button>
                        <button
                          onClick={() => document.execCommand('justifyCenter')}
                          className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                          title="Align Center"
                        >
                          <AlignCenter size={16} />
                        </button>
                      </div>

                      {/* Colors & Media */}
                      <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
                        <button
                          onClick={() => {
                            const color = prompt('Enter color (e.g., #8B1538 for Tahcom maroon):');
                            if (color) document.execCommand('foreColor', false, color);
                          }}
                          className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                          title="Text Color"
                        >
                          <Palette size={16} />
                        </button>
                        <button
                          onClick={() => {
                            const url = prompt('Enter image URL (for icons/logos):');
                            if (url) document.execCommand('insertImage', false, url);
                          }}
                          className="p-2 rounded hover:bg-brand-1/10 hover:text-brand-1 transition-colors"
                          title="Insert Image"
                        >
                          <Image size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div
                    contentEditable
                    className="p-4 min-h-[150px] focus:outline-none bg-white text-sm"
                    dangerouslySetInnerHTML={{ __html: customSignature || signatureHtml }}
                    onBlur={(e) => setCustomSignature(e.currentTarget.innerHTML)}
                  />
                </div>
                <div className="flex gap-2">
                  {outlookConnected && (
                    <button
                      onClick={importOutlookSignature}
                      className="flex-1 h-10 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <Download size={16} />
                      Import from Outlook
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setCustomSignature('');
                      setEditingSignature(false);
                    }}
                    className="h-10 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-all"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 min-h-[100px]">
                  {customSignature || signatureHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: customSignature || signatureHtml }} />
                  ) : (
                    <p className="text-sm text-gray-500 italic">No signature set. Click Edit to create one.</p>
                  )}
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <input
                    id="incl-sign"
                    type="checkbox"
                    checked={includeSignature}
                    onChange={(e) => setIncludeSignature(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="incl-sign" className="text-sm text-gray-700 font-medium">
                    Include signature in all emails
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Identity</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Full Name</label>
                <input
                  className="w-full mt-1 h-10 px-3 rounded-lg border-2 border-gray-200 focus:border-brand-1 text-sm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">Position</label>
                <input
                  className="w-full mt-1 h-10 px-3 rounded-lg border-2 border-gray-200 focus:border-brand-1 text-sm"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Your job title"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">Email</label>
                <input
                  className="w-full mt-1 h-10 px-3 rounded-lg border-2 border-gray-200 focus:border-brand-1 text-sm"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailExpertPage;