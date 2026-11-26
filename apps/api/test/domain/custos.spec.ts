import { formatarDinheiro } from '../../src/domain/dinheiro';
import {
  PercentuaisInvalidosError,
  RendimentoInvalidoError,
  UnidadeIncompativelError,
  ValorInvalidoError,
} from '../../src/domain/erros';
import {
  CustoIngredienteService,
  type ItemReceita,
} from '../../src/domain/ingrediente';
import {
  CustoReceitaService,
  type EntradaCustoReceita,
} from '../../src/domain/receita';

const itemFarinha: ItemReceita = {
  ingrediente: {
    precoEmbalagem: '22',
    embalagem: { quantidade: '5', unidade: 'kg' },
  },
  quantidadeUsada: { quantidade: '2500', unidade: 'g' },
};

describe('custo de ingrediente', () => {
  const servico = new CustoIngredienteService();

  it('faz a conversão antes de calcular o custo e usa fator 1 por padrão', () => {
    expect(servico.calcular(itemFarinha).toFixed(2)).toBe('11.00');
  });

  it('aplica o fator de correção do frango', () => {
    const frango: ItemReceita = {
      ingrediente: {
        precoEmbalagem: '18',
        embalagem: { quantidade: '1', unidade: 'kg' },
      },
      quantidadeUsada: { quantidade: '2', unidade: 'kg' },
      fatorCorrecao: '1.15',
    };

    expect(servico.calcular(frango).toFixed(2)).toBe('41.40');
  });

  it('multiplica antes da divisão quando o custo por medida é periódico', () => {
    const item: ItemReceita = {
      ingrediente: {
        precoEmbalagem: '1',
        embalagem: { quantidade: '3', unidade: 'un' },
      },
      quantidadeUsada: { quantidade: '3', unidade: 'un' },
    };

    expect(servico.calcular(item).toFixed()).toBe('1');
  });

  it.each<ItemReceita>([
    { ...itemFarinha, fatorCorrecao: '0.99' },
    { ...itemFarinha, quantidadeUsada: { quantidade: '0', unidade: 'g' } },
    {
      ...itemFarinha,
      ingrediente: { ...itemFarinha.ingrediente, precoEmbalagem: '-0.01' },
    },
    {
      ...itemFarinha,
      ingrediente: {
        precoEmbalagem: '22',
        embalagem: { quantidade: '0', unidade: 'kg' },
      },
    },
  ])('rejeita valores inválidos no item %#', (item) => {
    expect(() => servico.calcular(item)).toThrow(ValorInvalidoError);
  });

  it('rejeita unidade de uso incompatível com a compra', () => {
    const item = {
      ...itemFarinha,
      quantidadeUsada: { quantidade: '1', unidade: 'l' },
    } as const;

    expect(() => servico.calcular(item)).toThrow(UnidadeIncompativelError);
  });
});

describe('custo de receita', () => {
  const servico = new CustoReceitaService();

  it('calcula o caso fixo da receita de 100 coxinhas', () => {
    const itens: readonly ItemReceita[] = [
      itemFarinha,
      {
        ingrediente: {
          precoEmbalagem: '18',
          embalagem: { quantidade: '1', unidade: 'kg' },
        },
        quantidadeUsada: { quantidade: '2', unidade: 'kg' },
        fatorCorrecao: '1.15',
      },
      {
        ingrediente: {
          precoEmbalagem: '9',
          embalagem: { quantidade: '500', unidade: 'g' },
        },
        quantidadeUsada: { quantidade: '100', unidade: 'g' },
      },
      {
        ingrediente: {
          precoEmbalagem: '6',
          embalagem: { quantidade: '1', unidade: 'kg' },
        },
        quantidadeUsada: { quantidade: '0.3', unidade: 'kg' },
      },
      {
        ingrediente: {
          precoEmbalagem: '8',
          embalagem: { quantidade: '1', unidade: 'kg' },
        },
        quantidadeUsada: { quantidade: '0.5', unidade: 'kg' },
      },
      {
        ingrediente: {
          precoEmbalagem: '18',
          embalagem: { quantidade: '30', unidade: 'un' },
        },
        quantidadeUsada: { quantidade: '4', unidade: 'un' },
      },
      {
        ingrediente: {
          precoEmbalagem: '8',
          embalagem: { quantidade: '900', unidade: 'ml' },
        },
        quantidadeUsada: { quantidade: '500', unidade: 'ml' },
      },
      {
        ingrediente: {
          precoEmbalagem: '1.5',
          embalagem: { quantidade: '1', unidade: 'un' },
        },
        quantidadeUsada: { quantidade: '1', unidade: 'un' },
      },
    ];

    const custo = servico.calcular({ itens, rendimentoTeorico: '100' });

    expect(formatarDinheiro(custo.custoIngredientes)).toBe('68.34');
    expect(custo.custoIngredientes.toFixed(8)).toBe('68.34444444');
    expect(custo.custoDiretoTotal.eq(custo.custoIngredientes)).toBe(true);
    expect(custo.rendimentoReal.toFixed()).toBe('100');
    expect(formatarDinheiro(custo.custoDiretoUnitario)).toBe('0.68');
    expect(custo.custoDiretoUnitario.toFixed(8)).toBe('0.68344444');
  });

  it('inclui custos do lote e divide pelo rendimento já descontado da perda', () => {
    const receita: EntradaCustoReceita = {
      itens: [itemFarinha],
      rendimentoTeorico: '20',
      percentualPerda: '10',
      custoEmbalagem: '2.5',
      custoGasEnergia: '1.5',
      custoMaoDeObra: '3',
    };

    const custo = servico.calcular(receita);

    expect(custo.custoIngredientes.toFixed()).toBe('11');
    expect(custo.custoDiretoTotal.toFixed()).toBe('18');
    expect(custo.rendimentoReal.toFixed()).toBe('18');
    expect(custo.custoDiretoUnitario.toFixed()).toBe('1');
  });

  it('preserva o rendimento estimado fracionário', () => {
    const { rendimentoReal } = servico.calcular({
      itens: [itemFarinha],
      rendimentoTeorico: '101',
      percentualPerda: '5',
    });
    expect(rendimentoReal.toFixed()).toBe('95.95');
  });

  it.each(['0', '-1'])('rejeita rendimento %s', (rendimentoTeorico) => {
    expect(() =>
      servico.calcular({ itens: [itemFarinha], rendimentoTeorico }),
    ).toThrow(RendimentoInvalidoError);
  });

  it.each(['-1', '100'])(
    'rejeita perda de rendimento de %s%%',
    (percentualPerda) => {
      expect(() =>
        servico.calcular({
          itens: [itemFarinha],
          rendimentoTeorico: '10',
          percentualPerda,
        }),
      ).toThrow(PercentuaisInvalidosError);
    },
  );

  it('rejeita custo extra negativo', () => {
    expect(() =>
      servico.calcular({
        itens: [itemFarinha],
        rendimentoTeorico: '10',
        custoGasEnergia: '-1',
      }),
    ).toThrow(ValorInvalidoError);
  });
});
