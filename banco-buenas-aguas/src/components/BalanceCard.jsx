export default function BalanceCard({ label, amount, accent = false, sub }) {
  return (
    <div
      className={`rounded-xl2 border p-6 shadow-sm ${
        accent
          ? "border-acento-700 bg-acento-700 text-white"
          : "border-gray-200 bg-white text-gray-900"
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wider ${accent ? "text-acento-100" : "text-gray-400"}`}>
        {label}
      </p>
      <p className="mt-2 font-mono-num text-3xl font-bold tabular-nums sm:text-4xl">
        {amount}
      </p>
      {sub && (
        <p className={`mt-1 text-sm ${accent ? "text-acento-100" : "text-gray-400"}`}>{sub}</p>
      )}
    </div>
  );
}
