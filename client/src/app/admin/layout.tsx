import { Navbar } from '@/components/navbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar defaultIsLoggedIn={true} defaultUserRole="admin" />
      <main className="pt-28">
        {children}
      </main>
    </div>
  );
}
