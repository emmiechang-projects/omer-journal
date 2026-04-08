import './globals.css';

export const metadata = {
  title: 'Count the Omer — A 49-Day Spiritual Journal',
  description: 'A daily reflection journal for the 49 days between Passover and Shavuot. Guided by the sefirot, moon phases, and daily mantras.',
  openGraph: {
    title: 'Count the Omer',
    description: 'A 49-day spiritual journal from Passover to Shavuot.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0f0f0f', color: '#e8e0d4' }}>{children}</body>
    </html>
  );
}
