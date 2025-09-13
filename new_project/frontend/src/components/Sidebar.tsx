import React from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BookOpen,
  ClipboardList,
  FileBarChart2,
  FileText,
  Settings,
  LogOut,
  UserCheck
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", path: "/dashboard-sme", icon: <LayoutDashboard color="#1D4ED8" size={20} /> },
  { label: "Dashboard Professor", path: "/dashboard-professor", icon: <UserCheck color="#1D4ED8" size={20} /> },
  { label: "Chamada", path: "/chamada", icon: <ClipboardList color="#1D4ED8" size={20} /> },
  { label: "Diário de Classe", path: "/diario-classe", icon: <BookOpen color="#1D4ED8" size={20} /> },
  { label: "Relatórios de Frequência", path: "/relatorios-frequencia", icon: <FileBarChart2 color="#1D4ED8" size={20} /> },
  { label: "Relatórios de Boletim", path: "/relatorios-boletim", icon: <FileText color="#1D4ED8" size={20} /> },
  { label: "Cadastro de Usuários", path: "/cadastro-usuarios", icon: <Users color="#1D4ED8" size={20} /> },
  { label: "Cadastro de Aluno", path: "/cadastro-aluno-responsavel", icon: <UserPlus color="#1D4ED8" size={20} /> },
  { label: "Logs de Auditoria", path: "/logs-auditoria", icon: <FileText color="#1D4ED8" size={20} /> },
  { label: "Configurações", path: "/configuracoes", icon: <Settings color="#1D4ED8" size={20} /> },
  { label: "Sair", path: "/", icon: <LogOut color="#1D4ED8" size={20} /> },
];

const Sidebar: React.FC = () => {
  return (
    <aside
      style={{
        width: 220,
        background: "#fff",
        borderRight: "1px solid #e5e7eb",
        height: "100vh",
        position: "fixed",
        top: 64,
        left: 0,
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        paddingTop: 16,
        boxSizing: "border-box",
      }}
    >
      {menuItems.map((item) => (
        <Link
          key={item.label}
          to={item.path}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 20px",
            textDecoration: "none",
            color: "#222",
            fontWeight: 500,
            fontSize: 16,
            borderRadius: 6,
            margin: "2px 8px",
            transition: "background 0.2s",
          }}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </aside>
  );
};

export default Sidebar;
