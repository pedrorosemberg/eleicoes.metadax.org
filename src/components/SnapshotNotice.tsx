import { formatarDataHoraBR } from "@/lib/format";

/**
 * Aviso de transparência do próprio produto: sempre visível quando a lista
 * exibida é o fixture de exemplo (ingestão ainda não rodou) ou quando
 * mostramos a data do último snapshot real. Nunca comunicado só por cor
 * — sempre com ícone + texto, ver docs/DESIGN_SYSTEM.md §3.
 */
export function SnapshotNotice({
  isAmostra,
  geradoEm,
}: {
  isAmostra: boolean;
  geradoEm?: string | null;
}) {
  if (isAmostra) {
    return (
      <div
        className="flex items-start gap-2 rounded-[10px] border border-dashed p-3 text-sm text-[var(--text-secondary)]"
        style={{ borderColor: "var(--hairline-strong)" }}
        role="status"
      >
        <span aria-hidden>⚠</span>
        <p>
          <strong className="text-[var(--text-primary)]">Dados de exemplo.</strong> O snapshot
          oficial do TSE ainda não foi processado neste ambiente — ver docs/DATA_SOURCES.md §5.
          Os candidatos abaixo são fictícios.
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm text-[var(--text-tertiary)]">
      Última atualização dos dados oficiais: {geradoEm ? formatarDataHoraBR(geradoEm) : "—"}
    </p>
  );
}
