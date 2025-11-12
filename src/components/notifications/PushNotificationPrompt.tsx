import { useEffect, useMemo, useState } from 'react';
import { BellRing, X, CheckCircle } from 'lucide-react';
import { subscribeUserToPush } from '../../utils/pushNotifications.ts';
import { useNotifications } from '../../context/NotificationContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { motion, AnimatePresence } from 'framer-motion';

type PromptState = 'hidden' | 'pending' | 'granted' | 'denied' | 'success';

const DISMISS_KEY = 'tahcom-push-dismissed';
const SUBSCRIBED_KEY = 'tahcom-push-subscribed';

function isPushSupported() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}

export function PushNotificationPrompt() {
  const { savePushSubscription } = useNotifications();
  const { user } = useAuth();

  const [state, setState] = useState<PromptState>('hidden');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shouldDisplay = useMemo(() => {
    if (!user?.id) return false;
    if (typeof window === 'undefined') return false;
    if (!isPushSupported()) return false;
    if (!window.isSecureContext) return false;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === 'true') return false;
    } catch {
      // Ignore storage access issues (e.g., privacy mode)
    }
    return true;
  }, [user?.id]);

  useEffect(() => {
    if (!shouldDisplay) return;

    try {
      if (window.localStorage.getItem(SUBSCRIBED_KEY) === 'true') {
        setState('success');
        return;
      }
    } catch {
      // ignore
    }

    if (Notification.permission === 'granted') {
      subscribeUserToPush(savePushSubscription, { silent: true })
        .then((result) => {
        if (result.ok) {
          try {
            window.localStorage.setItem(SUBSCRIBED_KEY, 'true');
          } catch {
            // ignore storage failures
          }
            setState('success');
          } else if (result.reason === 'permission_prompt_required') {
            setState('pending');
          }
        })
        .catch((err) => {
          console.warn('[PushPrompt] Failed to refresh subscription', err);
        });
      return;
    }

    if (Notification.permission === 'default') {
      setState('pending');
      return;
    }

    // Permission denied
    setState('denied');
  }, [savePushSubscription, shouldDisplay]);

  useEffect(() => {
    if (state === 'success') {
      const timeout = window.setTimeout(() => {
        setState('hidden');
      }, 4000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [state]);

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await subscribeUserToPush(savePushSubscription);
      if (result.ok) {
        try {
          window.localStorage.setItem(SUBSCRIBED_KEY, 'true');
        } catch {
          // ignore
        }
        setState('success');
      } else {
        if (result.reason === 'permission_denied') {
          setState('denied');
          setError('Notifications were blocked. Enable them from your browser settings to receive alerts.');
        } else if (result.reason === 'unsupported') {
          setError('Push notifications are not supported in this browser.');
        } else if (result.reason === 'insecure_context') {
          setError('Push notifications need HTTPS. Install the app or use the secure site.');
        } else {
          setError('Unable to enable notifications. Please try again later.');
        }
      }
    } catch (err) {
      console.error('[PushPrompt] Subscription failed', err);
      setError('Something went wrong while enabling notifications.');
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // ignore
    }
    setState('hidden');
  };

  if (!shouldDisplay || state === 'hidden' || state === 'denied') {
    return null;
  }

  return (
    <AnimatePresence>
      {state !== 'hidden' && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 right-4 z-40 max-w-sm"
        >
          <div className="rounded-2xl border border-orange-200 bg-white/95 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand-full text-white">
                <BellRing size={22} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-brand-1">Enable task alerts</h3>
                  {state !== 'success' && (
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Dismiss push notification prompt"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {state === 'success' ? (
                  <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    <CheckCircle size={16} />
                    Push notifications are on. You’ll get alerts even when the app is closed.
                    <button
                      type="button"
                      onClick={() => setState('hidden')}
                      className="ml-auto rounded-full p-1 text-green-700 transition hover:bg-green-100"
                      aria-label="Dismiss success message"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Get instant notifications on your device whenever new tasks are assigned or updated.
                    </p>
                    {error && <p className="text-xs font-medium text-red-600">{error}</p>}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleEnable}
                        disabled={busy}
                        className="rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
                      >
                        {busy ? 'One moment…' : 'Enable notifications'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDismiss}
                        className="rounded-xl px-3 py-2 text-sm font-semibold text-brand-1 transition hover:bg-orange-50"
                      >
                        Not now
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


