import React from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

interface RecognitionActionProps {
  onRecognize: () => void;
  isLoading: boolean;
  progressStatus?: string;
  hasImage: boolean;
}

export const RecognitionAction: React.FC<RecognitionActionProps> = ({
  onRecognize,
  isLoading,
  progressStatus,
  hasImage,
}) => {
  if (!hasImage) return null;

  return (
    <div className="w-full max-w-xl mx-auto pt-1">
      <button
        type="button"
        onClick={onRecognize}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 group"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Recognizing handwriting...</span>
          </>
        ) : (
          <>
            <span>Recognize Text</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      {isLoading && progressStatus && (
        <p className="mt-2 text-center text-xs text-slate-500 animate-pulse">
          {progressStatus}
        </p>
      )}
    </div>
  );
};
