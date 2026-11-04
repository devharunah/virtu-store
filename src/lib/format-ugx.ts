const ugx = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

/** 1499000 -> "UGX 1,499,000" */
export const formatUGX = (amount: number) => `UGX ${ugx.format(amount)}`;
