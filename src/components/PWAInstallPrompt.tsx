import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Compass, Chrome, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'chrome' | 'edge' | 'firefox' | 'safari' | 'safari-ios' | 'safari-desktop' | 'other';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    return 'safari-ios';
  }
  
  if (/edg/i.test(ua)) {
    return 'edge';
  }
  
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) {
    return 'chrome';
  }
  
  if (/firefox/i.test(ua)) {
    return 'firefox';
  }
  
  if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
    return 'safari-desktop';
  }
  
  return 'other';
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [browser, setBrowser] = useState<BrowserType>('other');

  useEffect(() => {
    const detectedBrowser = detectBrowser();
    setBrowser(detectedBrowser);

    const showWithDelay = () => {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    if (standaloneMatch || iosStandalone) {
      setIsInstalled(true);
      return;
    }

    // For browsers that support beforeinstallprompt (Chrome, Edge, etc.)
    if (detectedBrowser === 'chrome' || detectedBrowser === 'edge' || detectedBrowser === 'other') {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        showWithDelay();
      };

      window.addEventListener('beforeinstallprompt', handler);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    // For Safari iOS, Safari Desktop, and Firefox (manual install)
    if (detectedBrowser === 'safari-ios' || detectedBrowser === 'safari-desktop' || detectedBrowser === 'firefox') {
      showWithDelay();
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled || !showPrompt) return null;

  const renderBrowserInstructions = () => {
    switch (browser) {
      case 'safari-ios':
        return (
          <div className="text-sm space-y-2">
            <p className="font-semibold">Install on iPhone/iPad:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs ml-2">
              <li>Tap the <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded">Share</span> button <span className="font-bold">□↑</span> at the bottom</li>
              <li>Scroll down and select <span className="font-bold">"Add to Home Screen"</span></li>
              <li>Tap <span className="font-bold">"Add"</span> in the top-right corner</li>
            </ol>
            <p className="text-xs text-white/90 mt-2">✨ The app will appear on your home screen!</p>
          </div>
        );

      case 'safari-desktop':
        return (
          <div className="text-sm space-y-2">
            <p className="font-semibold">Install with Safari:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs ml-2">
              <li>Click the <span className="font-bold">Share</span> button <span className="font-bold">□↑</span> in the Safari toolbar</li>
              <li>Select <span className="font-bold">"Add to Dock"</span> or <span className="font-bold">"Add to Home Screen"</span></li>
              <li>Click <span className="font-bold">"Add"</span> to confirm</li>
            </ol>
            <p className="text-xs text-white/80 flex items-center gap-1 mt-2">
              <Compass size={12} /> Requires Safari 16.4 or later on macOS
            </p>
          </div>
        );

      case 'chrome':
        return (
          <div className="text-sm space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <Chrome size={16} /> Install with Chrome
            </p>
            {deferredPrompt ? (
              <>
                <p className="text-xs">Click the button below to install, or:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                  <li>Look for the install icon <span className="font-bold">⊕</span> in the address bar</li>
                  <li>Click it and select <span className="font-bold">"Install"</span></li>
                </ol>
              </>
            ) : (
              <ol className="list-decimal list-inside space-y-1.5 text-xs ml-2">
                <li>Click the <span className="font-bold">install icon</span> <span className="font-bold">⊕</span> in the Chrome address bar (right side)</li>
                <li>Or go to <span className="font-bold">Menu (⋮)</span> → <span className="font-bold">"Install Tahcom Portal"</span></li>
                <li>Click <span className="font-bold">"Install"</span> in the popup</li>
              </ol>
            )}
          </div>
        );

      case 'edge':
        return (
          <div className="text-sm space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <Globe size={16} /> Install with Microsoft Edge
            </p>
            {deferredPrompt ? (
              <>
                <p className="text-xs">Click the button below to install, or:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                  <li>Look for the install icon <span className="font-bold">⊕</span> in the address bar</li>
                  <li>Click it and select <span className="font-bold">"Install"</span></li>
                </ol>
              </>
            ) : (
              <ol className="list-decimal list-inside space-y-1.5 text-xs ml-2">
                <li>Click the <span className="font-bold">install icon</span> <span className="font-bold">⊕</span> in the Edge address bar</li>
                <li>Or go to <span className="font-bold">Menu (⋯)</span> → <span className="font-bold">"Apps"</span> → <span className="font-bold">"Install this site as an app"</span></li>
                <li>Click <span className="font-bold">"Install"</span> to confirm</li>
              </ol>
            )}
          </div>
        );

      case 'firefox':
        return (
          <div className="text-sm space-y-2">
            <p className="font-semibold">Install with Firefox:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs ml-2">
              <li>Click the <span className="font-bold">menu</span> button <span className="font-bold">☰</span> in the top-right</li>
              <li>Select <span className="font-bold">"More Tools"</span> → <span className="font-bold">"Install Site as App"</span></li>
              <li>Click <span className="font-bold">"Allow"</span> in the permission prompt</li>
            </ol>
            <p className="text-xs text-white/80 mt-2">Note: PWA support in Firefox is limited. Consider using Chrome or Edge for best experience.</p>
          </div>
        );

      default:
        return (
          <div className="text-sm space-y-2">
            <p className="font-semibold">Install this app:</p>
            {deferredPrompt ? (
              <p className="text-xs">Click the button below to install the app for quick access and offline browsing.</p>
            ) : (
              <p className="text-xs">Look for an install option in your browser's menu or address bar. For best experience, use Chrome, Edge, or Safari.</p>
            )}
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
      >
        <div className="bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white rounded-xl shadow-2xl p-4 border-2 border-white/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
              <Smartphone className="text-white" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg mb-2">Install Tahcom Portal</h3>
              {renderBrowserInstructions()}
              {(browser === 'chrome' || browser === 'edge' || browser === 'other') && deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="w-full mt-3 bg-white text-[#8B4513] font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download size={18} />
                  Install Now
                </button>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

