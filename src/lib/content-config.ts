import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentConfigs } from "@/db/schema";
import { DEFAULT_CONTENT_CONFIGS } from "./content-config-defaults";

export type ContentConfigMap = Record<string, string>;

/** 初始化默认文案配置（首次启动时写入） */
export async function ensureContentConfigs() {
  const existing = await db.select({ key: contentConfigs.key }).from(contentConfigs);
  const existingKeys = new Set(existing.map((r) => r.key));
  const missing = DEFAULT_CONTENT_CONFIGS.filter((c) => !existingKeys.has(c.key));
  if (missing.length) {
    await db.insert(contentConfigs).values(
      missing.map((c) => ({
        key: c.key,
        value: c.value,
        category: c.category,
        description: c.description,
      })),
    );
  }
}

/** 获取全部文案配置（key->value映射） */
export async function getAllContentConfigs(): Promise<ContentConfigMap> {
  await ensureContentConfigs();
  const rows = await db.select({ key: contentConfigs.key, value: contentConfigs.value }).from(contentConfigs);
  const map: ContentConfigMap = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  // 兜底：如果数据库中没有，用默认值
  for (const def of DEFAULT_CONTENT_CONFIGS) {
    if (!(def.key in map)) {
      map[def.key] = def.value;
    }
  }
  return map;
}

/** 获取全部文案配置（含分类和描述，用于管理端编辑） */
export async function getAllContentConfigsWithMeta() {
  await ensureContentConfigs();
  const rows = await db
    .select({
      id: contentConfigs.id,
      key: contentConfigs.key,
      value: contentConfigs.value,
      category: contentConfigs.category,
      description: contentConfigs.description,
      updatedAt: contentConfigs.updatedAt,
    })
    .from(contentConfigs)
    .orderBy(contentConfigs.category, contentConfigs.key);
  return rows;
}

/** 批量更新文案配置 */
export async function updateContentConfigs(updates: { key: string; value: string }[]) {
  for (const { key, value } of updates) {
    await db
      .update(contentConfigs)
      .set({ value, updatedAt: new Date() })
      .where(eq(contentConfigs.key, key));
  }
  return updates.length;
}

/** 获取单个文案 */
export async function getContentConfig(key: string): Promise<string> {
  const all = await getAllContentConfigs();
  return all[key] ?? key;
}
