import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgresql://cnx:cnx@localhost:5432/cnx_prod";

// 禁用 prefetch 以兼容 PgBouncer 等连接池
const client = postgres(connectionString, { max: 10, idle_timeout: 20 });

export const db = drizzle(client);
