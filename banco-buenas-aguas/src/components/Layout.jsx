import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  History,
  Landmark,
  PiggyBank,
  CreditCard,
  User,
  LogOut,
  ShieldCheck,
  Users,
  Percent,
  Settings,
  ListOrdered,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const userLinks = [
  { to: "/", label: "Panel", icon: LayoutDashboard, end: true },
  { to: "/transferir", label: "Transferir", icon: ArrowLeftRight },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/prestamos", label: "Préstamos", icon: Landmark },
  { to: "/ahorro", label: "Ahorro", icon: PiggyBank },
  { to: "/tarjeta", label: "Tarjeta", icon: CreditCard },
  { to: "/perfil", label: "Perfil", icon: User },
];

const adminLinks = [
  { to: "/admin", label: "Panel general", icon: ShieldCheck, end: true },
  { to: "/admin/usuarios", label: "Usuarios", icon: Users },
  { to: "/admin/impuestos", label: "Impuestos", icon: Percent },
  { to: "/admin/prestamos", label: "Préstamos", icon: Landmark },
  { to: "/admin/config", label: "Configuración", icon: Settings },
  { to: "/admin/transacciones", label: "Transacciones", icon: ListOrdered },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-acento-600 text-white"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`
      }
    >
      <Icon size={18} strokeWidth={2} />
      {label}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:px-4 lg:py-6">
        <div className="mb-8 px-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-acento-600">
            Banco Nacional
          </p>
          <p className="text-lg font-bold text-gray-900">Buenas Aguas</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {userLinks.map((l) => (
            <NavItem key={l.to} {...l} />
          ))}
          {isAdmin && (
            <>
              <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Gobierno
              </div>
              {adminLinks.map((l) => (
                <NavItem key={l.to} {...l} />
              ))}
            </>
          )}
        </nav>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="truncate px-2 text-sm font-medium text-gray-900">
            {profile?.full_name ?? "Cuenta"}
          </p>
          <p className="truncate px-2 text-xs text-gray-400">{profile?.account_number}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1">
        {/* Top bar (mobile) */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-acento-600">
              Banco Nacional
            </p>
            <p className="text-base font-bold text-gray-900">Buenas Aguas</p>
          </div>
          <button onClick={handleLogout} className="text-gray-400">
            <LogOut size={20} />
          </button>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:pb-6">{children}</main>

        {/* Bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-gray-200 bg-white py-2 lg:hidden">
          {userLinks.slice(0, 5).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 text-[11px] font-medium ${
                  isActive ? "text-acento-600" : "text-gray-400"
                }`
              }
            >
              <l.icon size={20} />
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
