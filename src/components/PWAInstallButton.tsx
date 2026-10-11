import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and running standalone, suppress button
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Chromium / Android / Desktop Install Flow */}
      {isInstallable && (
        <button
          onClick={install}
          className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer flex-shrink-0 animate-pulse"
          title="Install Dispatch Genie App on your phone or computer"
          aria-label="Install Dispatch Genie App"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {/* iOS Safari Fallback Install Prompt */}
      {isIOS && !isInstallable && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer flex-shrink-0"
          title="Add Dispatch Genie App to iOS Home Screen"
          aria-label="Add to iPhone Home Screen"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0 text-blue-600" />
          <span className="hidden sm:inline">Add to Home Screen</span>
          <span className="sm:hidden">Install iOS</span>
        </button>
      )}

      {/* iOS Step-by-Step Instructions Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Install on iPhone / iPad</h3>
                  <p className="text-[11px] text-slate-500">Fast 2-tap home screen install</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <span className="font-bold text-slate-900">Tap the Share icon</span>
                  <p className="text-slate-600 text-[11px] mt-0.5 flex items-center gap-1">
                    Tap <Share className="w-3.5 h-3.5 text-blue-600 inline" /> at the bottom or top bar in Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <span className="font-bold text-slate-900">Choose &quot;Add to Home Screen&quot;</span>
                  <p className="text-slate-600 text-[11px] mt-0.5 flex items-center gap-1">
                    Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" /> <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  Dispatch Genie will open as a full-screen, standalone app on your mobile home screen without any browser address bar!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
