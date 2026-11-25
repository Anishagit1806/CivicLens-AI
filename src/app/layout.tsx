import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { RuntimeModeBanner } from '@/components/layout/RuntimeModeBanner';
import { AppProvider } from '@/components/providers/AppProvider';
import { listUserNotifications } from '@/lib/data/repository';
import { getRuntimeMode, isGeminiConfigured } from '@/lib/env';
import { getCurrentUser } from '@/lib/security/session';

export const metadata: Metadata = {
  title: 'CivicLens AI — Intelligent Civic Issue Detection & Prioritization',
  description:
    'AI-assisted civic infrastructure reporting, spatial duplicate detection, transparent priority scoring, and municipal resolution tracking.',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const notifications = user ? await listUserNotifications(user.id) : [];
  const runtimeMode = getRuntimeMode();
  const geminiConfigured = isGeminiConfigured();

  return (
    <html lang={user?.preferredLanguage ?? 'en'}>
      <body className="flex min-h-screen flex-col">
        <AppProvider
          initialUser={user}
          initialNotifications={notifications}
          initialRuntimeMode={runtimeMode}
          initialGeminiConfigured={geminiConfigured}
        >
          <RuntimeModeBanner />
          <Navbar />
          <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
            {children}
          </main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
