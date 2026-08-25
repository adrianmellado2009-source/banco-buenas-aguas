export function formatMoney(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + " ₣BA";
}

export function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export const TX_LABELS = {
  transferencia: "Transferencia",
  salario: "Salario",
  impuesto: "Impuesto",
  prestamo_desembolso: "Desembolso de préstamo",
  prestamo_cuota: "Cuota de préstamo",
  interes_ahorro: "Interés de ahorro",
  ajuste_manual: "Ajuste manual",
};
