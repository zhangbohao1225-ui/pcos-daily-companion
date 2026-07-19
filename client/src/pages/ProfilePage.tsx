import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, Leaf, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [date] = useState(today);
  const dashboardQuery = trpc.health.dashboard.useQuery({ date }, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const [displayName, setDisplayName] = useState("");
  const [sleepTarget, setSleepTarget] = useState("8");
  const [movementTarget, setMovementTarget] = useState("30");

  useEffect(() => {
    if (dashboardQuery.data?.profile) {
      setDisplayName(dashboardQuery.data.profile.displayName ?? user?.name ?? "");
      setSleepTarget(String(dashboardQuery.data.profile.dailySleepTarget));
      setMovementTarget(String(dashboardQuery.data.profile.dailyMovementTarget));
    }
  }, [dashboardQuery.data?.profile, user?.name]);

  const saveProfile = trpc.health.updateProfile.useMutation({
    onSuccess: () => {
      void utils.health.dashboard.invalidate({ date });
      toast.success("你的个人健康节奏已更新");
    },
    onError: error => toast.error(error.message),
  });

  const submit = () => {
    const sleep = Number(sleepTarget);
    const movement = Number(movementTarget);
    if (!displayName.trim()) { toast.error("请填写一个显示名称"); return; }
    if (!Number.isInteger(sleep) || sleep < 4 || sleep > 12) { toast.error("睡眠目标请填写 4–12 小时之间的整数"); return; }
    if (!Number.isInteger(movement) || movement < 1 || movement > 300) { toast.error("运动目标请填写 1–300 分钟之间的整数"); return; }
    saveProfile.mutate({ displayName: displayName.trim(), dailySleepTarget: sleep, dailyMovementTarget: movement });
  };

  return <DashboardLayout><div className="mx-auto max-w-5xl"><header className="mb-7"><p className="warm-kicker">MY SPACE · PERSONAL RHYTHM</p><h1 className="warm-title mt-1 text-3xl md:text-4xl">我的温柔档案</h1><p className="mt-2 text-sm text-[#9b746e]">这里的每个目标都可以很轻，不必为了打卡而打卡。</p></header>
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside className="rounded-[1.75rem] warm-gradient p-6 text-white shadow-[0_20px_44px_rgba(214,108,98,0.22)]"><Avatar className="h-16 w-16 border-2 border-white/40 bg-[#ffe2d9]"><AvatarFallback className="bg-[#ffe2d9] font-serif text-2xl text-[#c46260]">{(user?.name || "暖").slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><h2 className="mt-5 font-serif text-2xl">{dashboardQuery.data?.profile?.displayName || user?.name || "Suta用户"}</h2><p className="mt-1 text-sm text-white/80">这是你的私密健康空间</p><div className="mt-8 space-y-4 border-t border-white/15 pt-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-[#ffe8bd]" /><p className="text-xs leading-5 text-white/85">记录默认仅用于生成你的个人打卡与洞察。</p></div><div className="flex items-start gap-3"><Leaf className="mt-0.5 h-4 w-4 text-[#ffe8bd]" /><p className="text-xs leading-5 text-white/85">健康指数是自我观察工具，并非医疗诊断。</p></div></div></aside>
      <section className="rounded-[1.75rem] border warm-surface p-6 md:p-7"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0eb] text-[#d56e68]"><UserRound className="h-5 w-5" /></span><div><h2 className="font-serif text-2xl text-[#704845]">我的健康档案</h2><p className="mt-1 text-sm text-[#9b746e]">这份档案会帮助Suta把提示做得更贴近你。</p></div></div><div className="mt-8 grid gap-6 md:grid-cols-2"><div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-[#76514d]">显示名称</label><Input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="你希望被怎样称呼" className="h-12 rounded-xl border-[#f0d8d1]" /></div><div><label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#76514d]"><Clock3 className="h-4 w-4 text-[#d5786d]" />每日睡眠目标</label><div className="relative"><Input inputMode="numeric" value={sleepTarget} onChange={event => setSleepTarget(event.target.value)} className="h-12 rounded-xl border-[#f0d8d1] pr-14" /><span className="absolute right-4 top-3.5 text-sm text-[#a8847d]">小时</span></div></div><div><label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#76514d]"><CheckCircle2 className="h-4 w-4 text-[#d5786d]" />每日活动目标</label><div className="relative"><Input inputMode="numeric" value={movementTarget} onChange={event => setMovementTarget(event.target.value)} className="h-12 rounded-xl border-[#f0d8d1] pr-14" /><span className="absolute right-4 top-3.5 text-sm text-[#a8847d]">分钟</span></div></div></div><div className="mt-8 flex justify-end border-t border-[#f5e8e4] pt-5"><Button onClick={submit} disabled={saveProfile.isPending} className="rounded-xl warm-gradient px-5 hover:opacity-95">保存健康档案</Button></div></section></div>
  </div></DashboardLayout>;
}
