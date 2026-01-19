import { Metadata } from 'next'
import { Shield, FileText, Users, Database, Lock, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidade - EDUCA',
  description: 'Política de Privacidade e Proteção de Dados do Sistema EDUCA',
}

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
              <p className="text-sm text-gray-500">Sistema de Gestão Educacional</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Política de Privacidade
          </h1>
          <p className="text-gray-500 mb-8">
            Última atualização: Janeiro de 2026
          </p>

          {/* Section 1 */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">1. Introdução</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              O sistema EDUCA, operado pela <strong>Secretaria Municipal de Educação de Fronteira/MG</strong>,
              coleta e processa dados pessoais de alunos, responsáveis e profissionais da educação
              em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Esta política descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">2. Dados Coletados</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Coletamos os seguintes tipos de dados pessoais:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Dados de identificação:</strong> nome completo, CPF, RG, data de nascimento, sexo, raça/cor</li>
              <li><strong>Dados de contato:</strong> endereço residencial, telefone, e-mail</li>
              <li><strong>Dados educacionais:</strong> matrícula, série, turma, frequência, notas, observações pedagógicas</li>
              <li><strong>Dados de benefícios sociais:</strong> NIS (Número de Identificação Social) para acompanhamento do Bolsa Família</li>
              <li><strong>Dados de saúde:</strong> necessidades especiais, restrições alimentares (quando informados)</li>
              <li><strong>Dados de responsáveis:</strong> nome, CPF, parentesco, contato, profissão</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">3. Finalidade do Tratamento</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Os dados coletados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Gestão educacional e administrativa das escolas municipais</li>
              <li>Registro e acompanhamento de frequência escolar</li>
              <li>Avaliação e acompanhamento do desempenho acadêmico</li>
              <li>Comunicação com responsáveis sobre a vida escolar do aluno</li>
              <li>Cumprimento de obrigações legais perante o MEC (Educacenso)</li>
              <li>Acompanhamento de beneficiários do Bolsa Família</li>
              <li>Planejamento de transporte escolar e alimentação</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">4. Compartilhamento de Dados</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Seus dados podem ser compartilhados com:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Ministério da Educação:</strong> para o Censo Escolar (Educacenso)</li>
              <li><strong>Ministério do Desenvolvimento Social:</strong> para acompanhamento do Bolsa Família</li>
              <li><strong>Órgãos de controle:</strong> Tribunal de Contas, Ministério Público, quando legalmente exigido</li>
              <li><strong>Conselho Tutelar:</strong> em casos de evasão escolar ou situações de risco</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Não comercializamos</strong> dados pessoais com terceiros para fins de marketing ou publicidade.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">5. Segurança dos Dados</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Adotamos medidas técnicas e organizacionais para proteger seus dados:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
              <li>Controle de acesso por níveis de permissão</li>
              <li>Registro de auditoria de todas as operações</li>
              <li>Backup automático com redundância</li>
              <li>Servidores em nuvem com certificações de segurança</li>
            </ul>
          </section>

          {/* Section 6 - LGPD Art. 14 */}
          <section className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-gray-900">6. Dados de Crianças e Adolescentes</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Em conformidade com o <strong>Artigo 14 da LGPD</strong>, o tratamento de dados pessoais
              de crianças e adolescentes é realizado com:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Consentimento específico</strong> de pelo menos um dos responsáveis legais</li>
              <li>Coleta apenas dos dados <strong>estritamente necessários</strong> para a atividade educacional</li>
              <li><strong>Informação clara</strong> sobre a coleta e uso dos dados</li>
              <li>Possibilidade de <strong>revogação do consentimento</strong> a qualquer momento</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              O não fornecimento do consentimento não impedirá a matrícula do aluno,
              mas poderá limitar alguns serviços complementares.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-teal-600" />
              <h2 className="text-xl font-semibold text-gray-900">7. Direitos do Titular</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Você tem os seguintes direitos garantidos pela LGPD:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Acesso:</strong> solicitar cópia dos seus dados pessoais</li>
              <li><strong>Correção:</strong> solicitar correção de dados incorretos ou desatualizados</li>
              <li><strong>Exclusão:</strong> solicitar exclusão de dados desnecessários (quando aplicável)</li>
              <li><strong>Portabilidade:</strong> solicitar transferência dos dados para outro serviço</li>
              <li><strong>Revogação:</strong> retirar o consentimento dado anteriormente</li>
              <li><strong>Informação:</strong> saber com quem seus dados foram compartilhados</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">8. Contato</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-gray-700 font-semibold">Encarregado de Dados (DPO)</p>
              <p className="text-gray-700">Secretaria Municipal de Educação de Fronteira/MG</p>
              <p className="text-gray-700 mt-2">
                <strong>Endereço:</strong> Rua Jandira Batista de Oliveira, 545 - Vila de Furnas<br />
                Fronteira/MG - CEP 38280-000
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Telefone:</strong> (34) 3266-1350
              </p>
              <p className="text-gray-700">
                <strong>E-mail:</strong> educacao@fronteira.mg.gov.br
              </p>
              <p className="text-gray-700 mt-2 text-sm">
                <strong>Horário de Atendimento:</strong> Segunda a Sexta, 08h às 17h
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">9. Alterações na Política</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Esta política pode ser atualizada periodicamente. Alterações significativas serão
              comunicadas aos usuários do sistema. Recomendamos a consulta periódica desta página.
            </p>
          </section>

          {/* Footer */}
          <div className="border-t pt-6 mt-8">
            <p className="text-sm text-gray-500 text-center">
              Secretaria Municipal de Educação de Fronteira/MG<br />
              Rua Jandira Batista de Oliveira, 545 - Vila de Furnas, CEP 38280-000<br />
              Sistema EDUCA - Gestão Educacional<br />
              © 2025-2026 - Todos os direitos reservados
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
