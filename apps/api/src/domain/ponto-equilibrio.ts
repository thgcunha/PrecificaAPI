import type Decimal from 'decimal.js';
import {
  calcularPercentualVariavel,
  type EncargosVariaveisVenda,
} from './canais';
import {
  decimalNaoNegativo,
  decimalPositivo,
  type EntradaDecimal,
} from './decimal';
import { MargemContribuicaoInvalidaError } from './erros';
import { emFracao } from './percentuais';

export interface EntradaPontoEquilibrio extends EncargosVariaveisVenda {
  readonly precoPraticado: EntradaDecimal;
  readonly custoDiretoUnitario: EntradaDecimal;
  readonly despesasFixasMensais: EntradaDecimal;
}

export interface PontoEquilibrio {
  readonly margemContribuicaoUnitaria: Decimal;
  readonly unidadesPorMes: Decimal;
}

export class PontoEquilibrioService {
  calcular(entrada: EntradaPontoEquilibrio): PontoEquilibrio {
    const preco = decimalPositivo(entrada.precoPraticado, 'Preço praticado');
    const custoDireto = decimalNaoNegativo(
      entrada.custoDiretoUnitario,
      'Custo direto unitário',
    );
    const despesasFixas = decimalNaoNegativo(
      entrada.despesasFixasMensais,
      'Despesas fixas mensais',
    );
    const variaveis = preco.times(
      emFracao(calcularPercentualVariavel(entrada)),
    );
    const margemContribuicaoUnitaria = preco
      .minus(custoDireto)
      .minus(variaveis);

    if (margemContribuicaoUnitaria.lte('0')) {
      throw new MargemContribuicaoInvalidaError(
        'A margem de contribuição deve ser positiva para atingir o ponto de equilíbrio.',
      );
    }

    // O resultado é a menor quantidade inteira de vendas que cobre as despesas fixas.
    return {
      margemContribuicaoUnitaria,
      unidadesPorMes: despesasFixas.div(margemContribuicaoUnitaria).ceil(),
    };
  }
}
