import React, { useState } from "react";

const escolas = [
  {
    nome: "Escola Municipal Poliana Ziza Ferreira",
    turnos: ["Manhã", "Tarde"]
  },
  {
    nome: "Escola Municipal José Maria Basto Garcia (Antiga – ABC)",
    turnos: ["Manhã", "Tarde"]
  },
  {
    nome: "Escola Municipal Marechal Castelo Branco",
    turnos: ["Manhã", "Tarde"]
  },
  {
    nome: "PEM Turma da Mônica",
    turnos: ["Manhã", "Tarde"]
  },
  {
    nome: "EMEI Maísa Ferreira Passuelo Vasconcelos",
    turnos: ["Manhã", "Tarde"]
  },
  {
    nome: "CMEI – Dona Alice",
    turnos: ["Integral"]
  },
  {
    nome: "CMEI – Dona Belinha",
    turnos: ["Manhã", "Tarde"]
  },
  {
    nome: "CMEI – Dona Mençora",
    turnos: ["Manhã", "Tarde"]
  },
  {
    nome: "CMEI – Santo Antônio",
    turnos: ["Manhã", "Tarde"]
  }
];

const steps = [
  "Dados do Aluno",
  "Responsável 1",
  "Responsável 2 (opcional)",
  "Matrícula",
  "Resumo"
];

const CadastroAlunoResponsavel: React.FC = () => {
  const [step, setStep] = useState(0);
  const [selectedEscola, setSelectedEscola] = useState("");
  const [selectedTurno, setSelectedTurno] = useState("");

  const turnosDisponiveis = selectedEscola
    ? escolas.find(e => e.nome === selectedEscola)?.turnos || []
    : [];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>Cadastro de Aluno/Responsável</h2>
      {/* Wizard Steps */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {steps.map((s, idx) => (
          <div
            key={s}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              background: idx === step ? "#1D4ED8" : "#f3f4f6",
              color: idx === step ? "#fff" : "#222",
              fontWeight: 600,
              fontSize: 15
            }}
          >
            {s}
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 24, fontWeight: 500 }}>Etapa {step + 1} de 5</div>
      {/* Formulário por etapa */}
      {step === 0 && (
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Nome Completo
          </label>
          <input type="text" placeholder="Nome do aluno" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Data de Nascimento
          </label>
          <input type="date" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            RG/CPF
          </label>
          <input type="text" placeholder="RG ou CPF" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            NIS/PIS
          </label>
          <input type="text" placeholder="NIS ou PIS" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Endereço
          </label>
          <input type="text" placeholder="Endereço completo" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Contato
          </label>
          <input type="text" placeholder="Telefone ou e-mail" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
        </div>
      )}
      {step === 1 && (
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Nome do Responsável 1
          </label>
          <input type="text" placeholder="Nome completo" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Parentesco
          </label>
          <input type="text" placeholder="Ex: Mãe, Pai, Avó" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Telefone
          </label>
          <input type="text" placeholder="Telefone" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            E-mail
          </label>
          <input type="email" placeholder="E-mail" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
        </div>
      )}
      {step === 2 && (
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Nome do Responsável 2 (opcional)
          </label>
          <input type="text" placeholder="Nome completo" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Parentesco
          </label>
          <input type="text" placeholder="Ex: Tio, Avó" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Telefone
          </label>
          <input type="text" placeholder="Telefone" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            E-mail
          </label>
          <input type="email" placeholder="E-mail" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
        </div>
      )}
      {step === 3 && (
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Ano Letivo
          </label>
          <input type="text" placeholder="2025" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Série
          </label>
          <input type="text" placeholder="Ex: 1º Ano" style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }} />
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Escola
          </label>
          <select
            value={selectedEscola}
            onChange={e => { setSelectedEscola(e.target.value); setSelectedTurno(""); }}
            style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }}
          >
            <option value="">Selecione</option>
            {escolas.map((e, idx) => (
              <option key={idx} value={e.nome}>{e.nome}</option>
            ))}
          </select>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Turno
          </label>
          <select
            value={selectedTurno}
            onChange={e => setSelectedTurno(e.target.value)}
            style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 10, fontSize: 15, marginBottom: 16 }}
            disabled={!selectedEscola}
          >
            <option value="">Selecione</option>
            {turnosDisponiveis.map((t, idx) => (
              <option key={idx} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}
      {step === 4 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Resumo dos Dados (mock)</div>
          <div style={{ background: "#f3f4f6", borderRadius: 6, padding: 16, marginBottom: 16 }}>
            <div>Nome: Lorem Ipsum</div>
            <div>Escola: {selectedEscola || "Mock"}</div>
            <div>Turno: {selectedTurno || "Mock"}</div>
            <div>Ano/Série: 2025 / 1º Ano</div>
          </div>
        </div>
      )}
      {/* Navegação Wizard */}
      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <button
          type="button"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          style={{
            background: "#f3f4f6",
            color: "#222",
            border: "none",
            borderRadius: 6,
            padding: "12px 32px",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer"
          }}
          disabled={step === 0}
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={() => setStep(s => Math.min(4, s + 1))}
          style={{
            background: "#1D4ED8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "12px 32px",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer"
          }}
          disabled={step === 4}
        >
          Próximo
        </button>
        {step === 4 && (
          <button
            type="button"
            style={{
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "12px 32px",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer"
            }}
          >
            Salvar
          </button>
        )}
      </div>
    </div>
  );
};

export default CadastroAlunoResponsavel;
