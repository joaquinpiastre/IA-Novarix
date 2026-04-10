// Equivalencias de tokens a créditos
// 1 crédito = 10,000 tokens procesados

export const TOKENS_POR_CREDITO = 10000;

export function calcularCreditos(tokensUsados: number): number {
  return tokensUsados / TOKENS_POR_CREDITO;
}

export const PRECIO_CREDITO_EXTRA = 1.5; // USD

export const PLANES = {
  BASIC: { creditosIncluidos: 50, precioMensual: 65 },
  PRO: { creditosIncluidos: 200, precioMensual: 150 },
  ENTERPRISE: { creditosIncluidos: 999999, precioMensual: 400 },
} as const;
