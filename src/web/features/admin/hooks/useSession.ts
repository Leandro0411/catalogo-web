import { useCallback, useEffect, useState } from 'react';
import { getMe } from '../../../api/admin.api';
import type { AdminMeResponse } from '../../../../shared/types/api.types';

type SessionState =
  | { status: 'loading' }
  | { status: 'authenticated'; me: AdminMeResponse }
  | { status: 'anonymous' };

export function useSession(): SessionState & { refresh: () => void } {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((me) => {
        if (!cancelled) {
          setState({ status: 'authenticated', me });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'anonymous' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { ...state, refresh };
}
