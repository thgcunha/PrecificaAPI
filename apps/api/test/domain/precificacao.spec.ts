import { Balcao, Ifood, Maquininha } from '../../src/domain/canais';
import {
  PercentuaisInvalidosError,
  ValorInvalidoError,
} from '../../src/domain/erros';
import { PrecificacaoService } from '../../src/domain/precificacao';

const vendaDireta = {
  canal: new Maquininha('3'),
  custoDiretoUnitario: '2.00',
  percentualDespesasFixas: '15',
  percentualImpostos: '4',
};
const vendaComMeta = { ...vendaDireta, percentualMargemDesejada: '20' };

describe('preço sugerido', () => {
  const servico = new PrecificacaoService();

  it('sugere R$ 3,45 na venda com maquininha e total de 42%', () => {
    const resultado = servico.calcularPrecoSugerido(vendaComMeta);
    expect(resultado.percentualTotal.toFixed()).toBe('42');
    expect(resultado.precoSugerido.toFixed(2)).toBe('3.45');
  });

  it('sugere R$ 6,07 no iFood com taxa de 25% adicional e total de 67%', () => {
    const resultado = servico.calcularPrecoSugerido({
      ...vendaComMeta,
      canal: new Ifood('25', '3'),
    });
    expect(resultado.percentualTotal.toFixed()).toBe('67');
    expect(resultado.precoSugerido.toFixed(2)).toBe('6.07');

    const margemNoPrecoSugerido = servico.calcularMargemReal({
      ...vendaDireta,
      canal: new Ifood('25', '3'),
      precoPraticado: resultado.precoSugerido,
    });
    expect(margemNoPrecoSugerido.percentualMargemReal.gte('20')).toBe(true);

    const margemEmSeisReaisESeisCentavos = servico.calcularMargemReal({
      ...vendaDireta,
      canal: new Ifood('25', '3'),
      precoPraticado: '6.06',
    });
    expect(margemEmSeisReaisESeisCentavos.percentualMargemReal.lt('20')).toBe(
      true,
    );
  });

  it('mantém o centavo quando o preço calculado já é exato', () => {
    const resultado = servico.calcularPrecoSugerido({
      canal: new Balcao(),
      custoDiretoUnitario: '3',
      percentualDespesasFixas: '0',
      percentualImpostos: '0',
      percentualMargemDesejada: '25',
    });
    expect(resultado.precoSugerido.toFixed(2)).toBe('4.00');
  });

  it.each(['78', '79'])(
    'rejeita a soma maior ou igual a 100%% com margem-alvo %s%%',
    (percentualMargemDesejada) => {
      expect(() =>
        servico.calcularPrecoSugerido({
          ...vendaComMeta,
          percentualMargemDesejada,
        }),
      ).toThrow(PercentuaisInvalidosError);
    },
  );

  it('aceita soma de percentuais abaixo de 100%, mesmo muito próxima do limite', () => {
    const resultado = servico.calcularPrecoSugerido({
      ...vendaComMeta,
      percentualMargemDesejada: '77.999',
    });
    expect(resultado.percentualTotal.toFixed()).toBe('99.999');
    expect(resultado.precoSugerido.toFixed(2)).toBe('200000.00');
  });

  it('rejeita custo direto negativo', () => {
    expect(() =>
      servico.calcularPrecoSugerido({
        ...vendaComMeta,
        custoDiretoUnitario: '-2',
      }),
    ).toThrow(ValorInvalidoError);
  });
});

describe('margem real e despesas fixas', () => {
  const servico = new PrecificacaoService();

  it.each([
    { precoPraticado: '5', lucro: '1.90', margem: '38' },
    { precoPraticado: '2', lucro: '-0.44', margem: '-22' },
  ])(
    'calcula o lucro e a margem reais para o preço $precoPraticado',
    ({ precoPraticado, lucro, margem }) => {
      const resultado = servico.calcularMargemReal({
        ...vendaDireta,
        precoPraticado,
      });
      expect(resultado.lucroUnitario.toFixed(2)).toBe(lucro);
      expect(resultado.percentualMargemReal.toFixed()).toBe(margem);
    },
  );

  it('rejeita preço praticado zero', () => {
    expect(() =>
      servico.calcularMargemReal({ ...vendaDireta, precoPraticado: '0' }),
    ).toThrow(ValorInvalidoError);
  });

  it('rejeita encargos somados de 100% mesmo sem margem desejada', () => {
    expect(() =>
      servico.calcularMargemReal({
        ...vendaDireta,
        precoPraticado: '5',
        percentualDespesasFixas: '93',
      }),
    ).toThrow(PercentuaisInvalidosError);
  });

  it('calcula a proporção mensal sobre faturamento realizado ou estimado', () => {
    expect(
      servico.calcularPercentualDespesasFixas('1500', '10000').toFixed(),
    ).toBe('15');
    expect(
      servico.calcularPercentualDespesasFixas('12000', '10000').toFixed(),
    ).toBe('120');
  });

  it('rejeita faturamento zero e despesa negativa', () => {
    expect(() => servico.calcularPercentualDespesasFixas('1500', '0')).toThrow(
      ValorInvalidoError,
    );
    expect(() =>
      servico.calcularPercentualDespesasFixas('-1', '10000'),
    ).toThrow(ValorInvalidoError);
  });
});
