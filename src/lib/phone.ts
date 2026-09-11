const MOBILE_RE = /^(\+92|0)3\d{9}$/;

export function isPakistaniMobile(input: string): boolean {
  return MOBILE_RE.test(input.replace(/[\s-]/g, ""));
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (/^923\d{9}$/.test(digits)) return `+${digits}`;
  if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;
  return input.trim();
}