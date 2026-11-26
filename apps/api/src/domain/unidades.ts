import type Decimal from 'decimal.js';
import { decimalNaoNegativo, type EntradaDecimal } from './decimal';
import { UnidadeIncompativelError } from './erros';

const unidades = {
  g: { dimensao: 'massa', fator: '1' },
  kg: { dimensao: 'massa', fator: '1000' },
  ml: { dimensao: 'volume', fator: '1' },
  l: { dimensao: 'volume', fator: '1000' },
  un: { dimensao: 'contagem', fator: '1' },
} as const;

export type Unidade = keyof typeof unidades;

export interface Medida {
  readonly quantidade: EntradaDecimal;
  readonly unidade: Unidade;
}

export function converterUnidade(medida: Medida, destino: Unidade): Decimal {
  if (
    !Object.hasOwn(unidades, medida.unidade) ||
    !Object.hasOwn(unidades, destino)
  ) {
    throw new UnidadeIncompativelError(
      'Use uma unidade válida: g, kg, ml, l ou un.',
    );
  }

  const origem = unidades[medida.unidade];
  const alvo = unidades[destino];
  if (origem.dimensao !== alvo.dimensao) {
    throw new UnidadeIncompativelError(
      `Não é possível converter ${medida.unidade} para ${destino}.`,
    );
  }

  return decimalNaoNegativo(medida.quantidade, 'Quantidade')
    .times(origem.fator)
    .div(alvo.fator);
}
