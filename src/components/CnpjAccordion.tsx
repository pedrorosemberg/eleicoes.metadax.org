"use client";

import { useState } from "react";
import type { BrasilApiCnpjResponse } from "@/types/candidato";
import { formatarDataBR, formatarMoedaBRL } from "@/lib/format";
import { IconChevronDown } from "./icons";

/**
 * Accordion client-side: só consulta a BrasilAPI quando o usuário clica
 * para expandir, nunca em lote. O CNPJ vem direto da prestação de contas
 * do TSE (cpfCnpjDoador/cpfCnpjFornecedor) — dado já ligado de verdade a
 * essa receita/despesa específica, sem cruzamento por nome (diferente do
 * CNPJ_campanha, que não é usado desta forma por não ter chave confiável
 * — ver docs/DATA_SOURCES.md §1).
 */
export function CnpjAccordion({
  cnpj,
  nome,
  valorFormatado,
}: {
  cnpj: string;
  nome: string;
  valorFormatado?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<
    { tipo: "ocioso" } | { tipo: "carregando" } | { tipo: "erro" } | { tipo: "ok"; dados: BrasilApiCnpjResponse }
  >({ tipo: "ocioso" });

  const cnpjFormatado = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

  async function alternar() {
    const proximoAberto = !aberto;
    setAberto(proximoAberto);
    if (proximoAberto && estado.tipo === "ocioso") {
      setEstado({ tipo: "carregando" });
      try {
        const res = await fetch(`/api/cnpj/${cnpj}`);
        if (!res.ok) {
          setEstado({ tipo: "erro" });
          return;
        }
        const dados = (await res.json()) as BrasilApiCnpjResponse;
        setEstado({ tipo: "ok", dados });
      } catch {
        setEstado({ tipo: "erro" });
      }
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[var(--text-secondary)]">
          {nome}
          <span className="ml-1.5 text-xs text-[var(--text-tertiary)]">{cnpjFormatado}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {valorFormatado && (
            <span className="font-financial text-[var(--text-primary)]">{valorFormatado}</span>
          )}
          <IconChevronDown className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
        </span>
      </button>
      {aberto && (
        <div
          className="mt-2 rounded-[10px] border p-3 text-xs"
          style={{ borderColor: "var(--hairline)", background: "var(--surface-1)" }}
        >
          {estado.tipo === "carregando" && (
            <p className="text-[var(--text-tertiary)]">Consultando a Receita Federal (BrasilAPI)…</p>
          )}
          {estado.tipo === "erro" && (
            <p className="text-[var(--text-tertiary)]">
              Não foi possível obter dados deste CNPJ na BrasilAPI agora.
            </p>
          )}
          {estado.tipo === "ok" && (
            <dl className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--text-tertiary)]">Razão social</dt>
                <dd className="text-right text-[var(--text-primary)]">{estado.dados.razao_social}</dd>
              </div>
              {estado.dados.nome_fantasia && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-tertiary)]">Nome fantasia</dt>
                  <dd className="text-right text-[var(--text-primary)]">{estado.dados.nome_fantasia}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--text-tertiary)]">Situação cadastral</dt>
                <dd className="text-right text-[var(--text-primary)]">
                  {estado.dados.descricao_situacao_cadastral}
                </dd>
              </div>
              {estado.dados.cnae_fiscal_descricao && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-tertiary)]">Atividade</dt>
                  <dd className="text-right text-[var(--text-primary)]">{estado.dados.cnae_fiscal_descricao}</dd>
                </div>
              )}
              {(estado.dados.municipio || estado.dados.uf) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-tertiary)]">Município/UF</dt>
                  <dd className="text-right text-[var(--text-primary)]">
                    {estado.dados.municipio}
                    {estado.dados.uf ? `/${estado.dados.uf}` : ""}
                  </dd>
                </div>
              )}
              {estado.dados.data_inicio_atividade && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-tertiary)]">Início de atividade</dt>
                  <dd className="text-right text-[var(--text-primary)]">
                    {formatarDataBR(estado.dados.data_inicio_atividade)}
                  </dd>
                </div>
              )}
              {typeof estado.dados.capital_social === "number" && estado.dados.capital_social > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text-tertiary)]">Capital social</dt>
                  <dd className="text-right text-[var(--text-primary)]">
                    {formatarMoedaBRL(estado.dados.capital_social)}
                  </dd>
                </div>
              )}
              {estado.dados.qsa?.length ? (
                <div>
                  <dt className="text-[var(--text-tertiary)]">Sócios</dt>
                  <dd className="mt-1 text-[var(--text-primary)]">
                    <ul className="flex flex-col gap-0.5">
                      {estado.dados.qsa.map((s, i) => (
                        <li key={i}>
                          {s.nome_socio} — {s.qualificacao_socio}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              <p className="mt-1 text-[var(--text-tertiary)]">Fonte: Receita Federal, via BrasilAPI.</p>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
