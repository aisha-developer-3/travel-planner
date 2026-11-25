import React, { useState } from 'react';
import { Compass } from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EBF5FF] via-[#F5F8FC] to-[#DCEEFF] text-[#1687D9] dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 dark:text-sky-400 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Compass className="h-7 w-7 opacity-80" strokeWidth={1.75} />
        {fallbackTitle ? (
          <span className="mt-1.5 px-2 text-center text-xs font-medium text-[#172B42]/70 dark:text-slate-300 line-clamp-1">
            {fallbackTitle}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
