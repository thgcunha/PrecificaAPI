BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "UnidadeMedida" AS ENUM ('g', 'kg', 'ml', 'l', 'un');

-- CreateEnum
CREATE TYPE "TipoCanalVenda" AS ENUM ('BALCAO', 'MAQUININHA', 'IFOOD', 'WHATSAPP');

-- CreateTable
CREATE TABLE "Estabelecimento" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,

    CONSTRAINT "Estabelecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "estabelecimentoId" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senhaHash" VARCHAR(255) NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'OPERADOR',

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoCusto" (
    "estabelecimentoId" UUID NOT NULL,
    "despesasFixasMensais" DECIMAL(18,6) NOT NULL,
    "faturamentoMensal" DECIMAL(18,6) NOT NULL,
    "percentualImpostos" DECIMAL(8,6) NOT NULL DEFAULT 0,
    "percentualMargemAlvo" DECIMAL(8,6) NOT NULL DEFAULT 0,

    CONSTRAINT "ConfiguracaoCusto_pkey" PRIMARY KEY ("estabelecimentoId")
);

-- CreateTable
CREATE TABLE "Ingrediente" (
    "id" UUID NOT NULL,
    "estabelecimentoId" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "precoEmbalagem" DECIMAL(18,6) NOT NULL,
    "quantidadeEmbalagem" DECIMAL(18,6) NOT NULL,
    "unidadeEmbalagem" "UnidadeMedida" NOT NULL,

    CONSTRAINT "Ingrediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoPrecoIngrediente" (
    "id" UUID NOT NULL,
    "ingredienteId" UUID NOT NULL,
    "precoAnterior" DECIMAL(18,6) NOT NULL,
    "precoNovo" DECIMAL(18,6) NOT NULL,
    "registradoEm" TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT "HistoricoPrecoIngrediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receita" (
    "id" UUID NOT NULL,
    "estabelecimentoId" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" VARCHAR(500),
    "rendimentoTeorico" DECIMAL(18,6) NOT NULL,
    "percentualPerda" DECIMAL(8,6) NOT NULL DEFAULT 0,
    "custoEmbalagem" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "custoGasEnergia" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "custoMaoDeObra" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "publicada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Receita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemReceita" (
    "estabelecimentoId" UUID NOT NULL,
    "receitaId" UUID NOT NULL,
    "ingredienteId" UUID NOT NULL,
    "quantidadeUsada" DECIMAL(18,6) NOT NULL,
    "unidadeUsada" "UnidadeMedida" NOT NULL,
    "fatorCorrecao" DECIMAL(18,6) NOT NULL DEFAULT 1,

    CONSTRAINT "ItemReceita_pkey" PRIMARY KEY ("receitaId","ingredienteId")
);

-- CreateTable
CREATE TABLE "CanalVenda" (
    "id" UUID NOT NULL,
    "estabelecimentoId" UUID NOT NULL,
    "tipo" "TipoCanalVenda" NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "percentualMaquininha" DECIMAL(8,6) NOT NULL DEFAULT 0,
    "percentualCanal" DECIMAL(8,6) NOT NULL DEFAULT 0,

    CONSTRAINT "CanalVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecoPraticado" (
    "estabelecimentoId" UUID NOT NULL,
    "receitaId" UUID NOT NULL,
    "canalVendaId" UUID NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrecoPraticado_pkey" PRIMARY KEY ("receitaId","canalVendaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_estabelecimentoId_idx" ON "Usuario"("estabelecimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingrediente_estabelecimentoId_id_key" ON "Ingrediente"("estabelecimentoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Ingrediente_estabelecimentoId_nome_key" ON "Ingrediente"("estabelecimentoId", "nome");

-- CreateIndex
CREATE INDEX "HistoricoPrecoIngrediente_ingredienteId_registradoEm_idx" ON "HistoricoPrecoIngrediente"("ingredienteId", "registradoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Receita_estabelecimentoId_id_key" ON "Receita"("estabelecimentoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Receita_estabelecimentoId_nome_key" ON "Receita"("estabelecimentoId", "nome");

-- CreateIndex
CREATE INDEX "ItemReceita_estabelecimentoId_ingredienteId_idx" ON "ItemReceita"("estabelecimentoId", "ingredienteId");

-- CreateIndex
CREATE UNIQUE INDEX "CanalVenda_estabelecimentoId_id_key" ON "CanalVenda"("estabelecimentoId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CanalVenda_estabelecimentoId_tipo_key" ON "CanalVenda"("estabelecimentoId", "tipo");

-- CreateIndex
CREATE INDEX "PrecoPraticado_estabelecimentoId_canalVendaId_idx" ON "PrecoPraticado"("estabelecimentoId", "canalVendaId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracaoCusto" ADD CONSTRAINT "ConfiguracaoCusto_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingrediente" ADD CONSTRAINT "Ingrediente_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPrecoIngrediente" ADD CONSTRAINT "HistoricoPrecoIngrediente_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "Ingrediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemReceita" ADD CONSTRAINT "ItemReceita_estabelecimentoId_receitaId_fkey" FOREIGN KEY ("estabelecimentoId", "receitaId") REFERENCES "Receita"("estabelecimentoId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemReceita" ADD CONSTRAINT "ItemReceita_estabelecimentoId_ingredienteId_fkey" FOREIGN KEY ("estabelecimentoId", "ingredienteId") REFERENCES "Ingrediente"("estabelecimentoId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanalVenda" ADD CONSTRAINT "CanalVenda_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoPraticado" ADD CONSTRAINT "PrecoPraticado_estabelecimentoId_receitaId_fkey" FOREIGN KEY ("estabelecimentoId", "receitaId") REFERENCES "Receita"("estabelecimentoId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoPraticado" ADD CONSTRAINT "PrecoPraticado_estabelecimentoId_canalVendaId_fkey" FOREIGN KEY ("estabelecimentoId", "canalVendaId") REFERENCES "CanalVenda"("estabelecimentoId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Limites do domínio na persistência, inclusive para gravações fora da API.
ALTER TABLE "ConfiguracaoCusto"
  ADD CONSTRAINT "ConfiguracaoCusto_valores_check" CHECK (
    "despesasFixasMensais" >= 0 AND "despesasFixasMensais" < 'Infinity'::numeric
    AND "faturamentoMensal" > 0 AND "faturamentoMensal" < 'Infinity'::numeric
    AND "percentualImpostos" >= 0 AND "percentualImpostos" < 100
    AND "percentualMargemAlvo" >= 0 AND "percentualMargemAlvo" < 100
  );

ALTER TABLE "Ingrediente"
  ADD CONSTRAINT "Ingrediente_valores_check" CHECK (
    "precoEmbalagem" >= 0 AND "precoEmbalagem" < 'Infinity'::numeric
    AND "quantidadeEmbalagem" > 0 AND "quantidadeEmbalagem" < 'Infinity'::numeric
  );

ALTER TABLE "HistoricoPrecoIngrediente"
  ADD CONSTRAINT "HistoricoPrecoIngrediente_valores_check" CHECK (
    "precoAnterior" >= 0 AND "precoAnterior" < 'Infinity'::numeric
    AND "precoNovo" >= 0 AND "precoNovo" < 'Infinity'::numeric
    AND "precoAnterior" <> "precoNovo"
  );

ALTER TABLE "Receita"
  ADD CONSTRAINT "Receita_valores_check" CHECK (
    "rendimentoTeorico" > 0 AND "rendimentoTeorico" < 'Infinity'::numeric
    AND "percentualPerda" >= 0 AND "percentualPerda" < 100
    AND "custoEmbalagem" >= 0 AND "custoEmbalagem" < 'Infinity'::numeric
    AND "custoGasEnergia" >= 0 AND "custoGasEnergia" < 'Infinity'::numeric
    AND "custoMaoDeObra" >= 0 AND "custoMaoDeObra" < 'Infinity'::numeric
  );

ALTER TABLE "ItemReceita"
  ADD CONSTRAINT "ItemReceita_valores_check" CHECK (
    "quantidadeUsada" > 0 AND "quantidadeUsada" < 'Infinity'::numeric
    AND "fatorCorrecao" >= 1 AND "fatorCorrecao" < 'Infinity'::numeric
  );

ALTER TABLE "CanalVenda"
  ADD CONSTRAINT "CanalVenda_taxas_check" CHECK (
    "percentualMaquininha" >= 0 AND "percentualCanal" >= 0
    AND "percentualMaquininha" + "percentualCanal" < 100
  );

ALTER TABLE "PrecoPraticado"
  ADD CONSTRAINT "PrecoPraticado_valor_check" CHECK (valor > 0 AND valor < 'Infinity'::numeric);

COMMIT;
