import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { formatDate, formatMoney } from "../../lib/format";

export default function AdminImpuestos() {
  const [taxes, setTaxes] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "recurrente", mode: "porcentaje", value: "", frequency_days: 7 });
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("taxes").select("*").order("created_at", { ascending: false });
    setTaxes(data ?? []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("taxes").insert({
      name: form.name,
      kind: form.kind,
      mode: form.mode,
      value: Number(form.value),
      frequency_days: form.kind === "recurrente" ? Number(form.frequency_days) : null,
      target: "todos",
    });
    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
    } else {
      setMensaje({ tipo: "ok", texto: "Impuesto creado." });
      setMostrarForm(false);
      setForm({ name: "", kind: "recurrente", mode: "porcentaje", value: "", frequency_days: 7 });
      cargar();
    }
  };

  const cobrarAhora = async (id) => {
    const { error } = await supabase.rpc("aplicar_impuesto", { tax_id: id });
    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
    } else {
      setMensaje({ tipo: "ok", texto: "Impuesto aplicado a todas las cuentas objetivo." });
      cargar();
    }
  };

  const toggleActivo = async (t) => {
    await supabase.from("taxes").update({ active: !t.active }).eq("id", t.id);
    cargar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Impuestos</h1>
        <button onClick={() => setMostrarForm((v) => !v)} className="rounded-lg bg-acento-700 px-4 py-2 text-sm font-semibold text-white hover:bg-acento-800">
          {mostrarForm ? "Cancelar" : "Nuevo impuesto"}
        </button>
      </div>

      {mensaje && <p className={`text-sm font-medium ${mensaje.tipo === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{mensaje.texto}</p>}

      {mostrarForm && (
        <form onSubmit={crear} className="grid gap-3 rounded-xl2 border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <input required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="recurrente">Recurrente</option>
            <option value="puntual">Puntual</option>
          </select>
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="porcentaje">Porcentaje del saldo</option>
            <option value="fijo">Cantidad fija</option>
          </select>
          <input type="number" step="0.01" required placeholder="Valor" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          {form.kind === "recurrente" && (
            <input type="number" placeholder="Frecuencia (días)" value={form.frequency_days} onChange={(e) => setForm({ ...form, frequency_days: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          )}
          <button type="submit" className="sm:col-span-2 rounded-lg bg-acento-700 py-2.5 text-sm font-semibold text-white hover:bg-acento-800">
            Crear impuesto
          </button>
        </form>
      )}

      <div className="space-y-3">
        {taxes.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl2 border border-gray-200 bg-white p-4">
            <div>
              <p className="font-medium text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-400">
                {t.kind === "recurrente" ? `Cada ${t.frequency_days} días` : "Puntual"} ·{" "}
                {t.mode === "porcentaje" ? `${t.value}%` : formatMoney(t.value)} · Aplicado: {formatDate(t.last_applied_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActivo(t)} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {t.active ? "Activo" : "Inactivo"}
              </button>
              <button onClick={() => cobrarAhora(t.id)} className="rounded-lg bg-acento-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-acento-800">
                Cobrar ahora
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
