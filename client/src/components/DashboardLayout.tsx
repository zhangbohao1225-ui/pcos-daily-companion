import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { CalendarDays, ChartNoAxesCombined, ChevronRight, ClipboardCheck, Flower2, Heart, HeartHandshake, House, LogOut, MessageCircleHeart, PawPrint, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: House, label: "首页", caption: "今日概览", path: "/" },
  { icon: ClipboardCheck, label: "打卡", caption: "照顾自己", path: "/checkin" },
  { icon: HeartHandshake, label: "队伍", caption: "彼此陪伴", path: "/team" },
  { icon: MessageCircleHeart, label: "论坛", caption: "温柔交流", path: "/forum" },
  { icon: PawPrint, label: "成长", caption: "团团花园", path: "/growth" },
];

const utilityItems = [
  { icon: ChartNoAxesCombined, label: "洞察报告", path: "/insights" },
  { icon: CalendarDays, label: "健康日历", path: "/calendar" },
];

function SutaMark({ small = false }: { small?: boolean }) {
  return <span className={`relative flex shrink-0 items-center justify-center rounded-[1rem] warm-gradient text-white shadow-[0_10px_24px_rgba(207,103,95,0.28)] ${small ? "h-9 w-9" : "h-11 w-11"}`}><Heart className={`${small ? "h-4 w-4" : "h-5 w-5"} fill-white`} /><span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ffe9bc]"><Sparkles className="h-2.5 w-2.5 text-[#e08064]" /></span></span>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <GuestLanding />;
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

function GuestLanding() {
  return <main className="min-h-screen overflow-hidden bg-[#fff8f6] text-[#603a38]"><div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 lg:px-10"><div className="absolute -right-28 top-0 h-96 w-96 rounded-full bg-[#ffc9bc]/45 blur-3xl" /><div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#ffd1a5]/35 blur-3xl" /><section className="relative grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"><div><div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#f5d6ce] bg-white/75 px-4 py-2 text-sm text-[#c56b65] shadow-[0_8px_30px_rgba(183,88,83,0.08)]"><Flower2 className="h-4 w-4" />Suta · PMOS 日常陪伴</div><h1 className="warm-title max-w-2xl text-5xl leading-[1.12] md:text-6xl">让照顾自己，<span className="block text-[#db7972]">成为一件温柔而确定的事。</span></h1><p className="mt-7 max-w-xl text-base leading-8 text-[#8f6b67] md:text-lg">记录饮食、运动、情绪与睡眠；在数据里看见自己的节律。Suta以私密、克制的方式，陪你走过每一个普通却重要的日子。</p><div className="mt-10 flex flex-wrap items-center gap-4"><Button onClick={() => startLogin()} size="lg" className="warm-gradient rounded-full px-7 text-white hover:opacity-95">开始记录 <ChevronRight className="ml-1 h-4 w-4" /></Button><span className="text-sm text-[#a07d77]">使用 Manus OAuth 安全登录</span></div></div><div className="relative overflow-hidden rounded-[2rem] warm-surface p-5"><div className="absolute -right-10 -top-8 h-32 w-32 rounded-full bg-[#ffd2c7]/55 blur-2xl" /><div className="relative rounded-[1.5rem] warm-gradient-soft p-6"><div className="flex items-center justify-between text-sm text-[#9c726d]"><span>今天的一点小照顾</span><span className="rounded-full bg-white px-3 py-1 text-[#c56660]">团团陪着你</span></div><div className="mt-7 space-y-3">{["低糖 & 抗炎饮食", "温和运动", "心情停靠", "睡眠修复"].map((item, index) => <div key={item} className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-4 shadow-[0_6px_16px_rgba(198,104,97,0.06)]"><div className="flex items-center gap-3"><span className={`h-8 w-8 rounded-full ${index < 2 ? "bg-[#ffd9cf]" : "bg-[#ffe8c9]"}`} /><span className="font-medium text-[#704a47]">{item}</span></div><span className="text-xs text-[#a77f79]">轻轻完成</span></div>)}</div></div><p className="px-4 pt-5 text-sm leading-6 text-[#96736d]">每一笔记录都只属于你。这里不是追求完美的地方，而是回到自己身边的地方。</p></div></section></div></main>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const activeMenu = [...menuItems, ...utilityItems].find(item => item.path === location) ?? (location === "/profile" ? { label: "个人中心" } : menuItems[0]);
  const navButtonClass = "h-11 rounded-xl px-3 text-[#946e69] transition-colors hover:bg-[#fff0eb] hover:text-[#c46461] data-[active=true]:bg-[#ffe7e0] data-[active=true]:font-semibold data-[active=true]:text-[#be5c5e]";

  return <SidebarProvider><Sidebar className="border-r border-[#f4dfda] bg-[#fffaf8]/92 backdrop-blur"><SidebarHeader className="px-4 pb-5 pt-6"><button onClick={() => setLocation("/")} className="flex items-center gap-3 text-left" aria-label="返回Suta首页"><SutaMark /><span className="group-data-[collapsible=icon]:hidden"><strong className="warm-title block text-xl font-semibold">Suta</strong><small className="block text-[10px] tracking-[0.22em] text-[#bf918b]">SUTA</small></span></button></SidebarHeader><SidebarContent className="px-3"><p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.18em] text-[#c6a29c] group-data-[collapsible=icon]:hidden">陪伴空间</p><SidebarMenu>{menuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className={navButtonClass}><item.icon className="h-[18px] w-[18px]" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu><div className="mt-6 border-t border-[#f6e9e5] pt-5"><p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.18em] text-[#c6a29c] group-data-[collapsible=icon]:hidden">我的节律</p><SidebarMenu>{utilityItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className={navButtonClass}><item.icon className="h-[18px] w-[18px]" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></div><button onClick={() => setLocation("/growth")} className="mx-2 mt-7 overflow-hidden rounded-2xl warm-gradient-soft p-4 text-left group-data-[collapsible=icon]:hidden"><div className="flex items-center gap-2 text-[#cc6e69]"><PawPrint className="h-4 w-4" /><span className="text-sm font-semibold">团团的成长园</span></div><p className="mt-2 text-xs leading-5 text-[#9e746e]">每一次温柔记录，都在点亮一朵小花。</p></button></SidebarContent><SidebarFooter className="border-t border-[#f6e9e5] p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[#fff0eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ed988d] group-data-[collapsible=icon]:justify-center"><Avatar className="h-9 w-9 border border-[#f4d9d2] bg-[#ffe6df]"><AvatarFallback className="bg-[#ffe6df] text-xs font-semibold text-[#c36460]">{user?.name?.slice(0, 1).toUpperCase() ?? "S"}</AvatarFallback></Avatar><span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><span className="block truncate text-sm font-medium text-[#704b47]">{user?.name || "Suta用户"}</span><span className="block truncate pt-0.5 text-xs text-[#af8781]">个人健康空间</span></span></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48 rounded-xl border-[#f3ded8]"><DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer rounded-lg text-[#704b47]">个人中心</DropdownMenuItem><DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />退出登录</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><SidebarInset className="bg-transparent">{isMobile && <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#f5e2dd] bg-[#fffaf8]/88 px-4 backdrop-blur"><SidebarTrigger className="rounded-xl text-[#a66360]" /><SutaMark small /><div><p className="text-sm font-semibold text-[#704844]">{activeMenu.label}</p><p className="text-[10px] tracking-[0.14em] text-[#bc8d86]">Suta · SUTA</p></div></header>}<main className="min-h-screen p-4 md:p-7 lg:p-9">{children}</main></SidebarInset></SidebarProvider>;
}
