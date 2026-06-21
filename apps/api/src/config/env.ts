import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DB_DRIVER: z.enum(["sqlite", "postgres"]).default("sqlite"),
  DATABASE_URL: z.string().default("file:./data/app.db"),
  JWT_SECRET: z.string().min(12).default("development-secret-change-me"),
  INITIAL_ADMIN_USERNAME: z.string().min(1).default("admin"),
  INITIAL_ADMIN_PASSWORD: z.string().min(8).default("admin123456"),
  INITIAL_ADMIN_DISPLAY_NAME: z.string().min(1).default("Administrator"),
  BACKUP_DIR: z.string().default("./backups"),
  EXCHANGE_RATE_PROVIDER: z.string().default("mock")
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === "production" && env.JWT_SECRET === "development-secret-change-me") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_SECRET"],
      message: "JWT_SECRET must be changed in production"
    });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  return envSchema.parse(input);
}
