import FarmManagementAI from '@/components/ai-assistant/FarmManagementAI';

export const metadata = {
  title: 'Farm Management AI Assistant | AquaNext',
  description:
    'Intelligent decision support for harvest timing, resource optimization, and predictive farm analytics.',
};

export default function AIAssistantPage() {
  return (
    <main>
      <FarmManagementAI />
    </main>
  );
}
