import React, { createContext, useContext, useState } from "react";

type Aluno = {
  nome: string;
  nascimento: string;
  rg: string;
  cpf: string;
  nis: string;
  endereco: string;
  contato: string;
  // ... outros campos
};

type Responsavel = {
  nome: string;
  parentesco: string;
  telefone: string;
  email: string;
  // ... outros campos
};

type CadastroAlunoState = {
  aluno: Partial<Aluno>;
  responsavel1: Partial<Responsavel>;
  responsavel2: Partial<Responsavel>;
  matricula: {
    anoLetivo?: string;
    serie?: string;
    turma?: string;
    turno?: string;
  };
  // ... outros passos
};

type CadastroAlunoContextType = {
  data: CadastroAlunoState;
  setData: React.Dispatch<React.SetStateAction<CadastroAlunoState>>;
  reset: () => void;
};

const defaultState: CadastroAlunoState = {
  aluno: {},
  responsavel1: {},
  responsavel2: {},
  matricula: {},
};

const CadastroAlunoContext = createContext<CadastroAlunoContextType | undefined>(undefined);

export const CadastroAlunoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<CadastroAlunoState>(defaultState);

  const reset = () => setData(defaultState);

  return (
    <CadastroAlunoContext.Provider value={{ data, setData, reset }}>
      {children}
    </CadastroAlunoContext.Provider>
  );
};

export const useCadastroAluno = () => {
  const ctx = useContext(CadastroAlunoContext);
  if (!ctx) throw new Error("useCadastroAluno deve ser usado dentro de CadastroAlunoProvider");
  return ctx;
};
