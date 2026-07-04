import { Navbar } from "@/components/navbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar isAuthPage={true} />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
