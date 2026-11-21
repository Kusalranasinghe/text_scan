import React, { useState } from 'react';
import { X, Check, Key, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import type { OcrEngineConfig } from '../types/ocr';
import { saveConfig } from '../services/ocr/ocrManager';

interface SettingsModalProps {
  isOpen: boolean;
  config: OcrEngineConfig;
  onClose: () => void;
  onSave: (newConfig: OcrEngineConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  config,
  onClose,
  onSave,
}) => {
  const [geminiApiKey, setGeminiApiKey] = useState(config.geminiApiKey);
  const [googleAppsScriptUrl, setGoogleAppsScriptUrl] = useState(config.googleAppsScriptUrl);
  const [googleAppsScriptToken, setGoogleAppsScriptToken] = useState(config.googleAppsScriptToken);
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: OcrEngineConfig = {
      engine: 'gemini',
      geminiApiKey: geminiApiKey.trim(),
      googleAppsScriptUrl: googleAppsScriptUrl.trim(),
      googleAppsScriptToken: googleAppsScriptToken.trim(),
    };
    saveConfig(updated);
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Application Form Settings</h3>
            <p className="text-xs text-slate-500">Connect AI recognition and Google Sheets</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <div>
              <p className="text-xs font-semibold text-slate-900">Google Gemini 3.1 Flash-Lite</p>
              <p className="text-[11px] text-slate-500">Used for all image recognition requests.</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-slate-700 flex items-center gap-1">
                <Key className="w-3 h-3 text-slate-500" />
                <span>Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-0.5 text-[11px]"
              >
                Get API key
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 pr-16 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-700 bg-slate-100 rounded"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stored in browser localStorage only.</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Google Apps Script Web App URL</label>
              <input
                type="url"
                value={googleAppsScriptUrl}
                onChange={(e) => setGoogleAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Apps Script token</label>
              <input
                type="password"
                value={googleAppsScriptToken}
                onChange={(e) => setGoogleAppsScriptToken(e.target.value)}
                placeholder="Token printed by setup()"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              The Apps Script setup instructions are in the project README. It creates the spreadsheet under your Google account.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg"
          >
            <Check className="w-3.5 h-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
