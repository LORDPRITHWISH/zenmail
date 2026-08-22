import { EmailList } from '@/components/mail/email-list';

interface LabelPageProps {
  params: Promise<{ id: string }>;
}

export default async function LabelPage({ params }: LabelPageProps) {
  const { id } = await params;
  return <EmailList labelId={id} />;
}
