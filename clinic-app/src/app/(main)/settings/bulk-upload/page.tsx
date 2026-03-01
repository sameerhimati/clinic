import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { BulkUploadClient } from "./bulk-upload-client";

export const dynamic = "force-dynamic";

export default async function BulkUploadPage() {
  const currentUser = await requireAuth();
  if (!canManageSystem(currentUser.permissionLevel)) {
    redirect("/dashboard");
  }

  return <BulkUploadClient />;
}
