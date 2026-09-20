import { useState } from 'react';
import { brandStyle } from '../../../shared/theme';

interface AgeGateProps {
  primaryColor: string;
  tenantName: string;
  logoUrl: string | null;
  onAccept: () => void;
}

export function AgeGate({ primaryColor, tenantName, logoUrl, onAccept }: AgeGateProps) {
  const [rejected, setRejected] = useState(false);

  if (rejected) {
    return (
      <div
        style={brandStyle(primaryColor)}
        className="bg-brand text-brand-contrast flex min-h-dvh items-center justify-center px-8 text-center"
      >
        <p className="max-w-xs text-[15px] leading-relaxed">
          Lo sentimos, este catálogo es solo para mayores de 18 años.
        </p>
      </div>
    );
  }

  return (
    <div
      style={brandStyle(primaryColor)}
      className="bg-brand text-brand-contrast pb-safe flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <div className="flex flex-col items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/25"
          />
        ) : null}
        <span className="text-xl font-bold tracking-tight">{tenantName}</span>
      </div>

      <p className="max-w-xs text-[15px] leading-relaxed opacity-90">
        Este catálogo es solo para mayores de 18 años. ¿Sos mayor de edad?
      </p>

      <div className="flex w-full max-w-xs flex-col gap-2.5">
        <button
          type="button"
          onClick={onAccept}
          className="bg-brand-contrast text-brand rounded-full px-5 py-3.5 text-[15px] font-semibold transition active:scale-[0.98]"
        >
          Soy mayor de 18
        </button>
        <button
          type="button"
          onClick={() => setRejected(true)}
          className="rounded-full border border-current px-5 py-3.5 text-[15px] font-semibold opacity-60 transition active:scale-[0.98]"
        >
          Soy menor de 18
        </button>
      </div>
    </div>
  );
}
