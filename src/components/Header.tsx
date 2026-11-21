import React from 'react';
import { FlaskConical, Settings } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => (
  <header className="mx-auto flex w-full max-w-4xl items-start justify-between gap-4 px-1 pb-7 pt-7 sm:px-2 sm:pb-9 sm:pt-10">
    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-amber-300 shadow-lg shadow-emerald-950/10 sm:h-14 sm:w-14">
        <FlaskConical className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 pt-0.5">
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          ChemScan
        </h1>
        <p className="mt-1 max-w-xl text-xs font-medium text-slate-600 sm:text-sm">
          Charitha Disanayake - Chemistry
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={onOpenSettings}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-white hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
      title="Application and Google Sheets settings"
      aria-label="Settings"
    >
      <Settings className="h-4 w-4" />
      <span className="hidden text-xs font-semibold sm:inline">Settings</span>
    </button>
  </header>
);
