export function buildImportFeedback(inserted: number, rejected: number) {
  if (rejected > 0) {
    return {
      variant: "warning" as const,
      message: `Importação parcialmente concluída: ${inserted} registro(s) inserido(s) e ${rejected} rejeitado(s). Consulte o relatório.`,
    };
  }

  return {
    variant: "success" as const,
    message: `${inserted} registro(s) foram enviados ao Supabase.`,
  };
}

export async function finalizeImport(
  inserted: number,
  rejected: number,
  refreshDashboard: () => Promise<unknown>,
) {
  const feedback = buildImportFeedback(inserted, rejected);
  try {
    await refreshDashboard();
    return { feedback, dashboardUpdated: true } as const;
  } catch {
    return { feedback, dashboardUpdated: false } as const;
  }
}
