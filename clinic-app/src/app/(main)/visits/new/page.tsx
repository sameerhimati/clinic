import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";

export default async function NewVisitPage() {
  await requireAuth();
  // Manual visit creation disabled for all roles — use appointment workflow
  redirect("/dashboard");
}
