import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-IN').format(amount);

export const calculateDailySales = (quantity: number, start: Date, end: Date) => {
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  return (quantity / days).toFixed(2);
};