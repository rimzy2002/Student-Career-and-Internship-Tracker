import { Navbar } from '@/components/navbar';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRole="admin">
      <div className="min-h-screen">
        <Navbar defaultIsLoggedIn={true} defaultUserRole="admin" />
        <main className="pt-28">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
