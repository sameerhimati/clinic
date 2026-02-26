import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoomCreateForm } from "./room-form";
import { toggleRoomActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const currentUser = await requireAuth();
  if (!canManageSystem(currentUser.permissionLevel)) redirect("/dashboard");

  const rooms = await prisma.room.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="h-3 w-3" /> Settings
      </Link>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Rooms</h2>
      </div>

      <RoomCreateForm />

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {rooms.map((room) => (
              <div key={room.id} className={`flex items-center justify-between p-3 text-sm ${!room.isActive ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground w-8 text-right" title="Sort order">#{room.sortOrder}</span>
                  <span className="font-medium">{room.name}</span>
                  {!room.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                </div>
                <form action={toggleRoomActive}>
                  <input type="hidden" name="id" value={room.id} />
                  <Button size="sm" variant="ghost" type="submit" className="h-7 text-xs">
                    {room.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </form>
              </div>
            ))}
            {rooms.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No rooms configured. Add your first room above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
