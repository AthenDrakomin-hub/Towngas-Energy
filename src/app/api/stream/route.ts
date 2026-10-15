import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements, carResults, rounds } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { currentRoundSnapshot, tickEngine } from "@/lib/engine";
import { leaderboard } from "@/lib/gamification";
import { queryLogs } from "@/lib/logs";
import { PERIOD_KEYS, type PeriodKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** 推送频率配置（毫秒） */
const TICK_INTERVAL = 1000;        // 基础 tick：round 状态/倒计时
const CAR_INTERVAL = 5000;         // car 数据更新
const LOGS_INTERVAL = 3000;        // 日志推送
const LEADERBOARD_INTERVAL = 10000; // 排行榜
const ANNOUNCEMENT_INTERVAL = 30000; // 公告

/**
 * 实时推送通道：round:current / car:update / round:settled / logs / leaderboard / announcement
 * 按事件类型分级推送频率，降低数据库查询压力
 */
export async function GET(req: Request) {
  await ensureBootstrap();
  const user = await getSessionUser();
  const url = new URL(req.url);
  const period = (PERIOD_KEYS.includes(url.searchParams.get("period") as PeriodKey)
    ? url.searchParams.get("period")
    : "5m") as PeriodKey;
  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  // 各事件上次推送时间戳
  let lastLogId = 0;
  let lastPayload = "";
  let lastSettledCode = "";
  let lastCarPush = 0;
  let lastLogsPush = 0;
  let lastLbPush = 0;
  let lastAnnPush = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const push = async () => {
        if (closed) return;
        const now = Date.now();
        try {
          // 引擎心跳（内部已有 900ms 限频）
          await tickEngine();

          // ---- 每秒推送：round 状态 + 倒计时 ----
          const snapshot = await currentRoundSnapshot(user?.id, period);
          const settledRound = snapshot?.result
            ? snapshot
            : (
                await db
                  .select()
                  .from(rounds)
                  .where(eq(rounds.status, "settled"))
                  .orderBy(desc(rounds.settleTime))
                  .limit(1)
              )[0];
          const payload = JSON.stringify({
            code: snapshot?.code,
            status: snapshot?.status,
            phase: snapshot?.phase,
            upPool: snapshot?.upPool,
            downPool: snapshot?.downPool,
            result: snapshot?.result,
          });
          if (payload !== lastPayload) {
            lastPayload = payload;
            send("round:current", snapshot);
          }
          if (settledRound && settledRound.code !== lastSettledCode) {
            lastSettledCode = settledRound.code;
            send("round:settled", {
              code: settledRound.code,
              result: settledRound.result,
              settleCar: settledRound.settleCar,
              rakeAmount: settledRound.rakeAmount,
              myBets: snapshot?.myBets ?? [],
            });
          }

          // ---- 每 5 秒：car 数据 ----
          if (now - lastCarPush >= CAR_INTERVAL) {
            lastCarPush = now;
            const car = (await db.select().from(carResults).orderBy(desc(carResults.onlinetime)).limit(1))[0] ?? null;
            if (car) send("car:update", car);
          }

          // ---- 每 3 秒：日志 ----
          if (now - lastLogsPush >= LOGS_INTERVAL) {
            lastLogsPush = now;
            const logs = await queryLogs({ limit: 6 });
            const fresh = logs.filter((l) => l.id > lastLogId);
            if (fresh.length) {
              lastLogId = Math.max(...fresh.map((l) => l.id));
              send("logs", fresh.reverse());
            }
          }

          // ---- 每 10 秒：排行榜 ----
          if (now - lastLbPush >= LEADERBOARD_INTERVAL) {
            lastLbPush = now;
            send("leaderboard:update", await leaderboard("day"));
          }

          // ---- 每 30 秒：公告 ----
          if (now - lastAnnPush >= ANNOUNCEMENT_INTERVAL) {
            lastAnnPush = now;
            const ann = await db
              .select()
              .from(announcements)
              .where(eq(announcements.status, "published"))
              .orderBy(desc(announcements.publishedAt))
              .limit(3);
            send("announcement", ann);
          }
        } catch {
          // 单次推送失败不中断通道
        }
      };

      send("hello", { channel: "carbon-nebula", node: "CN-SZ-07", at: new Date().toISOString() });
      await push();
      timer = setInterval(push, TICK_INTERVAL);
      req.signal.addEventListener("abort", () => {
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
