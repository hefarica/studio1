import { Inter } from 'next/font/google';
import '@/styles/iptv.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Studio1 - Constructor IPTV Pro',
  description: 'Plataforma integral para gestión de servidores IPTV',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
