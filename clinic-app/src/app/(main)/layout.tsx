import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { requireAuth } from "@/lib/auth";
import { AuthProvider } from "@/lib/auth-context";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const doctor = await requireAuth();

  return (
    <AuthProvider doctor={doctor}>
      <div className="flex min-h-screen print:block">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 md:p-6 print:p-0">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
