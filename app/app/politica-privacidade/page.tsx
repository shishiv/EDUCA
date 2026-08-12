import type { Metadata } from "next";
import { Shield, FileText, Users, Database, Lock } from "lucide-react";

export const metadata: Metadata = {
	title: "Política de Privacidade do Demo - EDUCA",
	description:
		"Aviso de privacidade do demo público do EDUCA, um ambiente de demonstração com dados sintéticos e sem titulares reais.",
};

export default function PoliticaPrivacidadePage() {
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white border-b">
				<div className="max-w-4xl mx-auto px-4 py-6">
					<div className="flex items-center gap-3">
						<Shield className="h-8 w-8 text-green-600" />
						<div>
							<h1 className="text-2xl font-bold text-gray-900">EDUCA</h1>
							<p className="text-sm text-gray-500">
								Sistema de Gestão Educacional
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Content */}
			<main className="max-w-4xl mx-auto px-4 py-8">
				<div className="bg-white rounded-lg border p-6 sm:p-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Política de Privacidade
					</h1>
					<p className="text-gray-500 mb-8">
						Última atualização: agosto de 2026
					</p>

					<div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
						<div className="flex items-center gap-2 mb-4">
							<Shield className="h-5 w-5 text-emerald-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								Este é um demo público
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed">
							O EDUCA disponibiliza esta instância para demonstração aberta do
							produto. Os registros exibidos aqui são <strong>sintéticos</strong> e
							não correspondem a pessoas reais: não há titular real associado aos
							dados do demo.
						</p>
						<p className="text-gray-700 leading-relaxed mt-4">
							Não insira neste ambiente dados pessoais reais, especialmente dados de
							crianças e adolescentes. Use somente valores fictícios ao testar a
							interface.
						</p>
					</div>

					{/* Section 1 */}
					<section className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<FileText className="h-5 w-5 text-blue-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								1. Escopo desta política
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed">
							Esta página explica as condições de privacidade do demo público do
							EDUCA. Ela descreve um ambiente de demonstração com dados sintéticos,
							não uma operação municipal real e não uma política de privacidade de
							uma secretaria de educação.
						</p>
						<p className="text-gray-700 leading-relaxed mt-4">
							O demo serve para conhecer a interface e os fluxos do produto. Os dados
							de negócio apresentados nas telas são fictícios e podem ser reiniciados
							periodicamente como parte da operação do sandbox.
						</p>
					</section>

					{/* Section 2 */}
					<section className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<Database className="h-5 w-5 text-green-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								2. Dados usados no demo
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed mb-4">
							Os dados funcionais exibidos e usados nas telas do demo são sintéticos.
							Eles simulam rotinas de gestão escolar sem identificar aluno,
							responsável, profissional da educação ou qualquer outra pessoa real.
						</p>
						<p className="text-gray-700 leading-relaxed mb-4">
							O ambiente não foi disponibilizado para receber dados pessoais reais.
							Não informe nome, CPF, RG, endereço, telefone, e-mail, dados de saúde,
							dados educacionais reais ou qualquer outro dado que permita identificar
							uma pessoa.
						</p>
						<ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
							<li>Os registros do demo não têm titular real.</li>
							<li>Os valores de teste devem ser sempre fictícios.</li>
							<li>O demo não é uma base de dados municipal em produção.</li>
						</ul>
					</section>

					{/* Section 3 */}
					<section className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<Users className="h-5 w-5 text-purple-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								3. Papéis e responsabilidades
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed">
							Neste demo, a <strong>EDUCA não é controladora de dados pessoais de
							nenhum titular</strong>, porque os registros da demonstração são
							sintéticos e não correspondem a pessoas reais.
						</p>
						<p className="text-gray-700 leading-relaxed mt-4">
							Em uma implantação municipal real, o município adotante define o
							controlador do tratamento e designa o encarregado (DPO), além de
							publicar os canais de contato e atender às solicitações dos titulares.
							A EDUCA atua como operadora, conforme o contrato e as instruções do
							controlador.
						</p>
					</section>

					{/* Section 4 */}
					<section className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<FileText className="h-5 w-5 text-teal-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								4. Uso do produto em uma implantação municipal
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed mb-4">
							Em uma implantação municipal, o controlador deverá definir as
							finalidades, a base legal, os dados necessários, os prazos de retenção e
							as regras de acesso. O EDUCA pode apoiar rotinas como:
						</p>
						<ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
							<li>Gestão educacional e administrativa das escolas.</li>
							<li>Registro e acompanhamento de frequência escolar.</li>
							<li>Organização de turmas, matrículas e responsáveis.</li>
							<li>Relatórios e acompanhamento da vida escolar.</li>
							<li>Rotinas administrativas definidas pelo município adotante.</li>
						</ul>
					</section>

					{/* Section 5 */}
					<section className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<Users className="h-5 w-5 text-orange-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								5. Compartilhamento e efeitos externos
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed mb-4">
							O demo não compartilha dados pessoais reais e não deve ser usado para
							enviar informações a órgãos públicos, Educacenso, Bolsa Família,
							Conselho Tutelar ou qualquer outro terceiro. A existência de telas e
							relatórios de demonstração não significa que uma transmissão externa
							esteja ocorrendo.
						</p>
						<p className="text-gray-700 leading-relaxed">
							Na implantação municipal, o controlador deverá definir os
							compartilhamentos permitidos, suas finalidades e respectivas bases
							legais. O município também deverá revisar e aprovar qualquer integração
							com órgãos públicos ou terceiros antes de colocá-la em operação.
						</p>
					</section>

					{/* Section 6 */}
					<section className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
						<div className="flex items-center gap-2 mb-4">
							<Shield className="h-5 w-5 text-amber-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								6. Crianças e adolescentes
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed mb-4">
							Este demo não contém dados de crianças ou adolescentes reais. Não
							insira esse tipo de dado no ambiente, mesmo para testar um fluxo.
						</p>
						<p className="text-gray-700 leading-relaxed">
							Na implantação municipal, o controlador deverá avaliar e documentar o
							tratamento de dados de crianças e adolescentes conforme o Artigo 14 da
							LGPD, considerando o melhor interesse, a transparência, a necessidade e
							os procedimentos aplicáveis ao caso. Esta página não substitui essa
							análise.
						</p>
					</section>

					{/* Section 7 */}
					<section className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<FileText className="h-5 w-5 text-blue-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								7. Direitos dos titulares
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed mb-4">
							Como os registros funcionais do demo são sintéticos e não têm titular
							real, esta página não recebe solicitações de titulares sobre esses
							registros.
						</p>
						<p className="text-gray-700 leading-relaxed mb-4">
							Em uma implantação municipal real, as solicitações de acesso, correção,
							exclusão, informação e demais direitos previstos na LGPD deverão ser
							encaminhadas ao controlador e ao encarregado (DPO) designados pelo
							município adotante.
						</p>
						<p className="text-gray-700 leading-relaxed">
							Por isso, esta página não publica endereço, telefone ou e-mail de DPO:
							não há município controlador deste demo.
						</p>
					</section>

					{/* Section 8 */}
					<section className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<FileText className="h-5 w-5 text-green-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								8. Runbook para o município adotante
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed mb-4">
							O produto entrega um runbook de adequação à LGPD para orientar o
							município adotante a fazer o próprio dever de casa antes de uma
							implantação real. O município deverá, entre outras providências:
						</p>
						<ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
							<li>Definir controlador, operador e encarregado (DPO).</li>
							<li>Publicar a política municipal e os canais para titulares.</li>
							<li>Definir bases legais, finalidades, acessos e retenção.</li>
							<li>Documentar o tratamento de dados de crianças e adolescentes.</li>
							<li>Revisar fluxos como Educacenso e outros compartilhamentos.</li>
						</ul>
					</section>

					{/* Section 9 */}
					<section className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<Lock className="h-5 w-5 text-red-600" />
							<h2 className="text-xl font-semibold text-gray-900">
								9. Segurança e alterações
							</h2>
						</div>
						<p className="text-gray-700 leading-relaxed mb-4">
							O sandbox aplica controles de acesso, bloqueia efeitos externos e pode
							ser reiniciado para preservar a natureza sintética da demonstração.
							Essas medidas não transformam o demo em ambiente autorizado para dados
							pessoais reais.
						</p>
						<p className="text-gray-700 leading-relaxed">
							Esta política pode ser atualizada para refletir mudanças no demo. A
							data no início da página indica a versão mais recente deste aviso.
						</p>
					</section>

					{/* Footer */}
					<div className="border-t pt-6 mt-8">
						<p className="text-sm text-gray-500 text-center">
							EDUCA - Demo público de demonstração
							<br />
							Dados sintéticos, sem titular real
							<br />© 2025-2026 - Sistema EDUCA
						</p>
					</div>
				</div>
			</main>
		</div>
	);
}
