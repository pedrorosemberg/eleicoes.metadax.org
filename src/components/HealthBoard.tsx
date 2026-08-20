"use client";

import { useEffect, useState } from "react";
import type { ChecagemFonte, StatusFonte } from "@/lib/health";
import { formatarHoraBR } from "@/lib/format";
import { IconAlertTriangle, IconCheck, IconLock, IconX } from "./icons";

const POLL_MS = 30_000;

const ROTULO: Record<StatusFonte, string> = {
  operacional: "Operacional",
  "requer-autenticacao": "Requer chave de API",
  bloqueado: "Bloqueado (rede)",
  indisponivel: "Indisponível",
};

function IconeStatus({ status }: { status: StatusFonte }) {
  switch (status) {
    case "operacional":
      return <IconCheck />;
    case "requer-autenticacao":
      return <IconLock />;
    case "bloqueado":
      return <IconAlertTriangle />;
    case "indisponivel":
      return <IconX />;
  }
}

export function HealthBoard({ inicial }: { inicial: ChecagemFonte[] }) {
  const [checagens, setChecagens] = useState(inicial);
  const [atualizando, setAtualizando] = useState(false);
  const [proximaEm, setProximaEm] = useState(POLL_MS / 1000);

  useEffect(() => {
    const poll = setInterval(async () => {
      setAtualizando(true);
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (res.ok) {
          const dados = (await res.json()) as { checagens: ChecagemFonte[] };
          setChecagens(dados.checagens);
        }
      } finally {
        setAtualizando(false);
        setProximaEm(POLL_MS / 1000);
      }
    }, POLL_MS);

    const tick = setInterval(() => {
      setProximaEm((s) => (s <= 1 ? POLL_MS / 1000 : s - 1));
    }, 1000);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--text-tertiary)]" role="status" aria-live="polite">
        {atualizando ? "Verificando agora…" : `Próxima verificação em ${proximaEm}s`} · checagem
        automática a cada {POLL_MS / 1000}s
      </p>
      <ul className="flex flex-col gap-3">
        {checagens.map((c) => (
          <li
            key={c.id}
            className="rounded-[18px] border p-4 sm:p-5"
            style={{ borderColor: "var(--hairline)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[17px] font-semibold text-[var(--text-primary)]">{c.nome}</h3>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{c.descricao}</p>
              </div>
              <span
                className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]"
                style={{ borderColor: "var(--hairline-strong)" }}
              >
                <IconeStatus status={c.status} />
                {ROTULO[c.status]}
              </span>
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-tertiary)]">
              <div className="flex gap-1">
                <dt>Latência:</dt>
                <dd className="font-financial">{c.latenciaMs != null ? `${c.latenciaMs}ms` : "—"}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Verificado às:</dt>
                <dd className="font-financial">{formatarHoraBR(c.verificadoEm)}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Detalhe:</dt>
                <dd>{c.detalhe}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
