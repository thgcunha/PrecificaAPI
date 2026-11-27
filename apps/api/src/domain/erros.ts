export class ErroDeDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

export class ValorInvalidoError extends ErroDeDominio {}

export class PercentuaisInvalidosError extends ErroDeDominio {}

export class UnidadeIncompativelError extends ErroDeDominio {}

export class RendimentoInvalidoError extends ErroDeDominio {}

export class MargemContribuicaoInvalidaError extends ErroDeDominio {}

export class RecursoNaoEncontradoError extends ErroDeDominio {}
