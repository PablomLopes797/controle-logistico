import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

export type AccessLevel = 1 | 2;

export type UserPerfRow = {
  USER: string;
  NAME: string;
  PASSWORD: string;
  LEVEL: number | string;
};

export type AgendaRecRow = Record<string, unknown>;

export type AgendaPayload = {
  senha: string;
  dataAgenda: string;
  horaAgenda: string;
  fornecedor: string;
  plu: string;
  qtdCx: string;
  produto: string;
  categoria: string;
  valorRs: string;
  pesoCx: string;
  curvaItem: string;
  statusRuptura: string;
  qtdPaletes: string;
};

export type AgendaRejectedRecord = {
  senha: string;
  plu: string;
  dataAgenda: string;
  reason: string;
};

export type AgendaImportBatchReport = {
  batch: number;
  submitted: number;
  inserted: number;
  rejected: AgendaRejectedRecord[];
  status: "success" | "partial" | "failed";
  error?: string;
};

export type AgendaImportReport = {
  submitted: number;
  inserted: number;
  rejected: number;
  batches: AgendaImportBatchReport[];
};

const scryptAsync = promisify(scrypt);
const PASSWORD_PREFIX = "scrypt";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("A integração segura com o Supabase não foi configurada.");
  }

  return {
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`,
    serviceRoleKey,
  };
}

function responseHeaders(includeJson = false) {
  const { serviceRoleKey } = getSupabaseConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
  };
}

export async function readSupabaseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  if (!body.trim()) return undefined as T;
  return JSON.parse(body) as T;
}

async function requestSupabase<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { restUrl } = getSupabaseConfig();
  const response = await fetch(`${restUrl}${path}`, {
    ...init,
    headers: {
      ...responseHeaders(Boolean(init.body)),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha na integração com o Supabase (${response.status}): ${details}`);
  }

  return readSupabaseResponse<T>(response);
}

function encodeFilter(value: string) {
  return encodeURIComponent(value.trim());
}

export function normalizeLevel(value: number | string): AccessLevel {
  return Number(value) === 1 ? 1 : 2;
}

export function publicUser(row: UserPerfRow) {
  return {
    user: row.USER,
    name: row.NAME,
    level: normalizeLevel(row.LEVEL),
  };
}

export async function findUserByUsername(user: string) {
  const rows = await requestSupabase<UserPerfRow[]>(
    `/USER_PERF?select=USER,NAME,PASSWORD,LEVEL&USER=eq.${encodeFilter(user)}&limit=1`,
  );
  return rows[0] ?? null;
}

export async function listUsers() {
  const rows = await requestSupabase<UserPerfRow[]>(
    "/USER_PERF?select=USER,NAME,PASSWORD,LEVEL&order=USER.asc",
  );
  return rows.map(publicUser);
}

export async function createUser(input: {
  user: string;
  name: string;
  password: string;
  level: AccessLevel;
}) {
  const existing = await findUserByUsername(input.user);
  if (existing) throw new Error("Já existe um usuário com este identificador.");

  const row: UserPerfRow = {
    USER: input.user.trim(),
    NAME: input.name.trim(),
    PASSWORD: await hashPassword(input.password),
    LEVEL: input.level,
  };

  await requestSupabase<undefined>("/USER_PERF", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });

  return publicUser(row);
}

export async function updateUser(
  user: string,
  input: { name: string; level: AccessLevel; password?: string },
) {
  const patch: Record<string, unknown> = {
    NAME: input.name.trim(),
    LEVEL: input.level,
  };

  if (input.password) patch.PASSWORD = await hashPassword(input.password);

  await requestSupabase<undefined>(`/USER_PERF?USER=eq.${encodeFilter(user)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

export async function updateOwnPassword(user: string, password: string) {
  await requestSupabase<undefined>(`/USER_PERF?USER=eq.${encodeFilter(user)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ PASSWORD: await hashPassword(password) }),
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${PASSWORD_PREFIX}$${salt}$${derivedKey.toString("hex")}`;
}

function compareSafely(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export async function verifyPassword(password: string, storedPassword: string) {
  const [prefix, salt, encodedKey] = storedPassword.split("$");
  if (prefix === PASSWORD_PREFIX && salt && encodedKey) {
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return {
      valid: compareSafely(derivedKey.toString("hex"), encodedKey),
      legacy: false,
    };
  }

  return {
    valid: compareSafely(password, storedPassword),
    legacy: true,
  };
}

export async function authenticateUser(
  user: string,
  password: string,
  findUser: (user: string) => Promise<UserPerfRow | null> = findUserByUsername,
) {
  const row = await findUser(user);
  if (!row) return null;
  const verification = await verifyPassword(password, row.PASSWORD);
  if (!verification.valid) return null;
  return { session: publicUser(row), legacy: verification.legacy };
}

function toAgendaRecord(record: AgendaPayload) {
  return {
    SENHA: record.senha,
    "DATA AGENDA": record.dataAgenda,
    "HORA AGENDA": record.horaAgenda,
    FORNECEDOR: record.fornecedor,
    PLU: record.plu,
    "QTD CX": record.qtdCx,
    PRODUTO: record.produto,
    CATEGORIA: record.categoria,
    "VALOR R$": record.valorRs,
    "PESO CX": record.pesoCx,
    "CURVA ITEM": record.curvaItem,
    "STATUS DE RUPTURA": record.statusRuptura,
    "QTD DE PALETES": record.qtdPaletes,
  };
}

async function writeAgendaBatch(records: AgendaPayload[]) {
  await requestSupabase<undefined>("/AGENDA_REC", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(records.map(toAgendaRecord)),
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha não identificada ao gravar o registro.";
}

export async function insertAgendaRecords(
  records: AgendaPayload[],
  sendBatch: (records: AgendaPayload[]) => Promise<void> = writeAgendaBatch,
): Promise<AgendaImportReport> {
  const batchSize = 200;
  let inserted = 0;
  const batches: AgendaImportBatchReport[] = [];

  for (let index = 0; index < records.length; index += batchSize) {
    const batch = records.slice(index, index + batchSize);
    const batchNumber = batches.length + 1;

    try {
      await sendBatch(batch);
      inserted += batch.length;
      batches.push({ batch: batchNumber, submitted: batch.length, inserted: batch.length, rejected: [], status: "success" });
    } catch (batchError) {
      const rejected: AgendaRejectedRecord[] = [];
      let batchInserted = 0;

      for (const record of batch) {
        try {
          await sendBatch([record]);
          batchInserted += 1;
          inserted += 1;
        } catch (recordError) {
          rejected.push({ senha: record.senha, plu: record.plu, dataAgenda: record.dataAgenda, reason: errorMessage(recordError) });
        }
      }

      batches.push({
        batch: batchNumber,
        submitted: batch.length,
        inserted: batchInserted,
        rejected,
        status: batchInserted === 0 ? "failed" : "partial",
        error: errorMessage(batchError),
      });
    }
  }

  return { submitted: records.length, inserted, rejected: records.length - inserted, batches };
}

export async function listAgendaRecords() {
  const records: AgendaRecRow[] = [];
  const pageSize = 1_000;
  const maxRows = 20_000;

  for (let from = 0; from < maxRows; from += pageSize) {
    const page = await requestSupabase<AgendaRecRow[]>(
      `/AGENDA_REC?select=SENHA,DATA%20AGENDA,HORA%20AGENDA,FORNECEDOR,PLU,QTD%20CX,PRODUTO,CATEGORIA,VALOR%20R%24,PESO%20CX,CURVA%20ITEM,STATUS%20DE%20RUPTURA,QTD%20DE%20PALETES`,
      {
        headers: { Range: `${from}-${from + pageSize - 1}` },
      },
    );
    records.push(...page);
    if (page.length < pageSize) break;
  }

  return records;
}
