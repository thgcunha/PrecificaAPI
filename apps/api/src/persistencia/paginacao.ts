import type { Paginacao } from '../common/repository';
import { ValorInvalidoError } from '../domain/erros';

export function parametrosPaginacao({ pagina, tamanho, busca }: Paginacao) {
  const skip = (pagina - 1) * tamanho;
  if (
    !Number.isInteger(pagina) ||
    pagina < 1 ||
    !Number.isInteger(tamanho) ||
    tamanho < 1 ||
    tamanho > 100 ||
    skip > 2_147_483_647
  ) {
    throw new ValorInvalidoError(
      'Use página a partir de 1 e tamanho entre 1 e 100.',
    );
  }

  return { skip, take: tamanho, busca: busca?.trim() };
}
