import { AlertCircle } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

export function FormErrors({ messages }: { messages: string[] }) {
  if (messages.length === 0) {
    return null;
  }
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <ul className="grid gap-0.5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </Alert>
  );
}
