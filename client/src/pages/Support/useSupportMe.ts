import { useEffect, useState } from 'react';
import supportApi, { SupportMe } from '../../api/supportApi';

/** What the signed-in person may do in Help & Support. Null while loading or if it failed. */
export function useSupportMe(): SupportMe | null {
  const [me, setMe] = useState<SupportMe | null>(null);
  useEffect(() => {
    let live = true;
    supportApi.me().then(m => { if (live) setMe(m); }).catch(() => { if (live) setMe(null); });
    return () => { live = false; };
  }, []);
  return me;
}
