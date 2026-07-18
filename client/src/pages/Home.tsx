import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  CalendarHeart,
  Check,
  ChevronRight,
  CircleDot,
  Flower2,
  Heart,
  HeartHandshake,
  PawPrint,
  Sparkles,
  Sprout,
  Sun,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

function Companion({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative ${compact ? "h-28 w-28" : "h-44 w-44 sm:h-52 sm:w-52"}`} aria-label="暖巢陪伴精灵团团" role="img">
      <span className="pet-pulse absolute inset-2 rounded-full bg-[#ffb4a8]/35 blur-2xl" />
      <span className="pet-float absolute inset-0 flex items-center justify-center">
        <span className={`relative flex items-center justify-center rounded-[48%_52%_52%_48%] bg-gradient-to-br from-[#fff8f1] via-[#ffd7ce] to-[#f6a7a3] shadow-[inset_-8px_-10px_18px_rgba(216,100,101,0.15),0_22px_40px_rgba(197,94,91,0.22)] ${compact ? "h-24 w-24" : "h-36 w-36 sm:h-44 sm:w-44"}`}>
          <span className={`absolute -left-3 -top-4 rotate-[-28deg] rounded-[90%_15%_80%_15%] bg-[#ffb9b1] ${compact ? "h-10 w-7" : "h-14 w-9"}`} />
          <span className={`absolute -right-3 -top-4 rotate-[28deg] rounded-[15%_90%_15%_80%] bg-[#ffb9b1] ${compact ? "h-10 w-7" : "h-14 w-9"}`} />
          <span className="absolute left-[33%] top-[45%] h-2.5 w-2.5 rounded-full bg-[#714448]" />
          <span className="absolute right-[33%] top-[45%] h-2.5 w-2.5 rounded-full bg-[#714448]" />
          <span className="absolute top-[58%] h-2 w-3 rounded-full bg-[#dc7773]" />
          <span className="absolute left-[26%] top-[62%] h-3 w-5 rounded-full bg-[#f5a5a0]/70 blur-[1px]" />
          <span className="absolute right-[26%] top-[62%] h-3 w-5 rounded-full bg-[#f5a5a0]/70 blur-[1px]" />
          <Heart className={`absolute -bottom-3 fill-[#f47f78] text-[#f47f78] ${compact ? "h-6 w-6" : "h-8 w-8"}`} />
        </span>
      </span>
      {!compact ? <><Sparkles className="absolute left-0 top-7 h-5 w-5 text-[#f39a75]" /><Flower2 className="absolute right-0 top-4 h-5 w-5 text-[#e67a98]" /><span className="absolute bottom-2 left-0 h-3 w-3 rounded-full bg-[#f6be8d]" /></> : null}
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [today] = useState(() => formatDate(new Date()));
  const dashboardQuery = trpc.health.dashboard.useQuery({ date: today }, { enabled: isAuthenticated });
  const dashboard = dashboardQuery.data;
  const greeting = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date(`${today}T12:00:00`));
  const displayName = dashboard?.profile?.displayName || user?.name || "你";
  const completed = dashboard?.metric.completedCount ?? 0;
  const total = dashboard?.metric.totalCount ?? 4;
  const completionRate = dashboard?.metric.completionRate ?? 0;
  const tasks = useMemo(() => dashboard?.templates.slice(0, 4) ?? [], [dashboard?.templates]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-8">
        <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
          <div>
            <p className="warm-kicker">NEST WELL · WARM COMPANION</p>
            <h1 className="warm-title mt-1 text-3xl sm:text-4xl">早安，{displayName}</h1>
            <p className="mt-2 text-sm text-[#9a6d68]">{greeting} · 今天也让身体被好好照顾。</p>
          </div>
          <button onClick={() => setLocation("/growth")} className="group inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-[#b95f5d] shadow-[0_8px_22px_rgba(188,93,88,0.10)] transition-all hover:-translate-y-0.5 hover:bg-white">
            <PawPrint className="h-4 w-4" /> 团团的成长园 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </header>

        <section className="relative overflow-hidden rounded-[2rem] warm-gradient px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute bottom-0 left-[45%] h-28 w-72 rounded-full bg-[#d96168]/20 blur-2xl" />
          <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/13 px-3 py-1.5 text-xs font-medium text-white/90"><Sun className="h-3.5 w-3.5" /> 今日的一点温柔</div>
              <h2 className="mt-5 font-serif text-3xl leading-tight tracking-[-0.04em] sm:text-4xl">不必追赶完美，<br />从一次轻轻的打卡开始。</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/85">团团已经为你准备好今日的健康小任务。每一笔记录，都会变成陪伴你成长的星光。</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => setLocation("/checkin")} className="rounded-full bg-white px-5 text-[#c65e60] shadow-[0_10px_22px_rgba(130,54,54,0.16)] hover:bg-[#fff7f4]">开始今日打卡 <ChevronRight className="ml-1 h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => setLocation("/calendar")} className="rounded-full border-white/35 bg-white/10 px-5 text-white hover:bg-white/18 hover:text-white"><CalendarHeart className="mr-1.5 h-4 w-4" /> 看看我的节律</Button>
              </div>
            </div>
            <div className="hidden md:block"><Companion /></div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="warm-surface rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="warm-kicker">TODAY CHECK-IN</p><h2 className="warm-title mt-1 text-2xl">今天的照顾清单</h2><p className="mt-1 text-sm text-[#9a7772]">完成 {completed}/{total} 项，慢慢来就很好。</p></div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0eb] text-[#e4776e]"><Heart className="h-5 w-5 fill-current" /></span>
            </div>
            <Progress value={completionRate} className="mt-5 h-2.5 bg-[#ffe9e3] [&>div]:bg-gradient-to-r [&>div]:from-[#f59b8f] [&>div]:to-[#ef7780]" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {tasks.length ? tasks.map(task => {
                const checked = dashboard?.checkins.some(entry => entry.templateId === task.id && entry.completed);
                return <button key={task.id} onClick={() => setLocation("/checkin")} className="group flex items-center gap-3 rounded-2xl border border-[#fae5df] bg-[#fffdfc] px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#f6c9bf] hover:shadow-[0_10px_24px_rgba(192,104,98,0.09)]">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${checked ? "bg-[#f69789] text-white" : "bg-[#fff0eb] text-[#e78678]"}`}><Check className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-[#734944]">{task.name}</span><span className="block truncate pt-0.5 text-xs text-[#ad8580]">{checked ? "已收下这一次记录" : task.recordMode === "toggle" ? "点一下即可完成" : "留下一点小记录"}</span></span>
                </button>;
              }) : ["低糖 & 抗炎饮食", "运动记录", "情绪记录", "睡眠记录"].map(item => <button key={item} onClick={() => setLocation("/checkin")} className="flex items-center gap-3 rounded-2xl border border-[#fae5df] bg-[#fffdfc] px-4 py-3 text-left"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0eb] text-[#e78678]"><CircleDot className="h-4 w-4" /></span><span className="text-sm font-medium text-[#734944]">{item}</span></button>)}
            </div>
            <button onClick={() => setLocation("/checkin")} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#cb6764] transition-colors hover:text-[#aa4f50]">去打卡页完成记录 <ArrowRight className="h-4 w-4" /></button>
          </section>

          <aside className="rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-[#fff0eb] via-[#fff7f0] to-[#fdebf0] p-5 shadow-[0_16px_40px_rgba(193,105,99,0.10)]">
            <div className="flex items-start justify-between"><div><p className="warm-kicker">MY TEAM</p><h2 className="warm-title mt-1 text-2xl">把温柔，连成队伍</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-[#df7c79]"><HeartHandshake className="h-5 w-5" /></span></div>
            <p className="mt-4 text-sm leading-6 text-[#9b726d]">你的队伍从一份共同目标开始。邀请值得信任的人，一起留下不比较、只陪伴的健康记录。</p>
            <div className="mt-5 rounded-2xl border border-white/70 bg-white/65 p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffe4db] text-[#d96f6d]"><Sprout className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-[#754b48]">还没有创建队伍</p><p className="mt-0.5 text-xs text-[#ad8580]">从一个共同的小目标开始吧</p></div></div></div>
            <Button onClick={() => setLocation("/team")} className="mt-5 w-full rounded-xl bg-[#ef8276] text-white hover:bg-[#df7069]">进入队伍空间 <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
