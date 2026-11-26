import Decimal from 'decimal.js';
import { decimal } from '../../src/domain/decimal';
import {
  arredondarPrecoSugerido,
  formatarDinheiro,
} from '../../src/domain/dinheiro';
import {
  UnidadeIncompativelError,
  ValorInvalidoError,
} from '../../src/domain/erros';
import { converterUnidade, type Unidade } from '../../src/domain/unidades';

describe('decimais e dinheiro', () => {
  it('recebe valores em texto e Decimal preservando dígitos', () => {
    const valor = '9007199254740993.01';
    expect(decimal(valor, 'Valor').toFixed()).toBe(valor);
    expect(decimal(new Decimal(valor), 'Valor').toFixed()).toBe(valor);
  });

  it.each(['', '1,25', '1.25\n', ' 1.25', 'NaN', '1e2'])(
    'rejeita o texto %p',
    (valor) => {
      expect(() => decimal(valor, 'Valor')).toThrow(ValorInvalidoError);
    },
  );

  it('rejeita number mesmo quando chega sem tipagem', () => {
    const valorBruto: unknown = 0.1;
    expect(() => decimal(valorBruto as string, 'Valor')).toThrow(
      ValorInvalidoError,
    );
  });

  it.each([new Decimal('Infinity'), new Decimal('NaN')])(
    'rejeita Decimal não finito %p',
    (valor) => {
      expect(() => decimal(valor, 'Valor')).toThrow(ValorInvalidoError);
    },
  );

  it('formata dinheiro com duas casas e arredonda preço sugerido só para cima', () => {
    const valor = decimal('6.0606060606', 'Preço');
    expect(formatarDinheiro(valor)).toBe('6.06');
    expect(arredondarPrecoSugerido(valor).toFixed(2)).toBe('6.07');
    expect(arredondarPrecoSugerido(decimal('6.07', 'Preço')).toFixed(2)).toBe(
      '6.07',
    );
    expect(formatarDinheiro('-1.235')).toBe('-1.24');
    expect(formatarDinheiro('2')).toBe('2.00');
  });
});

describe('conversão de unidades', () => {
  it.each<{
    quantidade: string;
    origem: Unidade;
    destino: Unidade;
    esperado: string;
  }>([
    { quantidade: '2.5', origem: 'kg', destino: 'g', esperado: '2500' },
    { quantidade: '100', origem: 'g', destino: 'kg', esperado: '0.1' },
    { quantidade: '1.5', origem: 'l', destino: 'ml', esperado: '1500' },
    { quantidade: '500', origem: 'ml', destino: 'l', esperado: '0.5' },
    { quantidade: '4', origem: 'un', destino: 'un', esperado: '4' },
    { quantidade: '0', origem: 'g', destino: 'g', esperado: '0' },
  ])(
    'converte $quantidade $origem para $destino',
    ({ quantidade, origem, destino, esperado }) => {
      expect(
        converterUnidade({ quantidade, unidade: origem }, destino).toFixed(),
      ).toBe(esperado);
    },
  );

  it.each<{ origem: Unidade; destino: Unidade }>([
    { origem: 'g', destino: 'ml' },
    { origem: 'un', destino: 'kg' },
    { origem: 'kg', destino: 'un' },
    { origem: 'caixa' as Unidade, destino: 'un' },
    { origem: 'kg', destino: 'toString' as Unidade },
  ])('rejeita a conversão de $origem para $destino', ({ origem, destino }) => {
    expect(() =>
      converterUnidade({ quantidade: '1', unidade: origem }, destino),
    ).toThrow(UnidadeIncompativelError);
  });

  it('rejeita quantidade negativa', () => {
    expect(() =>
      converterUnidade({ quantidade: '-1', unidade: 'kg' }, 'g'),
    ).toThrow(ValorInvalidoError);
  });
});
