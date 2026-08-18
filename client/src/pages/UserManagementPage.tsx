import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Edit3, Plus, ShieldCheck, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type UserForm = { user: string; name: string; password: string; level: "1" | "2" };
type ListedUser = { user: string; name: string; level: 1 | 2 };
const blankForm: UserForm = { user: "", name: "", password: "", level: "2" };

function UserDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (open: boolean) => void; editing: ListedUser | null }) {
  const [form, setForm] = useState<UserForm>(() => editing ? { user: editing.user, name: editing.name, password: "", level: String(editing.level) as "1" | "2" } : blankForm);
  const utils = trpc.useUtils();
  const create = trpc.logistics.users.create.useMutation({ onSuccess: async () => { await utils.logistics.users.list.invalidate(); toast.success("Usuário criado com sucesso."); onOpenChange(false); }, onError: error => toast.error(error.message) });
  const update = trpc.logistics.users.update.useMutation({ onSuccess: async () => { await utils.logistics.users.list.invalidate(); toast.success("Usuário atualizado com sucesso."); onOpenChange(false); }, onError: error => toast.error(error.message) });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const level = Number(form.level) as 1 | 2;
    if (editing) update.mutate({ user: editing.user, name: form.name, level, ...(form.password ? { password: form.password } : {}) });
    else create.mutate({ user: form.user, name: form.name, password: form.password, level });
  }

  const pending = create.isPending || update.isPending;
  return <Dialog open={open} onOpenChange={value => { if (!pending) onOpenChange(value); }}><DialogContent className="sm:max-w-lg"><form onSubmit={submit} className="space-y-5"><DialogHeader><DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle><DialogDescription>{editing ? "Altere os dados necessários. Deixe a senha em branco para mantê-la." : "O acesso será habilitado de acordo com o nível selecionado."}</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="profile-user">Usuário</Label><Input id="profile-user" value={form.user} disabled={Boolean(editing)} onChange={event => setForm({ ...form, user: event.target.value })} placeholder="ex.: maria.silva" required /></div><div className="space-y-2"><Label htmlFor="profile-level">Nível de acesso</Label><Select value={form.level} onValueChange={value => setForm({ ...form, level: value as "1" | "2" })}><SelectTrigger id="profile-level"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Nível 1 · Administrador</SelectItem><SelectItem value="2">Nível 2 · Operação</SelectItem></SelectContent></Select></div></div><div className="space-y-2"><Label htmlFor="profile-name">Nome completo</Label><Input id="profile-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Nome para identificação no sistema" required /></div><div className="space-y-2"><Label htmlFor="profile-password">{editing ? "Nova senha (opcional)" : "Senha inicial"}</Label><Input id="profile-password" type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} minLength={editing && !form.password ? undefined : 8} placeholder={editing ? "Deixe em branco para manter" : "Mínimo de 8 caracteres"} required={!editing} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando…" : editing ? "Salvar alterações" : "Criar usuário"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ListedUser | null>(null);
  const users = trpc.logistics.users.list.useQuery();
  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (user: ListedUser) => { setEditing(user); setDialogOpen(true); };

  return <div className="space-y-6"><section className="flex flex-col justify-between gap-5 rounded-3xl border border-border/80 bg-card p-6 shadow-[0_16px_45px_-28px_rgba(15,23,42,0.32)] sm:flex-row sm:items-end md:p-8"><div className="max-w-2xl"><div className="mb-3 flex items-center gap-2 text-primary"><ShieldCheck className="size-4" /><span className="text-[11px] font-bold uppercase tracking-[0.16em]">Controle de acesso</span></div><h2 className="text-2xl font-semibold tracking-[-0.03em]">Usuários e permissões</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Cadastre e mantenha os acessos ao ambiente operacional. A gestão desta área é exclusiva para o nível 1.</p></div><Button onClick={openCreate} className="rounded-xl"><Plus className="mr-2 size-4" />Novo usuário</Button></section><div className="grid gap-5 md:grid-cols-3"><Card className="border-border/80 shadow-sm"><CardHeader className="pb-2"><CardDescription>Usuários cadastrados</CardDescription><CardTitle className="text-3xl">{users.data?.length ?? "—"}</CardTitle></CardHeader></Card><Card className="border-border/80 shadow-sm"><CardHeader className="pb-2"><CardDescription>Administradores</CardDescription><CardTitle className="text-3xl">{users.data?.filter(item => item.level === 1).length ?? "—"}</CardTitle></CardHeader></Card><Card className="border-border/80 shadow-sm"><CardHeader className="pb-2"><CardDescription>Usuários de operação</CardDescription><CardTitle className="text-3xl">{users.data?.filter(item => item.level === 2).length ?? "—"}</CardTitle></CardHeader></Card></div><Card className="overflow-hidden border-border/80 shadow-sm"><CardHeader className="flex-row items-center justify-between gap-4 border-b bg-muted/25"><div><CardTitle className="text-base">Base de usuários</CardTitle><CardDescription className="mt-1">Perfis habilitados para utilizar os módulos logísticos.</CardDescription></div><UsersRound className="size-5 text-muted-foreground" /></CardHeader><CardContent className="p-0">{users.isLoading ? <div className="space-y-4 p-6">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div> : users.error ? <p className="p-6 text-sm text-destructive">{users.error.message}</p> : <Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Nome</TableHead><TableHead>Nível</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{users.data?.map(item => <TableRow key={item.user}><TableCell className="font-mono text-xs font-medium">{item.user}</TableCell><TableCell className="font-medium">{item.name}{item.user === currentUser?.user && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}</TableCell><TableCell><Badge variant={item.level === 1 ? "default" : "secondary"}>{item.level === 1 ? "Nível 1" : "Nível 2"}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="h-8" onClick={() => openEdit(item)}><Edit3 className="mr-2 size-3.5" />Editar</Button></TableCell></TableRow>)}{users.data?.length === 0 && <TableRow><TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">Nenhum usuário foi cadastrado.</TableCell></TableRow>}</TableBody></Table>}</CardContent></Card><UserDialog key={editing?.user ?? "new"} open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} /></div>;
}
