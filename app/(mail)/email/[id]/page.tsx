import { EmailView } from '@/components/mail/email-view';

interface EmailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EmailPage({ params }: EmailPageProps) {
  const { id } = await params;
  return <EmailView emailId={id} />;
}
