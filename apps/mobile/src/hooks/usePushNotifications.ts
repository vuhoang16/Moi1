import { useEffect, useState, useCallback } from 'react';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export interface ForegroundNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export function usePushNotifications(navigate: (screen: string, params?: any) => void) {
  const qc = useQueryClient();
  const [foreground, setForeground] = useState<ForegroundNotification | null>(null);

  const clearForeground = useCallback(() => setForeground(null), []);

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
      invalidateByType(qc, remoteMessage.data?.type as string | undefined);

      const title = remoteMessage.notification?.title ?? 'Thông báo mới';
      const body = remoteMessage.notification?.body ?? '';
      setForeground({ title, body, data: remoteMessage.data as Record<string, string> | undefined });
    });

    // Background handler — invalidate queries when the app is brought to the foreground
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      invalidateByType(qc, remoteMessage.data?.type as string | undefined);
    });

    // Cold start: app was quit, user tapped notification
    messaging()
      .getInitialNotification()
      .then((msg) => {
        if (msg) {
          // Delay to allow nav to mount
          setTimeout(() => handleTap(msg.data as Record<string, string>, navigate), 500);
        }
      });

    // App in background, user tapped notification
    const unsubTap = messaging().onNotificationOpenedApp((msg) => {
      handleTap(msg.data as Record<string, string>, navigate);
    });

    return () => {
      unsubRefresh();
      unsubForeground();
      unsubTap();
    };
  }, [qc, navigate]);

  return { foreground, clearForeground };
}

function invalidateByType(qc: ReturnType<typeof useQueryClient>, type: string | undefined) {
  qc.invalidateQueries({ queryKey: ['notifications'] });
  switch (type) {
    case 'new_message':
      qc.invalidateQueries({ queryKey: ['conversations'] });
      break;
    case 'invoice_created':
    case 'invoice_overdue':
      qc.invalidateQueries({ queryKey: ['invoices'] });
      break;
    case 'maintenance_update':
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      break;
    case 'contract_expiry_warning':
      qc.invalidateQueries({ queryKey: ['contracts'] });
      break;
  }
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
      navigate('ChatScreen', { conversationId: relatedEntityId });
      break;
    case 'maintenance_update':
      navigate('MaintenanceDetail', { id: relatedEntityId });
      break;
    case 'contract_expiry_warning':
      navigate('ContractDetail', { id: relatedEntityId });
      break;
    default:
      navigate('Notifications');
  }
}
