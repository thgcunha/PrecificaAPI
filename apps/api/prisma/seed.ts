import { hash } from 'bcryptjs';
import {
  carregarAmbienteLocal,
  obterUrlBanco,
} from '../src/core/prisma/ambiente-banco';
import { criarPrismaClient } from '../src/core/prisma/criar-prisma-client';
import type { Prisma, UnidadeMedida } from '../src/generated/prisma/client';

interface InsumoDemo {
  readonly nome: string;
  readonly preco: string;
  readonly embalagem: string;
  readonly unidade: UnidadeMedida;
  readonly quantidadeUsada: string;
  readonly fatorCorrecao?: string;
}

interface EstabelecimentoDemo {
  readonly slug: string;
  readonly nome: string;
  readonly receita: string;
  readonly rendimento: string;
  readonly precoBalcao: string;
  readonly precoIfood: string;
  readonly insumos: readonly InsumoDemo[];
}

const demonstracoes: readonly EstabelecimentoDemo[] = [
  {
    slug: 'salgados-demo',
    nome: 'Cozinha Demo de Salgados',
    receita: 'Coxinha de frango',
    rendimento: '100',
    precoBalcao: '3.50',
    precoIfood: '6.10',
    insumos: [
      {
        nome: 'Farinha de trigo',
        preco: '22',
        embalagem: '5',
        unidade: 'kg',
        quantidadeUsada: '2.5',
      },
      {
        nome: 'Peito de frango',
        preco: '18',
        embalagem: '1',
        unidade: 'kg',
        quantidadeUsada: '2',
        fatorCorrecao: '1.15',
      },
      {
        nome: 'Margarina',
        preco: '9',
        embalagem: '500',
        unidade: 'g',
        quantidadeUsada: '100',
      },
      {
        nome: 'Cebola',
        preco: '6',
        embalagem: '1',
        unidade: 'kg',
        quantidadeUsada: '0.3',
      },
      {
        nome: 'Farinha de rosca',
        preco: '8',
        embalagem: '1',
        unidade: 'kg',
        quantidadeUsada: '0.5',
      },
      {
        nome: 'Ovos',
        preco: '18',
        embalagem: '30',
        unidade: 'un',
        quantidadeUsada: '4',
      },
      {
        nome: 'Óleo',
        preco: '8',
        embalagem: '900',
        unidade: 'ml',
        quantidadeUsada: '500',
      },
      {
        nome: 'Porção de temperos',
        preco: '1.50',
        embalagem: '1',
        unidade: 'un',
        quantidadeUsada: '1',
      },
    ],
  },
  {
    slug: 'confeitaria-demo',
    nome: 'Confeitaria Demo',
    receita: 'Brigadeiro',
    rendimento: '25',
    precoBalcao: '2.80',
    precoIfood: '4.75',
    insumos: [
      {
        nome: 'Leite condensado',
        preco: '7.50',
        embalagem: '395',
        unidade: 'g',
        quantidadeUsada: '395',
      },
      {
        nome: 'Cacau em pó',
        preco: '14',
        embalagem: '200',
        unidade: 'g',
        quantidadeUsada: '30',
      },
      {
        nome: 'Granulado',
        preco: '12',
        embalagem: '500',
        unidade: 'g',
        quantidadeUsada: '80',
      },
    ],
  },
];

const canais = [
  {
    tipo: 'BALCAO',
    nome: 'Balcão',
    percentualMaquininha: '0',
    percentualCanal: '0',
  },
  {
    tipo: 'MAQUININHA',
    nome: 'Maquininha',
    percentualMaquininha: '3',
    percentualCanal: '0',
  },
  {
    tipo: 'IFOOD',
    nome: 'iFood',
    percentualMaquininha: '0',
    percentualCanal: '25',
  },
  {
    tipo: 'WHATSAPP',
    nome: 'WhatsApp',
    percentualMaquininha: '0',
    percentualCanal: '0',
  },
] as const;

function lerSenha(
  chave: 'SEED_ADMIN_PASSWORD' | 'SEED_OPERADOR_PASSWORD',
): string {
  const senha = process.env[chave];
  if (!senha || senha.length < 12 || Buffer.byteLength(senha, 'utf-8') > 72) {
    throw new Error(
      `Defina ${chave} com pelo menos 12 caracteres e no máximo 72 bytes para executar o seed.`,
    );
  }
  return senha;
}

async function semearEstabelecimento(
  tx: Prisma.TransactionClient,
  demo: EstabelecimentoDemo,
  senhas: { admin: string; operador: string },
): Promise<void> {
  const { id: estabelecimentoId } = await tx.estabelecimento.upsert({
    where: { slug: demo.slug },
    create: { slug: demo.slug, nome: demo.nome },
    update: {},
  });

  await tx.configuracaoCusto.upsert({
    where: { estabelecimentoId },
    create: {
      estabelecimentoId,
      despesasFixasMensais: '1500',
      faturamentoMensal: '10000',
      percentualImpostos: '4',
      percentualMargemAlvo: '20',
    },
    update: {},
  });

  const usuarios = [
    {
      email: `admin@${demo.slug}.test`,
      nome: 'Admin Demo',
      perfil: 'ADMIN',
      senhaHash: senhas.admin,
    },
    {
      email: `operador@${demo.slug}.test`,
      nome: 'Operador Demo',
      perfil: 'OPERADOR',
      senhaHash: senhas.operador,
    },
  ] as const;

  for (const usuario of usuarios) {
    await tx.usuario.upsert({
      where: { email: usuario.email },
      create: { estabelecimentoId, ...usuario },
      update: {},
    });
  }

  const { id: receitaId } = await tx.receita.upsert({
    where: {
      estabelecimentoId_nome: { estabelecimentoId, nome: demo.receita },
    },
    create: {
      estabelecimentoId,
      nome: demo.receita,
      descricao: 'Produto fictício para demonstração da precificação.',
      rendimentoTeorico: demo.rendimento,
      publicada: true,
    },
    update: {},
  });

  for (const insumo of demo.insumos) {
    const { id: ingredienteId } = await tx.ingrediente.upsert({
      where: {
        estabelecimentoId_nome: { estabelecimentoId, nome: insumo.nome },
      },
      create: {
        estabelecimentoId,
        nome: insumo.nome,
        precoEmbalagem: insumo.preco,
        quantidadeEmbalagem: insumo.embalagem,
        unidadeEmbalagem: insumo.unidade,
      },
      update: {},
    });

    await tx.itemReceita.upsert({
      where: { receitaId_ingredienteId: { receitaId, ingredienteId } },
      create: {
        estabelecimentoId,
        receitaId,
        ingredienteId,
        quantidadeUsada: insumo.quantidadeUsada,
        unidadeUsada: insumo.unidade,
        fatorCorrecao: insumo.fatorCorrecao ?? '1',
      },
      update: {},
    });
  }

  for (const canal of canais) {
    const { id: canalVendaId } = await tx.canalVenda.upsert({
      where: {
        estabelecimentoId_tipo: { estabelecimentoId, tipo: canal.tipo },
      },
      create: { estabelecimentoId, ...canal },
      update: {},
    });
    const valor = canal.tipo === 'IFOOD' ? demo.precoIfood : demo.precoBalcao;

    await tx.precoPraticado.upsert({
      where: { receitaId_canalVendaId: { receitaId, canalVendaId } },
      create: { estabelecimentoId, receitaId, canalVendaId, valor },
      update: {},
    });
  }
}

async function main(): Promise<void> {
  carregarAmbienteLocal();
  const url = process.env.DIRECT_DATABASE_URL || obterUrlBanco();
  if (!url) {
    throw new Error(
      'Configure DATABASE_URL ou as variáveis POSTGRES_* do Docker local.',
    );
  }

  const senhaAdmin = lerSenha('SEED_ADMIN_PASSWORD');
  const senhaOperador = lerSenha('SEED_OPERADOR_PASSWORD');
  if (senhaAdmin === senhaOperador) {
    throw new Error(
      'As duas senhas dos usuários de demonstração devem ser diferentes.',
    );
  }

  const prisma = criarPrismaClient(url);
  try {
    for (const demonstracao of demonstracoes) {
      const [admin, operador] = await Promise.all([
        hash(senhaAdmin, 12),
        hash(senhaOperador, 12),
      ]);
      await prisma.$transaction((tx) =>
        semearEstabelecimento(tx, demonstracao, { admin, operador }),
      );
    }
    console.log(
      'Seed concluído com dados fictícios de salgados e confeitaria.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((erro: unknown) => {
  console.error(erro);
  process.exitCode = 1;
});
