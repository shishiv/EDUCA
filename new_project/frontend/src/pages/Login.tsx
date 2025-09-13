import React, { useState } from "react";
import { Mail, Lock, LogIn, AlertCircle, UserPlus } from "lucide-react";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock de validação
    if (!email.endsWith("@fronteira.mg.gov.br") || senha.length < 4) {
      setErro("Usuário ou senha incorretos");
    } else {
      setErro("");
      // Redirecionar ou autenticar
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: 24
    }}>
      <div style={{
        width: "100%",
        maxWidth: 340,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 16px #1d4ed81a",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <img src="/logo-prefeitura.png" alt="Prefeitura de Fronteira" style={{ width: 72, marginBottom: 8 }} />
        <div style={{ fontWeight: 700, fontSize: 22, color: "#1D4ED8", marginBottom: 18 }}>Gestão Educacional</div>
        <form style={{ width: "100%" }} onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="email" style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 4 }}>E-mail institucional</label>
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "#f3f4f6",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              padding: "6px 10px"
            }}>
              <Mail size={18} color="#1D4ED8" style={{ marginRight: 8 }} />
              <input
                id="email"
                type="email"
                placeholder="usuario@fronteira.mg.gov.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 15,
                  flex: 1
                }}
                autoComplete="username"
              />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label htmlFor="senha" style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 4 }}>Senha</label>
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "#f3f4f6",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              padding: "6px 10px"
            }}>
              <Lock size={18} color="#1D4ED8" style={{ marginRight: 8 }} />
              <input
                id="senha"
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 15,
                  flex: 1
                }}
                autoComplete="current-password"
              />
            </div>
          </div>
          {erro && (
            <div style={{
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              margin: "8px 0 0 0"
            }}>
              <AlertCircle size={16} /> {erro}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              background: "#1D4ED8",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 0",
              fontWeight: 700,
              fontSize: 16,
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer"
            }}
          >
            <LogIn size={18} /> Entrar
          </button>
        </form>
        <div style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          marginTop: 18,
          fontSize: 14
        }}>
          <a href="#" style={{ color: "#1D4ED8", textDecoration: "none" }}>Esqueci minha senha</a>
          <a href="#" style={{ color: "#1D4ED8", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <UserPlus size={16} /> Criar conta
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
