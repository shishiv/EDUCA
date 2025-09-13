import React from "react";

const escolas = [
  {
    nome: "Escola Municipal Poliana Ziza Ferreira",
    diretora: "Edilaine Fernandes de Freitas",
    endereco: "Avenida Aurélio Luiz Mistieri, Nº 370, Centro",
    telefone: "(34) 3199-9786",
    email: "escolapoliana.educacao@fronteira.mg.gov.br",
    turnos: [
      { nome: "Manhã", horario: "7:00 às 11:20", turmas: 8, chamadas: "95%", alunos: 210 },
      { nome: "Tarde", horario: "13:00 às 17:20", turmas: 7, chamadas: "92%", alunos: 180 }
    ]
  },
  {
    nome: "Escola Municipal José Maria Basto Garcia (Antiga – ABC)",
    diretora: "Liliane Carvalho do Carmo",
    endereco: "Rua Abdo Jauid Feres Nº 150, Jardim Ângelo Passuelo",
    telefone: "(34) 3199-9852",
    email: "escolajosemaria.educacao@fronteira.mg.gov.br",
    turnos: [
      { nome: "Manhã", horario: "7:00 às 11:20", turmas: 6, chamadas: "90%", alunos: 150 },
      { nome: "Tarde", horario: "13:00 às 17:20", turmas: 5, chamadas: "88%", alunos: 120 }
    ]
  },
  {
    nome: "Escola Municipal Marechal Castelo Branco",
    diretora: "Juliana Rodrigues de Andrade",
    endereco: "Rua Godofredo Antônio da Costa, S/N, Distrito de Santo Antônio do Rio Grande – Lagoa Seca",
    telefone: "(34) 3199-9856",
    email: "escolamarechal.educacao@fronteira.mg.gov.br",
    turnos: [
      { nome: "Manhã", horario: "7:00 às 11:20", turmas: 3, chamadas: "93%", alunos: 60 },
      { nome: "Tarde", horario: "13:00 às 17:20", turmas: 2, chamadas: "91%", alunos: 40 }
    ]
  },
  {
    nome: "PEM Turma da Mônica",
    diretora: "Márcia Lúcia da Silva",
    endereco: "Rua Higino Florêncio de Souza, Nº 430, Vila de Furnas",
    telefone: "(34) 3199-9785",
    email: "preturmadamonica.educacao@fronteira.mg.gov.br",
    turnos: [
      { nome: "Manhã", horario: "7:00 às 11:20", turmas: 2, chamadas: "97%", alunos: 35 },
      { nome: "Tarde", horario: "13:00 às 17:20", turmas: 2, chamadas: "96%", alunos: 32 }
    ]
  },
  {
    nome: "EMEI Maísa Ferreira Passuelo Vasconcelos",
    diretora: "Roselane dos Santos Carvalho",
    endereco: "Avenida Brasil, Nº 220, Vila de Furnas",
    telefone: "(34) 3199-9854",
    email: "emeimaisa.educacao@fronteira.mg.gov.br",
    turnos: [
      { nome: "Manhã", horario: "7:00 às 11:20", turmas: 2, chamadas: "98%", alunos: 30 },
      { nome: "Tarde", horario: "13:00 às 17:20", turmas: 2, chamadas: "97%", alunos: 28 }
    ]
  },
  {
    nome: "CMEI – Dona Alice",
    diretora: "Yasmim Ismael Póvoa",
    endereco: "Rua Miguel José Miziara, Nº 242, COHAB",
    telefone: "",
    email: "cmeialice.educacao@fronteira.mg.gov.br",
    turnos: [
      { nome: "Integral", horario: "07:00 às 17:00", turmas: 3, chamadas: "99%", alunos: 45 }
    ]
  },
  {
    nome: "CMEI – Dona Belinha",
    diretora: "Luany Jerônimo de Oliveira",
    endereco: "Avenida Liberdade, Nº 1480, Vila Reis",
    telefone: "(34) 3199-9851",
    email: "cmeibelinha.educacao@fronteira.mg.gov.br",
    turnos: [
      { nome: "Manhã", horario: "7:00 às 11:20", turmas: 2, chamadas: "97%", alunos: 30 },
      { nome: "Tarde", horario: "13:00 às 17:20", turmas: 2, chamadas: "96%", alunos: 28 }
    ]
  },
  {
    nome: "CMEI – Dona Mençora",
    diretora: "Eliane Aparecida Ferraz Vieira de Souza",
    endereco: "Rua Campo Florido, Nº 390, Jardim Ângelo Passuelo",
    telefone: "(34) 3199-9853",
    email: "cmeimencora.educacao@fronteira.mg.gov.br",
    turnos: [
      { nome: "Manhã", horario: "7:00 às 11:20", turmas: 2, chamadas: "98%", alunos: 28 },
      { nome: "Tarde", horario: "13:00 às 17:20", turmas: 2, chamadas: "97%", alunos: 26 }
    ]
  },
  {
    nome: "CMEI – Santo Antônio",
    diretora: "Luciene Santos Francelino",
    endereco: "Rua Godofredo Antônio da Costa, Nº 62, Distrito Santo Antônio do Rio Grande",
    telefone: "(34) 3199-9855",
    email: "cmeisantoantonio.educacao@fronteira.mg.gov.br",
    turnos: [
      { nome: "Manhã", horario: "7:00 às 11:20", turmas: 1, chamadas: "99%", alunos: 15 },
      { nome: "Tarde", horario: "13:00 às 17:30", turmas: 1, chamadas: "98%", alunos: 13 }
    ]
  }
];

const DashboardSME: React.FC = () => {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      {/* Banner/Filtros rápidos */}
      <section style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, marginRight: 8 }}>Período:</label>
          <input type="month" style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }} />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15, marginRight: 8 }}>Escola/Turno:</label>
          <select style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }}>
            <option>Todos</option>
            {escolas.map((e, idx) => (
              <option key={idx}>{e.nome}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Cards de KPI */}
      <section style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <div style={{
          flex: "1 1 200px",
          background: "#f3f4f6",
          borderRadius: 8,
          padding: 24,
          minWidth: 200,
          textAlign: "center",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>1200</div>
          <div style={{ fontWeight: 600, marginTop: 8 }}>Alunos Cadastrados</div>
          <a href="/cadastro-aluno-responsavel" style={{
            display: "inline-block",
            marginTop: 12,
            background: "#1D4ED8",
            color: "#fff",
            borderRadius: 6,
            padding: "6px 14px",
            fontWeight: 600,
            fontSize: 15,
            textDecoration: "none"
          }}>
            Novo Cadastro
          </a>
        </div>
        <div style={{
          flex: "1 1 200px",
          background: "#f3f4f6",
          borderRadius: 8,
          padding: 24,
          minWidth: 200,
          textAlign: "center",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>98</div>
          <div style={{ fontWeight: 600, marginTop: 8 }}>Professores Ativos</div>
          <a href="/cadastro-usuarios" style={{
            display: "inline-block",
            marginTop: 12,
            background: "#1D4ED8",
            color: "#fff",
            borderRadius: 6,
            padding: "6px 14px",
            fontWeight: 600,
            fontSize: 15,
            textDecoration: "none"
          }}>
            Novo Usuário
          </a>
        </div>
        <div style={{
          flex: "1 1 200px",
          background: "#f3f4f6",
          borderRadius: 8,
          padding: 24,
          minWidth: 200,
          textAlign: "center",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#f59e42" }}>12</div>
          <div style={{ fontWeight: 600, marginTop: 8 }}>Chamadas Pendentes</div>
        </div>
        <div style={{
          flex: "1 1 200px",
          background: "#f3f4f6",
          borderRadius: 8,
          padding: 24,
          minWidth: 200,
          textAlign: "center",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>32</div>
          <div style={{ fontWeight: 600, marginTop: 8 }}>Boletins Gerados</div>
        </div>
      </section>

      {/* Tabela Resumida */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>Resumo por Escola/Turno</div>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: 10, textAlign: "left" }}>Escola</th>
              <th style={{ padding: 10 }}>Diretora</th>
              <th style={{ padding: 10 }}>Turno</th>
              <th style={{ padding: 10 }}>Nº Turmas</th>
              <th style={{ padding: 10 }}>% Chamadas</th>
              <th style={{ padding: 10 }}>Alunos Presentes</th>
              <th style={{ padding: 10 }}>Contato</th>
            </tr>
          </thead>
          <tbody>
            {escolas.map((e, idx) =>
              e.turnos.map((t, tIdx) => (
                <tr key={e.nome + t.nome}>
                  <td style={{ padding: 10 }}>{e.nome}</td>
                  <td style={{ padding: 10 }}>{e.diretora}</td>
                  <td style={{ padding: 10 }}>{t.nome}</td>
                  <td style={{ padding: 10 }}>{t.turmas}</td>
                  <td style={{ padding: 10 }}>{t.chamadas}</td>
                  <td style={{ padding: 10 }}>{t.alunos}</td>
                  <td style={{ padding: 10 }}>
                    <div>{e.telefone}</div>
                    <div style={{ fontSize: 13 }}>{e.email}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Gráfico Placeholder */}
      <section>
        <div style={{
          background: "#f3f4f6",
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          color: "#888",
          border: "1px solid #e5e7eb"
        }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <div style={{ marginTop: 8 }}>Gráfico de Frequência Agregada (placeholder)</div>
        </div>
      </section>
    </div>
  );
};

export default DashboardSME;
