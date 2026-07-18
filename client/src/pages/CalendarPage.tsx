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
          <p className="warm-kicker">RECORDS · YOUR RHYTHM</p>
          <h1 className="warm-title mt-1 text-3xl md:text-4xl">在日历里，看见自己的节律</h1>
          <p className="mt-2 text-sm text-[#9b746e]">每一个小圆点，都是你和身体好好相处过的证据。</p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
          <section className="overflow-hidden rounded-[1.75rem] border border-[#f5e1dc] bg-white/85 shadow-[0_14px_34px_rgba(203,107,99,0.08)]">
            <div className="flex items-center justify-between border-b border-[#f5e9e5] px-5 py-5 sm:px-7">
              <Button aria-label="查看上个月" variant="ghost" size="icon" className="rounded-xl text-[#d36e69]" onClick={() => setCursor(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
              <div className="text-center">
                <h2 className="font-serif text-2xl text-[#704845]">{formatMonth(cursor)}</h2>
                <p className="mt-1 text-xs text-[#a77e78]">完成度与经期记录</p>
              </div>
              <Button aria-label="查看下个月" variant="ghost" size="icon" className="rounded-xl text-[#d36e69]" onClick={() => setCursor(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <div className="grid grid-cols-7 px-3 pt-5 sm:px-5">
              {weekdays.map(day => <div key={day} className="pb-3 text-center text-xs font-medium text-[#b5928c]">{day}</div>)}
              {days.map(day => {
                const item = byDate.get(day);
                const calendarDate = fromDateString(day);
                const isCurrentMonth = calendarDate.getMonth() === cursor.getMonth();
                const isSelected = selectedDate === day;
                const completion = item?.metric.completionRate ?? 0;
                const shade = completion >= 80 ? "bg-[#ed9388]" : completion >= 40 ? "bg-[#f4b986]" : completion > 0 ? "bg-[#f2c0b4]" : "bg-[#f7e6e1]";
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    aria-label={`查看 ${new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(calendarDate)} 的记录`}
                    aria-pressed={isSelected}
                    className={`group relative m-0.5 min-h-20 rounded-2xl p-2 text-left transition-all sm:min-h-24 ${isSelected ? "bg-[#fff0ed] ring-1 ring-[#f0aaa0]" : item?.isPeriodDay ? "bg-[#fff0ec] hover:bg-[#ffe6df]" : "hover:bg-[#fff9f6]"} ${!isCurrentMonth ? "opacity-35" : ""}`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${day === today ? "bg-[#d86f70] font-semibold text-white" : "text-[#805b56]"}`}>{calendarDate.getDate()}</span>
                    {item?.isPeriodDay ? <Droplets className="absolute right-2 top-3 h-3.5 w-3.5 text-[#d76d70]" /> : null}
                    <div className="absolute bottom-3 left-2 right-2 flex items-center gap-1.5">
                      <span className={`h-1.5 flex-1 rounded-full ${shade}`} />
                      {item?.symptoms ? <span className="h-1.5 w-1.5 rounded-full bg-[#f09b82]" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 border-t border-[#f5e9e5] px-5 py-4 text-xs text-[#9e7871]">
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#ed9388]" />完成度 80%+</span>
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#f4b986]" />完成了一部分</span>
              <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#d76d70]" />经期日</span>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[1.5rem] border border-[#f5e1dc] bg-white/85 p-5 shadow-[0_10px_25px_rgba(203,107,99,0.07)]">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0eb] text-[#d56d68]"><CalendarDays className="h-4 w-4" /></span>
                <div><p className="font-medium text-[#704845]">{selectedLabel}</p><p className="mt-0.5 text-xs text-[#a7817a]">当天记录小结</p></div>
              </div>
              {selected ? (
                <div className="mt-6">
                  <div className="rounded-2xl bg-[#fff8f5] p-4">
                    <div className="flex items-end justify-between"><span className="text-sm text-[#9c756e]">健康指数</span><span className="font-serif text-4xl tracking-[-0.05em] text-[#d36f68]">{selected.metric.healthScore}</span></div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ffe7e0]"><div className="h-full rounded-full bg-[#ee9387]" style={{ width: `${selected.metric.completionRate}%` }} /></div>
                    <p className="mt-2 text-xs text-[#a17b74]">完成 {selected.metric.completedCount} / {selected.metric.totalCount} 个项目</p>
                  </div>
                  {selected.isPeriodDay ? <p className="mt-4 rounded-xl bg-[#FFF2EF] px-3 py-2 text-sm text-[#B76E5D]">这一天有经期记录</p> : null}
                  {selected.symptoms ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-[#a8827b]">症状贴纸</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.symptoms.pain ? <Tag>{selected.symptoms.pain === "pain" ? "痛" : "不痛"}</Tag> : null}
                        {selected.symptoms.breastSwelling ? <Tag>{selected.symptoms.breastSwelling === "swollen" ? "胸胀" : "不胀"}</Tag> : null}
                        {selected.symptoms.acne ? <Tag>{selected.symptoms.acne === "acne" ? "长痘" : "没长"}</Tag> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-[#fff9f6] p-5 text-sm leading-6 text-[#a7817a]">这一天还没有记录。回到「今日」完成一次小小打卡吧。</div>
              )}
            </section>
            <section className="rounded-[1.5rem] bg-[#fff0e8] p-5"><Sparkles className="h-4 w-4 text-[#db7b69]" /><p className="mt-3 text-sm leading-6 text-[#987068]">查看较长周期时，不必急着下结论。身体的信号，值得被耐心地、多次地聆听。</p></section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#fff0e9] px-2.5 py-1 text-xs text-[#a26f66]">{children}</span>;
}
