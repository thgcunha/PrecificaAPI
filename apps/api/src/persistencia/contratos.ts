import type { Repository } from '../common/repository';
import type { EntradaDecimal } from '../domain/decimal';
import type { Ingrediente, ItemReceita } from '../domain/ingrediente';
import type { EntradaCustoReceita } from '../domain/receita';

export interface IngredienteCadastrado extends Ingrediente {
  readonly id: string;
  readonly nome: string;
  readonly precoEmbalagem: string;
}

export interface ItemReceitaCadastrado extends ItemReceita {
  readonly ingrediente: IngredienteCadastrado;
}

export interface ReceitaCadastrada extends EntradaCustoReceita {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string | null;
  readonly publicada: boolean;
  readonly itens: readonly ItemReceitaCadastrado[];
}

export interface RepositorioIngredientes extends Repository<IngredienteCadastrado> {
  atualizarPreco(
    estabelecimentoId: string,
    id: string,
    preco: EntradaDecimal,
  ): Promise<IngredienteCadastrado>;
}

export interface ResumoPrecosPorCanal {
  readonly canalId: string;
  readonly nome: string;
  readonly quantidadeReceitasComPreco: number;
  readonly precoMedio: string | null;
}

export interface RepositorioRelatorios {
  agruparPrecosPorCanal(
    estabelecimentoId: string,
  ): Promise<readonly ResumoPrecosPorCanal[]>;
}
