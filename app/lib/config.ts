/**
 * Municipal configuration — driven by environment variables.
 * Each municipality deploying EDUCA should configure these values in .env.local.
 *
 * @see .env.local.example for the full list of supported variables.
 */
export const municipalConfig = {
	nome: process.env.NEXT_PUBLIC_MUNICIPAL_NAME ?? "Município",
	secretaria:
		process.env.NEXT_PUBLIC_SECRETARIA_NAME ?? "Secretaria de Educação",
	estado: process.env.NEXT_PUBLIC_MUNICIPAL_STATE ?? "UF",
	telefoneContato: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
	emailDPO: process.env.NEXT_PUBLIC_DPO_EMAIL ?? "",
	enderecoDPO: process.env.NEXT_PUBLIC_DPO_ADDRESS ?? "",
};
