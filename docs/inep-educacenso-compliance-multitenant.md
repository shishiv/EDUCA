    # Integração INEP/Educacenso, Compliance Educacional e Arquitetura Multi-Tenant no i-Educar

## 1. Integração com INEP/Educacenso

O i-Educar possui um módulo específico para integração com o Educacenso, conforme indicado no README (`Módulo do Educacenso`).  
Essa integração é responsável por exportar e validar dados exigidos pelo INEP, garantindo conformidade com os padrões nacionais.

### Principais pontos identificados:
- **Exportação de dados**: Classes de `Exporter` geram arquivos com campos como `inep_id` (aluno) e `school_inep` (escola).
- **Validações específicas**:  
  - `BirthCertificateValidator` — valida formato e ano da certidão de nascimento.  
  - `DifferentiatedLocationValidator` — valida coerência entre localização diferenciada e zona de residência.  
  - `NisValidator` — valida número do NIS (não pode ser todos zeros).  
  - `NameValidator` — impede repetição excessiva de caracteres no nome.  
  - `InepExamValidator` — valida recursos necessários para provas, evitando combinações inválidas.
- **Regras Educacenso**:  
  - `CheckMandatoryCensoFields` — valida campos obrigatórios como organização curricular e etapa de ensino.
- **Serviços de importação**:  
  - `FinalStatusImportService` — valida dados de status final de matrícula, incluindo datas e situações.

## 2. Compliance Educacional

O compliance educacional no i-Educar é implementado por meio de:
- **Validações de consistência**: Garantem que dados enviados ao Educacenso estejam corretos e completos.
- **Regras de negócio**: Aplicadas em serviços e validadores para assegurar conformidade com normas do MEC/INEP.
- **Testes automatizados**: Extensa suíte de testes (`tests/Educacenso/Validator/`, `tests/Unit/Rules/`) cobre cenários válidos e inválidos, prevenindo regressões.

## 3. Arquitetura Multi-Tenant

A arquitetura multi-tenant permite que múltiplas entidades (municípios, redes de ensino) utilizem a mesma instância do sistema, mantendo dados isolados.

### Configuração:
- **Flag de ativação**:  
  - `config/app.php` contém `'multi_tenant' => env('APP_MULTI_TENANT', false)`.
- **Isolamento por domínio**:  
  - `config/session.php` e `config/sanctum.php` definem domínios e subdomínios para cookies e autenticação.
- **Suporte a múltiplos modelos**:  
  - `config/auth.php` permite múltiplas fontes de usuários e resets de senha.
- **Processamento por múltiplas escolas**:  
  - Serviços como `AcademicYearService` possuem métodos `validateAcademicYearDatesForMultipleSchools` e `validateAcademicYearModulesForMultipleSchools`, evidenciando operações multi-tenant.

## 4. Conclusão

O i-Educar apresenta uma integração robusta com o INEP/Educacenso, sustentada por validadores específicos e regras de negócio que garantem compliance educacional.  
A arquitetura multi-tenant é configurável e suporta múltiplos domínios e entidades, permitindo escalabilidade e isolamento de dados entre diferentes redes de ensino.

---
**Fonte:** Análise de código e testes no diretório `i-educar-reference`.
