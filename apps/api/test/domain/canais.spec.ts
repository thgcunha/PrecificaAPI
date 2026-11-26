import {
  Balcao,
  Ifood,
  Maquininha,
  WhatsApp,
  type CanalDeVenda,
} from '../../src/domain/canais';
import { PercentuaisInvalidosError } from '../../src/domain/erros';

describe('polimorfismo dos canais de venda', () => {
  it.each<{ canal: CanalDeVenda; maquininha: string; canalVenda: string }>([
    { canal: new Balcao(), maquininha: '0', canalVenda: '0' },
    { canal: new Maquininha('3.5'), maquininha: '3.5', canalVenda: '0' },
    { canal: new Ifood('25'), maquininha: '0', canalVenda: '25' },
    { canal: new Ifood('25', '3'), maquininha: '3', canalVenda: '25' },
    { canal: new WhatsApp(), maquininha: '0', canalVenda: '0' },
    { canal: new WhatsApp('4'), maquininha: '0', canalVenda: '4' },
  ])(
    'calcula as taxas do canal %# pela interface comum',
    ({ canal, maquininha, canalVenda }) => {
      const taxas = canal.calcularTaxas();
      expect(taxas.percentualMaquininha.toFixed()).toBe(maquininha);
      expect(taxas.percentualCanal.toFixed()).toBe(canalVenda);
    },
  );

  it.each<CanalDeVenda>([
    new Maquininha('-1'),
    new Ifood('100'),
    new Ifood('25', '101'),
    new WhatsApp('-1'),
  ])('rejeita taxa inválida no canal %#', (canal) => {
    expect(() => canal.calcularTaxas()).toThrow(PercentuaisInvalidosError);
  });
});
