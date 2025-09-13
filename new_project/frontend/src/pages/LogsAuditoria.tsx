import React from "react";

const LogsAuditoria: React.FC = () => {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>Logs de Auditoria</h2>
      {/* Filtros */}
      <section style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, marginRight: 8 }}>Data Inicial:</label>
          <input type="date" style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }} />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, marginRight: 8 }}>Data Final:</label>
          <input type="date" style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }} />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, marginRight: 8 }}>Usuário:</label>
          <input type="text" placeholder="Nome ou e-mail" style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }} />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, marginRight: 8 }}>Entidade:</label>
          <input type="text" placeholder="Aluno, Usuário, etc." style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }} />
        </div>
        <button
          style={{
            marginLeft: "auto",
            background: "#1D4ED8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 18px",
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            alignSelf: "flex-end"
          }}
        >
          Exportar CSV
        </button>
      </section>

      {/* Tabela de Eventos */}
      <section>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: 10 }}>Data/Hora</th>
              <th style={{ padding: 10 }}>Usuário</th>
              <th style={{ padding: 10 }}>Ação</th>
              <th style={{ padding: 10 }}>Entidade</th>
              <th style={{ padding: 10 }}>Registro-Alvo</th>
              <th style={{ padding: 10 }}>Descrição</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 10 }}>05/06/2025 10:12</td>
              <td style={{ padding: 10 }}>ana@fronteira.mg.gov.br</td>
              <td style={{ padding: 10, color: "#10b981" }}>CREATE</td>
              <td style={{ padding: 10 }}>Aluno</td>
              <td style={{ padding: 10 }}>#1234</td>
              <td style={{ padding: 10 }}>Cadastro de novo aluno</td>
            </tr>
            <tr style={{ background: "#f3f4f6" }}>
              <td style={{ padding: 10 }}>05/06/2025 10:15</td>
              <td style={{ padding: 10 }}>joao@fronteira.mg.gov.br</td>
              <td style={{ padding: 10, color: "#f59e42" }}>UPDATE</td>
              <td style={{ padding: 10 }}>Usuário</td>
              <td style={{ padding: 10 }}>#5678</td>
              <td style={{ padding: 10 }}>Alteração de permissões</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default LogsAuditoria;
