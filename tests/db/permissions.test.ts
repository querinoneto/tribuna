import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  as,
  dbAvailable,
  asRoot,
  closePool,
  createUser,
  expectDenied,
  resetDatabase,
  sectionId,
  uniqueSlug,
  type TestUser,
} from "./helpers";

const DB = await dbAvailable();

let admin: TestUser;
let editor: TestUser;
let colunista: TestUser;
let colunista2: TestUser;
let intruso: TestUser;
let politica: string;

beforeAll(async () => {
  if (!DB) return;
  await resetDatabase();
  admin = await createUser("querino.neto@gmail.com"); // já é admin pelo seed
  editor = await createUser("editora@tribuna.test", "editor");
  colunista = await createUser("colunista@tribuna.test", "colunista");
  colunista2 = await createUser("outra.colunista@tribuna.test", "colunista");
  intruso = await createUser("intruso@exemplo.test");
  politica = await sectionId("politica");
}, 60_000);

afterAll(async () => {
  if (DB) await closePool();
});

/** Cria uma matéria diretamente (como sistema) para montar cenários. */
async function seedArticle(opts: {
  status?: string;
  createdBy?: string | null;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  title?: string;
}) {
  const slug = uniqueSlug();
  return asRoot(async (c) => {
    const { rows } = await c.query(
      `insert into articles (title, slug, status, published_at, scheduled_at, created_by, section_id)
       values ($1, $2, $3, $4, $5, $6, $7) returning id, slug`,
      [
        opts.title ?? "Texto de teste",
        slug,
        opts.status ?? "draft",
        opts.publishedAt ?? null,
        opts.scheduledAt ?? null,
        opts.createdBy ?? null,
        politica,
      ],
    );
    return rows[0] as { id: string; slug: string };
  });
}

describe.runIf(DB)("visitante (sem conta)", () => {
  it("vê apenas matérias publicadas", async () => {
    const rascunho = await seedArticle({ status: "draft" });
    const futuro = await seedArticle({
      status: "scheduled",
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const arquivado = await seedArticle({ status: "archived" });

    const ids = await as(null, async (c) => (await c.query("select id, status from articles")).rows);
    const visiveis = ids.map((r) => r.id);
    expect(ids.every((r) => r.status === "published" || r.status === "scheduled")).toBe(true);
    expect(visiveis).not.toContain(rascunho.id);
    expect(visiveis).not.toContain(futuro.id);
    expect(visiveis).not.toContain(arquivado.id);
    expect(visiveis.length).toBeGreaterThanOrEqual(3); // as 3 do seed
  });

  it("não cria nem edita matérias", async () => {
    await expectDenied(
      as(null, (c) => c.query("insert into articles (title, slug) values ('x', $1)", [uniqueSlug()])),
    );
    const n = await as(null, async (c) => (await c.query("update articles set title = 'hackeado'")).rowCount);
    expect(n).toBe(0);
  });

  it("assina a newsletter mas não lê a lista de inscritos", async () => {
    await as(null, async (c) => {
      await c.query("insert into subscribers (email) values ('leitora@exemplo.test')");
      const { rowCount } = await c.query("select * from subscribers");
      expect(rowCount).toBe(0);
    });
  });

  it("não lê a lista autorizada nem os perfis", async () => {
    await as(null, async (c) => {
      expect((await c.query("select * from allowed_emails")).rowCount).toBe(0);
      expect((await c.query("select * from profiles")).rowCount).toBe(0);
    });
  });

  it("incrementa leituras só de matérias publicadas", async () => {
    const pub = await seedArticle({ status: "published", publishedAt: new Date(Date.now() - 1000).toISOString() });
    const draft = await seedArticle({ status: "draft" });
    await as(null, async (c) => {
      await c.query("select increment_views($1)", [pub.id]);
      await c.query("select increment_views($1)", [draft.id]);
    });
    // a transação de `as` é desfeita; rodamos de novo fora dela para conferir
    await asRoot(async (c) => {
      await c.query("set role anon");
      await c.query("select increment_views($1)", [pub.id]);
      await c.query("select increment_views($1)", [draft.id]);
      await c.query("reset role");
      const { rows } = await c.query("select id, views from articles where id = any($1)", [[pub.id, draft.id]]);
      const views = Object.fromEntries(rows.map((r) => [r.id, r.views]));
      expect(views[pub.id]).toBe(1);
      expect(views[draft.id]).toBe(0);
    });
  });

  it("busca encontra só o que está publicado", async () => {
    await seedArticle({ status: "draft", title: "Cooperativa de catadores rascunho secreto" });
    const rows = await as(null, async (c) => (await c.query("select slug from search_articles('entregadores')")).rows);
    expect(rows.map((r) => r.slug)).toContain("entregadores-param-as-capitais");
    const secreto = await as(null, async (c) => (await c.query("select slug from search_articles('catadores')")).rows);
    expect(secreto).toHaveLength(0);
  });
});

describe.runIf(DB)("conta não autorizada (fez login mas não está na lista)", () => {
  it("não tem papel e não acessa nada da equipe", async () => {
    await as(intruso, async (c) => {
      const { rows } = await c.query("select current_user_role() as r");
      expect(rows[0].r).toBeNull();
    });
    await expectDenied(
      as(intruso, (c) =>
        c.query("insert into articles (title, slug, created_by) values ('x', $1, $2)", [uniqueSlug(), intruso.id]),
      ),
    );
  });

  it("não vê rascunhos de ninguém", async () => {
    const r = await seedArticle({ status: "draft", createdBy: null });
    const rows = await as(intruso, async (c) => (await c.query("select id from articles where id = $1", [r.id])).rows);
    expect(rows).toHaveLength(0);
  });
});

describe.runIf(DB)("colunista", () => {
  it("cria rascunho e a autoria fica sendo dela", async () => {
    await as(colunista, async (c) => {
      const { rows } = await c.query(
        "insert into articles (title, slug, section_id) values ('Minha coluna', $1, $2) returning created_by, status",
        [uniqueSlug(), politica],
      );
      expect(rows[0].created_by).toBe(colunista.id);
      expect(rows[0].status).toBe("draft");
    });
  });

  it("não publica nem agenda", async () => {
    await expectDenied(
      as(colunista, (c) =>
        c.query("insert into articles (title, slug, status) values ('x', $1, 'published')", [uniqueSlug()]),
      ),
    );
    const meu = await seedArticle({ createdBy: colunista.id });
    await expectDenied(
      as(colunista, (c) => c.query("update articles set status = 'published' where id = $1", [meu.id])),
    );
    await expectDenied(
      as(colunista, (c) =>
        c.query("update articles set status = 'scheduled', scheduled_at = now() + interval '1 day' where id = $1", [
          meu.id,
        ]),
      ),
    );
  });

  it("não destaca texto na home", async () => {
    const meu = await seedArticle({ createdBy: colunista.id });
    await expectDenied(as(colunista, (c) => c.query("update articles set featured = true where id = $1", [meu.id])));
  });

  it("edita o próprio rascunho, mas não o de outra pessoa", async () => {
    const meu = await seedArticle({ createdBy: colunista.id });
    const alheio = await seedArticle({ createdBy: colunista2.id });
    await as(colunista, async (c) => {
      expect((await c.query("update articles set title = 'Novo título' where id = $1", [meu.id])).rowCount).toBe(1);
      expect((await c.query("update articles set title = 'Invasão' where id = $1", [alheio.id])).rowCount).toBe(0);
    });
  });

  it("não vê rascunhos de outras pessoas", async () => {
    const alheio = await seedArticle({ createdBy: colunista2.id });
    const rows = await as(colunista, async (c) => (await c.query("select id from articles where id = $1", [alheio.id])).rows);
    expect(rows).toHaveLength(0);
  });

  it("não edita o próprio texto depois de publicado pela edição", async () => {
    const publicado = await seedArticle({
      status: "published",
      createdBy: colunista.id,
      publishedAt: new Date(Date.now() - 1000).toISOString(),
    });
    const n = await as(colunista, async (c) =>
      (await c.query("update articles set title = 'Mudança' where id = $1", [publicado.id])).rowCount,
    );
    expect(n).toBe(0);
  });

  it("não transfere a autoria do texto", async () => {
    const meu = await seedArticle({ createdBy: colunista.id });
    await expectDenied(
      as(colunista, (c) => c.query("update articles set created_by = $2 where id = $1", [meu.id, colunista2.id])),
    );
  });

  it("apaga o próprio rascunho", async () => {
    const meu = await seedArticle({ createdBy: colunista.id });
    const n = await as(colunista, async (c) => (await c.query("delete from articles where id = $1", [meu.id])).rowCount);
    expect(n).toBe(1);
  });

  it("não gerencia usuários nem editorias", async () => {
    await expectDenied(
      as(colunista, (c) => c.query("insert into allowed_emails (email, role) values ('x@y.test', 'admin')")),
    );
    await expectDenied(
      as(colunista, (c) => c.query("insert into sections (name, slug) values ('Nova', 'nova-editoria')")),
    );
  });
});

describe.runIf(DB)("editor", () => {
  it("publica o texto de qualquer pessoa e a data é preenchida", async () => {
    const r = await seedArticle({ createdBy: colunista.id });
    await as(editor, async (c) => {
      const { rows } = await c.query(
        "update articles set status = 'published' where id = $1 returning status, published_at",
        [r.id],
      );
      expect(rows[0].status).toBe("published");
      expect(rows[0].published_at).not.toBeNull();
    });
  });

  it("agenda: o texto só aparece para o público na data marcada", async () => {
    const r = await seedArticle({ createdBy: editor.id });
    const amanha = new Date(Date.now() + 86_400_000).toISOString();
    await asRoot(async (c) => {
      // como editor, fora de transação descartável, para o visitante enxergar depois
      await c.query("begin");
      await c.query("set local role authenticated");
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: editor.id, email: editor.email }),
      ]);
      const { rows } = await c.query(
        "update articles set status = 'scheduled', scheduled_at = $2 where id = $1 returning published_at",
        [r.id, amanha],
      );
      expect(new Date(rows[0].published_at).toISOString()).toBe(amanha);
      await c.query("commit");
    });
    let visivel = await as(null, async (c) => (await c.query("select id from articles where id = $1", [r.id])).rowCount);
    expect(visivel).toBe(0);

    // A hora chega (simulada movendo o agendamento para o passado)
    await asRoot((c) =>
      c.query("update articles set scheduled_at = now() - interval '1 minute' where id = $1", [r.id]),
    );
    visivel = await as(null, async (c) => (await c.query("select id from articles where id = $1", [r.id])).rowCount);
    expect(visivel).toBe(1);

    // O cron marca como publicado
    const n = await asRoot(async (c) => (await c.query("select publish_due_articles() as n")).rows[0].n);
    expect(n).toBeGreaterThanOrEqual(1);
    const status = await asRoot(async (c) => (await c.query("select status from articles where id = $1", [r.id])).rows[0].status);
    expect(status).toBe("published");
  });

  it("agendar exige data e hora", async () => {
    const r = await seedArticle({ createdBy: editor.id });
    await expectDenied(as(editor, (c) => c.query("update articles set status = 'scheduled' where id = $1", [r.id])));
  });

  it("só existe uma manchete principal por vez", async () => {
    const a = await seedArticle({ status: "published", publishedAt: new Date().toISOString() });
    await as(editor, async (c) => {
      await c.query("update articles set featured = true where id = $1", [a.id]);
      const { rows } = await c.query("select count(*)::int as n from articles where featured");
      expect(rows[0].n).toBe(1);
    });
  });

  it("vê os rascunhos de todos para revisar", async () => {
    const r = await seedArticle({ createdBy: colunista.id });
    const n = await as(editor, async (c) => (await c.query("select id from articles where id = $1", [r.id])).rowCount);
    expect(n).toBe(1);
  });

  it("não gerencia usuários nem vê inscritos da newsletter", async () => {
    await expectDenied(
      as(editor, (c) => c.query("insert into allowed_emails (email, role) values ('novo@y.test', 'editor')")),
    );
    const n = await as(editor, async (c) => (await c.query("select * from subscribers")).rowCount);
    expect(n).toBe(0);
  });
});

describe.runIf(DB)("administrador", () => {
  it("convida e remove pessoas", async () => {
    await as(admin, async (c) => {
      await c.query("insert into allowed_emails (email, role) values ('nova@tribuna.test', 'colunista')");
      expect((await c.query("select * from allowed_emails where email = 'nova@tribuna.test'")).rowCount).toBe(1);
      expect((await c.query("delete from allowed_emails where email = 'nova@tribuna.test'")).rowCount).toBe(1);
    });
  });

  it("não deixa o jornal sem administrador", async () => {
    const msg = await expectDenied(
      as(admin, (c) => c.query("delete from allowed_emails where email = 'querino.neto@gmail.com'")),
    );
    expect(msg).toMatch(/administrador/);
  });

  it("remover da lista revoga o acesso imediatamente", async () => {
    const temp = await createUser("temporario@tribuna.test", "editor");
    await asRoot((c) => c.query("delete from allowed_emails where email = $1", [temp.email]));
    await expectDenied(
      as(temp, (c) => c.query("insert into articles (title, slug) values ('x', $1)", [uniqueSlug()])),
    );
  });

  it("vê os inscritos da newsletter", async () => {
    await asRoot((c) => c.query("insert into subscribers (email) values ('leitor2@exemplo.test') on conflict do nothing"));
    const n = await as(admin, async (c) => (await c.query("select * from subscribers")).rowCount);
    expect(n).toBeGreaterThanOrEqual(1);
  });
});

describe.runIf(DB)("envios de textos (Escreva e publique conosco)", () => {
  const id = () => crypto.randomUUID();
  const envio = (over: Record<string, unknown> = {}) => {
    const k = id();
    return {
      name: "Maria Leitora",
      email: `maria.${k.slice(0, 6)}@exemplo.test`,
      file_path: `recebidos/${k}/texto.pdf`,
      photo_path: `recebidos/${k}/foto.jpg`,
      first_time: true,
      ...over,
    };
  };
  const insert = (c: import("pg").PoolClient, e: ReturnType<typeof envio>) =>
    c.query(
      "insert into submissions (name, email, file_path, photo_path, first_time) values ($1, $2, $3, $4, $5)",
      [e.name, e.email, e.file_path, e.photo_path, e.first_time],
    );

  it("visitante envia, mas não lê nenhum envio", async () => {
    await as(null, async (c) => {
      await insert(c, envio());
      expect((await c.query("select * from submissions")).rowCount).toBe(0);
    });
  });

  it("primeira vez exige foto", async () => {
    await expectDenied(as(null, (c) => insert(c, envio({ photo_path: null, first_time: true }))));
    await as(null, (c) => insert(c, envio({ photo_path: null, first_time: false })));
  });

  it("recusa caminhos de arquivo fora da pasta de envios", async () => {
    await expectDenied(as(null, (c) => insert(c, envio({ file_path: "../media/x.pdf" }))));
    await expectDenied(as(null, (c) => insert(c, envio({ file_path: `recebidos/${id()}/texto.exe` }))));
  });

  it("visitante não consegue criar envio já marcado como lido", async () => {
    const e = envio();
    await expectDenied(
      as(null, (c) =>
        c.query("insert into submissions (name, email, file_path, photo_path, status) values ($1,$2,$3,$4,'lido')", [
          e.name, e.email, e.file_path, e.photo_path,
        ]),
      ),
    );
  });

  it("limita a 5 envios por e-mail por hora", async () => {
    const email = `repetido.${id().slice(0, 6)}@exemplo.test`;
    for (let i = 0; i < 5; i++) await asRoot((c) => insert(c, envio({ email })));
    const msg = await expectDenied(asRoot((c) => insert(c, envio({ email }))));
    expect(msg).toMatch(/Muitos envios/);
  });

  it("editor lê e marca envios; colunista não vê nada", async () => {
    await asRoot((c) => insert(c, envio()));
    const vistoPeloEditor = await as(editor, async (c) => (await c.query("select id from submissions")).rowCount);
    expect(vistoPeloEditor).toBeGreaterThan(0);
    const vistoPelaColunista = await as(colunista, async (c) => (await c.query("select id from submissions")).rowCount);
    expect(vistoPelaColunista).toBe(0);
    await as(editor, async (c) => {
      expect((await c.query("update submissions set status = 'lido'")).rowCount).toBeGreaterThan(0);
    });
  });

  it("visitante envia arquivo só na pasta permitida do bucket privado", async () => {
    await as(null, async (c) => {
      await c.query("insert into storage.objects (bucket_id, name) values ('envios', $1)", [`recebidos/${id()}/texto.pdf`]);
      expect((await c.query("select * from storage.objects where bucket_id = 'envios'")).rowCount).toBe(0);
    });
    await expectDenied(
      as(null, (c) => c.query("insert into storage.objects (bucket_id, name) values ('envios', 'qualquer/coisa.pdf')")),
    );
    await expectDenied(
      as(null, (c) => c.query("insert into storage.objects (bucket_id, name) values ('media', $1)", [`recebidos/${id()}/foto.jpg`])),
    );
  });
});

describe.runIf(DB)("reforço de segurança (revisão)", () => {
  it("conta com e-mail NÃO confirmado não ganha papel, mesmo com e-mail de admin", async () => {
    const falso = await asRoot(async (c) => {
      const { rows } = await c.query(
        "insert into auth.users (email, email_confirmed_at) values ('querino.neto@gmail.com', null) returning id",
      );
      return { id: rows[0].id as string, email: "querino.neto@gmail.com" };
    });
    const role = await as(falso, async (c) => (await c.query("select current_user_role() as r")).rows[0].r);
    expect(role).toBeNull();
    await expectDenied(
      as(falso, (c) => c.query("insert into allowed_emails (email, role) values ('invasor@x.test', 'admin')")),
    );
  });

  it("colunista não assina com o nome de outra pessoa", async () => {
    const outro = await asRoot(async (c) =>
      (await c.query("insert into authors (name, slug, is_columnist) values ('Outro Colunista', $1, true) returning id", [uniqueSlug("outro")])).rows[0].id,
    );
    await expectDenied(
      as(colunista, (c) =>
        c.query("insert into articles (title, slug, author_id) values ('x', $1, $2)", [uniqueSlug(), outro]),
      ),
    );
    const meu = await seedArticle({ createdBy: colunista.id });
    await expectDenied(as(colunista, (c) => c.query("update articles set author_id = $2 where id = $1", [meu.id, outro])));
  });

  it("colunista assina com a própria assinatura", async () => {
    const minha = await asRoot(async (c) =>
      (await c.query("insert into authors (name, slug, profile_id) values ('Eu Mesma', $1, $2) returning id", [uniqueSlug("eu"), colunista.id])).rows[0].id,
    );
    await as(colunista, (c) =>
      c.query("insert into articles (title, slug, author_id) values ('x', $1, $2)", [uniqueSlug(), minha]),
    );
  });

  it("colunista não muda tipo nem endereço da própria assinatura", async () => {
    const minha = await asRoot(async (c) =>
      (await c.query("insert into authors (name, slug, profile_id) values ('Assinatura', $1, $2) returning id", [uniqueSlug("ass"), colunista2.id])).rows[0].id,
    );
    await as(colunista2, async (c) => {
      expect((await c.query("update authors set bio = 'Minha bio' where id = $1", [minha])).rowCount).toBe(1);
    });
    await expectDenied(as(colunista2, (c) => c.query("update authors set is_columnist = true where id = $1", [minha])));
  });

  it("ninguém troca o e-mail do próprio perfil", async () => {
    await expectDenied(
      as(colunista, (c) => c.query("update profiles set email = 'querino.neto@gmail.com' where id = $1", [colunista.id])),
    );
    await as(colunista, (c) => c.query("update profiles set name = 'Novo Nome' where id = $1", [colunista.id]));
  });

  it("visitante não liga envio a autor ou matéria existentes", async () => {
    const autor = await asRoot(async (c) => (await c.query("select id from authors limit 1")).rows[0].id);
    const k = crypto.randomUUID();
    await expectDenied(
      as(null, (c) =>
        c.query(
          "insert into submissions (name, email, file_path, photo_path, author_id) values ('Falso', 'f@x.test', $1, $2, $3)",
          [`recebidos/${k}/texto.pdf`, `recebidos/${k}/foto.jpg`, autor],
        ),
      ),
    );
  });
});
