import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CalendarDays, ChevronLeft, ChevronRight, Droplets, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const dateString = (date: Date) => date.toISOString().slice(0, 10);
const fromDateString = (value: string) => new Date(`${value}T12:00:00`);
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

function getMonthSpan(anchor: Date) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
  return { start: dateString(start), end: dateString(end) };
}

function formatMonth(anchor: Date) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(anchor);
}

export default function CalendarPage() {
  const { isAuthenticated } = useAuth();
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => dateString(new Date()));
  const span = useMemo(() => getMonthSpan(cursor), [cursor]);
  const historyQuery = trpc.health.history.useQuery({ startDate: span.start, endDate: span.end }, { enabled: isAuthenticated });
  const records = historyQuery.data ?? [];
  const byDate = useMemo(() => new Map(records.map(item => [item.date, item])), [records]);
  const days = useMemo(() => {
    const result: string[] = [];
    const current = fromDateString(span.start);
    const end = fromDateString(span.end);
    while (current <= end) {
      result.push(dateString(current));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [span]);

  const selected = byDate.get(selectedDate);
  const today = dateString(new Date());
  const selectedLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(fromDateString(selectedDate));

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <header className="mb-7">
          <p className="text-xs font-medium tracking-[0.16em] text-[#8C998F]">暖巢 · RECORDS</p>
          <h1 className="mt-1 font-serif text-3xl tracking-[-0.035em] text-[#2E4436] md:text-4xl">在日历里，看见自己的节律</h1>
          <p className="mt-2 text-sm text-[#748278]">每一个小圆点，都是你和身体好好相处过的证据。</p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
          <section className="overflow-hidden rounded-[1.75rem] border border-[#E4EAE3] bg-white shadow-[0_14px_34px_rgba(69,91,74,0.06)]">
            <div className="flex items-center justify-between border-b border-[#EEF1ED] px-5 py-5 sm:px-7">
              <Button variant="ghost" size="icon" className="rounded-xl text-[#5C6D62]" onClick={() => setCursor(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <h2 className="font-serif text-2xl text-[#344A3B]">{formatMonth(cursor)}</h2>
                <p className="mt-1 text-xs text-[#8A978E]">完成度与经期记录</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl text-[#5C6D62]" onClick={() => setCursor(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-7 px-3 pt-5 sm:px-5">
              {weekdays.map(day => <div key={day} className="pb-3 text-center text-xs font-medium text-[#98A39B]">{day}</div>)}
              {days.map(day => {
                const item = byDate.get(day);
                const calendarDate = fromDateString(day);
                const isCurrentMonth = calendarDate.getMonth() === cursor.getMonth();
                const isSelected = selectedDate === day;
                const completion = item?.metric.completionRate ?? 0;
                const shade = completion >= 80 ? "bg-[#6F9B72]" : completion >= 40 ? "bg-[#D9B36A]" : completion > 0 ? "bg-[#D59A85]" : "bg-[#E5EAE4]";
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    className={`group relative m-0.5 min-h-20 rounded-2xl p-2 text-left transition-all sm:min-h-24 ${isSelected ? "bg-[#EAF4E8] ring-1 ring-[#A9C4AA]" : item?.isPeriodDay ? "bg-[#FCEEEA] hover:bg-[#F9E6E0]" : "hover:bg-[#F5F8F4]"} ${!isCurrentMonth ? "opacity-35" : ""}`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${day === today ? "bg-[#395844] font-semibold text-white" : "text-[#4D6254]"}`}>{calendarDate.getDate()}</span>
                    {item?.isPeriodDay ? <Droplets className="absolute right-2 top-3 h-3.5 w-3.5 text-[#C57465]" /> : null}
                    <div className="absolute bottom-3 left-2 right-2 flex items-center gap-1.5">
                      <span className={`h-1.5 flex-1 rounded-full ${shade}`} />
                      {item?.symptoms ? <span className="h-1.5 w-1.5 rounded-full bg-[#C98070]" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 border-t border-[#EEF1ED] px-5 py-4 text-xs text-[#7D8A81]">
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#6F9B72]" />完成度 80%+</span>
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#D9B36A]" />完成了一部分</span>
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#C57465]" />经期日</span>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[1.5rem] border border-[#E4EAE3] bg-white p-5 shadow-[0_10px_25px_rgba(68,85,74,0.05)]">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF5EC] text-[#4C7356]"><CalendarDays className="h-4 w-4" /></span>
                <div><p className="font-medium text-[#3C5443]">{selectedLabel}</p><p className="mt-0.5 text-xs text-[#89958D]">当天记录小结</p></div>
              </div>
              {selected ? (
                <div className="mt-6">
                  <div className="rounded-2xl bg-[#F5F8F3] p-4">
                    <div className="flex items-end justify-between"><span className="text-sm text-[#708077]">健康指数</span><span className="font-serif text-4xl tracking-[-0.05em] text-[#35523F]">{selected.metric.healthScore}</span></div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#DDE7DB]"><div className="h-full rounded-full bg-[#6E9B72]" style={{ width: `${selected.metric.completionRate}%` }} /></div>
                    <p className="mt-2 text-xs text-[#7C8D81]">完成 {selected.metric.completedCount} / {selected.metric.totalCount} 个项目</p>
                  </div>
                  {selected.isPeriodDay ? <p className="mt-4 rounded-xl bg-[#FFF2EF] px-3 py-2 text-sm text-[#B76E5D]">这一天有经期记录</p> : null}
                  {selected.symptoms ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-[#87948A]">症状贴纸</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.symptoms.pain ? <Tag>{selected.symptoms.pain === "pain" ? "痛" : "不痛"}</Tag> : null}
                        {selected.symptoms.breastSwelling ? <Tag>{selected.symptoms.breastSwelling === "swollen" ? "胸胀" : "不胀"}</Tag> : null}
                        {selected.symptoms.acne ? <Tag>{selected.symptoms.acne === "acne" ? "长痘" : "没长"}</Tag> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-[#F8FAF7] p-5 text-sm leading-6 text-[#89958D]">这一天还没有记录。回到「今日」完成一次小小打卡吧。</div>
              )}
            </section>
            <section className="rounded-[1.5rem] bg-[#F4EEE7] p-5"><Sparkles className="h-4 w-4 text-[#A96A52]" /><p className="mt-3 text-sm leading-6 text-[#82695C]">查看较长周期时，不必急着下结论。身体的信号，值得被耐心地、多次地聆听。</p></section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#F5F0EA] px-2.5 py-1 text-xs text-[#886A5A]">{children}</span>;
}
