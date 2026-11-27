import { defineConfig } from 'prisma/config';
import {
  carregarAmbienteLocal,
  obterUrlBanco,
} from './src/core/prisma/ambiente-banco';

carregarAmbienteLocal();

// A conexão direta do Neon é usada pelas migrations quando configurada.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.DIRECT_DATABASE_URL || obterUrlBanco() },
});
