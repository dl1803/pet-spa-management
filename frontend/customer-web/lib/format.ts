const MONEY_FORMAT = new Intl.NumberFormat("vi-VN");
const WEIGHT_FORMAT = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatMoney(amount: number) {
  return `${MONEY_FORMAT.format(amount)}đ`;
}

export function formatWeight(kg: number) {
  return `${WEIGHT_FORMAT.format(kg)} kg`;
}

