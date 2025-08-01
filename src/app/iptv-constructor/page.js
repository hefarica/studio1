import dynamic from 'next/dynamic';

const IPTVConstructor = dynamic(() => import('@/components/iptv/IPTVConstructor'), {
  ssr: false,
  loading: () => <p className="text-center p-8">Cargando constructor...</p>
});

export default function IPTVConstructorPage() {
  return (
    <main>
      <IPTVConstructor />
    </main>
  );
}

export const metadata = {
  title: 'Constructor IPTV Pro Multi-Servidor',
  description: 'Sistema inteligente para gestión de servidores IPTV con cache inteligente'
};
