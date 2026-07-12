import { Navbar } from '@/components/navbar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar defaultIsLoggedIn={true} defaultUserRole="student" />
      <main className="pt-28">
        {children}
      </main>
    </div>
  );
}
