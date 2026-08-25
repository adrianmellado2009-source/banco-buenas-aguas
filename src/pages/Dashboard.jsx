import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Wallet, Landmark } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import BalanceCard from "../components/BalanceCard";
import TransactionList from "../components/TransactionList";
import { formatMoney } from "../lib/format";

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [cobrando, setCobrando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [proximoCobro, setProximoCobro] = useState(null);

  const cargarHistorial = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .or(`from_account.eq.${user.id},to_account.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(8);
    setTransactions(data ?? []);
  }, [user]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  useEffect(() => {
    if (profile?.last_salary_collected_at) {
      const proximo = new Date(
        new Date(profile.last_salary_collected_at).getTime() +
          profile.salary_frequency_days * 86400000
      );
      setProximoCobro(proximo > new Date() ? proximo : null);
    } else {
      setProximoCobro(null);
    }
  }, [profile]);

  const handleCobrarSalario = async () => {
    setCobrando(true);
    setMensaje(null);
    const { error } = await supabase.rpc("cobrar_salario");
    setCobrando(false);
    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
    } else {
      setMensaje({ tipo: "ok", texto: "Salario cobrado correctamente." });
      refreshProfile();
      cargarHistorial();
    }
  };

  const salarioDisponible = !proximoCobro;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {profile?.full_name?.split(" ")[0] ?? "ciudadano"}
        </h1>
        <p className="text-sm text-gray-400">Cuenta {profile?.account_number}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <BalanceCard label="Saldo disponible" amount={formatMoney(profile?.balance)} accent />
        <BalanceCard
          label="Ahorro"
          amount={formatMoney(profile?.savings_balance)}
          sub="Ver detalle en Ahorro"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/transferir"
          className="flex items-center gap-3 rounded-xl2 border border-gray-200 bg-white p-4 text-sm font-medium text-gray-900 shadow-sm hover:border-acento-300"
        >
          <ArrowLeftRight size={18} className="text-acento-600" /> Transferir
        </Link>
        <button
          onClick={handleCobrarSalario}
          disabled={!salarioDisponible || cobrando}
          className="flex items-center gap-3 rounded-xl2 border border-gray-200 bg-white p-4 text-left text-sm font-medium text-gray-900 shadow-sm hover:border-acento-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Wallet size={18} className="text-acento-600" />
          {salarioDisponible
            ? cobrando
              ? "Cobrando…"
              : "Cobrar salario"
            : `Disponible el ${proximoCobro?.toLocaleDateString("es-ES")}`}
        </button>
        <Link
          to="/prestamos"
          className="flex items-center gap-3 rounded-xl2 border border-gray-200 bg-white p-4 text-sm font-medium text-gray-900 shadow-sm hover:border-acento-300"
        >
          <Landmark size={18} className="text-acento-600" /> Solicitar préstamo
        </Link>
      </div>

      {mensaje && (
        <p
          className={`text-sm font-medium ${
            mensaje.tipo === "ok" ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Últimos movimientos</h2>
          <Link to="/historial" className="text-sm font-medium text-acento-600">
            Ver todo
          </Link>
        </div>
        <TransactionList transactions={transactions} currentUserId={user?.id} />
      </div>
    </div>
  );
}
