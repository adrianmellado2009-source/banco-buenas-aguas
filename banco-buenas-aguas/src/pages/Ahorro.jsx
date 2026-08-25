import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import BalanceCard from "../components/BalanceCard";
import { formatMoney, formatDate } from "../lib/format";

export default function Ahorro() {
  const { profile, refreshProfile } = useAuth();
  const [config, setConfig] = useState(null);
  const [direccion, setDireccion] = useState("a_ahorro");
  const [cantidad, setCantidad] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.from("savings_config").select("*").eq("id", 1).single().then(({ data }) => setConfig(data));
  }, []);

  const proximaAplicacion = config?.last_applied_at
    ? new Date(new Date(config.last_applied_at).getTime() + config.frequency_days * 86400000)
    : null;

  const handleMover = async (e) => {
    e.preventDefault();
    setMensaje(null);
    setEnviando(true);
    const fn = direccion === "a_ahorro" ? "mover_a_ahorro" : "mover_de_ahorro";
    const { error } = await supabase.rpc(fn, { cantidad: Number(cantidad) });
    setEnviando(false);
    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
    } else {
      setMensaje({ tipo: "ok", texto: "Movimiento realizado." });
      setCantidad("");
      refreshProfile();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ahorro</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <BalanceCard label="Saldo en ahorro" amount={formatMoney(profile?.savings_balance)} accent />
        <div className="rounded-xl2 border border-gray-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tasa vigente</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{config?.interest_rate ?? "—"}%</p>
          <p className="mt-1 text-sm text-gray-400">
            cada {config?.frequency_days ?? "—"} días
            {proximaAplicacion && ` · próxima: ${formatDate(proximaAplicacion)}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleMover} className="space-y-4 rounded-xl2 border border-gray-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Movimiento</label>
          <select
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="a_ahorro">Cuenta corriente → Ahorro</option>
            <option value="de_ahorro">Ahorro → Cuenta corriente</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-acento-700 py-2.5 text-sm font-semibold text-white hover:bg-acento-800 disabled:opacity-60"
        >
          {enviando ? "Moviendo…" : "Mover dinero"}
        </button>
      </form>

      {mensaje && (
        <p className={`text-sm font-medium ${mensaje.tipo === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{mensaje.texto}</p>
      )}
    </div>
  );
}
