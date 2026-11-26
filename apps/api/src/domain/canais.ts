import type Decimal from 'decimal.js';
import { decimal, type EntradaDecimal } from './decimal';
import { somarPercentuais, validarPercentual } from './percentuais';

export interface TaxasCanal {
  readonly percentualMaquininha: Decimal;
  readonly percentualCanal: Decimal;
}

export abstract class CanalDeVenda {
  abstract calcularTaxas(): TaxasCanal;
}

export class Balcao extends CanalDeVenda {
  calcularTaxas(): TaxasCanal {
    const zero = decimal('0', 'Taxa de balcão');
    return { percentualMaquininha: zero, percentualCanal: zero };
  }
}

export class Maquininha extends CanalDeVenda {
  constructor(private readonly percentual: EntradaDecimal) {
    super();
  }

  calcularTaxas(): TaxasCanal {
    return {
      percentualMaquininha: validarPercentual(
        this.percentual,
        'Taxa de maquininha',
      ),
      percentualCanal: decimal('0', 'Taxa do canal'),
    };
  }
}

export class Ifood extends CanalDeVenda {
  constructor(
    private readonly percentual: EntradaDecimal,
    private readonly percentualMaquininha: EntradaDecimal = '0',
  ) {
    super();
  }

  calcularTaxas(): TaxasCanal {
    // A taxa de maquininha representa uma cobrança adicional informada para esta venda.
    return {
      percentualMaquininha: validarPercentual(
        this.percentualMaquininha,
        'Taxa de maquininha',
      ),
      percentualCanal: validarPercentual(this.percentual, 'Taxa do iFood'),
    };
  }
}

export class WhatsApp extends CanalDeVenda {
  constructor(private readonly percentualLinkPagamento: EntradaDecimal = '0') {
    super();
  }

  calcularTaxas(): TaxasCanal {
    return {
      percentualMaquininha: decimal('0', 'Taxa de maquininha'),
      percentualCanal: validarPercentual(
        this.percentualLinkPagamento,
        'Taxa do link de pagamento',
      ),
    };
  }
}

export interface EncargosVariaveisVenda {
  readonly canal: CanalDeVenda;
  readonly percentualImpostos: EntradaDecimal;
}

export function calcularPercentualVariavel(
  entrada: EncargosVariaveisVenda,
): Decimal {
  const taxas = entrada.canal.calcularTaxas();
  return somarPercentuais(
    validarPercentual(entrada.percentualImpostos, 'Impostos'),
    taxas.percentualMaquininha,
    taxas.percentualCanal,
  );
}
