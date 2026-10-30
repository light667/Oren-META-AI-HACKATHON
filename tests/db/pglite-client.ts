/**
 * Adaptateur minimal PostgREST -> PGlite, pour les tests uniquement.
 *
 * Il permet d'exécuter le VRAI SupabaseAssistantStore (mêmes requêtes,
 * même code) contre un vrai PostgreSQL (PGlite) chargé avec les vraies
 * migrations du dépôt. Seule la couche HTTP PostgREST est remplacée ;
 * les contraintes, la RLS (contournée ici comme service_role, connexion
 * superutilisateur) et les types sont ceux de la base réelle.
 * Le projet distant, lui, est testé avec le vrai client Supabase.
 */
import type { PGlite } from "@electric-sql/pglite";

type Row = Record<string, unknown>;

interface Filter {
  column: string;
  op: "eq" | "is" | "in";
  value: unknown;
}

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

class QueryBuilder implements PromiseLike<QueryResult> {
  private mode: "select" | "insert" | "update" = "select";
  private payload: Row | Row[] | null = null;
  private readonly filters: Filter[] = [];
  private readonly orderBy: { column: string; ascending: boolean }[] = [];
  private limitCount: number | null = null;
  private singleMode: "none" | "single" | "maybe" = "none";
  private returnCols = "*";

  constructor(
    private readonly db: PGlite,
    private readonly table: string,
  ) {}

  select(cols = "*"): this {
    this.returnCols = cols;
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row): this {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push({ column, op: "is", value });
    return this;
  }

  in(column: string, value: unknown[]): this {
    this.filters.push({ column, op: "in", value });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.orderBy.push({ column, ascending: opts?.ascending !== false });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.singleMode = "single";
    return this;
  }

  maybeSingle(): this {
    this.singleMode = "maybe";
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onFulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onFulfilled, onRejected);
  }

  private buildWhere(params: unknown[]): string {
    if (this.filters.length === 0) return "";
    const parts = this.filters.map((f) => {
      if (f.op === "is") {
        return f.value === null ? `${f.column} is null` : `${f.column} is true`;
      }
      if (f.op === "in") {
        const values = f.value as unknown[];
        const placeholders = values.map((v) => {
          params.push(v);
          return `$${params.length}`;
        });
        return `${f.column} in (${placeholders.join(", ")})`;
      }
      params.push(f.value);
      return `${f.column} = $${params.length}`;
    });
    return ` where ${parts.join(" and ")}`;
  }

  private async execute(): Promise<QueryResult> {
    try {
      const params: unknown[] = [];
      let rows: Row[] = [];
      if (this.mode === "insert") {
        const records = Array.isArray(this.payload) ? this.payload : [this.payload!];
        for (const record of records) {
          const cols = Object.keys(record);
          const placeholders = cols.map((col) => {
            params.push(record[col]);
            return `$${params.length}`;
          });
          const sql = `insert into ${this.table} (${cols.join(", ")}) values (${placeholders.join(", ")}) returning ${this.returnCols}`;
          const res = await this.db.query<Row>(sql, params.splice(0, params.length));
          rows.push(...res.rows);
        }
      } else if (this.mode === "update") {
        const record = this.payload as Row;
        const sets = Object.keys(record).map((col) => {
          params.push(record[col]);
          return `${col} = $${params.length}`;
        });
        const sql = `update ${this.table} set ${sets.join(", ")}${this.buildWhere(params)} returning ${this.returnCols}`;
        const res = await this.db.query<Row>(sql, params);
        rows = res.rows;
        if (this.returnCols === "*") {
          // Mise à jour sans .select() : PostgREST renvoie data = null.
          return { data: null, error: null };
        }
      } else {
        let sql = `select ${this.returnCols} from ${this.table}${this.buildWhere(params)}`;
        if (this.orderBy.length > 0) {
          sql += ` order by ${this.orderBy.map((o) => `${o.column} ${o.ascending ? "asc" : "desc"}`).join(", ")}`;
        }
        if (this.limitCount !== null) sql += ` limit ${this.limitCount}`;
        const res = await this.db.query<Row>(sql, params);
        rows = res.rows;
      }
      if (this.singleMode === "single") {
        if (rows.length === 0) return { data: null, error: { message: "0 ligne renvoyée" } };
        return { data: rows[0], error: null };
      }
      if (this.singleMode === "maybe") {
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  }
}

/** Forme minimale compatible avec l'usage qu'en fait SupabaseAssistantStore. */
export function createPgliteSupabaseClient(db: PGlite) {
  return {
    from: (table: string) => new QueryBuilder(db, table),
  };
}
