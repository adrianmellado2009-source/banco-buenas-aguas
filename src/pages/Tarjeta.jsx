import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

function enmascarar(numero) {
  if (!numero) return "•••• •••• •••• ••••";
  const limpio = numero.replace(/\D/g, "");
  const ultimos4 = limpio.slice(-4);
  return `•••• •••• •••• ${ultimos4}`;
}

export default function Tarjeta() {
  const { user, profile } = useAuth();
  const [card, setCard] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("cards")
      .select("*")
      .eq("account_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setCard(data);
        setCargando(false);
      });
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tarjeta</h1>

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : card ? (
        <div className="mx-auto max-w-sm rounded-2xl bg-gradient-to-br from-acento-800 to-acento-600 p-6 text-white shadow-lg">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-acento-100">
              Buenas Aguas
            </span>
            <Wifi size={20} className="rotate-90 text-acento-100" />
          </div>
          <p className="font-mono-num mb-6 text-xl tracking-widest">{enmascarar(card.card_number)}</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase text-acento-100">Titular</p>
              <p className="text-sm font-semibold">{profile?.full_name}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                card.status === "activa" ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"
              }`}
            >
              {card.status === "activa" ? "Activa" : "Bloqueada"}
            </span>
          </div>
        </div>
      ) : (
        <p className="rounded-xl2 border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          Todavía no tienes una tarjeta emitida. Solicítala al Gobierno.
        </p>
      )}
    </div>
  );
}
