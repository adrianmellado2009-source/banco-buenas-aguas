import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import TransactionList from "../components/TransactionList";
import { TX_LABELS } from "../lib/format";

export default function Historial() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [tipo, setTipo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!user) return;
    setCargando(true);
    let query = supabase
      .from("transactions")
      .select("*")
      .or(`from_account.eq.${user.id},to_account.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (tipo) query = query.eq("type", tipo);
    if (desde) query = query.gte("created_at", desde);
    if (hasta) query = query.lte("created_at", hasta + "T23:59:59");

    const { data } = await query;
    setTransactions(data ?? []);
    setCargando(false);
  }, [user, tipo, desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Historial</h1>

      <div className="grid gap-3 rounded-xl2 border border-gray-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(TX_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : (
        <TransactionList transactions={transactions} currentUserId={user?.id} />
      )}
    </div>
  );
}
