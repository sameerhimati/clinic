import { prisma } from "@/lib/db";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const doctors = await prisma.doctor.findMany({
    where: {
      isActive: true,
      password: { not: null },
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-8 p-8">
        <div className="text-center space-y-1">
          <div className="text-4xl mb-3">🦷</div>
          <h1 className="text-xl font-bold">Secunderabad Dental Hospital</h1>
          <p className="text-sm text-muted-foreground">Centre for Advanced Dental Care</p>
          <p className="text-xs text-muted-foreground">Est. 2002</p>
        </div>
        <LoginForm doctors={doctors} />
        <p className="text-center text-xs text-muted-foreground">Secunderabad, Hyderabad</p>
      </div>
    </div>
  );
}
