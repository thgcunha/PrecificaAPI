import type Decimal from 'decimal.js';
import { decimal, decimalNaoNegativo, type EntradaDecimal } from './decimal';
import { RendimentoInvalidoError } from './erros';
import { CustoIngredienteService, type ItemReceita } from './ingrediente';
import { emFracao, validarPercentual } from './percentuais';

export interface EntradaCustoReceita {
  readonly itens: readonly ItemReceita[];
  readonly rendimentoTeorico: EntradaDecimal;
  readonly percentualPerda?: EntradaDecimal;
  readonly custoEmbalagem?: EntradaDecimal;
  readonly custoGasEnergia?: EntradaDecimal;
  readonly custoMaoDeObra?: EntradaDecimal;
}

export interface CustoReceita {
  readonly custoIngredientes: Decimal;
  readonly custoDiretoTotal: Decimal;
  readonly rendimentoReal: Decimal;
  readonly custoDiretoUnitario: Decimal;
}

export class CustoReceitaService {
  constructor(
    private readonly custoIngrediente = new CustoIngredienteService(),
  ) {}

  calcular(entrada: EntradaCustoReceita): CustoReceita {
    const rendimento = decimal(entrada.rendimentoTeorico, 'Rendimento teórico');
    if (rendimento.lte('0')) {
      throw new RendimentoInvalidoError(
        'O rendimento da receita deve ser maior que zero.',
      );
    }

    const perda = emFracao(
      validarPercentual(entrada.percentualPerda ?? '0', 'Perda de rendimento'),
    );
    // Os custos correspondem ao lote inteiro e são distribuídos pelas unidades aproveitáveis.
    const rendimentoReal = rendimento.times(
      decimal('1', 'Fator de rendimento').minus(perda),
    );
    const custoIngredientes = entrada.itens.reduce(
      (total, item) => total.plus(this.custoIngrediente.calcular(item)),
      decimal('0', 'Custo de ingredientes'),
    );
    const custoDiretoTotal = custoIngredientes
      .plus(
        decimalNaoNegativo(entrada.custoEmbalagem ?? '0', 'Embalagem do lote'),
      )
      .plus(
        decimalNaoNegativo(
          entrada.custoGasEnergia ?? '0',
          'Gás e energia do lote',
        ),
      )
      .plus(
        decimalNaoNegativo(
          entrada.custoMaoDeObra ?? '0',
          'Mão de obra do lote',
        ),
      );

    return {
      custoIngredientes,
      custoDiretoTotal,
      rendimentoReal,
      custoDiretoUnitario: custoDiretoTotal.div(rendimentoReal),
    };
  }
}
