import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl2 bg-acento-700 text-white">
            <Landmark size={24} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-acento-600">
            Banco Nacional de
          </p>
          <h1 className="text-xl font-bold text-gray-900">Buenas Aguas</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-acento-500 focus:outline-none focus:ring-1 focus:ring-acento-500"
              placeholder="tu@correo.com"
            />
          </div>
          <div className="mb-5">
            <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-acento-500 focus:outline-none focus:ring-1 focus:ring-acento-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="mb-4 text-sm font-medium text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-acento-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-acento-800 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Las cuentas las crea el Gobierno. Si no tienes acceso, contacta con la administración.
        </p>
      </div>
    </div>
  );
}
