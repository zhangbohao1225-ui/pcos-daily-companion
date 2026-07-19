import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DimensionBarChart, HealthTrendChart } from "@/components/HealthCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { BarChart3, BrainCircuit, CalendarClock, CircleAlert, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Streamdown } from "streamdown";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const currentDate = () => new Date().toISOString().slice(0, 10);

function weekdayLabel(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${value}T12:00:00`)).replace("周", "");
}

export default function InsightsPage() {
  const { isAuthenticated } = useAuth();
  const [endDate] = useState(currentDate);
  const utils = trpc.useUtils();
  const weekQuery = trpc.health.week.useQuery({ endDate }, { enabled: isAuthenticated });
  const reportQuery = trpc.health.latestReport.useQuery(undefined, { enabled: isAuthenticated });
  const scheduleQuery = trpc.health.reportSchedule.useQuery(undefined, { enabled: isAuthenticated });
  const generateReport = trpc.health.generateWeeklyReport.useMutation({
    onSuccess: () => {
      void utils.health.latestReport.invalidate();
      toast.success("你的本周健康洞察已经准备好了");
    },
    onError: error => toast.error(error.message),
  });
  const scheduleMutation = trpc.health.configureWeeklyReport.useMutation({
    onSuccess: () => { void utils.health.reportSchedule.invalidate(); toast.success("自动周报设置已更新"); },
    onError: error => toast.error(error.message),
  });

  const summary = weekQuery.data?.summary;
  const trendPoints = useMemo(() => (summary?.daily ?? []).map(item => ({ label: weekdayLabel(item.date), score: item.healthScore, completion: item.completionRate })), [summary?.daily]);
  const dimensions = useMemo(() => (summary?.dimensions ?? []).map(item => ({ label: item.label, score: Math.round(item.score) })), [summary?.dimensions]);
  const report = reportQuery.data;
  const correlation = summary?.correlations[0];

  return <DashboardLayout><div className="mx-auto max-w-7xl"><header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="warm-kicker">INSIGHTS · GENTLE DATA</p><h1 className="warm-title mt-1 text-3xl md:text-4xl">数据会说话，也会安慰你</h1><p className="mt-2 text-sm text-[#9b746e]">把这七天的微小选择，慢慢连成可理解的健康节律。</p></div><Badge variant="outline" className="w-fit rounded-full border-[#f3cec6] bg-[#fff2ee] px-3 py-1.5 text-xs font-normal text-[#c76b66]">近 7 天 · 截至今日</Badge></header>
    {weekQuery.isLoading ? <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#db8176]" /></div> : <div className="space-y-6"><section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="relative overflow-hidden rounded-[1.75rem] warm-gradient p-6 text-white shadow-[0_20px_44px_rgba(214,108,98,0.22)] md:p-8"><div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/16 blur-2xl" /><div className="relative"><div className="flex items-center gap-2 text-sm text-white/80"><TrendingUp className="h-4 w-4" />本周综合健康指数</div><div className="mt-4 flex items-end gap-3"><span className="font-serif text-7xl tracking-[-0.07em]">{summary?.healthScore ?? 0}</span><span className="mb-3 text-sm text-white/80">/ 100</span></div><div className="mt-5 max-w-md"><div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ffe4bc] transition-all duration-700" style={{ width: `${summary?.healthScore ?? 0}%` }} /></div><p className="mt-3 text-sm leading-6 text-white/85">本周平均完成率 {summary?.completionRate ?? 0}%。没有所谓“完美周”，每一次愿意记录都是与你自己站在一起。</p></div></div></div><div className="rounded-[1.75rem] border border-[#f5e1dc] bg-white/85 p-6 shadow-[0_12px_30px_rgba(203,107,99,0.08)]"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e9] text-[#d56d68]"><BrainCircuit className="h-5 w-5" /></span><div><p className="font-medium text-[#704845]">关联观察</p><p className="mt-1 text-xs text-[#a8847d]">基于同日记录的初步线索</p></div></div><div className="mt-5 rounded-2xl bg-[#fff8f5] p-4"><p className="text-sm font-medium text-[#7d5550]">{correlation ? `${correlation.left} × ${correlation.right}` : "正在收集更多记录"}</p><p className="mt-2 text-sm leading-6 text-[#98716b]">{correlation?.explanation ?? "完成至少 3 天饮食与睡眠记录后，Suta会在这里呈现一项值得留意的个人观察。"}</p></div><p className="mt-4 text-xs leading-5 text-[#af8a82]">这是数据关联，不代表因果关系或医疗结论。</p></div></section>
      <section className="grid gap-6 xl:grid-cols-2"><div className="rounded-[1.75rem] border border-[#f5e1dc] bg-white/85 p-5 shadow-[0_10px_25px_rgba(203,107,99,0.07)] sm:p-6"><div className="mb-2 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff0eb] text-[#d56d68]"><BarChart3 className="h-4 w-4" /></span><div><h2 className="font-serif text-xl text-[#704845]">健康节律趋势</h2><p className="mt-0.5 text-xs text-[#a7817a]">指数与每日完成率</p></div></div><HealthTrendChart points={trendPoints} /></div><div className="rounded-[1.75rem] border border-[#f5e1dc] bg-white/85 p-5 shadow-[0_10px_25px_rgba(203,107,99,0.07)] sm:p-6"><div className="mb-2 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff0e3] text-[#d78061]"><Sparkles className="h-4 w-4" /></span><div><h2 className="font-serif text-xl text-[#704845]">各维度达标率</h2><p className="mt-0.5 text-xs text-[#a7817a]">以你的实际记录为准</p></div></div><DimensionBarChart points={dimensions} /></div></section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><article className="overflow-hidden rounded-[1.75rem] border border-[#f5e1dc] bg-[#fffdfc] shadow-[0_12px_30px_rgba(203,107,99,0.07)]"><div className="flex flex-col gap-4 border-b border-[#f5e8e4] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0e9] text-[#d56d68]"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-serif text-2xl text-[#704845]">Suta AI 周报</h2><p className="mt-0.5 text-xs text-[#aa837c]">由 DeepSeek 依据你的主动记录生成</p></div></div><Button onClick={() => generateReport.mutate({ endDate })} disabled={generateReport.isPending} className="rounded-xl warm-gradient hover:opacity-95">{generateReport.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />整理中</> : "生成本周洞察"}</Button></div><div className="min-h-56 px-6 py-6"><div className="prose prose-sm max-w-none leading-7 text-[#805b56] prose-p:my-0 prose-p:mb-4">{report ? <Streamdown>{report.content}</Streamdown> : <div className="rounded-2xl bg-[#fff7f3] p-5 text-sm leading-7 text-[#9b746e]">在积累了一些打卡记录后，点击「生成本周洞察」，Suta会把趋势和关联观察整理成一段温暖、非诊断性的个人小结。</div>}</div>{report ? <p className="mt-2 text-xs text-[#ad8780]">报告模型：{report.model || "DeepSeek"} · 数据仅用于个人自我观察</p> : null}</div></article>
        <aside className="rounded-[1.75rem] border border-[#f5e1dc] bg-white/85 p-6 shadow-[0_10px_25px_rgba(203,107,99,0.07)]"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0eb] text-[#d56d68]"><CalendarClock className="h-5 w-5" /></span><div><h2 className="font-serif text-xl text-[#704845]">每周自动整理</h2><p className="mt-1 text-xs leading-5 text-[#a7817a]">每周一上午，把上一周的记录整理成报告。</p></div></div><div className="mt-7 flex items-center justify-between rounded-2xl bg-[#fff7f3] p-4"><div><p className="text-sm font-medium text-[#805752]">自动生成周报</p><p className="mt-1 text-xs text-[#a7817a]">发布后即可开启</p></div><Switch checked={Boolean(scheduleQuery.data?.isEnabled)} onCheckedChange={checked => scheduleMutation.mutate({ enabled: checked })} disabled={scheduleMutation.isPending} /></div><div className="mt-5 flex gap-2 rounded-xl bg-[#fff2e5] px-3 py-3 text-xs leading-5 text-[#a96f58]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />周报是支持自我观察的工具，不替代医疗咨询或诊断。</div></aside></section></div>}</div></DashboardLayout>;
}
