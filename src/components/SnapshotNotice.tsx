import { formatarDataHoraBR } from "@/lib/format";
import { IconInfo } from "./icons";

/**
 * Aviso de transparência do próprio produto: sempre visível quando a lista
 * exibida é o fixture de exemplo (ingestão ainda não rodou) ou quando
 * mostramos a data do último snapshot real. Cor informativa (azul) +
 * ícone + texto — nunca cor sozinha.
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
        className="flex items-start gap-2 rounded-[10px] p-3 text-sm"
        style={{ background: "var(--color-info-bg)", color: "var(--text-secondary)" }}
        role="status"
      >
        <span className="mt-0.5 shrink-0" style={{ color: "var(--color-info)" }}>
          <IconInfo />
        </span>
        <p>
          <strong className="text-[var(--text-primary)]">Dados de exemplo.</strong> Ainda
          estamos processando a base oficial do TSE para este ambiente. Os candidatos abaixo
          são fictícios, só para mostrar como a busca vai funcionar.
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
