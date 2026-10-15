"use client";

import { Button } from "@/components/ui/form/Button";

/**
 * RemindDialog — 参与时长提醒弹窗
 */
export function RemindDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-bg-0/85 p-4 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl max-w-md p-6 animate-modal-in">
        <h3 className="text-lg font-semibold text-text-1">参与时长提醒</h3>
        <p className="mt-3 text-sm leading-relaxed text-text-2">
          您已连续在线超过 30 分钟。演算周期为每天 288 轮的高频节奏，建议休息片刻。碳积分为虚拟积分，仅供娱乐，
          不可兑换、不可提现、无真钱价值。您可以在「我的 → 参与保护」中开启冷静期。
        </p>
        <Button fullWidth className="mt-5" variant="primary" onClick={onClose}>
          我已了解，继续
        </Button>
      </div>
    </div>
  );
}
