import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatMoney, formatDate, TX_LABELS } from "../lib/format";

export default function TransactionList({ transactions, currentUserId }) {
  if (!transactions?.length) {
    return (
      <p className="rounded-xl2 border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
        Todavía no hay movimientos.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl2 border border-gray-200 bg-white">
      {transactions.map((tx) => {
        const esIngreso = tx.to_account === currentUserId || tx.from_account === null && tx.to_account;
        const entrante = tx.to_account === currentUserId;
        return (
          <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                entrante ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}
            >
              {entrante ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {tx.description || TX_LABELS[tx.type] || tx.type}
              </p>
              <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
            </div>
            <p
              className={`font-mono-num text-sm font-semibold tabular-nums ${
                entrante ? "text-emerald-600" : "text-gray-900"
              }`}
            >
              {entrante ? "+" : "−"} {formatMoney(tx.amount)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
