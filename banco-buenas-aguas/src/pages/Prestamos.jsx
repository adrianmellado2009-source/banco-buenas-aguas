import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { formatMoney, formatDate } from "../lib/format";

const ESTADOS = {
  pendiente: "bg-amber-50 text-amber-700",
  activo: "bg-acento-50 text-acento-700",
  pagado: "bg-emerald-50 text-emerald-700",
  rechazado: "bg-rose-50 text-rose-700",
  impagado: "bg-rose-50 text-rose-700",
};

export default function Prestamos() {
  const { refreshProfile } = useAuth();
  const [loans, setLoans] = useState([]);
  const [cantidad, setCantidad] = useState("");
  const [cuotas, setCuotas] = useState(3);
  const [mensaje, setMensaje] = useState(null);
  const [pagando, setPagando] = useState(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("loans").select("*").order("requested_at", { ascending: false });
    setLoans(data ?? []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const solicitar = async (e) => {
    e.preventDefault();
    setMensaje(null);
    const { error } = await supabase.rpc("solicitar_prestamo", {
      cantidad: Number(cantidad),
      cuotas: Number(cuotas),
    });
    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
    } else {
      setMensaje({ tipo: "ok", texto: "Solicitud enviada. Queda pendiente de aprobación." });
      setCantidad("");
      cargar();
    }
  };

  const pagarCuota = async (loanId) => {
    setPagando(loanId);
    const { error } = await supabase.rpc("pagar_cuota_prestamo", { loan_id: loanId });
    setPagando(null);
    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
    } else {
      setMensaje({ tipo: "ok", texto: "Cuota pagada." });
      cargar();
      refreshProfile();
    }
  };

  const activos = loans.filter((l) => l.status === "activo" || l.status === "pendiente");
  const pasados = loans.filter((l) => l.status === "pagado" || l.status === "rechazado" || l.status === "impagado");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Préstamos</h1>

      <form onSubmit={solicitar} className="grid gap-3 rounded-xl2 border border-gray-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad</label>
          <input type="number" min="1" step="0.01" required value={cantidad} onChange={(e) => setCantidad(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cuotas</label>
          <input type="number" min="1" max="24" required value={cuotas} onChange={(e) => setCuotas(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-lg bg-acento-700 py-2.5 text-sm font-semibold text-white hover:bg-acento-800">
            Solicitar
          </button>
        </div>
      </form>

      {mensaje && (
        <p className={`text-sm font-medium ${mensaje.tipo === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{mensaje.texto}</p>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Activos y pendientes</h2>
        <div className="space-y-3">
          {activos.length === 0 && <p className="text-sm text-gray-400">No tienes préstamos activos.</p>}
          {activos.map((l) => (
            <div key={l.id} className="rounded-xl2 border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADOS[l.status]}`}>{l.status}</span>
                <span className="text-xs text-gray-400">{formatDate(l.requested_at)}</span>
              </div>
              <p className="font-mono-num text-lg font-bold text-gray-900">{formatMoney(l.principal)}</p>
              {l.status === "activo" && (
                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  <p>Cuota: {formatMoney(l.installment_amount)} · Pendiente: {formatMoney(l.remaining_balance)}</p>
                  <button
                    onClick={() => pagarCuota(l.id)}
                    disabled={pagando === l.id}
                    className="mt-2 rounded-lg bg-acento-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-acento-800 disabled:opacity-60"
                  >
                    {pagando === l.id ? "Pagando…" : "Pagar próxima cuota"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {pasados.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Historial</h2>
          <div className="space-y-2">
            {pasados.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl2 border border-gray-200 bg-white p-4 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADOS[l.status]}`}>{l.status}</span>
                <span className="font-mono-num font-medium">{formatMoney(l.principal)}</span>
                <span className="text-xs text-gray-400">{formatDate(l.requested_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
