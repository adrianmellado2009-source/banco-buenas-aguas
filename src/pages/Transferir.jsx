import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../lib/format";

export default function Transferir() {
  const { profile, refreshProfile } = useAuth();
  const [cuenta, setCuenta] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [concepto, setConcepto] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleConfirmar = (e) => {
    e.preventDefault();
    setResultado(null);
    setConfirmando(true);
  };

  const handleEnviar = async () => {
    setEnviando(true);
    const { error } = await supabase.rpc("transferir", {
      destino_cuenta: cuenta.trim(),
      cantidad: Number(cantidad),
      concepto: concepto || null,
    });
    setEnviando(false);
    setConfirmando(false);
    if (error) {
      setResultado({ tipo: "error", texto: error.message });
    } else {
      setResultado({ tipo: "ok", texto: "Transferencia realizada correctamente." });
      setCuenta("");
      setCantidad("");
      setConcepto("");
      refreshProfile();
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Transferir</h1>

      <div className="rounded-xl2 border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Saldo disponible: <span className="font-semibold text-gray-900">{formatMoney(profile?.balance)}</span>
        {profile?.transfer_limit_per_tx && (
          <p className="mt-1 text-xs">Límite por transferencia: {formatMoney(profile.transfer_limit_per_tx)}</p>
        )}
        {profile?.transfer_limit_daily && (
          <p className="text-xs">Límite diario: {formatMoney(profile.transfer_limit_daily)}</p>
        )}
      </div>

      {!confirmando ? (
        <form onSubmit={handleConfirmar} className="space-y-4 rounded-xl2 border border-gray-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cuenta destino</label>
            <input
              required
              value={cuenta}
              onChange={(e) => setCuenta(e.target.value)}
              placeholder="BBA-00000000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-acento-500 focus:outline-none focus:ring-1 focus:ring-acento-500"
            />
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-acento-500 focus:outline-none focus:ring-1 focus:ring-acento-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Concepto (opcional)</label>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-acento-500 focus:outline-none focus:ring-1 focus:ring-acento-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-acento-700 py-2.5 text-sm font-semibold text-white hover:bg-acento-800"
          >
            Revisar transferencia
          </button>
        </form>
      ) : (
        <div className="space-y-4 rounded-xl2 border border-acento-200 bg-acento-50 p-5">
          <p className="text-sm font-semibold text-gray-900">Confirma la transferencia</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Destino</dt><dd className="font-medium">{cuenta}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Cantidad</dt><dd className="font-medium">{formatMoney(cantidad)}</dd></div>
            {concepto && <div className="flex justify-between"><dt className="text-gray-500">Concepto</dt><dd className="font-medium">{concepto}</dd></div>}
          </dl>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmando(false)}
              className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700"
            >
              Volver
            </button>
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="flex-1 rounded-lg bg-acento-700 py-2.5 text-sm font-semibold text-white hover:bg-acento-800 disabled:opacity-60"
            >
              {enviando ? "Enviando…" : "Confirmar"}
            </button>
          </div>
        </div>
      )}

      {resultado && (
        <p className={`text-sm font-medium ${resultado.tipo === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
          {resultado.texto}
        </p>
      )}
    </div>
  );
}
