import React from "react";
import { UserCheck, ClipboardList, BookOpen, Cloud, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, Info } from "lucide-react";

const DashboardProfessor: React.FC = () => {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <UserCheck size={22} color="#1D4ED8" />
        <div style={{ fontWeight: 700, fontSize: 20 }}>Dashboard do Professor</div>
      </div>

      {/* Seleção de Turma */}
      <section style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 600, fontSize: 16, display: "block", marginBottom: 8 }}>
          Turma
        </label>
        <select style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}>
          <option>1º Ano A</option>
          <option>2º Ano B</option>
          <option>3º Ano C</option>
        </select>
      </section>

      {/* Indicador de Conectividade e Sincronizar */}
      <section style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Cloud size={20} color="#16a34a" />
          <span style={{ fontSize: 13, color: "#16a34a" }}>Online</span>
        </span>
        <button
          style={{
            background: "#1D4ED8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <RefreshCw size={18} /> Sincronizar
        </button>
      </section>

      {/* Seletor de Data */}
      <section style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer" }}>
          <ChevronLeft size={20} color="#1D4ED8" />
        </button>
        <span style={{ fontWeight: 500 }}>05/06/2025</span>
        <button style={{ background: "none", border: "none", cursor: "pointer" }}>
          <ChevronRight size={20} color="#1D4ED8" />
        </button>
      </section>

      {/* Cards de Acesso Rápido */}
      <section style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <div style={{
          flex: 1,
          background: "#f3f4f6",
          borderRadius: 8,
          padding: 20,
          textAlign: "center",
          cursor: "pointer",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <ClipboardList size={28} color="#1D4ED8" />
          <div style={{ fontWeight: 600, marginTop: 8 }}>Chamada</div>
        </div>
        <div style={{
          flex: 1,
          background: "#f3f4f6",
          borderRadius: 8,
          padding: 20,
          textAlign: "center",
          cursor: "pointer",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <BookOpen size={28} color="#1D4ED8" />
          <div style={{ fontWeight: 600, marginTop: 8 }}>Diário de Classe</div>
        </div>
      </section>

      {/* Feedback de estado */}
      <section style={{ marginTop: 32 }}>
        <div style={{
          background: "#fef3c7",
          color: "#b45309",
          borderRadius: 6,
          padding: 12,
          fontSize: 14,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <AlertTriangle size={18} color="#f59e42" />
          <span><span style={{ fontWeight: 600 }}>Atenção:</span> Existem chamadas pendentes para sincronizar.</span>
        </div>
        <div style={{
          background: "#f3f4f6",
          color: "#222",
          borderRadius: 6,
          padding: 12,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <Info size={18} color="#1D4ED8" />
          <span><span style={{ fontWeight: 600 }}>Dica:</span> Use o botão <b>Sincronizar</b> para enviar dados offline.</span>
        </div>
      </section>
    </div>
  );
};

export default DashboardProfessor;
