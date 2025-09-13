import React from "react";

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

const turmasMock = [
  { escola: "Escola Municipal Poliana Ziza Ferreira", turno: "Manhã", turma: "1º Ano A", alunos: 28 },
  { escola: "Escola Municipal Poliana Ziza Ferreira", turno: "Tarde", turma: "2º Ano B", alunos: 30 },
  { escola: "CMEI – Dona Alice", turno: "Integral", turma: "Maternal I", alunos: 15 }
];

const RelatoriosBoletim: React.FC = () => {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      {/* Filtros */}
      <section style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, marginRight: 8 }}>Período:</label>
          <select style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }}>
            <option>Bimestre 1</option>
            <option>Bimestre 2</option>
            <option>Semestre 1</option>
          </select>
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, marginRight: 8 }}>Escola:</label>
          <select style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }}>
            <option>Todos</option>
            {escolas.map((e, idx) => (
              <option key={idx}>{e.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, marginRight: 8 }}>Turno:</label>
          <select style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }}>
            <option>Todos</option>
            {[...new Set(escolas.flatMap(e => e.turnos))].map((turno, idx) => (
              <option key={idx}>{turno}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Lista de Turmas */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>Turmas</div>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: 10, textAlign: "left" }}>Escola</th>
              <th style={{ padding: 10 }}>Turno</th>
              <th style={{ padding: 10 }}>Turma</th>
              <th style={{ padding: 10 }}>Alunos</th>
              <th style={{ padding: 10 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmasMock.map((t, idx) => (
              <tr key={idx}>
                <td style={{ padding: 10 }}>{t.escola}</td>
                <td style={{ padding: 10 }}>{t.turno}</td>
                <td style={{ padding: 10 }}>{t.turma}</td>
                <td style={{ padding: 10 }}>{t.alunos}</td>
                <td style={{ padding: 10 }}>
                  <button style={{
                    background: "#1D4ED8",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontWeight: 600,
                    fontSize: 15,
                    marginRight: 8,
                    cursor: "pointer"
                  }}>Visualizar</button>
                  <button style={{
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontWeight: 600,
                    fontSize: 15,
                    marginRight: 8,
                    cursor: "pointer"
                  }}>Exportar PDF</button>
                  <button style={{
                    background: "#f59e42",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: "pointer"
                  }}>Enviar E-mail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Modal/Página de Boletim (placeholder) */}
      <section>
        <div style={{
          background: "#f3f4f6",
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          color: "#888",
          border: "1px solid #e5e7eb"
        }}>
          <svg width="48" height="32" viewBox="0 0 48 32" fill="none" style={{ display: "block", margin: "0 auto" }}>
            <rect x="4" y="16" width="6" height="12" rx="2" fill="#d1d5db"/>
            <rect x="14" y="8" width="6" height="20" rx="2" fill="#93c5fd"/>
            <rect x="24" y="4" width="6" height="24" rx="2" fill="#1D4ED8"/>
            <rect x="34" y="12" width="6" height="16" rx="2" fill="#60a5fa"/>
          </svg>
          <div style={{ marginTop: 8 }}>Tabela de Alunos x Disciplinas (placeholder)</div>
        </div>
      </section>
    </div>
  );
};

export default RelatoriosBoletim;
