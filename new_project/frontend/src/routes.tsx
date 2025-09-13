import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import DashboardProfessor from "./pages/DashboardProfessor";
import DashboardSME from "./pages/DashboardSME";
import CadastroAlunoResponsavel from "./pages/CadastroAlunoResponsavel";
import CadastroUsuarios from "./pages/CadastroUsuarios";
import LogsAuditoria from "./pages/LogsAuditoria";
import RelatoriosBoletim from "./pages/RelatoriosBoletim";
import RelatoriosFrequencia from "./pages/RelatoriosFrequencia";
import MainLayout from "./components/MainLayout";
import Chamada from "./pages/Chamada";
import DiarioClasse from "./pages/DiarioClasse";
import Configuracoes from "./pages/Configuracoes";

const AppRoutes = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        element={<MainLayout />}
      >
        <Route path="/dashboard-professor" element={<DashboardProfessor />} />
        <Route path="/chamada" element={<Chamada />} />
        <Route path="/diario-classe" element={<DiarioClasse />} />
        <Route path="/dashboard-sme" element={<DashboardSME />} />
        <Route path="/cadastro-aluno-responsavel" element={<CadastroAlunoResponsavel />} />
        <Route path="/cadastro-usuarios" element={<CadastroUsuarios />} />
        <Route path="/logs-auditoria" element={<LogsAuditoria />} />
        <Route path="/relatorios-boletim" element={<RelatoriosBoletim />} />
        <Route path="/relatorios-frequencia" element={<RelatoriosFrequencia />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>
    </Routes>
  </Router>
);

export default AppRoutes;
