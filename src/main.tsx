import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Early interceptor for Google Maps JavaScript API authentication & target blocked errors, plus quota and referrer limits
if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    console.warn('Google Maps API Auth Notice (gm_authFailure). Enabling interactive fallback territory map.');
    window.dispatchEvent(new CustomEvent('google-maps-auth-failure'));
  };

  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args
      .map((a) => {
        if (typeof a === 'object' && a !== null) {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(' ');

    if (
      msg.includes('Google Maps JavaScript API error') ||
      msg.includes('RefererNotAllowedMapError') ||
      msg.includes('ApiTargetBlockedMapError') ||
      msg.includes('ApiProjectMapError') ||
      msg.includes('InvalidKeyMapError') ||
      msg.includes('OverQuotaMapError') ||
      msg.includes('QuotaExceededError') ||
      msg.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
      msg.includes('type.googleapis.com/google.rpc.ErrorInfo') ||
      msg.includes('ErrorInfo') ||
      msg.includes('maps.googleapis.com') ||
      msg.includes('maps-backend.googleapis.com')
    ) {
      window.dispatchEvent(new CustomEvent('google-maps-auth-failure'));
      if (
        msg.includes('RefererNotAllowedMapError') ||
        msg.includes('API_KEY_HTTP_REFERRER_BLOCKED')
      ) {
        window.dispatchEvent(
          new CustomEvent('google-maps-referer-error', {
            detail: { url: window.location.origin },
          })
        );
      }
      if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      return;
    }

    origError.apply(console, args);
  };

  window.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message || '';
    const filename = event.filename || '';
    if (
      message.includes('ApiTargetBlockedMapError') ||
      message.includes('ApiProjectMapError') ||
      message.includes('RefererNotAllowedMapError') ||
      message.includes('InvalidKeyMapError') ||
      message.includes('Google Maps JavaScript API error') ||
      message.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
      message.includes('ErrorInfo') ||
      filename.includes('maps.googleapis.com')
    ) {
      window.dispatchEvent(new CustomEvent('google-maps-auth-failure'));
      if (
        message.includes('RefererNotAllowedMapError') ||
        message.includes('API_KEY_HTTP_REFERRER_BLOCKED')
      ) {
        window.dispatchEvent(
          new CustomEvent('google-maps-referer-error', {
            detail: { url: window.location.origin },
          })
        );
      }
      // Prevent uncaught error popup from breaking the UI
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.includes('ApiTargetBlockedMapError') ||
      reason.includes('Google Maps') ||
      reason.includes('maps.googleapis.com') ||
      reason.includes('RefererNotAllowedMapError') ||
      reason.includes('ErrorInfo') ||
      reason.includes('API_KEY_HTTP_REFERRER_BLOCKED')
    ) {
      window.dispatchEvent(new CustomEvent('google-maps-auth-failure'));
      if (
        reason.includes('RefererNotAllowedMapError') ||
        reason.includes('API_KEY_HTTP_REFERRER_BLOCKED')
      ) {
        window.dispatchEvent(
          new CustomEvent('google-maps-referer-error', {
            detail: { url: window.location.origin },
          })
        );
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

