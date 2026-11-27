export interface Paginacao {
  readonly pagina: number;
  readonly tamanho: number;
  readonly busca?: string;
}

export interface PaginatedResponse<T> {
  readonly itens: readonly T[];
  readonly pagina: number;
  readonly tamanho: number;
  readonly total: number;
}

export interface Repository<T> {
  buscarPorId(estabelecimentoId: string, id: string): Promise<T | null>;
  listar(
    estabelecimentoId: string,
    paginacao: Paginacao,
  ): Promise<PaginatedResponse<T>>;
}
