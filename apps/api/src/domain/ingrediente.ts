import type Decimal from 'decimal.js';
import {
  decimal,
  decimalNaoNegativo,
  decimalPositivo,
  type EntradaDecimal,
} from './decimal';
import { ValorInvalidoError } from './erros';
import { converterUnidade, type Medida } from './unidades';

export interface Ingrediente {
  readonly precoEmbalagem: EntradaDecimal;
  readonly embalagem: Medida;
}

export interface ItemReceita {
  readonly ingrediente: Ingrediente;
  readonly quantidadeUsada: Medida;
  readonly fatorCorrecao?: EntradaDecimal;
}

export class CustoIngredienteService {
  calcular(item: ItemReceita): Decimal {
    const { ingrediente, quantidadeUsada } = item;
    const preco = decimalNaoNegativo(
      ingrediente.precoEmbalagem,
      'Preço da embalagem',
    );
    const quantidadeEmbalagem = decimalPositivo(
      ingrediente.embalagem.quantidade,
      'Quantidade da embalagem',
    );
    const quantidadeConvertida = converterUnidade(
      quantidadeUsada,
      ingrediente.embalagem.unidade,
    );
    if (quantidadeConvertida.isZero()) {
      throw new ValorInvalidoError(
        'A quantidade usada deve ser maior que zero.',
      );
    }

    const fator = decimal(item.fatorCorrecao ?? '1', 'Fator de correção');

    if (fator.lt('1')) {
      throw new ValorInvalidoError(
        'O fator de correção deve ser maior ou igual a 1.',
      );
    }

    // Multiplicar antes de dividir preserva a precisão quando o custo por medida é periódico.
    return preco
      .times(quantidadeConvertida)
      .times(fator)
      .div(quantidadeEmbalagem);
  }
}
