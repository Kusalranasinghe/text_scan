import React from 'react';
import { AlertCircle, Loader2, RotateCcw, Save, Settings } from 'lucide-react';
import {
  APPLICATION_FORM_FIELDS,
  type ApplicationFieldKey,
  type ApplicationFormData,
} from '../types/applicationForm';

interface ApplicationFormReviewProps {
  data: ApplicationFormData;
  hasGoogleSheetsConnection: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onChange: (field: ApplicationFieldKey, value: string) => void;
  onSubmit: () => void;
  onOpenSettings: () => void;
  onRecognizeAgain: () => void;
  isRecognizing: boolean;
}

export const ApplicationFormReview: React.FC<ApplicationFormReviewProps> = ({
  data,
  hasGoogleSheetsConnection,
  isSubmitting,
  submitError,
  onChange,
  onSubmit,
  onOpenSettings,
  onRecognizeAgain,
  isRecognizing,
}) => (
  <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-white bg-white shadow-xl shadow-slate-900/[0.06]">
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-900">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-700 text-[9px] text-white">2</span>
          Check details
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
          Review your application
        </h2>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
          Correct any details that need it. Signature and signature date are not included.
        </p>
      </div>
      <button
        type="button"
        onClick={onRecognizeAgain}
        disabled={isRecognizing}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-50"
      >
        {isRecognizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Scan again
      </button>
    </div>

    <div className="grid grid-cols-1 gap-4 bg-slate-50/50 p-5 sm:grid-cols-2 sm:gap-4 sm:p-7">
      {APPLICATION_FORM_FIELDS.map((field) => (
        <label
          key={field.key}
          className={`block text-xs font-semibold text-slate-700 ${
            field.key === 'address' || field.key === 'additionalAnswer' || field.key === 'loggingNumber'
              ? 'sm:col-span-2'
              : ''
          }`}
        >
          <span>{field.label}</span>
          {field.kind === 'choice' ? (
            <select
              value={data[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Not selected / unclear</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : field.key === 'address' || field.key === 'additionalAnswer' ? (
            <textarea
              value={data[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              rows={field.key === 'address' ? 2 : 3}
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          ) : (
            <input
              type="text"
              value={data[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          )}
        </label>
      ))}
    </div>

    <div className="space-y-3 px-5 pb-5 sm:px-7 sm:pb-7">
      {Object.values(data).every((value) => !value.trim()) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No filled answers were detected. Check that you uploaded the completed form; you can also enter the values manually.</span>
        </div>
      )}

      {!hasGoogleSheetsConnection && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          <Settings className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p>Connect the Google Apps Script URL and token before submitting.</p>
            <button type="button" onClick={onOpenSettings} className="mt-1 font-bold underline underline-offset-2">
              Open Settings
            </button>
          </div>
        </div>
      )}

      {submitError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={
          !hasGoogleSheetsConnection ||
          isSubmitting ||
          Object.values(data).every((value) => !value.trim())
        }
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isSubmitting ? 'Saving application…' : 'Save application'}
      </button>
    </div>
  </section>
);
