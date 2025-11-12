import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSafariDesktop, setIsSafariDesktop] = useState(false);

  useEffect(() => {
    const showWithDelay = () => {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    if (standaloneMatch || iosStandalone) {
      setIsInstalled(true);
      return;
    }

    const iosRegex = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const safariDesktopRegex = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && !iosRegex;
    setIsSafariDesktop(safariDesktopRegex);

    if (iosRegex) {
      showWithDelay();
      return;
    }

    if (safariDesktopRegex) {
      showWithDelay();
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      showWithDelay();
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
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

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
      >
        <div className="bg-gradient-to-r from-[#8B4513] to-[#FF8C00] text-white rounded-xl shadow-2xl p-4 border-2 border-white/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
              <Smartphone className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Install App</h3>
              {isIOS && !isInStandaloneMode ? (
                <div className="text-sm space-y-2">
                  <p>Install this app on your iPhone/iPad:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Tap the Share button <span className="font-bold">□↑</span></li>
                    <li>Select <span className="font-bold">"Add to Home Screen"</span></li>
                    <li>Tap <span className="font-bold">"Add"</span></li>
                  </ol>
                </div>
              ) : isSafariDesktop ? (
                <div className="text-sm space-y-2">
                  <p>Install this app with Safari for quick access:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Open the <span className="font-bold">Share</span> menu (top-right).</li>
                    <li>Choose <span className="font-bold">"Add to Dock"</span> or <span className="font-bold">"Add to Home Screen"</span>.</li>
                    <li>Confirm by pressing <span className="font-bold">"Add"</span>.</li>
                  </ol>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <Compass size={12} /> Available on Safari 16.4 or later.
                  </p>
                </div>
              ) : (
                <p className="text-sm mb-3">
                  Install this app for quick access and offline browsing of our partners and solutions.
                </p>
              )}
              {!isIOS && !isSafariDesktop && deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="w-full bg-white text-[#8B4513] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
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

