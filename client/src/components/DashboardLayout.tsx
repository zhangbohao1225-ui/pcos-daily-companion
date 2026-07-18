import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleUserRound,
  Leaf,
  LogOut,
  PanelLeft,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: Sparkles, label: "今日", path: "/" },
  { icon: CalendarDays, label: "健康日历", path: "/calendar" },
  { icon: ChartNoAxesCombined, label: "洞察报告", path: "/insights" },
  { icon: CircleUserRound, label: "我的档案", path: "/profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#F7F5F0] text-[#27342F]">
        <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 lg:px-10">
          <div className="absolute -right-28 top-0 h-96 w-96 rounded-full bg-[#D7E7D6]/70 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#F0D8CA]/60 blur-3xl" />
          <section className="relative grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#CEDCD1] bg-white/75 px-4 py-2 text-sm text-[#557362] shadow-[0_8px_30px_rgba(47,76,59,0.06)]">
                <Leaf className="h-4 w-4" />
                暖巢 · PCOS 日常陪伴
              </div>
              <h1 className="max-w-2xl font-serif text-5xl leading-[1.12] tracking-[-0.04em] text-[#24362D] md:text-6xl">
                让照顾自己，
                <span className="text-[#A8644C]">成为一件温柔而确定的事。</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-8 text-[#64756B] md:text-lg">
                记录饮食、运动、情绪与睡眠；在数据里看见自己的节律。暖巢以私密、克制的方式，陪你走过每一个普通却重要的日子。
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button onClick={() => startLogin()} size="lg" className="rounded-full bg-[#334D3E] px-7 text-white shadow-[0_12px_24px_rgba(51,77,62,0.2)] hover:bg-[#263D31]">
                  开始记录 <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
                <span className="text-sm text-[#7A887E]">使用 Manus OAuth 安全登录</span>
              </div>
            </div>
            <div className="relative rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_28px_70px_rgba(62,82,70,0.12)] backdrop-blur">
              <div className="rounded-[1.5rem] bg-[#EEF4EC] p-6">
                <div className="flex items-center justify-between text-sm text-[#66786D]">
                  <span>今日的小小照顾</span><span className="rounded-full bg-white px-3 py-1 text-[#3B5B48]">4 个项目</span>
                </div>
                <div className="mt-7 space-y-3">
                  {["低糖 & 抗炎饮食", "温和运动", "心情停靠", "睡眠修复"].map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-sm">
                      <div className="flex items-center gap-3"><span className={`h-8 w-8 rounded-full ${index < 2 ? "bg-[#DDEBDD]" : "bg-[#F4E8DE]"}`} /><span className="font-medium text-[#34483D]">{item}</span></div>
                      <span className="text-xs text-[#829087]">轻轻完成</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="px-4 pt-5 text-sm leading-6 text-[#6B7B72]">每一笔记录都只属于你。这里不是追求完美的地方，而是回到自己身边的地方。</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const activeMenu = menuItems.find(item => item.path === location) ?? menuItems[0];

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-[#E4E9E2] bg-[#FCFCFA]">
        <SidebarHeader className="px-4 pb-5 pt-6">
          <button onClick={() => setLocation("/")} className="flex items-center gap-3 text-left" aria-label="返回今日页面">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#35513F] text-white shadow-[0_8px_20px_rgba(53,81,63,0.22)]"><Leaf className="h-5 w-5" /></span>
            <span className="group-data-[collapsible=icon]:hidden"><strong className="block font-serif text-xl font-semibold tracking-tight text-[#2B4033]">暖巢</strong><small className="block text-[10px] tracking-[0.22em] text-[#859188]">NEST WELL</small></span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.18em] text-[#9AA49E] group-data-[collapsible=icon]:hidden">个人空间</p>
          <SidebarMenu>
            {menuItems.map(item => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={location === item.path}
                  onClick={() => setLocation(item.path)}
                  tooltip={item.label}
                  className="h-11 rounded-xl px-3 text-[#627168] hover:bg-[#F1F5EE] hover:text-[#35513F] data-[active=true]:bg-[#E4EFE2] data-[active=true]:font-medium data-[active=true]:text-[#294635]"
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="mx-2 mt-8 rounded-2xl bg-[#F5EEE8] p-4 group-data-[collapsible=icon]:hidden">
            <Sparkles className="mb-3 h-4 w-4 text-[#A9644C]" />
            <p className="text-sm font-medium text-[#704D3E]">慢一点也没关系</p>
            <p className="mt-1 text-xs leading-5 text-[#8A6B5C]">你的健康节奏，不需要和任何人比较。</p>
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-[#EDF0EB] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[#F1F5EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7E9B86] group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-9 w-9 border border-[#DCE7DA] bg-[#E5EFE3]">
                  <AvatarFallback className="bg-[#E5EFE3] text-xs font-semibold text-[#41604D]">{user?.name?.slice(0, 1).toUpperCase() ?? "暖"}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><span className="block truncate text-sm font-medium text-[#3A5143]">{user?.name || "暖巢用户"}</span><span className="block truncate pt-0.5 text-xs text-[#8B978F]">个人健康空间</span></span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E7ECE5]">
              <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer rounded-lg">个人档案</DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />退出登录</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#F8F9F6]">
        {isMobile && (
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#E7ECE5] bg-[#FCFCFA]/90 px-4 backdrop-blur">
            <SidebarTrigger className="rounded-xl" />
            <div><p className="text-sm font-semibold text-[#304639]">{activeMenu.label}</p><p className="text-[10px] tracking-[0.14em] text-[#8A978E]">暖巢 · NEST WELL</p></div>
          </header>
        )}
        <main className="min-h-screen p-4 md:p-7 lg:p-9">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
