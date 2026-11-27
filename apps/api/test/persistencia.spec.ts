import { randomUUID } from 'node:crypto';
import { criarPrismaClient } from '../src/core/prisma/criar-prisma-client';
import { formatarDinheiro } from '../src/domain/dinheiro';
import {
  RecursoNaoEncontradoError,
  ValorInvalidoError,
} from '../src/domain/erros';
import { CustoReceitaService } from '../src/domain/receita';
import type { PrismaClient } from '../src/generated/prisma/client';
import { IngredientesPrismaRepository } from '../src/persistencia/ingredientes.prisma';
import { ReceitasPrismaRepository } from '../src/persistencia/receitas.prisma';
import { RelatoriosPrismaRepository } from '../src/persistencia/relatorios.prisma';

const urlDeTeste = process.env.DATABASE_TEST_URL;
const suite = urlDeTeste ? describe : describe.skip;

suite('persistência no PostgreSQL com o seed de demonstração', () => {
  let prisma: PrismaClient;
  let salgadosId: string;
  let confeitariaId: string;

  beforeAll(async () => {
    if (!urlDeTeste) {
      throw new Error(
        'Defina DATABASE_TEST_URL com um banco descartável já migrado e populado.',
      );
    }
    prisma = criarPrismaClient(urlDeTeste);
    const [salgados, confeitaria] = await Promise.all([
      prisma.estabelecimento.findUniqueOrThrow({
        where: { slug: 'salgados-demo' },
      }),
      prisma.estabelecimento.findUniqueOrThrow({
        where: { slug: 'confeitaria-demo' },
      }),
    ]);
    salgadosId = salgados.id;
    confeitariaId = confeitaria.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('carrega dados dos dois perfis e persiste somente hashes bcrypt', async () => {
    const usuarios = await prisma.usuario.findMany({
      where: { estabelecimentoId: salgadosId },
      orderBy: { perfil: 'asc' },
    });
    expect(usuarios).toHaveLength(2);
    expect(usuarios.map((usuario) => usuario.perfil)).toEqual([
      'ADMIN',
      'OPERADOR',
    ]);
    for (const usuario of usuarios) {
      expect(usuario.senhaHash).toMatch(/^\$2[aby]\$12\$/u);
    }
  });

  it('paginar e buscar filtra por estabelecimento e devolve decimais para o domínio', async () => {
    const ingredientes = new IngredientesPrismaRepository(prisma);
    const { itens, total } = await ingredientes.listar(salgadosId, {
      pagina: 1,
      tamanho: 1,
      busca: ' FARINHA ',
    });
    expect(total).toBe(2);
    expect(itens).toHaveLength(1);
    const [ingrediente] = itens;
    if (!ingrediente) {
      throw new Error('O seed deve cadastrar os ingredientes da coxinha.');
    }
    expect(
      await ingredientes.buscarPorId(confeitariaId, ingrediente.id),
    ).toBeNull();

    const receitas = new ReceitasPrismaRepository(prisma);
    const lista = await receitas.listar(salgadosId, {
      pagina: 1,
      tamanho: 10,
      busca: 'coxinha',
    });
    expect(lista.total).toBe(1);
    const [item] = lista.itens;
    if (!item) {
      throw new Error('O seed deve cadastrar a coxinha.');
    }
    const receita = await receitas.buscarPorId(salgadosId, item.id);
    expect(receita?.itens).toHaveLength(8);
    expect(await receitas.buscarPorId(confeitariaId, item.id)).toBeNull();
    if (!receita) {
      throw new Error('A receita não foi recuperada.');
    }
    expect(
      formatarDinheiro(
        new CustoReceitaService().calcular(receita).custoIngredientes,
      ),
    ).toBe('68.34');
  });

  it('mantém uma sequência coerente de preços quando dois updates ocorrem juntos', async () => {
    const ingredientes = new IngredientesPrismaRepository(prisma);
    const { id } = await prisma.ingrediente.create({
      data: {
        estabelecimentoId: salgadosId,
        nome: `Insumo de teste ${randomUUID()}`,
        precoEmbalagem: '1',
        quantidadeEmbalagem: '1',
        unidadeEmbalagem: 'kg',
      },
    });

    try {
      await expect(
        ingredientes.atualizarPreco(confeitariaId, id, '2'),
      ).rejects.toThrow(RecursoNaoEncontradoError);
      await expect(
        ingredientes.atualizarPreco(salgadosId, id, '1.9999999'),
      ).rejects.toThrow(ValorInvalidoError);

      await Promise.all([
        ingredientes.atualizarPreco(salgadosId, id, '2.125'),
        ingredientes.atualizarPreco(salgadosId, id, '3.999999'),
      ]);
      const atual = await ingredientes.buscarPorId(salgadosId, id);
      if (!atual) {
        throw new Error(
          'O ingrediente de teste precisa existir após os updates.',
        );
      }
      await ingredientes.atualizarPreco(salgadosId, id, atual.precoEmbalagem);

      const historico = await prisma.historicoPrecoIngrediente.findMany({
        where: { ingredienteId: id },
        orderBy: { registradoEm: 'asc' },
      });
      expect(historico).toHaveLength(2);
      const [primeiro, segundo] = historico;
      expect(primeiro?.precoAnterior.toFixed()).toBe('1');
      expect(segundo?.precoAnterior.toFixed()).toBe(
        primeiro?.precoNovo.toFixed(),
      );
      expect(segundo?.precoNovo.toFixed()).toBe(atual.precoEmbalagem);
      expect(historico.map((item) => item.precoNovo.toFixed()).sort()).toEqual([
        '2.125',
        '3.999999',
      ]);
    } finally {
      await prisma.ingrediente.delete({ where: { id } });
    }
  });

  it('rejeita os vínculos de ingredientes e canais de outro estabelecimento', async () => {
    const [receita, ingrediente, canal] = await Promise.all([
      prisma.receita.findFirstOrThrow({
        where: { estabelecimentoId: salgadosId },
      }),
      prisma.ingrediente.findFirstOrThrow({
        where: { estabelecimentoId: confeitariaId },
      }),
      prisma.canalVenda.findFirstOrThrow({
        where: { estabelecimentoId: confeitariaId },
      }),
    ]);

    await expect(
      prisma.itemReceita.create({
        data: {
          estabelecimentoId: salgadosId,
          receitaId: receita.id,
          ingredienteId: ingrediente.id,
          quantidadeUsada: '1',
          unidadeUsada: ingrediente.unidadeEmbalagem,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });

    await expect(
      prisma.precoPraticado.create({
        data: {
          estabelecimentoId: salgadosId,
          receitaId: receita.id,
          canalVendaId: canal.id,
          valor: '1',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('agrupa a cobertura de preços e calcula o preço médio por canal', async () => {
    const resumo = new RelatoriosPrismaRepository(prisma);
    const canal = await prisma.canalVenda.findUniqueOrThrow({
      where: {
        estabelecimentoId_tipo: {
          estabelecimentoId: salgadosId,
          tipo: 'BALCAO',
        },
      },
    });
    const receita = await prisma.receita.create({
      data: {
        estabelecimentoId: salgadosId,
        nome: `Receita de teste ${randomUUID()}`,
        rendimentoTeorico: '1',
      },
    });

    try {
      await prisma.precoPraticado.create({
        data: {
          estabelecimentoId: salgadosId,
          receitaId: receita.id,
          canalVendaId: canal.id,
          valor: '4.50',
        },
      });
      const linhas = await resumo.agruparPrecosPorCanal(salgadosId);
      expect(linhas).toHaveLength(4);
      expect(linhas.find((linha) => linha.canalId === canal.id)).toMatchObject({
        nome: 'Balcão',
        quantidadeReceitasComPreco: 2,
        precoMedio: '4.00',
      });
      const outraLoja = await resumo.agruparPrecosPorCanal(confeitariaId);
      expect(outraLoja.find((linha) => linha.nome === 'Balcão')).toMatchObject({
        quantidadeReceitasComPreco: 1,
        precoMedio: '2.80',
      });
    } finally {
      await prisma.receita.delete({ where: { id: receita.id } });
    }
  });
});
