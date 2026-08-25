import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Perfil() {
  const { user, profile } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje(null);
    if (password.length < 8) {
      setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (password !== confirmar) {
      setMensaje({ tipo: "error", texto: "Las contraseñas no coinciden." });
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password });
    setEnviando(false);
    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
    } else {
      setMensaje({ tipo: "ok", texto: "Contraseña actualizada." });
      setPassword("");
      setConfirmar("");
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>

      <div className="space-y-1 rounded-xl2 border border-gray-200 bg-white p-5 text-sm">
        <p><span className="text-gray-400">Nombre:</span> <span className="font-medium">{profile?.full_name}</span></p>
        <p><span className="text-gray-400">Cuenta:</span> <span className="font-medium">{profile?.account_number}</span></p>
        <p><span className="text-gray-400">Email:</span> <span className="font-medium">{user?.email}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl2 border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900">Cambiar contraseña</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nueva contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar contraseña</label>
          <input
            type="password"
            required
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-acento-700 py-2.5 text-sm font-semibold text-white hover:bg-acento-800 disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Guardar cambios"}
        </button>
        {mensaje && (
          <p className={`text-sm font-medium ${mensaje.tipo === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{mensaje.texto}</p>
        )}
      </form>
    </div>
  );
}
