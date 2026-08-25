import { Routes, Route } from "react-router-dom";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transferir from "./pages/Transferir";
import Historial from "./pages/Historial";
import Prestamos from "./pages/Prestamos";
import Ahorro from "./pages/Ahorro";
import Tarjeta from "./pages/Tarjeta";
import Perfil from "./pages/Perfil";
import AdminPanel from "./pages/admin/AdminPanel";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminImpuestos from "./pages/admin/AdminImpuestos";
import AdminPrestamos from "./pages/admin/AdminPrestamos";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminTransacciones from "./pages/admin/AdminTransacciones";

function withLayout(el) {
  return <Layout>{el}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={withLayout(<Dashboard />)} />
        <Route path="/transferir" element={withLayout(<Transferir />)} />
        <Route path="/historial" element={withLayout(<Historial />)} />
        <Route path="/prestamos" element={withLayout(<Prestamos />)} />
        <Route path="/ahorro" element={withLayout(<Ahorro />)} />
        <Route path="/tarjeta" element={withLayout(<Tarjeta />)} />
        <Route path="/perfil" element={withLayout(<Perfil />)} />

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={withLayout(<AdminPanel />)} />
          <Route path="/admin/usuarios" element={withLayout(<AdminUsuarios />)} />
          <Route path="/admin/impuestos" element={withLayout(<AdminImpuestos />)} />
          <Route path="/admin/prestamos" element={withLayout(<AdminPrestamos />)} />
          <Route path="/admin/config" element={withLayout(<AdminConfig />)} />
          <Route path="/admin/transacciones" element={withLayout(<AdminTransacciones />)} />
        </Route>
      </Route>
    </Routes>
  );
}
