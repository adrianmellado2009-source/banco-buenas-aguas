import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { formatMoney, formatDate, TX_LABELS } from "../../lib/format";

export default function AdminTransacciones() {
  const [transactions, setTransactions] = useState([]);
  const [tipo, setTipo] = useState("");
  const [usuarios, setUsuarios] = useState({});

  const cargar = useCallback(async () => {
    let query = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
    if (tipo) query = query.eq("type", tipo);
    const { data } = await query;
    setTransactions(data ?? []);

    const { data: perfiles } = await supabase.from("profiles").select("id, full_name");
    const mapa = {};
    (perfiles ?? []).forEach((p) => (mapa[p.id] = p.full_name));
    setUsuarios(mapa);
  }, [tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Todas las transacciones</h1>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {Object.entries(TX_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">De</th>
              <th className="px-4 py-3">A</th>
              <th className="px-4 py-3">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-3 text-gray-400">{formatDate(tx.created_at)}</td>
                <td className="px-4 py-3">{TX_LABELS[tx.type] ?? tx.type}</td>
                <td className="px-4 py-3">{usuarios[tx.from_account] ?? "—"}</td>
                <td className="px-4 py-3">{usuarios[tx.to_account] ?? "—"}</td>
                <td className="px-4 py-3 font-mono-num font-medium">{formatMoney(tx.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
