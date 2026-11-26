import Decimal from 'decimal.js';
import { decimal, type EntradaDecimal } from './decimal';

export function arredondarPrecoSugerido(preco: Decimal): Decimal {
  // O centavo adicional garante que o preço entregue cubra o valor calculado.
  return preco.toDecimalPlaces(2, Decimal.ROUND_CEIL);
}

export function formatarDinheiro(valor: EntradaDecimal): string {
  // Custos e lucros são exibidos com duas casas depois de concluído o cálculo.
  return decimal(valor, 'Valor monetário').toFixed(2, Decimal.ROUND_HALF_UP);
}
