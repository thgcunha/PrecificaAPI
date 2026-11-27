import type { PaginatedResponse, Paginacao } from '../common/repository';
import { decimalNaoNegativo, type EntradaDecimal } from '../domain/decimal';
import { RecursoNaoEncontradoError, ValorInvalidoError } from '../domain/erros';
import {
  Prisma,
  type Ingrediente,
  type PrismaClient,
} from '../generated/prisma/client';
import type {
  IngredienteCadastrado,
  RepositorioIngredientes,
} from './contratos';
import { parametrosPaginacao } from './paginacao';

export function mapearIngrediente(
  registro: Ingrediente,
): IngredienteCadastrado {
  return {
    id: registro.id,
    nome: registro.nome,
    precoEmbalagem: registro.precoEmbalagem.toFixed(),
    embalagem: {
      quantidade: registro.quantidadeEmbalagem.toFixed(),
      unidade: registro.unidadeEmbalagem,
    },
  };
}

export class IngredientesPrismaRepository implements RepositorioIngredientes {
  constructor(private readonly prisma: PrismaClient) {}

  async buscarPorId(
    estabelecimentoId: string,
    id: string,
  ): Promise<IngredienteCadastrado | null> {
    const registro = await this.prisma.ingrediente.findUnique({
      where: { estabelecimentoId_id: { estabelecimentoId, id } },
    });
    return registro ? mapearIngrediente(registro) : null;
  }

  async listar(
    estabelecimentoId: string,
    paginacao: Paginacao,
  ): Promise<PaginatedResponse<IngredienteCadastrado>> {
    const { skip, take, busca } = parametrosPaginacao(paginacao);
    const where: Prisma.IngredienteWhereInput = {
      estabelecimentoId,
      ...(busca ? { nome: { contains: busca, mode: 'insensitive' } } : {}),
    };

    const [registros, total] = await this.prisma.$transaction(
      [
        this.prisma.ingrediente.findMany({
          where,
          skip,
          take,
          orderBy: { nome: 'asc' },
        }),
        this.prisma.ingrediente.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    return {
      itens: registros.map(mapearIngrediente),
      pagina: paginacao.pagina,
      tamanho: take,
      total,
    };
  }

  async atualizarPreco(
    estabelecimentoId: string,
    id: string,
    preco: EntradaDecimal,
  ): Promise<IngredienteCadastrado> {
    const novoPreco = decimalNaoNegativo(preco, 'Preço da embalagem');
    if (novoPreco.decimalPlaces() > 6 || novoPreco.gte('1000000000000')) {
      throw new ValorInvalidoError(
        'O preço da embalagem deve ter até 12 dígitos inteiros e 6 decimais.',
      );
    }
    const precoPersistido = novoPreco.toFixed();

    return this.prisma.$transaction(
      async (tx) => {
        // O bloqueio mantém a sequência do histórico quando duas alterações chegam juntas.
        const [anterior] = await tx.$queryRaw<
          { precoEmbalagem: Prisma.Decimal }[]
        >`
        SELECT "precoEmbalagem" FROM "Ingrediente"
        WHERE id = ${id}::uuid AND "estabelecimentoId" = ${estabelecimentoId}::uuid
        FOR UPDATE
      `;
        if (!anterior) {
          throw new RecursoNaoEncontradoError('Ingrediente não encontrado.');
        }

        const where = { estabelecimentoId_id: { estabelecimentoId, id } };
        if (anterior.precoEmbalagem.eq(precoPersistido)) {
          const atual = await tx.ingrediente.findUniqueOrThrow({ where });
          return mapearIngrediente(atual);
        }

        const atual = await tx.ingrediente.update({
          where,
          data: { precoEmbalagem: precoPersistido },
        });
        await tx.historicoPrecoIngrediente.create({
          data: {
            ingredienteId: id,
            precoAnterior: anterior.precoEmbalagem,
            precoNovo: atual.precoEmbalagem,
          },
        });

        return mapearIngrediente(atual);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
