import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { formatMoney, formatDate } from "../../lib/format";

export default function AdminPrestamos() {
  const [loans, setLoans] = useState([]);
  const [tasas, setTasas] = useState({});
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("loans")
      .select("*, profiles:account_id(full_name, account_number)")
      .order("requested_at", { ascending: false });
    setLoans(data ?? []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aprobar = async (loan) => {
    const tasa = Number(tasas[loan.id] ?? 0);
    const { error } = await supabase.rpc("aprobar_prestamo", { loan_id: loan.id, interest_rate: tasa });
    if (error) setMensaje({ tipo: "error", texto: error.message });
    else {
      setMensaje({ tipo: "ok", texto: "Préstamo aprobado." });
      cargar();
    }
  };

  const rechazar = async (loan) => {
    const { error } = await supabase.rpc("rechazar_prestamo", { loan_id: loan.id });
    if (error) setMensaje({ tipo: "error", texto: error.message });
    else {
      setMensaje({ tipo: "ok", texto: "Préstamo rechazado." });
      cargar();
    }
  };

  const pendientes = loans.filter((l) => l.status === "pendiente");
  const otros = loans.filter((l) => l.status !== "pendiente");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Préstamos</h1>

      {mensaje && <p className={`text-sm font-medium ${mensaje.tipo === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{mensaje.texto}</p>}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Pendientes de aprobación</h2>
        <div className="space-y-3">
          {pendientes.length === 0 && <p className="text-sm text-gray-400">No hay solicitudes pendientes.</p>}
          {pendientes.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-gray-200 bg-white p-4">
              <div>
                <p className="font-medium text-gray-900">{l.profiles?.full_name}</p>
                <p className="text-xs text-gray-400">{l.profiles?.account_number} · {formatDate(l.requested_at)}</p>
                <p className="font-mono-num mt-1 text-lg font-bold">{formatMoney(l.principal)} en {l.installments} cuotas</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Interés %"
                  value={tasas[l.id] ?? ""}
                  onChange={(e) => setTasas({ ...tasas, [l.id]: e.target.value })}
                  className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button onClick={() => aprobar(l)} className="rounded-lg bg-acento-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-acento-800">
                  Aprobar
                </button>
                <button onClick={() => rechazar(l)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600">
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Todos los préstamos</h2>
        <div className="overflow-x-auto rounded-xl2 border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3">Pendiente</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {otros.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">{l.profiles?.full_name}</td>
                  <td className="px-4 py-3 font-mono-num">{formatMoney(l.principal)}</td>
                  <td className="px-4 py-3 font-mono-num">{formatMoney(l.remaining_balance)}</td>
                  <td className="px-4 py-3">{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
