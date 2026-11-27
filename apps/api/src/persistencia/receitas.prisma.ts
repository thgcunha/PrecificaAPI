import type {
  PaginatedResponse,
  Paginacao,
  Repository,
} from '../common/repository';
import { Prisma, type PrismaClient } from '../generated/prisma/client';
import type { ReceitaCadastrada } from './contratos';
import { mapearIngrediente } from './ingredientes.prisma';
import { parametrosPaginacao } from './paginacao';

const incluirItens = {
  itens: { include: { ingrediente: true }, orderBy: { ingredienteId: 'asc' } },
} satisfies Prisma.ReceitaInclude;

type RegistroReceita = Prisma.ReceitaGetPayload<{
  include: typeof incluirItens;
}>;

function mapearReceita(registro: RegistroReceita): ReceitaCadastrada {
  return {
    id: registro.id,
    nome: registro.nome,
    descricao: registro.descricao,
    publicada: registro.publicada,
    rendimentoTeorico: registro.rendimentoTeorico.toFixed(),
    percentualPerda: registro.percentualPerda.toFixed(),
    custoEmbalagem: registro.custoEmbalagem.toFixed(),
    custoGasEnergia: registro.custoGasEnergia.toFixed(),
    custoMaoDeObra: registro.custoMaoDeObra.toFixed(),
    itens: registro.itens.map((item) => ({
      ingrediente: mapearIngrediente(item.ingrediente),
      quantidadeUsada: {
        quantidade: item.quantidadeUsada.toFixed(),
        unidade: item.unidadeUsada,
      },
      fatorCorrecao: item.fatorCorrecao.toFixed(),
    })),
  };
}

export class ReceitasPrismaRepository implements Repository<ReceitaCadastrada> {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(
    estabelecimentoId: string,
    id: string,
  ): Promise<ReceitaCadastrada | null> {
    const registro = await this.prisma.receita.findUnique({
      where: { estabelecimentoId_id: { estabelecimentoId, id } },
      include: incluirItens,
    });
    return registro ? mapearReceita(registro) : null;
  }

  async listar(
    estabelecimentoId: string,
    paginacao: Paginacao,
  ): Promise<PaginatedResponse<ReceitaCadastrada>> {
    const { skip, take, busca } = parametrosPaginacao(paginacao);
    const where: Prisma.ReceitaWhereInput = {
      estabelecimentoId,
      ...(busca ? { nome: { contains: busca, mode: 'insensitive' } } : {}),
    };

    const [registros, total] = await this.prisma.$transaction(
      [
        this.prisma.receita.findMany({
          where,
          skip,
          take,
          include: incluirItens,
          orderBy: { nome: 'asc' },
        }),
        this.prisma.receita.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    return {
      itens: registros.map(mapearReceita),
      pagina: paginacao.pagina,
      tamanho: take,
      total,
    };
  }
}
