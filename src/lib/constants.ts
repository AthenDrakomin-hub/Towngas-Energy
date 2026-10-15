export const ROLES = {
  super: { key: "super", name: "超级管理员", scope: ["*"] },
  admin: { key: "admin", name: "管理员", scope: ["*"] },
  user: { key: "user", name: "普通用户", scope: [] },
  system: { key: "system", name: "系统账户", scope: [] },
  bot: { key: "bot", name: "机器人", scope: [] },
} as const;

export type RoleKey = keyof typeof ROLES;

export function hasScope(role: string, scope: string): boolean {
  const entry = (ROLES as Record<string, { scope: readonly string[] }>)[role];
  if (!entry) return false;
  return entry.scope.includes("*") || entry.scope.includes(scope);
}
