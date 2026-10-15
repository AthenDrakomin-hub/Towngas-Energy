import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/display/Card";
import { FAQ, PLATFORM, FOUR_PLATFORMS } from "@/lib/constants";

export default function FaqPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <div className="p-2">
            <h1 className="text-xl font-bold text-gray-800">平台说明 · FAQ</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {PLATFORM.fullName} 是内部娱乐化演算环境。以下问答用于回答"这是做什么的"，所有话术与命名映射体系保持一致。
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {FOUR_PLATFORMS.map((p) => (
                <div key={p.key} className="rounded-lg bg-white p-3 border border-gray-200">
                  <div className="text-sm font-semibold text-gray-800">{p.name}</div>
                  <p className="mt-1 text-xs text-gray-500">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {FAQ.map((item) => (
          <Card key={item.q}>
            <div className="p-2">
              <h2 className="text-sm font-semibold text-success">Q · {item.q}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.a}</p>
            </div>
          </Card>
        ))}

        <Card title="参与保护与理性提示" status="warn">
          <ul className="space-y-2 text-sm leading-relaxed text-gray-500">
            <li>· 演算周期为每天 288 轮，属于高频节奏，平台默认每 30 分钟弹出一次参与时长提醒。</li>
            <li>· 单周期投资份额上限与每日投资份额上限由平台统一配置，达到上限后将拒绝建立投资份额。</li>
            <li>· 碳积分（EEC）为虚拟积分，不可兑换、不可提现、不可转让、无真钱价值。</li>
            <li>· 每期 5% 生态服务费构成负期望结构，用于虚拟积分回收与通胀控制。</li>
            <li>· 采集失败时周期被标记为"数据缺口"，投资份额原路退还，绝不伪造结果。</li>
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
