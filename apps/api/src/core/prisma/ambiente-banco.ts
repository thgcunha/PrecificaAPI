import { config } from 'dotenv';
import { resolve } from 'node:path';

export function carregarAmbienteLocal(): void {
  config({ path: resolve(__dirname, '../../../../../.env'), quiet: true });
}

export function obterUrlBanco(): string | undefined {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const {
    POSTGRES_USER: usuario,
    POSTGRES_PASSWORD: senha,
    POSTGRES_DB: banco,
  } = process.env;
  if (!usuario || !senha || !banco) {
    return undefined;
  }

  const porta = process.env.POSTGRES_PORT || '5432';
  return `postgresql://${encodeURIComponent(usuario)}:${encodeURIComponent(senha)}@127.0.0.1:${porta}/${encodeURIComponent(banco)}`;
}
