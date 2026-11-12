import { BrowserRouter, Routes, Route } from "react-router-dom";
import Balcao from "./pages/Balcao";
import Mesa from "./pages/Mesa";
import "./App.css"; // Vamos colocar os estilos globais aqui

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota principal será a mesa dos clientes */}
        <Route path="/" element={<Mesa />} />
        {/* Rota para os atendentes/cozinha */}
        <Route path="/balcao" element={<Balcao />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
