import Decimal from 'decimal.js';
import { ValorInvalidoError } from './erros';

export type EntradaDecimal = string | Decimal;

const DecimalDominio = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

const formatoDecimal = /^-?\d+(?:\.\d+)?$/u;

export function decimal(valor: EntradaDecimal, campo: string): Decimal {
  const formatoValido =
    typeof valor === 'string'
      ? valor === valor.trim() && formatoDecimal.test(valor)
      : Decimal.isDecimal(valor);
  if (!formatoValido) {
    throw new ValorInvalidoError(
      `${campo} deve ser um decimal com ponto como separador.`,
    );
  }

  const resultado = new DecimalDominio(valor);
  if (!resultado.isFinite()) {
    throw new ValorInvalidoError(`${campo} deve ser finito.`);
  }
  return resultado;
}

export function decimalNaoNegativo(
  valor: EntradaDecimal,
  campo: string,
): Decimal {
  const resultado = decimal(valor, campo);
  if (resultado.lt('0')) {
    throw new ValorInvalidoError(`${campo} deve ser maior ou igual a zero.`);
  }
  return resultado;
}

export function decimalPositivo(valor: EntradaDecimal, campo: string): Decimal {
  const resultado = decimal(valor, campo);
  if (resultado.lte('0')) {
    throw new ValorInvalidoError(`${campo} deve ser maior que zero.`);
  }
  return resultado;
}
