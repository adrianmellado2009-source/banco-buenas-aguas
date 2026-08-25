import { useEffect, useState, useCallback } from "react";
import { Snowflake, Sun } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { formatMoney } from "../../lib/format";

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    salary_amount: 0,
    salary_frequency_days: 7,
    transfer_limit_per_tx: "",
    transfer_limit_daily: "",
  });
  const [mensaje, setMensaje] = useState(null);
  const [ajusteUsuario, setAjusteUsuario] = useState(null);
  const [ajusteCantidad, setAjusteCantidad] = useState("");
  const [ajusteMotivo, setAjusteMotivo] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsuarios(data ?? []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleCrear = async (e) => {
    e.preventDefault();
    setMensaje(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crear-usuario`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            ...form,
            transfer_limit_per_tx: form.transfer_limit_per_tx || null,
            transfer_limit_daily: form.transfer_limit_daily || null,
          }),
        }
      );
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Error creando usuario");
      setMensaje({
        tipo: "ok",
        texto: `Usuario creado. Contraseña temporal: ${json.temp_password}`,
      });
      setMostrarForm(false);
      setForm({ email: "", full_name: "", salary_amount: 0, salary_frequency_days: 7, transfer_limit_per_tx: "", transfer_limit_daily: "" });
      cargar();
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    }
  };

  const toggleEstado = async (u) => {
    const nuevo = u.status === "activa" ? "congelada" : "activa";
    const { error } = await supabase.rpc("set_estado_cuenta", { cuenta: u.id, nuevo_estado: nuevo });
    if (!error) cargar();
  };

  const handleAjuste = async (e) => {
    e.preventDefault();
    const { error } = await supabase.rpc("ajustar_saldo", {
      cuenta: ajusteUsuario.id,
      cantidad: Number(ajusteCantidad),
      motivo: ajusteMotivo || null,
    });
    if (!error) {
      setAjusteUsuario(null);
      setAjusteCantidad("");
      setAjusteMotivo("");
      cargar();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-lg bg-acento-700 px-4 py-2 text-sm font-semibold text-white hover:bg-acento-800"
        >
          {mostrarForm ? "Cancelar" : "Nuevo usuario"}
        </button>
      </div>

      {mensaje && (
        <p className={`text-sm font-medium ${mensaje.tipo === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{mensaje.texto}</p>
      )}

      {mostrarForm && (
        <form onSubmit={handleCrear} className="grid gap-3 rounded-xl2 border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <input required placeholder="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input type="number" placeholder="Salario inicial" value={form.salary_amount} onChange={(e) => setForm({ ...form, salary_amount: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input type="number" placeholder="Frecuencia salario (días)" value={form.salary_frequency_days} onChange={(e) => setForm({ ...form, salary_frequency_days: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input type="number" placeholder="Límite por transferencia" value={form.transfer_limit_per_tx} onChange={(e) => setForm({ ...form, transfer_limit_per_tx: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input type="number" placeholder="Límite diario" value={form.transfer_limit_daily} onChange={(e) => setForm({ ...form, transfer_limit_daily: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button type="submit" className="sm:col-span-2 rounded-lg bg-acento-700 py-2.5 text-sm font-semibold text-white hover:bg-acento-800">
            Crear usuario
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl2 border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Cuenta</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-3 font-medium">{u.full_name}</td>
                <td className="px-4 py-3 text-gray-400">{u.account_number}</td>
                <td className="px-4 py-3 font-mono-num">{formatMoney(u.balance)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.status === "activa" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setAjusteUsuario(u)} className="text-xs font-semibold text-acento-600">
                      Ajustar
                    </button>
                    <button onClick={() => toggleEstado(u)} className="text-gray-400 hover:text-gray-700">
                      {u.status === "activa" ? <Snowflake size={16} /> : <Sun size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ajusteUsuario && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <form onSubmit={handleAjuste} className="w-full max-w-sm space-y-3 rounded-xl2 bg-white p-5">
            <p className="text-sm font-semibold text-gray-900">Ajustar saldo de {ajusteUsuario.full_name}</p>
            <input type="number" step="0.01" required placeholder="Cantidad (+ o -)" value={ajusteCantidad} onChange={(e) => setAjusteCantidad(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Motivo (opcional)" value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAjusteUsuario(null)} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700">Cancelar</button>
              <button type="submit" className="flex-1 rounded-lg bg-acento-700 py-2 text-sm font-semibold text-white">Aplicar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
