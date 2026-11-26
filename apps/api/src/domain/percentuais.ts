import type Decimal from 'decimal.js';
import { decimal, type EntradaDecimal } from './decimal';
import { PercentuaisInvalidosError } from './erros';

export function validarPercentual(
  valor: EntradaDecimal,
  campo: string,
): Decimal {
  const percentual = decimal(valor, campo);
  if (percentual.lt('0') || percentual.gte('100')) {
    throw new PercentuaisInvalidosError(
      `${campo} deve estar entre 0% e menos de 100%.`,
    );
  }
  return percentual;
}

export function somarPercentuais(...percentuais: Decimal[]): Decimal {
  const total = percentuais.reduce(
    (acumulado, percentual) => acumulado.plus(percentual),
    decimal('0', 'Percentual total'),
  );
  if (total.gte('100')) {
    throw new PercentuaisInvalidosError(
      'A soma dos percentuais deve ser menor que 100%.',
    );
  }
  return total;
}

export function emFracao(percentual: Decimal): Decimal {
  return percentual.div('100');
}
