import React, { useState } from "react";
import { CheckCircle, XCircle, User, Search, FileText } from "lucide-react";

const alunosMock = [
  { id: 1, nome: "Ana Beatriz Silva", avatar: "", presente: true, justificado: false },
  { id: 2, nome: "Bruno Costa", avatar: "", presente: false, justificado: false },
  { id: 3, nome: "Carlos Eduardo", avatar: "", presente: true, justificado: false },
  { id: 4, nome: "Daniela Souza", avatar: "", presente: false, justificado: true },
  { id: 5, nome: "Eduarda Lima", avatar: "", presente: true, justificado: false },
  { id: 6, nome: "Fernanda Alves", avatar: "", presente: true, justificado: false },
  { id: 7, nome: "Gabriel Martins", avatar: "", presente: false, justificado: false },
  { id: 8, nome: "Helena Rocha", avatar: "", presente: true, justificado: false },
  { id: 9, nome: "Isabela Ferreira", avatar: "", presente: true, justificado: false },
  { id: 10, nome: "João Pedro", avatar: "", presente: false, justificado: false }
];

const turmaInfo = {
  nome: "1º Ano A",
  turno: "Manhã",
  professor: "Prof. Lucas Andrade",
  data: "05/06/2025"
};

const Chamada: React.FC = () => {
  const [alunos, setAlunos] = useState(alunosMock);
  const [busca, setBusca] = useState("");

  const presentes = alunos.filter(a => a.presente).length;
  const total = alunos.length;

  const marcarPresenca = (id: number, presente: boolean) => {
    setAlunos(alunos =>
      alunos.map(a =>
        a.id === id ? { ...a, presente, justificado: presente ? false : a.justificado } : a
      )
    );
  };

  const justificarFalta = (id: number) => {
    setAlunos(alunos =>
      alunos.map(a =>
        a.id === id ? { ...a, justificado: true, presente: false } : a
      )
    );
  };

  const alunosFiltrados = alunos.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 16 }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{turmaInfo.nome} <span style={{ fontWeight: 400, fontSize: 15, color: "#666" }}>({turmaInfo.turno})</span></div>
        <div style={{ fontSize: 15, color: "#444" }}>{turmaInfo.professor}</div>
        <div style={{ fontSize: 15, color: "#444" }}>Data: {turmaInfo.data}</div>
        <div style={{ marginTop: 6, fontSize: 15 }}>
          <span style={{
            background: "#1D4ED8",
            color: "#fff",
            borderRadius: 12,
            padding: "2px 12px",
            fontWeight: 600,
            fontSize: 15
          }}>
            {presentes} de {total} presentes
          </span>
        </div>
      </div>

      {/* Busca */}
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Search size={18} color="#888" />
        <input
          type="text"
          placeholder="Buscar aluno..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 15
          }}
        />
      </div>

      {/* Lista de alunos */}
      <div style={{
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        overflow: "hidden"
      }}>
        {alunosFiltrados.map(aluno => (
          <div
            key={aluno.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 8px",
              borderBottom: "1px solid #f3f4f6",
              background: aluno.presente ? "#f0f9ff" : aluno.justificado ? "#fef3c7" : "#fff"
            }}
          >
            <div style={{ marginRight: 12 }}>
              <User size={28} color="#1D4ED8" style={{ background: "#e0e7ff", borderRadius: "50%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{aluno.nome}</div>
              {!aluno.presente && aluno.justificado && (
                <div style={{ fontSize: 13, color: "#f59e42", display: "flex", alignItems: "center", gap: 4 }}>
                  <FileText size={14} /> Falta justificada
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => marcarPresenca(aluno.id, true)}
                style={{
                  background: aluno.presente ? "#1D4ED8" : "#f3f4f6",
                  color: aluno.presente ? "#fff" : "#1D4ED8",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer"
                }}
                aria-label="Marcar presente"
              >
                <CheckCircle size={20} />
              </button>
              <button
                onClick={() => marcarPresenca(aluno.id, false)}
                style={{
                  background: !aluno.presente && !aluno.justificado ? "#ef4444" : "#f3f4f6",
                  color: !aluno.presente && !aluno.justificado ? "#fff" : "#ef4444",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer"
                }}
                aria-label="Marcar ausente"
              >
                <XCircle size={20} />
              </button>
              {!aluno.presente && !aluno.justificado && (
                <button
                  onClick={() => justificarFalta(aluno.id)}
                  style={{
                    background: "#f59e42",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                  aria-label="Justificar falta"
                >
                  Justificar
                </button>
              )}
            </div>
          </div>
        ))}
        {alunosFiltrados.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#888" }}>Nenhum aluno encontrado.</div>
        )}
      </div>

      {/* Sticky footer */}
      <div style={{
        position: "sticky",
        bottom: 0,
        background: "#fff",
        padding: "16px 0 0 0",
        marginTop: 18
      }}>
        <button
          style={{
            width: "100%",
            background: "#1D4ED8",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 0",
            fontWeight: 700,
            fontSize: 17,
            boxShadow: "0 2px 8px #1d4ed81a",
            cursor: "pointer"
          }}
        >
          Salvar Chamada
        </button>
      </div>
    </div>
  );
};

export default Chamada;
