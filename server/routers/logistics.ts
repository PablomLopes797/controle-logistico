import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  clearPerformanceSession,
  getPerformanceSession,
  requireLevelOne,
  requirePerformanceSession,
  writePerformanceSession,
} from "../logisticsAuth";
import { buildReceptionDashboard } from "../receptionAnalytics";
import {
  authenticateUser,
  createUser,
  findUserByUsername,
  insertAgendaRecords,
  listAgendaRecords,
  listUsers,
  normalizeLevel,
  publicUser,
  updateOwnPassword,
  updateUser,
  verifyPassword,
} from "../supabase";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Informe ao menos 3 caracteres para o usuário.")
  .max(60)
  .regex(/^[A-Za-z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado.");

const strongPasswordSchema = z.string().min(8, "A senha deve ter ao menos 8 caracteres.").max(128);
const agendaRecordSchema = z.object({
  senha: z.string().trim().min(1, "A coluna SENHA é obrigatória."),
  dataAgenda: z.string().trim().min(1, "A coluna DATA AGENDA é obrigatória."),
  horaAgenda: z.string().trim(),
  fornecedor: z.string().trim(),
  plu: z.string().trim(),
  qtdCx: z.string().trim(),
  produto: z.string().trim(),
  categoria: z.string().trim(),
  valorRs: z.string().trim(),
  pesoCx: z.string().trim(),
  curvaItem: z.string().trim(),
  statusRuptura: z.string().trim(),
  qtdPaletes: z.string().trim(),
});

export const logisticsRouter = router({
  session: publicProcedure.query(async ({ ctx }) => getPerformanceSession(ctx.req)),
  login: publicProcedure
    .input(z.object({ user: usernameSchema, password: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const authentication = await authenticateUser(input.user, input.password);
      if (!authentication) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos." });
      }

      if (authentication.legacy) await updateOwnPassword(authentication.session.user, input.password);
      await writePerformanceSession(ctx.req, ctx.res, authentication.session);
      return authentication.session;
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    clearPerformanceSession(ctx.req, ctx.res);
    return { success: true } as const;
  }),
  changeOwnPassword: publicProcedure
    .input(z.object({ currentPassword: z.string().min(1).max(128), newPassword: strongPasswordSchema }))
    .mutation(async ({ ctx, input }) => {
      const session = await requirePerformanceSession(ctx.req);
      const row = await findUserByUsername(session.user);
      if (!row) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não localizado." });
      const verification = await verifyPassword(input.currentPassword, row.PASSWORD);
      if (!verification.valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "A senha atual está incorreta." });
      }
      await updateOwnPassword(session.user, input.newPassword);
      return { success: true } as const;
    }),
  users: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const session = await requirePerformanceSession(ctx.req);
      requireLevelOne(session);
      return listUsers();
    }),
    create: publicProcedure
      .input(z.object({ user: usernameSchema, name: z.string().trim().min(3).max(120), password: strongPasswordSchema, level: z.union([z.literal(1), z.literal(2)]) }))
      .mutation(async ({ ctx, input }) => {
        const session = await requirePerformanceSession(ctx.req);
        requireLevelOne(session);
        return createUser(input);
      }),
    update: publicProcedure
      .input(z.object({ user: usernameSchema, name: z.string().trim().min(3).max(120), level: z.union([z.literal(1), z.literal(2)]), password: strongPasswordSchema.optional() }))
      .mutation(async ({ ctx, input }) => {
        const session = await requirePerformanceSession(ctx.req);
        requireLevelOne(session);
        await updateUser(input.user, input);
        return { success: true } as const;
      }),
  }),
  agenda: router({
    import: publicProcedure
      .input(z.object({ records: z.array(agendaRecordSchema).min(1).max(5_000) }))
      .mutation(async ({ ctx, input }) => {
        await requirePerformanceSession(ctx.req);
        return insertAgendaRecords(input.records);
      }),
  }),
  reception: router({
    dashboard: publicProcedure.query(async ({ ctx }) => {
      await requirePerformanceSession(ctx.req);
      const rows = await listAgendaRecords();
      return buildReceptionDashboard(rows);
    }),
  }),
});
