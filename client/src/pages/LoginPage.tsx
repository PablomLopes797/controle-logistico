import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowRight, LockKeyhole, ShieldCheck, Warehouse } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const login = trpc.logistics.login.useMutation({
    onSuccess: async session => {
      await utils.logistics.session.invalidate();
      toast.success(`Bem-vindo(a), ${session.name}.`);
      setLocation("/");
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!loading && isAuthenticated) setLocation("/");
  }, [isAuthenticated, loading, setLocation]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate({ user, password });
  }

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_17%,rgba(59,130,246,0.38),transparent_30%),radial-gradient(circle_at_64%_70%,rgba(14,165,233,0.20),transparent_27%)]" />
      <section className="relative hidden flex-col justify-between border-r border-white/10 p-12 text-white lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/20"><Warehouse className="size-6" /></div>
          <div><p className="text-base font-semibold">Controle Logístico</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100/65">Recebimento & agenda</p></div>
        </div>
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/15 bg-blue-300/10 px-3 py-1.5 text-xs font-medium text-blue-100"><ShieldCheck className="size-3.5" />Acesso operacional protegido</div>
          <h1 className="text-5xl font-semibold leading-[1.06] tracking-[-0.045em] xl:text-6xl">Visibilidade que torna a operação mais precisa.</h1>
          <p className="mt-7 max-w-md text-base leading-7 text-blue-100/75">Concentre agenda, recebimento, indicadores de ruptura e gestão de acesso em um único ambiente operacional.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-blue-100/55"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />Conexão de dados segura e monitorada</div>
      </section>
      <section className="relative flex items-center justify-center bg-background/95 px-5 py-12 backdrop-blur-xl sm:px-8 lg:bg-white/95 dark:lg:bg-slate-950/95">
        <div className="w-full max-w-[390px]">
          <div className="mb-10 lg:hidden"><div className="mb-5 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30"><Warehouse className="size-6" /></div><p className="text-sm font-semibold text-primary">Controle Logístico</p></div>
          <div className="mb-8"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Área restrita</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-foreground">Acesse sua operação</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Use suas credenciais cadastradas para entrar no módulo de recebimento.</p></div>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="user">Usuário</Label><Input id="user" value={user} onChange={event => setUser(event.target.value)} placeholder="Digite seu usuário" autoComplete="username" className="h-11 rounded-xl" required /></div>
            <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="password">Senha</Label><span className="text-[11px] text-muted-foreground">Acesso individual</span></div><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" className="h-11 rounded-xl pl-9" required /></div></div>
            <Button type="submit" className="h-11 w-full rounded-xl text-sm shadow-lg shadow-blue-600/20" disabled={login.isPending}>{login.isPending ? "Validando acesso…" : <>Entrar no sistema <ArrowRight className="ml-2 size-4" /></>}</Button>
          </form>
          <p className="mt-8 border-t pt-5 text-center text-xs leading-5 text-muted-foreground">Problemas de acesso? Solicite a redefinição de senha a um administrador de nível 1.</p>
        </div>
      </section>
    </div>
  );
}
