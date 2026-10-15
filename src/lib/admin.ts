import { db } from "@/db";
import { adminLogs } from "@/db/schema";
import type { SessionUser } from "./auth";

export async function writeAdminLog(
  admin: SessionUser,
  action: string,
  targetType = "",
  targetId: string | number = "",
  detail: Record<string, unknown> = {},
) {
  await db.insert(adminLogs).values({
    adminId: admin.id,
    action,
    targetType,
    targetId: String(targetId),
    detail,
  });
}

export async function readJson<T>(req: Request): Promise<T> {
  return (await req.json().catch(() => ({}))) as T;
}
