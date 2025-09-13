import React from "react";

const Header: React.FC = () => {
  return (
    <header
      style={{
        width: "100%",
        height: 64,
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxSizing: "border-box",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Placeholder para logo */}
        <div
          style={{
            width: 36,
            height: 36,
            background: "#1D4ED8",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          PF
        </div>
        <span
          style={{
            fontWeight: 600,
            fontSize: 20,
            fontFamily: "Inter, Montserrat, Arial, sans-serif",
            color: "#222",
          }}
        >
          Gestão Educacional
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Placeholder para ícone nuvem (online/offline) */}
        <span
          title="Status de Conectividade"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "#1D4ED8",
            fontSize: 20,
          }}
        >
          <span style={{ fontSize: 22 }}>☁️</span>
          <span style={{ fontSize: 12, color: "#16a34a" }}>Online</span>
        </span>
        {/* Placeholder para perfil/logout */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            color: "#222",
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: 20 }}>👤</span>
          <span style={{ fontSize: 14 }}>Usuário</span>
          <span style={{ fontSize: 18, color: "#888" }}>⎋</span>
        </span>
      </div>
    </header>
  );
};

export default Header;
