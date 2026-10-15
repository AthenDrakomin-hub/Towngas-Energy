"use client";

import clsx from "clsx";
import { Modal } from "@/components/ui/feedback/Modal";
import { Button } from "@/components/ui/form/Button";
import { NumberInput } from "@/components/ui/form/NumberInput";
import { fmtInt, fmtX } from "@/lib/format";
import type { Round } from "./types";

const QUICK = [500, 1000, 5000, 10000];

/**
 * BetModal — 投资确认弹窗
 */
export function BetModal({
  open,
  side,
  amount,
  onAmountChange,
  onClose,
  onConfirm,
  round,
}: {
  open: boolean;
  side: "up" | "down" | null;
  amount: number;
  onAmountChange: (n: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  round: Round | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="确认建立投资份额"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button
            variant={side === "up" ? "success" : "danger"}
            onClick={onConfirm}
          >
            确认投资
          </Button>
        </>
      }
    >
      {side && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-bg-1 p-3">
            <span className="text-text-3">方向</span>
            <span className={clsx("text-lg font-bold", side === "up" ? "text-success" : "text-danger")}>
              {side === "up" ? "▲ 看多" : "▼ 看空"}
            </span>
          </div>
          <NumberInput
            value={amount}
            onChange={onAmountChange}
            min={round?.minBet ?? 100}
            max={round?.maxBetPerRound ?? 50000}
            quickAmounts={QUICK}
          />
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-bg-1 p-3">
            <div>
              <div className="label">预估结算率</div>
              <div className="num mt-1 text-lg font-bold text-primary">
                {fmtX(side === "up" ? round?.payoutUp : round?.payoutDown)}x
              </div>
            </div>
            <div>
              <div className="label">潜在收益</div>
              <div className="num mt-1 text-lg font-bold text-success">
                {fmtInt(amount * (side === "up" ? round?.payoutUp ?? 0 : round?.payoutDown ?? 0))}
              </div>
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-text-4">
            虚拟积分，仅供娱乐。结算率随两侧投资份额规模实时变化，最终以清算时点为准。
          </p>
        </div>
      )}
    </Modal>
  );
}
