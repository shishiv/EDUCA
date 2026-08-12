/** Marker stored by the only seed authorized to emit a bounded descriptive-report PDF. */
export const PILOT_DESCRIPTIVE_SEED_MARKER = 'SYNTHETIC-EDUCA-PILOT-DESCRIPTIVE'

/** Database config key that proves the descriptive-report synthetic seed was applied. */
export const PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY = 'pilot_descriptive_synthetic_marker'

/** Runtime input that identifies the source revision used by the rehearsal. */
export const PILOT_DESCRIPTIVE_RELEASE_REVISION_ENV_KEY = 'EDUCA_RELEASE_REVISION'

/** Database config key that binds the isolated seed to the source revision. */
export const PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY = 'pilot_descriptive_release_revision'

/** Database config key that records the bounded rehearsal environment. */
export const PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY = 'pilot_descriptive_environment'

/** Database config key that records the exact canonical source used for emission. */
export const PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY = 'pilot_descriptive_canonical_source'

/** The only environment authorized for this PDF rehearsal. */
export const PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT = 'local synthetic pilot rehearsal'

/** The content query that supplies the report's taught-content evidence. */
export const PILOT_DESCRIPTIVE_CANONICAL_SOURCE =
  "public.conteudo_aula via generateContentReport (from('conteudo_aula'))"

/** Stable algorithm label for the deterministic canonical-row fingerprint. */
export const PILOT_DESCRIPTIVE_FINGERPRINT_ALGORITHM = 'MD5'

/** Boundary printed in every operational rehearsal PDF. */
export const PILOT_DESCRIPTIVE_NON_LEGAL_BOUNDARY =
  'Este é um relatório operacional de ensaio piloto sintético local. Não é documento legal, emissão municipal oficial, assinatura, certificado, comprovação de conformidade ou exportação Educacenso.'

/** Fixed report period used by the isolated synthetic fixture. */
export const PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD = Object.freeze({
  year: 2026,
  semester: 'primeiro',
  start: '2026-02-01',
  end: '2026-07-31',
})

/** Fixed scope used by the isolated synthetic fixture. */
export const PILOT_DESCRIPTIVE_EXPECTED_SCOPE = Object.freeze({
  schoolName: 'Escola Descritiva Sintética',
  className: 'Pré II Sintético',
  classSeries: 'Pré II',
})

/** Fixed synthetic actor identity used by the isolated fixture. */
export const PILOT_DESCRIPTIVE_EXPECTED_ISSUER = Object.freeze({
  name: 'Professora Descritiva Sintética',
  email: 'professora.descritivo@synthetic.invalid',
  role: 'professor',
})

/** Config row IDs keep the seed and validation receipt deterministic. */
export const PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_ID =
  '2a000000-0000-0000-0000-000000000001'
export const PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_ID =
  '2b000000-0000-0000-0000-000000000001'
export const PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_ID =
  '2c000000-0000-0000-0000-000000000001'

/** Returns the explicit source revision required by the rehearsal. */
export function requirePilotDescriptiveReleaseRevision(value = process.env[PILOT_DESCRIPTIVE_RELEASE_REVISION_ENV_KEY]): string {
  const revision = value?.trim()
  if (!revision) {
    throw new Error('PILOT_DESCRIPTIVE_RELEASE_REVISION_REQUIRED: explicit source revision is required')
  }
  return revision
}
