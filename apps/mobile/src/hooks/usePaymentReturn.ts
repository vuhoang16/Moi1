import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

export type PaymentReturnStatus = 'success' | 'failed' | null;

export function usePaymentReturn() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<PaymentReturnStatus>(null);

  useEffect(() => {
    const handle = (url: string) => {
      if (!url.includes('/payment/result')) return;
      const query = url.split('?')[1] ?? '';
      const params: Record<string, string> = {};
      for (const part of query.split('&')) {
        const [k, v] = part.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
      }
      // MoMo: resultCode=0 is success; ZaloPay: return_code=1 is success
      const isSuccess = params['resultCode'] === '0' || params['return_code'] === '1';
      setStatus(isSuccess ? 'success' : 'failed');
      qc.invalidateQueries({ queryKey: ['invoices'] });
    };

    const sub = Linking.addEventListener('url', ({ url }) => handle(url));

    // Cold start: app opened via payment return deeplink
    Linking.getInitialURL().then((url) => {
      if (url) handle(url);
    });

    return () => sub.remove();
  }, [qc]);

  return { paymentReturnStatus: status, clearPaymentReturnStatus: () => setStatus(null) };
}
