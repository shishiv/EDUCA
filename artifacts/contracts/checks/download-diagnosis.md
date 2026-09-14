# Diagnóstico limitado após instrução 004

2026-09-14. Nenhuma terceira execução do E2E de frequência.

## Artefatos existentes

- `general/build.log`: compilação e geração de páginas concluídas; `general/server.log`: servidor iniciou e ficou pronto.
- O build local contém o helper atualizado em `app/.next/static/chunks/2517-d57e4fb2ef1990f1.js`:

```js
async function x(e,a){let o=new Blob([await e.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),t=a.endsWith(".xlsx")?a:`${a}.xlsx`,i=URL.createObjectURL(o),r=document.createElement("a");r.href=i,r.download=t,document.body.appendChild(r),r.click(),r.remove(),requestAnimationFrame(()=>URL.revokeObjectURL(i))}
```

- Isso confirma **o build produzido**, não prova qual recurso o navegador anterior carregou: não foi preservado trace/network da primeira execução, pois o manifest grava trace no primeiro retry e não houve retry.
- `app/test-results/.playwright-artifacts-1/traces` não contém trace útil; artefatos restantes são screenshots.
- O teste aguarda o primeiro evento `page.waitForEvent('download')` registrado imediatamente antes do clique no botão Excel. Não filtra URL. A assertion de filename falha antes de `saveAs`, portanto não conserva bytes/URL desse download. Ainda não é possível excluir evento indevido sem nova coleta autorizada.
- O fluxo de código é botão Excel → `handleExportExcel` → `generateAttendanceReportExcel(reportData, schoolName)` → `saveWorkbook` → blob/link. O nome é derivado de turma e datas; não há HTTP Content-Disposition nesse download gerado no cliente.

## Tentativa de diagnóstico mínimo, não E2E

Fixture isolada em `.pilot-evidence/download-diagnosis/index.html`: dois botões de download nativo (nome ASCII e nome Unicode), blob sintético **não XLSX válido**, e registro de URL/atributo download. Servidor bind somente `127.0.0.1`, sem Supabase, autenticação ou dados externos.

Ferramenta exigida: `chrome-devtools-axi` 0.1.30, sessão própria `educa-contracts-download`.

A ferramenta abriu a URL local, mas retornou:

```text
MCP error -32602: Input validation error: Invalid arguments for tool take_snapshot: Required at pageId
MCP error -32602: Input validation error: Invalid arguments for tool evaluate_script: Required at pageId
```

Não foram obtidos registros do clique nem metadata do download. Isso é um bloqueio do protocolo wrapper/backend, não evidência de causa no produto. A fixture não foi descrita como teste aprovado. Trap encerrou o servidor e a sessão próprios. Nenhuma ferramenta global foi alterada.

## Próximo passo governado

- Mantida aberta `educa-contracts-frequency-download`.
- Aberta `educa-contracts-download-diagnostics`: é necessário corrigir/prover ferramenta compatível ou autorizar explicitamente coleta diagnóstica alternativa.
- A mudança candidata de downloader permanece sem causa comprovada; não descartar nem promover como solução.
- Não houve relaxamento de expectativa, reteste de cenário ou campanha histórica.
