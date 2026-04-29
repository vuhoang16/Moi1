import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function usePushNotifications(navigate: (screen: string, params?: any) => void) {
  const qc = useQueryClient();

  useEffect(() => {
    const requestAndRegister = async () => {
      const status = await messaging().requestPermission();
      const granted =
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL;
      if (!granted) return;

      const token = await messaging().getToken();
      try {
        await api.patch('/auth/fcm-token', { fcmToken: token });
      } catch {
        // non-critical — user can still use app
      }
    };

    requestAndRegister();

    const unsubRefresh = messaging().onTokenRefresh(async (token) => {
      try { await api.patch('/auth/fcm-token', { fcmToken: token }); } catch {}
    });

    const unsubForeground = messaging().onMessage(async (remoteMessage) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });

      const type = remoteMessage.data?.type as string | undefined;
      if (type === 'new_message') {
        qc.invalidateQueries({ queryKey: ['conversations'] });
      } else if (type === 'invoice_created' || type === 'invoice_overdue') {
        qc.invalidateQueries({ queryKey: ['invoices'] });
      } else if (type === 'maintenance_update') {
        qc.invalidateQueries({ queryKey: ['maintenance'] });
      }
    });

    messaging().setBackgroundMessageHandler(async () => {});

    messaging()
      .getInitialNotification()
      .then((msg) => {
        if (msg) handleTap(msg.data as Record<string, string>, navigate);
      });

    const unsubTap = messaging().onNotificationOpenedApp((msg) => {
      handleTap(msg.data as Record<string, string>, navigate);
    });

    return () => {
      unsubRefresh();
      unsubForeground();
      unsubTap();
    };
  }, [qc, navigate]);
}

function handleTap(data: Record<string, string> | undefined, navigate: (s: string, p?: any) => void) {
  if (!data) return;
  const { type, relatedEntityId } = data;
  switch (type) {
    case 'invoice_created':
    case 'invoice_overdue':
      navigate('InvoiceDetail', { id: relatedEntityId });
      break;
    case 'new_message':
      navigate('Chat', { conversationId: relatedEntityId });
      break;
    case 'maintenance_update':
      navigate('MaintenanceDetail', { id: relatedEntityId });
      break;
    case 'contract_expiry_warning':
      navigate('ContractDetail', { id: relatedEntityId });
      break;
  }
}
