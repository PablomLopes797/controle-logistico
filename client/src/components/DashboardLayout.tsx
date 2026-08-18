import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type NavigationItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  minimumLevel: 1 | 2;
};

const primaryNavigation: NavigationItem[] = [
  { icon: LayoutDashboard, label: "Recebimento", path: "/", minimumLevel: 2 },
  { icon: UsersRound, label: "Gestão de Usuários", path: "/usuarios", minimumLevel: 1 },
];

const basesNavigation: NavigationItem[] = [
  { icon: CalendarClock, label: "Programação de Agenda", path: "/bases/programacao", minimumLevel: 2 },
];

const titles: Record<string, { title: string; eyebrow: string }> = {
  "/": { title: "Visão de Recebimento", eyebrow: "Operação logística" },
  "/bases/programacao": { title: "Programação de Agenda", eyebrow: "Bases operacionais" },
  "/usuarios": { title: "Gestão de Usuários", eyebrow: "Administração" },
};

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mutation = trpc.logistics.changeOwnPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha atualizada com segurança.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    },
    onError: error => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da nova senha não corresponde.");
      return;
    }
    mutation.mutate({ currentPassword, newPassword });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Alterar minha senha</DialogTitle>
            <DialogDescription>Use uma senha de pelo menos oito caracteres. A alteração vale para o próximo login.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input id="current-password" type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Atualizando…" : "Salvar senha"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, setPreferenceUser } = useTheme();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const active = titles[location] ?? titles["/"];
  const visiblePrimaryNavigation = primaryNavigation.filter(item => (user?.level ?? 99) <= item.minimumLevel);
  const visibleBasesNavigation = basesNavigation.filter(item => (user?.level ?? 99) <= item.minimumLevel);

  useEffect(() => {
    if (user?.user) setPreferenceUser?.(user.user);
  }, [setPreferenceUser, user?.user]);

  const navigate = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
  };

  const navigationContent = (
    <>
      <div className="flex h-24 items-center gap-3 border-b border-white/10 px-6">
        <div className="grid size-11 place-items-center rounded-2xl bg-white/12 text-white shadow-lg shadow-slate-950/10 ring-1 ring-white/15">
          <Warehouse className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-tight text-white">Controle Logístico</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/65">Recebimento</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/50">Navegação</p>
        <div className="space-y-1.5">
          {visiblePrimaryNavigation.map(item => {
            const selected = location === item.path;
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition duration-200 ${selected ? "bg-white text-slate-950 shadow-xl shadow-slate-950/15" : "text-blue-50/75 hover:bg-white/10 hover:text-white"}`}>
                <Icon className={`size-[18px] ${selected ? "text-blue-600" : "text-blue-100/75 group-hover:text-white"}`} />
                <span className="flex-1">{item.label}</span>
                {selected && <ChevronRight className="size-4 text-blue-500" />}
              </button>
            );
          })}
        </div>
        {visibleBasesNavigation.length > 0 && (
          <>
            <p className="mt-8 px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/50">Bases</p>
            <div className="space-y-1.5">
              {visibleBasesNavigation.map(item => {
                const selected = location === item.path;
                const Icon = item.icon;
                return (
                  <button key={item.path} onClick={() => navigate(item.path)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition duration-200 ${selected ? "bg-white text-slate-950 shadow-xl shadow-slate-950/15" : "text-blue-50/75 hover:bg-white/10 hover:text-white"}`}>
                    <Icon className={`size-[18px] ${selected ? "text-blue-600" : "text-blue-100/75 group-hover:text-white"}`} />
                    <span className="flex-1">{item.label}</span>
                    {selected && <ChevronRight className="size-4 text-blue-500" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/55">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.8)]" />
            Ambiente conectado
          </div>
          <p className="mt-2 text-xs leading-relaxed text-blue-50/75">Dados operacionais sincronizados com segurança.</p>
        </div>
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
          <Avatar className="size-9 ring-1 ring-white/20">
            <AvatarFallback className="bg-blue-300 text-xs font-bold text-blue-950">{user?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
            <p className="truncate text-[11px] text-blue-100/60">Nível {user?.level}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_90%_-10%,rgba(37,99,235,0.12),transparent_28%),var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[278px] flex-col bg-[linear-gradient(180deg,#0b2754_0%,#123d7b_48%,#0d2e61_100%)] md:flex">
        {navigationContent}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-[285px] flex-col bg-[linear-gradient(180deg,#0b2754_0%,#123d7b_48%,#0d2e61_100%)] shadow-2xl">
            <Button variant="ghost" size="icon" className="absolute right-3 top-4 text-white hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X className="size-5" /></Button>
            {navigationContent}
          </aside>
        </div>
      )}
      <div className="min-h-screen md:pl-[278px]">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-border/80 bg-background/80 px-5 backdrop-blur-xl md:px-9">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu className="size-5" /></Button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-muted-foreground">{active.eyebrow}</p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground md:text-xl">{active.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="icon" className="size-9 rounded-xl bg-card/70" onClick={toggleTheme} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/70 px-2 py-1.5 text-left shadow-sm transition hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-7"><AvatarFallback className="bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">{user?.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <span className="hidden max-w-28 truncate text-xs font-medium sm:block">{user?.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="space-y-1.5 py-3">
                  <p className="text-sm">{user?.name}</p>
                  <div className="flex items-center justify-between"><span className="text-xs font-normal text-muted-foreground">@{user?.user}</span><Badge variant="secondary" className="text-[10px]">Nível {user?.level}</Badge></div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPasswordOpen(true)}><KeyRound className="mr-2 size-4" />Alterar minha senha</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleTheme?.()}>{theme === "dark" ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}{theme === "dark" ? "Tema claro" : "Tema escuro"}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={async () => { await logout(); setLocation("/login"); }}><LogOut className="mr-2 size-4" />Sair do sistema</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto max-w-[1640px] px-5 py-6 md:px-9 md:py-8">{children}</main>
      </div>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
}
