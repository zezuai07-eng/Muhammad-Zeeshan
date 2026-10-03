import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt) {
      return (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt || null;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed or running inside Android wrapper / TWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if early captured beforeinstallprompt exists on window
    const winWithPWA = window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent };
    if (winWithPWA.deferredInstallPrompt) {
      setDeferredPrompt(winWithPWA.deferredInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      winWithPWA.deferredInstallPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handlePromptAvailable = () => {
      if (winWithPWA.deferredInstallPrompt) {
        setDeferredPrompt(winWithPWA.deferredInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      winWithPWA.deferredInstallPrompt = undefined;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    const winWithPWA = typeof window !== 'undefined' ? (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }) : {};
    let promptToUse = deferredPrompt || winWithPWA.deferredInstallPrompt;

    // If prompt is not ready immediately, wait briefly (up to 800ms) in case beforeinstallprompt event is firing
    if (!promptToUse && typeof window !== 'undefined') {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 800);
        const onPrompt = () => {
          clearTimeout(timeout);
          window.removeEventListener('pwa-prompt-available', onPrompt);
          resolve();
        };
        window.addEventListener('pwa-prompt-available', onPrompt, { once: true });
      });
      promptToUse = deferredPrompt || (window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt;
    }

    if (!promptToUse) return false;
    try {
      await promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        winWithPWA.deferredInstallPrompt = undefined;
        return true;
      }
      return false;
    } catch (e) {
      console.error('Install prompt error:', e);
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt || (typeof window !== 'undefined' && !!(window as unknown as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt),
    isInstalled,
    isIOS,
    isAndroid,
    install,
  };
}
