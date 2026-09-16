import { useState } from 'react';
import { brandStyle } from '../../../shared/theme';

interface AgeGateProps {
  primaryColor: string;
  onAccept: () => void;
}

export function AgeGate({ primaryColor, onAccept }: AgeGateProps) {
  const [rejected, setRejected] = useState(false);

  if (rejected) {
    return (
      <div
        style={brandStyle(primaryColor)}
        className="bg-brand text-brand-contrast flex min-h-screen items-center justify-center p-8 text-center"
      >
        <p>Lo sentimos, este catálogo es solo para mayores de 18 años.</p>
      </div>
    );
  }

  return (
    <div
      style={brandStyle(primaryColor)}
      className="bg-brand text-brand-contrast flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center"
    >
      <p className="text-lg">Este catálogo es solo para mayores de 18 años. ¿Sos mayor de edad?</p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onAccept}
          className="rounded bg-white px-4 py-2 text-gray-900"
        >
          Soy mayor de 18
        </button>
        <button
          type="button"
          onClick={() => setRejected(true)}
          className="rounded border border-current px-4 py-2"
        >
          Soy menor de 18
        </button>
      </div>
    </div>
  );
}
