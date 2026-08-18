import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AgendaImportPreview, parseAgendaFile } from "@/lib/agendaImport";
import { trpc } from "@/lib/trpc";
import ReceptionDashboard from "@/components/ReceptionDashboard";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { toast } from "sonner";

type UploadBatchReport = {
  batch: number;
  submitted: number;
  inserted: number;
  rejected: Array<{ senha: string; plu: string; dataAgenda: string; reason: string }>;
  status: "success" | "partial" | "failed";
  error?: string;
};

type UploadReport = {
  fileName: string;
  scannedRows: number;
  eligibleRows: number;
  skippedRows: number;
  invalidRows: number;
  inserted: number;
  rejected: number;
  status: "success" | "partial";
  batches: UploadBatchReport[];
};

function RejectedRecordDetails({ report }: { report: UploadReport }) {
  const rejected = report.batches.flatMap(batch => batch.rejected.map(record => ({ ...record, batch: batch.batch })));
  if (!rejected.length) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/[0.035]">
      <CardHeader><CardTitle className="text-base">Registros rejeitados pelo Supabase</CardTitle><CardDescription>Estes itens não foram persistidos. Corrija a planilha e reimporte somente os registros necessários.</CardDescription></CardHeader>
      <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Lote</TableHead><TableHead>Senha</TableHead><TableHead>PLU</TableHead><TableHead>Data</TableHead><TableHead>Motivo da rejeição</TableHead></TableRow></TableHeader><TableBody>{rejected.map((record, index) => <TableRow key={`${record.batch}-${record.senha}-${record.plu}-${index}`}><TableCell>{record.batch}</TableCell><TableCell className="font-mono text-xs">{record.senha}</TableCell><TableCell className="font-mono text-xs">{record.plu || "—"}</TableCell><TableCell>{record.dataAgenda}</TableCell><TableCell className="max-w-xl text-xs text-muted-foreground">{record.reason}</TableCell></TableRow>)}</TableBody></Table></CardContent>
    </Card>
  );
}

function AgendaImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<AgendaImportPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<UploadReport | null>(null);
  const utils = trpc.useUtils();
  const importMutation = trpc.logistics.agenda.import.useMutation();

  async function readFile(file?: File) {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error("Selecione um arquivo Excel nos formatos .xlsx ou .xls.");
      return;
    }

    setIsReading(true);
    setPreview(null);
    setReport(null);
    setProgress(0);
    try {
      const result = await parseAgendaFile(file);
      setPreview(result);
      setFileName(file.name);
      if (!result.records.length) toast.error("Nenhum registro válido com código 910 foi encontrado.");
      else toast.success(`${result.records.length} registros preparados para conferência.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a planilha.");
    } finally {
      setIsReading(false);
    }
  }

  async function upload() {
    if (!preview?.records.length) return;
    const chunkSize = 5_000;
    const batches: UploadBatchReport[] = [];
    let inserted = 0;
    let rejected = 0;
    setProgress(0);

    for (let index = 0; index < preview.records.length; index += chunkSize) {
      const records = preview.records.slice(index, index + chunkSize);
      const batch = batches.length + 1;
      try {
        const result = await importMutation.mutateAsync({ records });
        inserted += result.inserted;
        rejected += result.rejected;
        const offset = batches.length;
        batches.push(...result.batches.map(batchReport => ({ ...batchReport, batch: batchReport.batch + offset })));
        setProgress(Math.round((Math.min(index + records.length, preview.records.length) / preview.records.length) * 100));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha não identificada ao gravar o lote.";
        batches.push({ batch, submitted: records.length, inserted: 0, rejected: records.map(record => ({ senha: record.senha, plu: record.plu, dataAgenda: record.dataAgenda, reason: message })), status: "failed", error: message });
        setReport({
          fileName,
          scannedRows: preview.scannedRows,
          eligibleRows: preview.eligibleRows,
          skippedRows: preview.skippedRows,
          invalidRows: preview.invalidRows.length,
          inserted,
          rejected: rejected + records.length,
          status: "partial",
          batches,
        });
        toast.error("O envio foi interrompido. Consulte o relatório por lote abaixo.");
        return;
      }
    }

    setReport({
      fileName,
      scannedRows: preview.scannedRows,
      eligibleRows: preview.eligibleRows,
      skippedRows: preview.skippedRows,
      invalidRows: preview.invalidRows.length,
      inserted,
      rejected,
      status: rejected ? "partial" : "success",
      batches,
    });
    await utils.logistics.reception.dashboard.invalidate();
    if (rejected) toast.error(`${inserted} registros inseridos e ${rejected} rejeitado(s). Consulte o relatório.`);
    else toast.success(`${inserted} registros foram enviados ao Supabase.`);
    setPreview(null);
    setFileName("");
  }

  const importing = importMutation.isPending;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/80 bg-card p-7 shadow-[0_16px_45px_-28px_rgba(15,23,42,0.32)] md:p-9">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div className="max-w-2xl">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25"><CalendarClock className="size-5" /></div>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Bases operacionais</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Programação de agenda</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Importe a aba <strong className="text-foreground">Agendas</strong>. O sistema remove as seis primeiras linhas, seleciona apenas os registros com <strong className="text-foreground">A = 910</strong> e permite conferir tudo antes do envio.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-muted/65 p-4"><p className="font-medium text-muted-foreground">Origem exigida</p><p className="mt-1 font-semibold">Aba “Agendas”</p></div>
            <div className="rounded-2xl bg-muted/65 p-4"><p className="font-medium text-muted-foreground">Filtro aplicado</p><p className="mt-1 font-semibold">Coluna A = 910</p></div>
          </div>
        </div>
      </section>

      <Card className="border-border/80 shadow-sm">
        <CardHeader><CardTitle className="text-base">Selecionar planilha</CardTitle><CardDescription>São aceitos arquivos Excel .xlsx e .xls. O arquivo é lido no navegador e apenas os registros confirmados são enviados.</CardDescription></CardHeader>
        <CardContent>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => void readFile(event.target.files?.[0])} />
          <div className={`relative flex min-h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/45"}`} onDragOver={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); void readFile(event.dataTransfer.files?.[0]); }}>
            <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><FileSpreadsheet className="size-6" /></div>
            <p className="font-semibold">Arraste a planilha para cá</p><p className="mt-1 text-sm text-muted-foreground">ou selecione o arquivo no seu computador</p>
            <Button variant="outline" className="mt-5 rounded-xl" onClick={() => inputRef.current?.click()} disabled={isReading}>{isReading ? <><Loader2 className="mr-2 size-4 animate-spin" />Lendo planilha…</> : <><UploadCloud className="mr-2 size-4" />Escolher arquivo</>}</Button>
          </div>
        </CardContent>
      </Card>

      {report && <RejectedRecordDetails report={report} />}
      {preview && <>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-muted/20"><div><CardTitle className="text-base">Conferência da importação</CardTitle><CardDescription className="mt-1">Arquivo: {fileName}</CardDescription></div><Badge variant={preview.invalidRows.length ? "destructive" : "secondary"}>{preview.invalidRows.length ? `${preview.invalidRows.length} pendência(s)` : "Pronto para envio"}</Badge></CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-4"><div className="rounded-2xl bg-blue-500/8 p-4"><p className="text-xs text-muted-foreground">Linhas analisadas</p><p className="mt-1 text-2xl font-semibold">{preview.scannedRows}</p></div><div className="rounded-2xl bg-sky-500/8 p-4"><p className="text-xs text-muted-foreground">Elegíveis (910)</p><p className="mt-1 text-2xl font-semibold">{preview.eligibleRows}</p></div><div className="rounded-2xl bg-emerald-500/8 p-4"><p className="text-xs text-muted-foreground">Registros válidos</p><p className="mt-1 text-2xl font-semibold">{preview.records.length}</p></div><div className="rounded-2xl bg-amber-500/10 p-4"><p className="text-xs text-muted-foreground">Fora do filtro</p><p className="mt-1 text-2xl font-semibold">{preview.skippedRows}</p></div></CardContent>
        </Card>
        {preview.invalidRows.length > 0 && <Card className="border-amber-500/35 bg-amber-500/5"><CardContent className="flex gap-3 p-5 text-sm"><AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" /><div><p className="font-semibold">Registros com campos obrigatórios ausentes</p><p className="mt-1 text-muted-foreground">As linhas com pendência não serão enviadas: {preview.invalidRows.slice(0, 4).map(item => `linha ${item.row}`).join(", ")}{preview.invalidRows.length > 4 ? "…" : ""}.</p></div></CardContent></Card>}
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4 border-b"><div><CardTitle className="text-base">Pré-visualização</CardTitle><CardDescription className="mt-1">Primeiros {Math.min(preview.records.length, 8)} registros que serão inseridos em AGENDA_REC.</CardDescription></div><CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" /></CardHeader>
          <CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>Senha</TableHead><TableHead>Data</TableHead><TableHead>Hora</TableHead><TableHead>Fornecedor</TableHead><TableHead>Categoria</TableHead><TableHead>Paletes</TableHead><TableHead>Ruptura</TableHead></TableRow></TableHeader><TableBody>{preview.records.slice(0, 8).map((record, index) => <TableRow key={`${record.senha}-${index}`}><TableCell className="font-mono text-xs">{record.senha}</TableCell><TableCell>{record.dataAgenda}</TableCell><TableCell>{record.horaAgenda || "—"}</TableCell><TableCell className="max-w-52 truncate">{record.fornecedor || "—"}</TableCell><TableCell>{record.categoria || "—"}</TableCell><TableCell>{record.qtdPaletes || "0"}</TableCell><TableCell><Badge variant={record.statusRuptura ? "outline" : "secondary"}>{record.statusRuptura || "Sem status"}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent>
        </Card>
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-primary/15 bg-primary/[0.045] p-5 sm:flex-row sm:items-center"><div><p className="font-semibold">Enviar registros confirmados?</p><p className="mt-1 text-sm text-muted-foreground">A ação gravará {preview.records.length} registro(s) em AGENDA_REC.</p>{importing && <Progress value={progress} className="mt-3 h-1.5 w-64 max-w-full" />}</div><div className="flex gap-2"><Button variant="outline" onClick={() => { setPreview(null); setFileName(""); }}>Descartar</Button><Button onClick={() => void upload()} disabled={!preview.records.length || importing}>{importing ? <><Loader2 className="mr-2 size-4 animate-spin" />Enviando {progress}%</> : <><UploadCloud className="mr-2 size-4" />Enviar ao Supabase</>}</Button></div></div>
      </>}

      {report && <Card className={report.status === "success" ? "border-emerald-500/30 bg-emerald-500/[0.035]" : "border-amber-500/35 bg-amber-500/[0.035]"}>
        <CardHeader className="flex-row items-start justify-between gap-5"><div><CardTitle className="text-base">Resultado da importação</CardTitle><CardDescription className="mt-1">{report.fileName} · {report.status === "success" ? "processamento concluído" : "processamento interrompido"}</CardDescription></div><Badge variant={report.status === "success" ? "secondary" : "destructive"}>{report.status === "success" ? "Concluído" : "Parcial"}</Badge></CardHeader>
        <CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div className="rounded-xl bg-background/65 p-3"><p className="text-xs text-muted-foreground">Analisadas</p><p className="mt-1 text-xl font-semibold">{report.scannedRows}</p></div><div className="rounded-xl bg-background/65 p-3"><p className="text-xs text-muted-foreground">Elegíveis</p><p className="mt-1 text-xl font-semibold">{report.eligibleRows}</p></div><div className="rounded-xl bg-background/65 p-3"><p className="text-xs text-muted-foreground">Ignoradas (A ≠ 910)</p><p className="mt-1 text-xl font-semibold">{report.skippedRows}</p></div><div className="rounded-xl bg-background/65 p-3"><p className="text-xs text-muted-foreground">Inválidas</p><p className="mt-1 text-xl font-semibold">{report.invalidRows}</p></div><div className="rounded-xl bg-background/65 p-3"><p className="text-xs text-muted-foreground">Inseridas</p><p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-400">{report.inserted}</p></div></div><div className="overflow-x-auto rounded-xl border bg-background/45"><Table><TableHeader><TableRow><TableHead>Lote</TableHead><TableHead>Enviados</TableHead><TableHead>Inseridos</TableHead><TableHead>Situação</TableHead><TableHead>Detalhe</TableHead></TableRow></TableHeader><TableBody>{report.batches.map(batch => <TableRow key={batch.batch}><TableCell>{batch.batch}</TableCell><TableCell>{batch.submitted}</TableCell><TableCell>{batch.inserted}</TableCell><TableCell><Badge variant={batch.status === "success" ? "secondary" : "destructive"}>{batch.status === "success" ? "Concluído" : "Falhou"}</Badge></TableCell><TableCell className="max-w-96 text-xs text-muted-foreground">{batch.error ?? "Gravado com sucesso."}</TableCell></TableRow>)}</TableBody></Table></div></CardContent>
      </Card>}
    </div>
  );
}

export default function ReceptionPage({ mode }: { mode: "dashboard" | "agenda" }) {
  if (mode === "agenda") return <AgendaImportPanel />;
  return <ReceptionDashboard />;
}
