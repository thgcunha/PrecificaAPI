import { Balcao, Ifood } from '../../src/domain/canais';
import {
  MargemContribuicaoInvalidaError,
  PercentuaisInvalidosError,
  ValorInvalidoError,
} from '../../src/domain/erros';
import { PontoEquilibrioService } from '../../src/domain/ponto-equilibrio';

const venda = {
  canal: new Ifood('25', '3'),
  percentualImpostos: '4',
  precoPraticado: '5',
  custoDiretoUnitario: '2',
  despesasFixasMensais: '100',
};

describe('ponto de equilíbrio', () => {
  const servico = new PontoEquilibrioService();

  it('aplica apenas impostos e taxas na contribuição e arredonda unidades para cima', () => {
    const resultado = servico.calcular(venda);
    expect(resultado.margemContribuicaoUnitaria.toFixed(2)).toBe('1.40');
    expect(resultado.unidadesPorMes.toFixed()).toBe('72');
  });

  it('mantém resultado inteiro exato e aceita ausência de despesas fixas', () => {
    expect(
      servico
        .calcular({ ...venda, despesasFixasMensais: '14' })
        .unidadesPorMes.toFixed(),
    ).toBe('10');
    expect(
      servico
        .calcular({ ...venda, despesasFixasMensais: '0' })
        .unidadesPorMes.toFixed(),
    ).toBe('0');
  });

  it.each(['2', '1'])(
    'rejeita contribuição nula ou negativa com preço %s',
    (precoPraticado) => {
      expect(() =>
        servico.calcular({
          ...venda,
          canal: new Balcao(),
          percentualImpostos: '0',
          precoPraticado,
        }),
      ).toThrow(MargemContribuicaoInvalidaError);
    },
  );

  it('rejeita custo fixo negativo e preço praticado zero', () => {
    expect(() =>
      servico.calcular({ ...venda, despesasFixasMensais: '-1' }),
    ).toThrow(ValorInvalidoError);
    expect(() => servico.calcular({ ...venda, precoPraticado: '0' })).toThrow(
      ValorInvalidoError,
    );
  });

  it('rejeita taxas variáveis cuja soma chega a 100%', () => {
    expect(() =>
      servico.calcular({ ...venda, percentualImpostos: '72' }),
    ).toThrow(PercentuaisInvalidosError);
  });
});
