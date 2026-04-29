export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  readAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
}
