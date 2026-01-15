import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weekly Standup Generator',
  description: 'Generate weekly standup reports from Jira',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
