import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import BalanceCard from "../../components/BalanceCard";
import { formatMoney } from "../../lib/format";

export default function AdminPanel() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function cargar() {
      const [{ data: profiles }, { data: loans }, { data: taxTx }] = await Promise.all([
        supabase.from("profiles").select("balance, savings_balance"),
        supabase.from("loans").select("remaining_balance, status").eq("status", "activo"),
        supabase
          .from("transactions")
          .select("amount")
          .eq("type", "impuesto")
          .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);

      const enCirculacion = (profiles ?? []).reduce((s, p) => s + Number(p.balance) + Number(p.savings_balance), 0);
      const deudaTotal = (loans ?? []).reduce((s, l) => s + Number(l.remaining_balance), 0);
      const recaudado = (taxTx ?? []).reduce((s, t) => s + Number(t.amount), 0);

      setStats({
        usuarios: (profiles ?? []).length,
        enCirculacion,
        deudaTotal,
        recaudado,
      });
    }
    cargar();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel general</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard label="Usuarios" amount={stats?.usuarios ?? "—"} />
        <BalanceCard label="Dinero en circulación" amount={stats ? formatMoney(stats.enCirculacion) : "—"} accent />
        <BalanceCard label="Deuda en préstamos activos" amount={stats ? formatMoney(stats.deudaTotal) : "—"} />
        <BalanceCard label="Impuestos recaudados (30 días)" amount={stats ? formatMoney(stats.recaudado) : "—"} />
      </div>
    </div>
  );
}
