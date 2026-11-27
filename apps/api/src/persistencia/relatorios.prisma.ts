import { Prisma, type PrismaClient } from '../generated/prisma/client';
import type { RepositorioRelatorios, ResumoPrecosPorCanal } from './contratos';

export class RelatoriosPrismaRepository implements RepositorioRelatorios {
  constructor(private readonly prisma: PrismaClient) {}

  async agruparPrecosPorCanal(
    estabelecimentoId: string,
  ): Promise<readonly ResumoPrecosPorCanal[]> {
    const agrupar = {
      by: ['canalVendaId'],
      orderBy: { canalVendaId: 'asc' },
      where: { estabelecimentoId },
      _count: { _all: true },
      _avg: { valor: true },
    } satisfies Prisma.PrecoPraticadoGroupByArgs;
    const consultarGrupos = this.prisma.precoPraticado.groupBy(agrupar);
    const [canais, grupos] = await this.prisma.$transaction(
      [
        this.prisma.canalVenda.findMany({
          where: { estabelecimentoId },
          select: { id: true, nome: true },
          orderBy: { nome: 'asc' },
        }),
        consultarGrupos,
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const porCanal = new Map(
      grupos.map((grupo) => [grupo.canalVendaId, grupo]),
    );
    return canais.map((canal) => {
      const grupo = porCanal.get(canal.id);
      return {
        canalId: canal.id,
        nome: canal.nome,
        quantidadeReceitasComPreco: grupo?._count._all ?? 0,
        precoMedio: grupo?._avg.valor?.toFixed(2) ?? null,
      };
    });
  }
}
