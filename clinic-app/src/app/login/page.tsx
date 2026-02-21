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
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Secunderabad Dental Hospital</h1>
          <p className="text-muted-foreground">
            Centre for Advanced Dental Care
          </p>
        </div>
        <LoginForm doctors={doctors} />
      </div>
    </div>
  );
}
