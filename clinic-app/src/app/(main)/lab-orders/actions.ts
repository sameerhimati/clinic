"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageLabOrders } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit, logFlaggedAction } from "@/lib/audit";

async function requireLabOrderAccess() {
  const user = await requireAuth();
  if (!canManageLabOrders(user.permissionLevel)) {
    throw new Error("Permission denied");
  }
  return user;
}

export async function createLabOrder(data: {
  patientId: number;
  labRateId: number;
  planItemId?: number;
  quantity: number;
  rateAdjustment: number;
  adjustmentNote?: string;
  orderedDate: string;
  expectedDate?: string;
  notes?: string;
  toothNumbers?: string;
}) {
  const user = await requireLabOrderAccess();

  // Fetch the lab rate for snapshot
  const labRate = await prisma.labRate.findUnique({
    where: { id: data.labRateId },
    include: { lab: { select: { id: true } } },
  });
  if (!labRate) throw new Error("Lab rate not found");

  const unitRate = labRate.rate;
  const totalAmount = (unitRate + data.rateAdjustment) * data.quantity;

  const order = await prisma.labOrder.create({
    data: {
      patientId: data.patientId,
      labId: labRate.lab.id,
      labRateId: data.labRateId,
      planItemId: data.planItemId || null,
      quantity: data.quantity,
      unitRate,
      rateAdjustment: data.rateAdjustment,
      totalAmount,
      adjustmentNote: data.adjustmentNote || null,
      status: "ORDERED",
      orderedDate: new Date(data.orderedDate),
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      notes: data.notes || null,
      toothNumbers: data.toothNumbers || null,
      createdById: user.id,
    },
  });

  logAudit({
    action: "LAB_ORDER_CREATED",
    actorId: user.id,
    patientId: data.patientId,
    entityType: "LabOrder",
    entityId: order.id,
    details: {
      labRateId: data.labRateId,
      unitRate,
      rateAdjustment: data.rateAdjustment,
      totalAmount,
      quantity: data.quantity,
    },
  });

  revalidatePath("/lab-orders");
  revalidatePath(`/patients/${data.patientId}`);
  revalidatePath("/dashboard");

  return { id: order.id };
}

export async function receiveLabOrder(id: number) {
  const user = await requireLabOrderAccess();

  const order = await prisma.labOrder.findUnique({ where: { id } });
  if (!order) throw new Error("Lab order not found");
  if (order.status !== "ORDERED") throw new Error("Order is not in ORDERED status");

  await prisma.labOrder.update({
    where: { id },
    data: {
      status: "RECEIVED",
      receivedDate: new Date(),
      receivedById: user.id,
    },
  });

  logAudit({
    action: "LAB_ORDER_RECEIVED",
    actorId: user.id,
    patientId: order.patientId,
    entityType: "LabOrder",
    entityId: id,
    details: {
      orderedDate: order.orderedDate.toISOString(),
      totalAmount: order.totalAmount,
    },
  });

  revalidatePath("/lab-orders");
  revalidatePath(`/patients/${order.patientId}`);
  revalidatePath("/dashboard");
}

export async function deleteLabOrder(id: number) {
  const user = await requireLabOrderAccess();

  const order = await prisma.labOrder.findUnique({
    where: { id },
    include: { labRate: { select: { itemName: true } } },
  });
  if (!order) throw new Error("Lab order not found");
  if (order.status !== "ORDERED") throw new Error("Cannot delete received orders");

  await prisma.labOrder.delete({ where: { id } });

  logFlaggedAction({
    action: "LAB_ORDER_DELETED",
    actorId: user.id,
    patientId: order.patientId,
    entityType: "LabOrder",
    entityId: id,
    reason: `Deleted lab order for ${order.labRate.itemName}`,
    details: {
      totalAmount: order.totalAmount,
      orderedDate: order.orderedDate.toISOString(),
    },
  });

  revalidatePath("/lab-orders");
  revalidatePath(`/patients/${order.patientId}`);
  revalidatePath("/dashboard");
}
