import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Apple,
  CalendarHeart,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Dumbbell,
  Frown,
  Heart,
  HeartPulse,
  Moon,
  Plus,
  Sparkles,
  Smile,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const iconByName: Record<string, LucideIcon> = { Apple, Dumbbell, Smile, Moon, Sparkles };
const formatDate = (value: Date) => value.toISOString().slice(0, 10);

function HeaderTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="mb-7 flex flex-col gap-1"><p className="text-xs font-medium tracking-[0.16em] text-[#8C998F]">暖巢 · DAILY CARE</p><h1 className="font-serif text-3xl tracking-[-0.035em] text-[#2E4436] md:text-4xl">{title}</h1><p className="text-sm text-[#748278]">{subtitle}</p></header>;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [today] = useState(() => formatDate(new Date()));
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [numericValue, setNumericValue] = useState("");
  const [choice, setChoice] = useState("green");
  const [note, setNote] = useState("");
  const [vitamin, setVitamin] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customIsValue, setCustomIsValue] = useState(false);
  const [customGoal, setCustomGoal] = useState("1");
  const [customUnit, setCustomUnit] = useState("次");
  const utils = trpc.useUtils();
  const dashboardQuery = trpc.health.dashboard.useQuery({ date: today }, { enabled: isAuthenticated });
  const data = dashboardQuery.data;

  const saveCheckin = trpc.health.saveCheckin.useMutation({
    onSuccess: () => {
      void utils.health.dashboard.invalidate({ date: today });
      setActiveTemplateId(null);
      toast.success("已收下这一次认真记录");
    },
    onError: error => toast.error(error.message),
  });
  const startPeriod = trpc.health.startPeriod.useMutation({
    onSuccess: () => { void utils.health.dashboard.invalidate({ date: today }); toast.success("已开始记录本次经期"); },
    onError: error => toast.error(error.message),
  });
  const endPeriod = trpc.health.endPeriod.useMutation({
    onSuccess: () => { void utils.health.dashboard.invalidate({ date: today }); toast.success("已结束本次经期记录"); },
    onError: error => toast.error(error.message),
  });
  const saveSymptoms = trpc.health.saveSymptoms.useMutation({
    onSuccess: () => { void utils.health.dashboard.invalidate({ date: today }); },
    onError: error => toast.error(error.message),
  });
  const addCustom = trpc.health.addCustomTemplate.useMutation({
    onSuccess: () => {
      void utils.health.dashboard.invalidate({ date: today });
      setCustomOpen(false);
      setCustomName("");
      toast.success("新的日常目标已加入今天");
    },
    onError: error => toast.error(error.message),
  });

  const activeTemplate = useMemo(() => data?.templates.find(item => item.id === activeTemplateId) ?? null, [data?.templates, activeTemplateId]);
  const checkinByTemplateId = useMemo(() => new Map(data?.checkins.map(item => [item.templateId, item]) ?? []), [data?.checkins]);
  const dayLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date(`${today}T12:00:00`));
  const activeDays = data?.activeCycle ? Math.max(1, Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${data.activeCycle.startDate}T12:00:00`).getTime()) / 86400000) + 1) : 0;

  const openEditor = (templateId: number) => {
    const template = data?.templates.find(item => item.id === templateId);
    const existing = checkinByTemplateId.get(templateId);
    if (!template) return;
    if (template.recordMode === "toggle") {
      saveCheckin.mutate({ templateId, recordDate: today, completed: !existing?.completed });
      return;
    }
    setActiveTemplateId(templateId);
    setNumericValue(existing?.numericValue ? String(existing.numericValue) : "");
    setChoice(existing?.textValue ?? (template.kind === "mood" ? "calm" : "green"));
    setNote(existing?.note ?? "");
    setVitamin(Boolean(existing?.note?.includes("维生素")));
  };

  const submitEditor = () => {
    if (!activeTemplate) return;
    const parsedValue = numericValue === "" ? null : Number(numericValue);
    if (activeTemplate.recordMode === "value" && (parsedValue === null || Number.isNaN(parsedValue))) {
      toast.error(`请填写${activeTemplate.unit ?? "数值"}`);
      return;
    }
    const finalNote = activeTemplate.kind === "nutrition" && vitamin
      ? [note.trim(), "已补充维生素"].filter(Boolean).join(" · ")
      : note.trim() || null;
    saveCheckin.mutate({
      templateId: activeTemplate.id,
      recordDate: today,
      completed: true,
      numericValue: parsedValue,
      textValue: activeTemplate.recordMode === "choice" ? choice : null,
      note: finalNote,
    });
  };

  const saveSticker = (field: "pain" | "breastSwelling" | "acne", value: "pain" | "no_pain" | "swollen" | "not_swollen" | "acne" | "clear") => {
    const prior = data?.symptoms;
    saveSymptoms.mutate({
      recordDate: today,
      pain: field === "pain" ? value as "pain" | "no_pain" : prior?.pain ?? undefined,
      breastSwelling: field === "breastSwelling" ? value as "swollen" | "not_swollen" : prior?.breastSwelling ?? undefined,
      acne: field === "acne" ? value as "acne" | "clear" : prior?.acne ?? undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <HeaderTitle title="今天，想怎样照顾自己？" subtitle={`${dayLabel} · 不必全都完成，先从一件对自己好的事开始。`} />
        {dashboardQuery.isLoading ? <DashboardSkeleton /> : data ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-6">
              <div className="overflow-hidden rounded-[1.75rem] bg-[#33513F] p-6 text-white shadow-[0_18px_40px_rgba(51,81,63,0.18)] md:p-7">
                <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm text-[#C8D8CC]">今日健康指数</p><div className="mt-1 flex items-end gap-3"><span className="font-serif text-6xl tracking-[-0.06em]">{data.metric.healthScore}</span><span className="mb-2 text-sm text-[#C8D8CC]">/ 100</span></div><p className="mt-3 max-w-md text-sm leading-6 text-[#DDE8DF]">{data.metric.completionRate >= 75 ? "节奏很好，继续带着这份温柔往前走。" : "每一次记录都在帮你更了解自己的身体。"}</p></div>
                  <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:w-48"><div className="flex items-center justify-between text-xs text-[#D7E5D9]"><span>今日进度</span><span>{data.metric.completedCount}/{data.metric.totalCount}</span></div><Progress value={data.metric.completionRate} className="mt-3 h-2 bg-white/20 [&>div]:bg-[#D7E4B9]" /><p className="mt-3 text-xs text-[#D7E5D9]">已完成 {data.metric.completionRate}%</p></div>
                </div>
              </div>

              <div className="flex items-center justify-between"><div><h2 className="font-serif text-2xl text-[#344A3B]">今日打卡</h2><p className="mt-1 text-sm text-[#7B897F]">点按即可完成；需要填写的项目会温柔地等你。</p></div><Button variant="outline" onClick={() => setCustomOpen(true)} className="rounded-full border-[#D5E1D4] bg-white text-[#486351] hover:bg-[#EEF5EC]"><Plus className="mr-1.5 h-4 w-4" />添加目标</Button></div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.templates.map(template => {
                  const entry = checkinByTemplateId.get(template.id);
                  const Icon = iconByName[template.icon] ?? Sparkles;
                  const complete = Boolean(entry?.completed);
                  return <button key={template.id} onClick={() => openEditor(template.id)} className={`group rounded-[1.45rem] border p-5 text-left transition-all duration-200 ${complete ? "border-[#D5E5D4] bg-[#F3F8F1] shadow-[0_10px_28px_rgba(60,93,68,0.06)]" : "border-[#E4E9E3] bg-white hover:-translate-y-0.5 hover:border-[#C7D9C6] hover:shadow-[0_14px_30px_rgba(70,88,75,0.08)]"}`}>
                    <div className="flex items-start justify-between gap-4"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${complete ? "bg-[#DDECD9] text-[#3A6246]" : "bg-[#F1F5EF] text-[#62806B]"}`}><Icon className="h-5 w-5" /></span><span className={`flex h-6 w-6 items-center justify-center rounded-full border ${complete ? "border-[#5D8B65] bg-[#5D8B65] text-white" : "border-[#D6DFD5] text-transparent"}`}><Check className="h-3.5 w-3.5" /></span></div>
                    <p className="mt-5 font-medium text-[#354B3B]">{template.name}</p><p className="mt-1 min-h-10 text-sm leading-5 text-[#829087]">{entry?.completed ? entry.note || (entry.numericValue ? `已记录 ${entry.numericValue}${template.unit ?? ""}` : "今天已完成") : template.description}</p>
                    <div className="mt-4 flex items-center justify-between text-xs"><span className={complete ? "text-[#4D7657]" : "text-[#8A978E]"}>{complete ? "已完成" : template.recordMode === "toggle" ? "一键完成" : "填写记录"}</span><ChevronRight className={`h-4 w-4 transition-transform ${complete ? "text-[#4D7657]" : "text-[#A9B4AA] group-hover:translate-x-0.5"}`} /></div>
                  </button>;
                })}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-[1.5rem] border border-[#E5EAE4] bg-white p-5 shadow-[0_10px_25px_rgba(68,85,74,0.05)]"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[#3E5B46]"><CalendarHeart className="h-5 w-5" /><h2 className="font-serif text-xl">经期记录</h2></div>{data.activeCycle ? <span className="rounded-full bg-[#F8E6E0] px-2.5 py-1 text-xs text-[#A66153]">第 {activeDays} 天</span> : null}</div><p className="mt-3 text-sm leading-6 text-[#7A897F]">用最简单的方式，留下一点关于身体周期的线索。</p><Button onClick={() => data.activeCycle ? endPeriod.mutate({ recordDate: today }) : startPeriod.mutate({ recordDate: today })} className={`mt-5 w-full rounded-xl ${data.activeCycle ? "bg-[#A85F50] hover:bg-[#925143]" : "bg-[#3F604B] hover:bg-[#34503E]"}`}>{data.activeCycle ? "姨妈走了" : "来姨妈了"}</Button></section>
              <section className="rounded-[1.5rem] border border-[#E5EAE4] bg-white p-5 shadow-[0_10px_25px_rgba(68,85,74,0.05)]"><div className="flex items-center gap-2 text-[#3E5B46]"><HeartPulse className="h-5 w-5" /><h2 className="font-serif text-xl">症状小贴纸</h2></div><p className="mt-2 text-xs leading-5 text-[#89958D]">点一下就好，10 秒完成今天的感受。</p><StickerRow label="腹部" left="痛" right="不痛" leftIcon={Frown} rightIcon={Smile} selected={data.symptoms?.pain} leftValue="pain" rightValue="no_pain" onSelect={value => saveSticker("pain", value)} /><StickerRow label="胸部" left="胸胀" right="不胀" leftIcon={HeartPulse} rightIcon={Heart} selected={data.symptoms?.breastSwelling} leftValue="swollen" rightValue="not_swollen" onSelect={value => saveSticker("breastSwelling", value)} /><StickerRow label="皮肤" left="长痘" right="没长" leftIcon={Activity} rightIcon={Sparkles} selected={data.symptoms?.acne} leftValue="acne" rightValue="clear" onSelect={value => saveSticker("acne", value)} /></section>
              <section className="rounded-[1.5rem] bg-[#F5EEE8] p-5"><div className="flex items-center gap-2 text-[#925E48]"><Sparkles className="h-4 w-4" /><span className="text-sm font-medium">今日提醒</span></div><p className="mt-3 text-sm leading-6 text-[#856B5D]">你不需要一次改变所有事。选一件最轻松的，给自己一点肯定。</p></section>
            </aside>
          </div>
        ) : null}
      </div>

      <Dialog open={Boolean(activeTemplate)} onOpenChange={open => !open && setActiveTemplateId(null)}>
        <DialogContent className="max-w-md rounded-[1.75rem] border-[#E2E9E1] p-0 overflow-hidden"><div className="bg-[#EEF5EC] px-6 py-6"><DialogHeader><DialogTitle className="font-serif text-2xl text-[#324B3A]">{activeTemplate?.name}</DialogTitle><DialogDescription className="pt-1 text-[#728278]">{activeTemplate?.description}</DialogDescription></DialogHeader></div><div className="space-y-5 px-6 py-6">{activeTemplate?.recordMode === "value" ? <div><label className="mb-2 block text-sm font-medium text-[#506456]">今天记录了多少 {activeTemplate.unit ?? ""}？</label><div className="relative"><Input autoFocus inputMode="decimal" value={numericValue} onChange={event => setNumericValue(event.target.value)} placeholder={activeTemplate.goalValue ? `目标 ${activeTemplate.goalValue} ${activeTemplate.unit ?? ""}` : "填写数值"} className="h-12 rounded-xl border-[#DDE7DB] pr-16" /><span className="absolute right-4 top-3 text-sm text-[#849188]">{activeTemplate.unit}</span></div></div> : null}
          {activeTemplate?.kind === "nutrition" ? <ChoiceGroup title="今天的饮食状态" value={choice} onChange={setChoice} options={[{ value: "green", label: "绿灯饮食", hint: "轻盈、稳定" }, { value: "balanced", label: "平衡就好", hint: "正常吃饭" }, { value: "high_sugar", label: "有点高糖", hint: "如实记录" }]} /> : null}
          {activeTemplate?.kind === "mood" ? <ChoiceGroup title="此刻的心情更接近" value={choice} onChange={setChoice} options={[{ value: "uplifted", label: "有能量", hint: "今天很不错" }, { value: "calm", label: "平静", hint: "安稳如常" }, { value: "sensitive", label: "敏感", hint: "需要抱抱" }]} /> : null}
          {activeTemplate?.kind === "nutrition" ? <div className="flex items-center justify-between rounded-xl bg-[#F8FAF6] p-4"><div><p className="text-sm font-medium text-[#435A49]">今日补充维生素</p><p className="mt-1 text-xs text-[#839187]">会记录在本次饮食打卡里</p></div><Switch checked={vitamin} onCheckedChange={setVitamin} /></div> : null}
          <div><label className="mb-2 block text-sm font-medium text-[#506456]">留一句备注 <span className="font-normal text-[#9AA59C]">（可选）</span></label><Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="比如：散步时听到了喜欢的歌" className="min-h-20 rounded-xl border-[#DDE7DB]" /></div>
        </div><DialogFooter className="border-t border-[#EEF1EC] px-6 py-4"><Button variant="ghost" onClick={() => setActiveTemplateId(null)} className="rounded-xl">先不记录</Button><Button onClick={submitEditor} disabled={saveCheckin.isPending} className="rounded-xl bg-[#385542] hover:bg-[#2E4737]">完成打卡</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}><DialogContent className="max-w-md rounded-[1.75rem] border-[#E2E9E1]"><DialogHeader><DialogTitle className="font-serif text-2xl text-[#324B3A]">添加我的目标</DialogTitle><DialogDescription>做一个真正适合你生活节奏的小目标。</DialogDescription></DialogHeader><div className="space-y-5 py-2"><div><label className="mb-2 block text-sm font-medium text-[#506456]">目标名称</label><Input value={customName} onChange={event => setCustomName(event.target.value)} placeholder="例如：午后晒太阳" className="h-12 rounded-xl" /></div><div className="flex items-center justify-between rounded-xl bg-[#F8FAF6] p-4"><div><p className="text-sm font-medium text-[#435A49]">需要填写数值</p><p className="mt-1 text-xs text-[#839187]">关闭后将是一键完成的习惯</p></div><Switch checked={customIsValue} onCheckedChange={setCustomIsValue} /></div>{customIsValue ? <div className="grid grid-cols-2 gap-3"><div><label className="mb-2 block text-sm font-medium text-[#506456]">目标数值</label><Input inputMode="numeric" value={customGoal} onChange={event => setCustomGoal(event.target.value)} className="h-11 rounded-xl" /></div><div><label className="mb-2 block text-sm font-medium text-[#506456]">单位</label><Input value={customUnit} onChange={event => setCustomUnit(event.target.value)} className="h-11 rounded-xl" /></div></div> : null}</div><DialogFooter><Button variant="ghost" onClick={() => setCustomOpen(false)} className="rounded-xl">取消</Button><Button onClick={() => { if (!customName.trim()) { toast.error("先给这个目标一个名字吧"); return; } addCustom.mutate({ name: customName.trim(), recordMode: customIsValue ? "value" : "toggle", unit: customIsValue ? customUnit : undefined, goalValue: customIsValue ? Number(customGoal) || 1 : undefined }); }} disabled={addCustom.isPending} className="rounded-xl bg-[#385542] hover:bg-[#2E4737]">加入今天</Button></DialogFooter></DialogContent></Dialog>
    </DashboardLayout>
  );
}

type SymptomValue = "pain" | "no_pain" | "swollen" | "not_swollen" | "acne" | "clear";

function StickerRow({ label, left, right, leftIcon: LeftIcon, rightIcon: RightIcon, selected, leftValue, rightValue, onSelect }: { label: string; left: string; right: string; leftIcon: LucideIcon; rightIcon: LucideIcon; selected?: string | null; leftValue: SymptomValue; rightValue: SymptomValue; onSelect: (value: SymptomValue) => void }) {
  const optionClass = (isSelected: boolean, tone: "rose" | "green") => `flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm transition-colors ${isSelected ? tone === "rose" ? "border-[#D49483] bg-[#FDEEE8] text-[#A55F4E]" : "border-[#9ABF9B] bg-[#EAF5E8] text-[#47734E]" : "border-[#E8ECE7] bg-[#FCFCFB] text-[#78877D] hover:bg-[#F8FAF6]"}`;
  return <div className="mt-4"><p className="mb-2 text-xs font-medium text-[#89958D]">{label}</p><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={selected === leftValue} aria-label={`${label}：${left}`} onClick={() => onSelect(leftValue)} className={optionClass(selected === leftValue, "rose")}><LeftIcon className="h-4 w-4" aria-hidden="true" /><span>{left}</span></button><button type="button" aria-pressed={selected === rightValue} aria-label={`${label}：${right}`} onClick={() => onSelect(rightValue)} className={optionClass(selected === rightValue, "green")}><RightIcon className="h-4 w-4" aria-hidden="true" /><span>{right}</span></button></div></div>;
}

function ChoiceGroup({ title, value, onChange, options }: { title: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string; hint: string }> }) {
  return <div><label className="mb-2 block text-sm font-medium text-[#506456]">{title}</label><div className="grid gap-2">{options.map(option => <button key={option.value} onClick={() => onChange(option.value)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${value === option.value ? "border-[#8BAA91] bg-[#EEF6EC]" : "border-[#E0E7DF] hover:bg-[#F8FAF6]"}`}><span className="text-sm font-medium text-[#445B49]">{option.label}</span><span className="text-xs text-[#839187]">{option.hint}</span></button>)}</div></div>;
}

function DashboardSkeleton() { return <div className="space-y-6 animate-pulse"><div className="h-44 rounded-[1.75rem] bg-[#E9EEE7]" /><div className="grid gap-4 md:grid-cols-2"><div className="h-48 rounded-[1.5rem] bg-white" /><div className="h-48 rounded-[1.5rem] bg-white" /></div></div>; }
