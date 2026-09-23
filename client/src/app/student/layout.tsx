import { Navbar } from '@/components/navbar';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRole="student">
      <div className="min-h-screen">
        <Navbar defaultIsLoggedIn={true} defaultUserRole="student" />
        <main className="pt-28">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
