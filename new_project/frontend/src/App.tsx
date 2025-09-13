import React from "react";
import AppRoutes from "./routes";
import { CadastroAlunoProvider } from "./context/CadastroAlunoContext";

function App() {
  return (
    <CadastroAlunoProvider>
      <AppRoutes />
    </CadastroAlunoProvider>
  );
}

export default App;
