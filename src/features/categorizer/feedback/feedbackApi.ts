import { api } from '@/api/client';

export type FeedbackBody = {
  merchant: string;
  from_category: string;
  from_source: string;
  to_category: string;
  prediction_id: string | null;
};

// Through the gateway, which adds the user id the model server counts corrections by. Throws axios
// errors; the sync decides what each status means.
export async function postFeedback(body: FeedbackBody): Promise<void> {
  await api.post('/api/ai-service/feedback', body);
}
