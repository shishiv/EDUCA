import React from "react";

const Configuracoes: React.FC = () => {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>Configurações Gerais</h2>
      {/* Parâmetros Gerais */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Calendário Escolar</div>
        <label style={{ fontWeight: 500, fontSize: 15, display: "block", marginBottom: 6 }}>
          Datas de Feriados/Recessos
        </label>
        <input
          type="text"
          placeholder="Ex: 01/01/2025, 15/02/2025, ..."
          style={{
            width: "100%",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            padding: 10,
            fontSize: 15,
            marginBottom: 16,
          }}
        />
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Definição de Turnos</div>
        <label style={{ fontWeight: 500, fontSize: 15, display: "block", marginBottom: 6 }}>
          Turnos Disponíveis
        </label>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <label><input type="checkbox" defaultChecked /> Manhã</label>
          <label><input type="checkbox" defaultChecked /> Tarde</label>
          <label><input type="checkbox" /> Integral</label>
        </div>
      </section>
      {/* Botões */}
      <div style={{ display: "flex", gap: 16 }}>
        <button
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
          Salvar Configurações
        </button>
        <button
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
        >
          Restaurar Padrão
        </button>
      </div>
    </div>
  );
};

export default Configuracoes;
