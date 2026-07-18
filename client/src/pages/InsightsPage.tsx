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

  return <DashboardLayout><div className="mx-auto max-w-7xl"><header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium tracking-[0.16em] text-[#8C998F]">暖巢 · INSIGHTS</p><h1 className="mt-1 font-serif text-3xl tracking-[-0.035em] text-[#2E4436] md:text-4xl">数据会说话，也会安慰你</h1><p className="mt-2 text-sm text-[#748278]">把这七天的微小选择，慢慢连成可理解的健康节律。</p></div><Badge variant="outline" className="w-fit rounded-full border-[#D5E4D3] bg-[#F4F9F2] px-3 py-1.5 text-xs font-normal text-[#58755E]">近 7 天 · 截至今日</Badge></header>
    {weekQuery.isLoading ? <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#6E9573]" /></div> : <div className="space-y-6"><section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="relative overflow-hidden rounded-[1.75rem] bg-[#34513F] p-6 text-white shadow-[0_18px_42px_rgba(53,81,64,0.18)] md:p-8"><div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#8EAD8B]/25 blur-2xl" /><div className="relative"><div className="flex items-center gap-2 text-sm text-[#CFE0D2]"><TrendingUp className="h-4 w-4" />本周综合健康指数</div><div className="mt-4 flex items-end gap-3"><span className="font-serif text-7xl tracking-[-0.07em]">{summary?.healthScore ?? 0}</span><span className="mb-3 text-sm text-[#CFE0D2]">/ 100</span></div><div className="mt-5 max-w-md"><div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#CDE2A7] transition-all duration-700" style={{ width: `${summary?.healthScore ?? 0}%` }} /></div><p className="mt-3 text-sm leading-6 text-[#D4E0D6]">本周平均完成率 {summary?.completionRate ?? 0}%。没有所谓“完美周”，每一次愿意记录都是与你自己站在一起。</p></div></div></div><div className="rounded-[1.75rem] border border-[#E4EAE3] bg-white p-6 shadow-[0_12px_30px_rgba(68,85,74,0.05)]"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F9E9E3] text-[#AF6C58]"><BrainCircuit className="h-5 w-5" /></span><div><p className="font-medium text-[#3D5443]">关联观察</p><p className="mt-1 text-xs text-[#849188]">基于同日记录的初步线索</p></div></div><div className="mt-5 rounded-2xl bg-[#FAF7F2] p-4"><p className="text-sm font-medium text-[#6D574B]">{correlation ? `${correlation.left} × ${correlation.right}` : "正在收集更多记录"}</p><p className="mt-2 text-sm leading-6 text-[#816D61]">{correlation?.explanation ?? "完成至少 3 天饮食与睡眠记录后，暖巢会在这里呈现一项值得留意的个人观察。"}</p></div><p className="mt-4 text-xs leading-5 text-[#9B887C]">这是数据关联，不代表因果关系或医疗结论。</p></div></section>
      <section className="grid gap-6 xl:grid-cols-2"><div className="rounded-[1.75rem] border border-[#E4EAE3] bg-white p-5 shadow-[0_10px_25px_rgba(68,85,74,0.05)] sm:p-6"><div className="mb-2 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EDF5EB] text-[#52785B]"><BarChart3 className="h-4 w-4" /></span><div><h2 className="font-serif text-xl text-[#344B3A]">健康节律趋势</h2><p className="mt-0.5 text-xs text-[#89968D]">指数与每日完成率</p></div></div><HealthTrendChart points={trendPoints} /></div><div className="rounded-[1.75rem] border border-[#E4EAE3] bg-white p-5 shadow-[0_10px_25px_rgba(68,85,74,0.05)] sm:p-6"><div className="mb-2 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7F1E8] text-[#AE8054]"><Sparkles className="h-4 w-4" /></span><div><h2 className="font-serif text-xl text-[#344B3A]">各维度达标率</h2><p className="mt-0.5 text-xs text-[#89968D]">以你的实际记录为准</p></div></div><DimensionBarChart points={dimensions} /></div></section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><article className="overflow-hidden rounded-[1.75rem] border border-[#E6E2DD] bg-[#FFFDFC] shadow-[0_12px_30px_rgba(99,78,58,0.06)]"><div className="flex flex-col gap-4 border-b border-[#F0EAE5] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F6E9E1] text-[#AB6B55]"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-serif text-2xl text-[#5C4539]">暖巢 AI 周报</h2><p className="mt-0.5 text-xs text-[#9D8375]">由 DeepSeek 依据你的主动记录生成</p></div></div><Button onClick={() => generateReport.mutate({ endDate })} disabled={generateReport.isPending} className="rounded-xl bg-[#A76A55] hover:bg-[#925842]">{generateReport.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />整理中</> : "生成本周洞察"}</Button></div><div className="min-h-56 px-6 py-6"><div className="prose prose-sm max-w-none leading-7 text-[#705B4F] prose-p:my-0 prose-p:mb-4">{report ? <Streamdown>{report.content}</Streamdown> : <div className="rounded-2xl bg-[#FCF6F1] p-5 text-sm leading-7 text-[#8D7568]">在积累了一些打卡记录后，点击「生成本周洞察」，暖巢会把趋势和关联观察整理成一段温暖、非诊断性的个人小结。</div>}</div>{report ? <p className="mt-2 text-xs text-[#A18C80]">报告模型：{report.model || "DeepSeek"} · 数据仅用于个人自我观察</p> : null}</div></article>
        <aside className="rounded-[1.75rem] border border-[#E4EAE3] bg-white p-6 shadow-[0_10px_25px_rgba(68,85,74,0.05)]"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF5EC] text-[#537B5C]"><CalendarClock className="h-5 w-5" /></span><div><h2 className="font-serif text-xl text-[#344B3A]">每周自动整理</h2><p className="mt-1 text-xs leading-5 text-[#87948B]">每周一上午，把上一周的记录整理成报告。</p></div></div><div className="mt-7 flex items-center justify-between rounded-2xl bg-[#F6F9F5] p-4"><div><p className="text-sm font-medium text-[#48604E]">自动生成周报</p><p className="mt-1 text-xs text-[#86948A]">发布后即可开启</p></div><Switch checked={Boolean(scheduleQuery.data?.isEnabled)} onCheckedChange={checked => scheduleMutation.mutate({ enabled: checked })} disabled={scheduleMutation.isPending} /></div><div className="mt-5 flex gap-2 rounded-xl bg-[#FFF8E9] px-3 py-3 text-xs leading-5 text-[#927845]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />周报是支持自我观察的工具，不替代医疗咨询或诊断。</div></aside></section></div>}</div></DashboardLayout>;
}
