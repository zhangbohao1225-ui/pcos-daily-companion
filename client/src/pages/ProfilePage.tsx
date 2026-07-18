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

  return <DashboardLayout><div className="mx-auto max-w-5xl"><header className="mb-7"><p className="text-xs font-medium tracking-[0.16em] text-[#8C998F]">暖巢 · MY SPACE</p><h1 className="mt-1 font-serif text-3xl tracking-[-0.035em] text-[#2E4436] md:text-4xl">让设置，贴合你的生活</h1><p className="mt-2 text-sm text-[#748278]">这里的每个目标都可以很轻，不必为了打卡而打卡。</p></header>
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside className="rounded-[1.75rem] bg-[#34513F] p-6 text-white shadow-[0_18px_40px_rgba(51,81,63,0.18)]"><Avatar className="h-16 w-16 border-2 border-white/40 bg-[#DDEBD9]"><AvatarFallback className="bg-[#DDEBD9] font-serif text-2xl text-[#41604D]">{(user?.name || "暖").slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><h2 className="mt-5 font-serif text-2xl">{dashboardQuery.data?.profile?.displayName || user?.name || "暖巢用户"}</h2><p className="mt-1 text-sm text-[#C9D9CC]">这是你的私密健康空间</p><div className="mt-8 space-y-4 border-t border-white/15 pt-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-[#D6E7B7]" /><p className="text-xs leading-5 text-[#D9E6DB]">记录默认仅用于生成你的个人打卡与洞察。</p></div><div className="flex items-start gap-3"><Leaf className="mt-0.5 h-4 w-4 text-[#D6E7B7]" /><p className="text-xs leading-5 text-[#D9E6DB]">健康指数是自我观察工具，并非医疗诊断。</p></div></div></aside>
      <section className="rounded-[1.75rem] border border-[#E4EAE3] bg-white p-6 shadow-[0_12px_30px_rgba(68,85,74,0.05)] md:p-7"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EDF5EB] text-[#50775A]"><UserRound className="h-5 w-5" /></span><div><h2 className="font-serif text-2xl text-[#354B3B]">我的健康档案</h2><p className="mt-1 text-sm text-[#7B897F]">这份档案会帮助暖巢把提示做得更贴近你。</p></div></div><div className="mt-8 grid gap-6 md:grid-cols-2"><div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-[#506456]">显示名称</label><Input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="你希望被怎样称呼" className="h-12 rounded-xl border-[#DDE7DB]" /></div><div><label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#506456]"><Clock3 className="h-4 w-4 text-[#6C9272]" />每日睡眠目标</label><div className="relative"><Input inputMode="numeric" value={sleepTarget} onChange={event => setSleepTarget(event.target.value)} className="h-12 rounded-xl border-[#DDE7DB] pr-14" /><span className="absolute right-4 top-3.5 text-sm text-[#849188]">小时</span></div></div><div><label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#506456]"><CheckCircle2 className="h-4 w-4 text-[#6C9272]" />每日活动目标</label><div className="relative"><Input inputMode="numeric" value={movementTarget} onChange={event => setMovementTarget(event.target.value)} className="h-12 rounded-xl border-[#DDE7DB] pr-14" /><span className="absolute right-4 top-3.5 text-sm text-[#849188]">分钟</span></div></div></div><div className="mt-8 flex justify-end border-t border-[#EFF2EE] pt-5"><Button onClick={submit} disabled={saveProfile.isPending} className="rounded-xl bg-[#385542] px-5 hover:bg-[#2E4737]">保存健康档案</Button></div></section></div>
  </div></DashboardLayout>;
}
