import React, { useState } from "react";
import {
  Calendar,
  FileText,
  Edit,
  Eye,
  Send,
  PlusCircle,
  CheckCircle,
  Clock
} from "lucide-react";

const diasMock = [
  { data: "2025-06-03", status: "enviado", conteudo: "Matemática: Frações", atividades: "Exercícios em grupo", observacoes: "Turma participativa" },
  { data: "2025-06-04", status: "rascunho", conteudo: "Português: Interpretação de texto", atividades: "Leitura coletiva", observacoes: "Dois alunos dispersos" },
  { data: "2025-06-05", status: "aberto", conteudo: "", atividades: "", observacoes: "" }
];

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const DiarioClasse: React.FC = () => {
  const [diaSelecionado, setDiaSelecionado] = useState("2025-06-05");

  const diarioDia = diasMock.find(d => d.data === diaSelecionado);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Calendar size={22} color="#1D4ED8" />
        <div style={{ fontWeight: 700, fontSize: 20 }}>Diário de Classe</div>
      </div>

      {/* Calendário mock */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 18,
        flexWrap: "wrap"
      }}>
        {diasMock.map(dia => (
          <button
            key={dia.data}
            onClick={() => setDiaSelecionado(dia.data)}
            style={{
              background: diaSelecionado === dia.data ? "#1D4ED8" : "#f3f4f6",
              color: diaSelecionado === dia.data ? "#fff" : "#222",
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: diaSelecionado === dia.data ? "0 2px 8px #1d4ed81a" : undefined
            }}
          >
            {dia.status === "enviado" && <CheckCircle size={18} color="#10b981" />}
            {dia.status === "rascunho" && <Clock size={18} color="#f59e42" />}
            {dia.status === "aberto" && <PlusCircle size={18} color="#1D4ED8" />}
            {formatarData(dia.data)}
          </button>
        ))}
      </div>

      {/* Detalhe do diário do dia selecionado */}
      <div style={{
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        padding: 18,
        marginBottom: 18
      }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
          {formatarData(diaSelecionado)}
        </div>
        {diarioDia?.status === "enviado" && (
          <div style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <CheckCircle size={18} /> Diário enviado
          </div>
        )}
        {diarioDia?.status === "rascunho" && (
          <div style={{ color: "#f59e42", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Clock size={18} /> Rascunho (pode editar)
          </div>
        )}
        {diarioDia?.status === "aberto" && (
          <div style={{ color: "#1D4ED8", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <PlusCircle size={18} /> Novo diário
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>Conteúdo Ministrado</div>
          <div style={{
            minHeight: 32,
            background: "#f3f4f6",
            borderRadius: 6,
            padding: 8,
            fontSize: 15
          }}>{diarioDia?.conteudo || <span style={{ color: "#bbb" }}>Não preenchido</span>}</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>Atividades Planejadas</div>
          <div style={{
            minHeight: 32,
            background: "#f3f4f6",
            borderRadius: 6,
            padding: 8,
            fontSize: 15
          }}>{diarioDia?.atividades || <span style={{ color: "#bbb" }}>Não preenchido</span>}</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>Observações/Comportamento</div>
          <div style={{
            minHeight: 32,
            background: "#f3f4f6",
            borderRadius: 6,
            padding: 8,
            fontSize: 15
          }}>{diarioDia?.observacoes || <span style={{ color: "#bbb" }}>Não preenchido</span>}</div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {diarioDia?.status === "aberto" && (
            <button style={{
              background: "#1D4ED8",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontWeight: 600,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer"
            }}>
              <Send size={18} /> Enviar Diário
            </button>
          )}
          {diarioDia?.status === "rascunho" && (
            <>
              <button style={{
                background: "#1D4ED8",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 600,
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer"
              }}>
                <Edit size={18} /> Editar
              </button>
              <button style={{
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 600,
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer"
              }}>
                <Send size={18} /> Enviar Diário
              </button>
            </>
          )}
          {diarioDia?.status === "enviado" && (
            <button style={{
              background: "#f3f4f6",
              color: "#1D4ED8",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontWeight: 600,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer"
            }}>
              <Eye size={18} /> Visualizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiarioClasse;
