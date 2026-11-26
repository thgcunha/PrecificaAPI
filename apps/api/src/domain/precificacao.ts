import type Decimal from 'decimal.js';
import {
  calcularPercentualVariavel,
  type EncargosVariaveisVenda,
} from './canais';
import {
  decimal,
  decimalNaoNegativo,
  decimalPositivo,
  type EntradaDecimal,
} from './decimal';
import { arredondarPrecoSugerido } from './dinheiro';
import { emFracao, somarPercentuais, validarPercentual } from './percentuais';

interface EntradaPrecificacao extends EncargosVariaveisVenda {
  readonly custoDiretoUnitario: EntradaDecimal;
  readonly percentualDespesasFixas: EntradaDecimal;
}

export interface EntradaPrecoSugerido extends EntradaPrecificacao {
  readonly percentualMargemDesejada: EntradaDecimal;
}

export interface EntradaMargemReal extends EntradaPrecificacao {
  readonly precoPraticado: EntradaDecimal;
}

export interface PrecoSugerido {
  readonly precoSugerido: Decimal;
  readonly percentualTotal: Decimal;
}

export interface MargemReal {
  readonly lucroUnitario: Decimal;
  readonly percentualMargemReal: Decimal;
}

export class PrecificacaoService {
  calcularPrecoSugerido(entrada: EntradaPrecoSugerido): PrecoSugerido {
    const custoDireto = decimalNaoNegativo(
      entrada.custoDiretoUnitario,
      'Custo direto unitário',
    );
    const percentualTotal = somarPercentuais(
      calcularPercentualAplicavel(entrada),
      validarPercentual(entrada.percentualMargemDesejada, 'Margem desejada'),
    );

    // A soma das taxas incide sobre o preço de venda.
    const parcelaDoCusto = decimal('1', 'Parcela do preço').minus(
      emFracao(percentualTotal),
    );
    return {
      precoSugerido: arredondarPrecoSugerido(custoDireto.div(parcelaDoCusto)),
      percentualTotal,
    };
  }

  calcularMargemReal(entrada: EntradaMargemReal): MargemReal {
    const custoDireto = decimalNaoNegativo(
      entrada.custoDiretoUnitario,
      'Custo direto unitário',
    );
    const preco = decimalPositivo(entrada.precoPraticado, 'Preço praticado');
    const percentualAplicavel = emFracao(calcularPercentualAplicavel(entrada));
    const lucroUnitario = preco
      .minus(custoDireto)
      .minus(preco.times(percentualAplicavel));

    return {
      lucroUnitario,
      percentualMargemReal: lucroUnitario.div(preco).times('100'),
    };
  }

  calcularPercentualDespesasFixas(
    despesasFixas: EntradaDecimal,
    faturamento: EntradaDecimal,
  ): Decimal {
    const despesas = decimalNaoNegativo(
      despesasFixas,
      'Despesas fixas mensais',
    );
    const receita = decimalPositivo(faturamento, 'Faturamento mensal');
    return despesas.div(receita).times('100');
  }
}

function calcularPercentualAplicavel(entrada: EntradaPrecificacao): Decimal {
  return somarPercentuais(
    calcularPercentualVariavel(entrada),
    validarPercentual(entrada.percentualDespesasFixas, 'Despesas fixas'),
  );
}
