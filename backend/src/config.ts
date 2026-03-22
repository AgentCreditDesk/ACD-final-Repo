import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  RPC_URL: z.string().default("https://sepolia.base.org"),
  CHAIN_ID: z.coerce.number().default(84532),
  TREASURY_PRIVATE_KEY: z.string().default(""),
  TREASURY_MNEMONIC: z.string().default(""),
  LOAN_VAULT_FACTORY_ADDRESS: z.string().default(""),
  CREDIT_SCORE_ORACLE_ADDRESS: z.string().default(""),
  USDT_ADDRESS: z.string().default(""),
  AAVE_POOL_ADDRESS: z.string().default(""),
  PORT: z.coerce.number().default(3001),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
