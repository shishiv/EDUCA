import React from "react";

const escolas = [
  "Escola Municipal Poliana Ziza Ferreira",
  "Escola Municipal José Maria Basto Garcia (Antiga – ABC)",
  "Escola Municipal Marechal Castelo Branco",
  "PEM Turma da Mônica",
  "EMEI Maísa Ferreira Passuelo Vasconcelos",
  "CMEI – Dona Alice",
  "CMEI – Dona Belinha",
  "CMEI – Dona Mençora",
  "CMEI – Santo Antônio"
];

const CadastroUsuarios: React.FC = () => {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>Cadastro de Usuários</h2>
      <form>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Nome
          </label>
          <input
            type="text"
            placeholder="Nome completo"
            style={{
              width: "100%",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              padding: 10,
              fontSize: 15
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            E-mail
          </label>
          <input
            type="email"
            placeholder="usuario@fronteira.mg.gov.br"
            style={{
              width: "100%",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              padding: 10,
              fontSize: 15
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Disciplina (para professores)
          </label>
          <input
            type="text"
            placeholder="Ex: Matemática"
            style={{
              width: "100%",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              padding: 10,
              fontSize: 15
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Escola Vinculada
          </label>
          <select
            style={{
              width: "100%",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              padding: 10,
              fontSize: 15
            }}
          >
            <option value="">Selecione</option>
            {escolas.map((e, idx) => (
              <option key={idx} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 6 }}>
            Permissões
          </label>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label><input type="checkbox" /> Professor</label>
            <label><input type="checkbox" /> Diretor</label>
            <label><input type="checkbox" /> Secretária Escola</label>
            <label><input type="checkbox" /> SME</label>
            <label><input type="checkbox" /> Admin TI</label>
          </div>
        </div>
        <button
          type="submit"
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
        >
          Enviar Convite
        </button>
      </form>
    </div>
  );
};

export default CadastroUsuarios;
