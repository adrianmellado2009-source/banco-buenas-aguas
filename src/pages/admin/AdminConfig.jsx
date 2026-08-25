import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function AdminConfig() {
  const [savings, setSavings] = useState(null);
  const [app, setApp] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    supabase.from("savings_config").select("*").eq("id", 1).single().then(({ data }) => setSavings(data));
    supabase.from("app_config").select("*").eq("id", 1).single().then(({ data }) => setApp(data));
  }, []);

  const guardarSavings = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("savings_config")
      .update({
        interest_rate: Number(savings.interest_rate),
        frequency_days: Number(savings.frequency_days),
        active: savings.active,
      })
      .eq("id", 1);
    setMensaje(error ? { tipo: "error", texto: error.message } : { tipo: "ok", texto: "Configuración de ahorro guardada." });
  };

  const guardarApp = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("app_config")
      .update({
        default_transfer_limit_per_tx: Number(app.default_transfer_limit_per_tx),
        default_transfer_limit_daily: Number(app.default_transfer_limit_daily),
      })
      .eq("id", 1);
    setMensaje(error ? { tipo: "error", texto: error.message } : { tipo: "ok", texto: "Límites por defecto guardados." });
  };

  if (!savings || !app) return <p className="text-sm text-gray-400">Cargando…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>

      {mensaje && <p className={`text-sm font-medium ${mensaje.tipo === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{mensaje.texto}</p>}

      <form onSubmit={guardarSavings} className="space-y-3 rounded-xl2 border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900">Ahorro global</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Tasa de interés (%)</label>
            <input type="number" step="0.1" value={savings.interest_rate} onChange={(e) => setSavings({ ...savings, interest_rate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Frecuencia (días)</label>
            <input type="number" value={savings.frequency_days} onChange={(e) => setSavings({ ...savings, frequency_days: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={savings.active} onChange={(e) => setSavings({ ...savings, active: e.target.checked })} />
          Activo
        </label>
        <button type="submit" className="rounded-lg bg-acento-700 px-4 py-2 text-sm font-semibold text-white hover:bg-acento-800">Guardar</button>
      </form>

      <form onSubmit={guardarApp} className="space-y-3 rounded-xl2 border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900">Límites por defecto para nuevos usuarios</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Límite por transferencia</label>
            <input type="number" value={app.default_transfer_limit_per_tx} onChange={(e) => setApp({ ...app, default_transfer_limit_per_tx: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Límite diario</label>
            <input type="number" value={app.default_transfer_limit_daily} onChange={(e) => setApp({ ...app, default_transfer_limit_daily: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button type="submit" className="rounded-lg bg-acento-700 px-4 py-2 text-sm font-semibold text-white hover:bg-acento-800">Guardar</button>
      </form>
    </div>
  );
}
