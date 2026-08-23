/**
 * Frozen provenance for the official artifacts used by the bounded 2026
 * implementation. Hashes are SHA-256 over the downloaded files.
 *
 * These references establish the implemented file structure; they do not
 * establish acceptance by the Educacenso service or regulatory compliance.
 */
export const EDUCACENSO_SOURCE_2026 = Object.freeze({
  officialPage: {
    url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar/orientacoes/matricula-inicial/migracao',
    observedUpdatedAt: '2026-07-09T17:11:00-03:00',
  },
  instructions: {
    title:
      'Etapas e Instruções Gerais para a Migração no Sistema Educacenso — 1ª Etapa da Coleta do Censo Escolar 2026 (Matrícula Inicial)',
    url: 'https://download.inep.gov.br/educacao_basica/educacenso/migracao/2026/instrucoes_da_migracao_censo_escolar_1_etapa_2026.pdf',
    sha256: 'efdf88b968da214b79cc7396ebcd91703e1c10efaaab995f0e3f16d181529e22',
  },
  identificationLayout: {
    title: 'Layout de Identificação 2026',
    version: 1,
    url: 'https://download.inep.gov.br/educacao_basica/educacenso/migracao/2026/layout_de_identificacao_2026.xlsx',
    sha256: 'b507c61eb94d277d6d3a1e16d936f0dff80cc39a413dcfa526dd2d653917ec15',
  },
  importExportLayout: {
    title: 'Layout de Importação e Exportação da Matrícula Inicial 2026',
    latestChangeLogVersionObserved: 5,
    url: 'https://download.inep.gov.br/educacao_basica/educacenso/migracao/2026/layout_de_importacao_e_exportacao_2026.xlsx',
    sha256: '68abca006f808d8c7d0ae405e350de7b77e3c70385f329cf4b8e7ff597296a09',
  },
  auxiliaryTables: {
    title: 'Tabelas auxiliares do Educacenso 2026',
    url: 'https://download.inep.gov.br/educacao_basica/educacenso/migracao/2026/tabelas_auxiliares_2026.rar',
    sha256: 'ca7d1c033dfdebf47f1dc61cc25c3c9fdf4ee227189dd3257d72ae8118e46ac0',
    municipalityTableSha256:
      'cea115117f79a697f3402eb67133976788544399b15c9789bcd9fe2ad08d80a3',
  },
  retrievedAt: '2026-08-23T08:24:00Z',
} as const)
