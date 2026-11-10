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

  it("não mexe no contador de leituras direto pela API", async () => {
    const pub = await seedArticle({ status: "published", publishedAt: new Date(Date.now() - 1000).toISOString() });
    await expectDenied(as(null, (c) => c.query("select increment_views($1)", [pub.id])));
    await expectDenied(as(null, (c) => c.query("select register_view($1, $2)", [pub.id, "a".repeat(32)])));
  });

  it("o servidor conta uma leitura por leitor, por dia, e só de matérias publicadas", async () => {
    const pub = await seedArticle({ status: "published", publishedAt: new Date(Date.now() - 1000).toISOString() });
    const draft = await seedArticle({ status: "draft" });
    await asRoot(async (c) => {
      const { rows: before } = await c.query("select updated_at from articles where id = $1", [pub.id]);
      await c.query("set role service_role");
      await c.query("select register_view($1, $2)", [pub.id, "a".repeat(32)]);
      await c.query("select register_view($1, $2)", [pub.id, "a".repeat(32)]); // mesmo leitor: não conta de novo
      await c.query("select register_view($1, $2)", [pub.id, "b".repeat(32)]);
      await c.query("select register_view($1, $2)", [draft.id, "a".repeat(32)]);
      await c.query("reset role");
      const { rows } = await c.query("select id, views, updated_at from articles where id = any($1)", [[pub.id, draft.id]]);
      const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
      expect(byId[pub.id].views).toBe(2);
      expect(byId[draft.id].views).toBe(0);
      // Leitura não muda o "Atualizado em"
      expect(byId[pub.id].updated_at.getTime()).toBe(before[0].updated_at.getTime());
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

  it("publica, agenda e tira do ar o próprio texto", async () => {
    const meu = await seedArticle({ createdBy: colunista.id });
    await as(colunista, async (c) => {
      expect((await c.query("update articles set status = 'published' where id = $1", [meu.id])).rowCount).toBe(1);
      const { rows } = await c.query("select status, published_at from articles where id = $1", [meu.id]);
      expect(rows[0].status).toBe("published");
      expect(rows[0].published_at).not.toBeNull();
    });
    await as(colunista, async (c) => {
      expect(
        (await c.query("update articles set status = 'scheduled', scheduled_at = now() + interval '1 day' where id = $1", [meu.id])).rowCount,
      ).toBe(1);
    });
  });

  it("não publica o texto de outra pessoa", async () => {
    const alheio = await seedArticle({ createdBy: colunista2.id });
    const n = await as(colunista, async (c) => (await c.query("update articles set status = 'published' where id = $1", [alheio.id])).rowCount);
    expect(n).toBe(0);
  });

  it("não destaca texto na home (o banco ignora o pedido)", async () => {
    const meu = await seedArticle({ createdBy: colunista.id });
    const row = await as(colunista, async (c) =>
      (await c.query("update articles set featured = true, pinned = true where id = $1 returning featured, pinned", [meu.id])).rows[0],
    );
    expect(row).toEqual({ featured: false, pinned: false });
  });

  it("não infla o contador de leituras do próprio texto", async () => {
    const meu = await seedArticle({ createdBy: colunista.id, status: "published", publishedAt: new Date().toISOString() });
    const row = await as(colunista, async (c) => (await c.query("update articles set views = 99999 where id = $1 returning views", [meu.id])).rows[0]);
    expect(row.views).toBe(0);
  });

  it("não antedata a publicação nem agenda no passado", async () => {
    const meu = await seedArticle({ createdBy: colunista.id });
    const row = await as(colunista, async (c) =>
      (await c.query("update articles set status = 'published', published_at = '2001-01-01' where id = $1 returning published_at", [meu.id])).rows[0],
    );
    expect(new Date(row.published_at).getFullYear()).toBeGreaterThanOrEqual(2026);
    await expectDenied(
      as(colunista, (c) => c.query("update articles set status = 'scheduled', scheduled_at = '2001-01-01' where id = $1", [meu.id])),
    );
  });

  it("não muda o endereço de um texto que já foi ao ar, mesmo de volta a rascunho", async () => {
    const meu = await seedArticle({ createdBy: colunista.id });
    const slug = await as(colunista, async (c) => {
      await c.query("update articles set status = 'published' where id = $1", [meu.id]);
      await c.query("update articles set status = 'draft' where id = $1", [meu.id]);
      return (await c.query("update articles set slug = 'endereco-trocado' where id = $1 returning slug", [meu.id])).rows[0].slug;
    });
    expect(slug).toBe(meu.slug);
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

  it("edita e tira do ar o próprio texto publicado, mas não o apaga", async () => {
    const publicado = await seedArticle({
      status: "published",
      createdBy: colunista.id,
      publishedAt: new Date(Date.now() - 1000).toISOString(),
    });
    await as(colunista, async (c) => {
      expect((await c.query("update articles set title = 'Mudança' where id = $1", [publicado.id])).rowCount).toBe(1);
      expect((await c.query("update articles set status = 'draft' where id = $1", [publicado.id])).rowCount).toBe(1);
    });
    const n = await as(colunista, async (c) => (await c.query("delete from articles where id = $1", [publicado.id])).rowCount);
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

  it("não escolhe a manchete principal nem fixa textos (só o administrador)", async () => {
    const a = await seedArticle({ status: "published", publishedAt: new Date().toISOString() });
    const row = await as(editor, async (c) =>
      (await c.query("update articles set featured = true, pinned = true where id = $1 returning featured, pinned", [a.id])).rows[0],
    );
    expect(row).toEqual({ featured: false, pinned: false });
  });

  it("só existe uma manchete principal por vez (administrador)", async () => {
    const a = await seedArticle({ status: "published", publishedAt: new Date().toISOString() });
    await as(admin, async (c) => {
      await c.query("update articles set featured = true where id = $1", [a.id]);
      const { rows } = await c.query("select count(*)::int as n, bool_and(id = $1) as ok from articles where featured", [a.id]);
      expect(rows[0]).toEqual({ n: 1, ok: true });
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
      "insert into submissions (name, email, title, file_path, photo_path, first_time, terms_version) values ($1, $2, 'Título', $3, $4, $5, 'teste@1')",
      [e.name, e.email, e.file_path, e.photo_path, e.first_time],
    );

  it("visitante envia, mas não lê nenhum envio", async () => {
    await as(null, async (c) => {
      await insert(c, envio());
      expect((await c.query("select * from submissions")).rowCount).toBe(0);
    });
  });

  it("envio sem aceite do termo é recusado; com aceite, a data é carimbada pelo banco", async () => {
    const e = envio();
    await expectDenied(
      as(null, (c) =>
        c.query("insert into submissions (name, email, title, file_path, photo_path, first_time) values ($1, $2, 'Título', $3, $4, true)", [
          e.name, e.email, e.file_path, e.photo_path,
        ]),
      ),
    );
    await as(null, (c) => insert(c, envio()));
    const k = crypto.randomUUID();
    const row = await asRoot(async (c) =>
      (
        await c.query(
          "insert into submissions (name, email, title, file_path, photo_path, first_time, terms_version) values ('A B', 'a@b.test', 'Título', $1, $2, true, 'v1') returning terms_accepted_at",
          [`recebidos/${k}/texto.pdf`, `recebidos/${k}/foto.jpg`],
        )
      ).rows[0],
    );
    expect(row.terms_accepted_at).not.toBeNull();
  });

  it("envio sem título é recusado", async () => {
    const e = envio();
    await expectDenied(
      as(null, (c) =>
        c.query("insert into submissions (name, email, title, file_path, photo_path, first_time, terms_version) values ($1, $2, '  ', $3, $4, true, 'v1')", [
          e.name, e.email, e.file_path, e.photo_path,
        ]),
      ),
    );
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
        c.query("insert into submissions (name, email, title, file_path, photo_path, status, terms_version) values ($1,$2,'Título',$3,$4,'lido','v1')", [
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
      (await c.query("select id from authors where profile_id = $1", [colunista.id])).rows[0].id,
    );
    await as(colunista, (c) =>
      c.query("insert into articles (title, slug, author_id) values ('x', $1, $2)", [uniqueSlug(), minha]),
    );
  });

  it("colunista não muda tipo nem endereço da própria assinatura", async () => {
    const minha = await asRoot(async (c) =>
      (await c.query("select id from authors where profile_id = $1", [colunista2.id])).rows[0].id,
    );
    await as(colunista2, async (c) => {
      expect((await c.query("update authors set bio = 'Minha bio' where id = $1", [minha])).rowCount).toBe(1);
    });
    await expectDenied(as(colunista2, (c) => c.query("update authors set is_columnist = false where id = $1", [minha])));
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
          "insert into submissions (name, email, title, file_path, photo_path, author_id, terms_version) values ('Falso', 'f@x.test', 'Título', $1, $2, $3, 'v1')",
          [`recebidos/${k}/texto.pdf`, `recebidos/${k}/foto.jpg`, autor],
        ),
      ),
    );
  });
});

describe.runIf(DB)("assinaturas e contato", () => {
  it("colunista convidado já tem a própria assinatura de colunista", async () => {
    const rows = await asRoot(async (c) => (await c.query("select is_columnist, is_contributor from authors where profile_id = $1", [colunista.id])).rows);
    expect(rows).toEqual([{ is_columnist: true, is_contributor: false }]);
  });

  it("coordenador convidado também ganha assinatura", async () => {
    const rows = await asRoot(async (c) => (await c.query("select is_columnist from authors where profile_id = $1", [editor.id])).rows);
    expect(rows).toEqual([{ is_columnist: true }]);
  });

  it("administrador cria a própria assinatura pelo Meu perfil e edita foto, nome e bio", async () => {
    await as(admin, async (c) => {
      const id = (await c.query("select public.ensure_my_author() as id")).rows[0].id;
      expect(id).toBeTruthy();
      expect((await c.query("update authors set name = 'Querino', bio = 'Advogado' where id = $1", [id])).rowCount).toBe(1);
    });
  });

  it("colunista edita a própria assinatura, mas não a de outra pessoa", async () => {
    await as(colunista, async (c) => {
      expect((await c.query("update authors set bio = 'Nova bio' where profile_id = $1", [colunista.id])).rowCount).toBe(1);
      expect((await c.query("update authors set bio = 'Invasão' where profile_id = $1", [colunista2.id])).rowCount).toBe(0);
    });
  });

  it("visitante não chama as funções de assinatura", async () => {
    await expectDenied(as(null, (c) => c.query("select public.ensure_my_author()")));
  });

  it("visitante envia mensagem de contato, mas não lê nenhuma", async () => {
    await as(null, async (c) => {
      await c.query("insert into contact_messages (first_name, last_name, email, message) values ('Ana', 'Souza', 'ana@exemplo.com', 'Olá')");
      expect((await c.query("select * from contact_messages")).rowCount).toBe(0);
    });
  });

  it("coordenação e administrador leem o Contato; só o administrador apaga", async () => {
    const id = await asRoot(async (c) =>
      (
        await c.query("insert into contact_messages (first_name, last_name, email, message) values ('Bia', 'Lima', $1, 'Oi') returning id", [
          `${uniqueSlug("b")}@exemplo.com`,
        ])
      ).rows[0].id,
    );
    await as(colunista, async (c) => expect((await c.query("select * from contact_messages")).rowCount).toBe(0));
    await as(editor, async (c) => {
      expect((await c.query("select * from contact_messages where id = $1", [id])).rowCount).toBe(1);
      expect((await c.query("update contact_messages set read_at = now() where id = $1", [id])).rowCount).toBe(1);
      expect((await c.query("delete from contact_messages where id = $1", [id])).rowCount).toBe(0);
    });
    await as(admin, async (c) => expect((await c.query("delete from contact_messages where id = $1", [id])).rowCount).toBe(1));
  });

  it("limita mensagens de contato repetidas", async () => {
    const email = `${uniqueSlug("spam")}@exemplo.com`;
    await expectDenied(
      as(null, async (c) => {
        for (let i = 0; i < 6; i++) {
          await c.query("insert into contact_messages (first_name, last_name, email, message) values ('A', 'B', $1, 'x')", [email]);
        }
      }),
    );
  });
});

describe.runIf(DB)("assinaturas por e-mail", () => {
  it("visitante cria assinatura apenas como pendente", async () => {
    await as(null, (c) => c.query("insert into subscribers (email) values ($1)", [`${uniqueSlug("p")}@exemplo.test`]));
    await expectDenied(as(null, (c) => c.query("insert into subscribers (email, status) values ($1, 'ativo')", [`${uniqueSlug("a")}@exemplo.test`])));
    await expectDenied(
      as(null, (c) =>
        c.query("insert into subscribers (email, confirm_token_hash) values ($1, 'abc')", [`${uniqueSlug("t")}@exemplo.test`]),
      ),
    );
  });

  it("assinatura nova nasce pendente", async () => {
    const row = await asRoot(async (c) =>
      (await c.query("insert into subscribers (email) values ($1) returning status", [`${uniqueSlug("n")}@exemplo.test`])).rows[0],
    );
    expect(row.status).toBe("pendente");
  });

  it("histórico de envios: só o administrador vê", async () => {
    await asRoot((c) => c.query("insert into newsletter_sends (week_key, kind, status) values ($1, 'manual', 'enviado')", [uniqueSlug("w")]));
    await as(null, async (c) => expect((await c.query("select * from newsletter_sends")).rowCount).toBe(0));
    await as(editor, async (c) => expect((await c.query("select * from newsletter_sends")).rowCount).toBe(0));
    await as(admin, async (c) => expect((await c.query("select * from newsletter_sends")).rowCount).toBeGreaterThan(0));
  });

  it("resumo automático só uma vez por semana", async () => {
    const w = uniqueSlug("semana");
    await asRoot((c) => c.query("insert into newsletter_sends (week_key, kind, status) values ($1, 'semanal', 'enviado')", [w]));
    await expectDenied(asRoot((c) => c.query("insert into newsletter_sends (week_key, kind, status) values ($1, 'semanal', 'enviado')", [w])));
  });
});

describe.runIf(DB)("acesso revogado", () => {
  it("sai de Colunistas, mas a assinatura continua pública; ao voltar, reaparece", async () => {
    const ex = await createUser("ex.colunista@tribuna.test", "colunista");
    await asRoot((c) => c.query("insert into profiles (id, email, name) values ($1, $2, 'Ex Colunista') on conflict (id) do nothing", [ex.id, ex.email]));
    await asRoot((c) => c.query("select public.ensure_staff_author($1, true)", [ex.id]));
    const before = await asRoot(async (c) => (await c.query("select is_columnist, revoked_at from authors where profile_id = $1", [ex.id])).rows[0]);
    expect(before).toEqual({ is_columnist: true, revoked_at: null });

    await as(admin, async (c) => {
      await c.query("delete from allowed_emails where email = $1", [ex.email]);
      const a = (await c.query("select is_columnist, revoked_at from authors where profile_id = $1", [ex.id])).rows[0];
      expect(a.is_columnist).toBe(false);
      expect(a.revoked_at).not.toBeNull();
    });
    // Visitante continua vendo nome e página (a linha do autor é pública)
    const pub = await as(null, async (c) => (await c.query("select name from authors where profile_id = $1", [ex.id])).rowCount);
    expect(pub).toBe(1);

    await as(admin, async (c) => {
      await c.query("delete from allowed_emails where email = $1", [ex.email]);
      await c.query("insert into allowed_emails (email, role) values ($1, 'colunista')", [ex.email]);
      const a = (await c.query("select is_columnist, revoked_at from authors where profile_id = $1", [ex.id])).rows[0];
      expect(a).toEqual({ is_columnist: true, revoked_at: null });
    });
  });

  it("quem perdeu o acesso não edita mais a própria coluna", async () => {
    const ex = await createUser("ex.coluna@tribuna.test", "colunista");
    await asRoot(async (c) => {
      await c.query("insert into profiles (id, email, name) values ($1, $2, 'Ex Coluna') on conflict (id) do nothing", [ex.id, ex.email]);
      const author = (await c.query("select public.ensure_staff_author($1, true) as id", [ex.id])).rows[0].id;
      await c.query("insert into columns (author_id, name, slug) values ($1, 'Coluna Antiga', 'coluna-antiga')", [author]);
      await c.query("delete from allowed_emails where email = $1", [ex.email]);
    });
    const n = await as(ex, async (c) => (await c.query("update columns set name = 'Pichação' where slug = 'coluna-antiga'")).rowCount);
    expect(n).toBe(0);
  });

  it("colunista não marca a si mesmo como revogado ou não revogado", async () => {
    await expectDenied(
      as(colunista, (c) => c.query("update authors set revoked_at = now() where profile_id = $1", [colunista.id])),
    );
  });
});

describe.runIf(DB)("tetos contra abuso", () => {
  it("visitante não envia arquivos além do teto por hora", async () => {
    await asRoot((c) =>
      c.query(
        "insert into storage.objects (bucket_id, name, created_at) select 'envios', 'recebidos/' || gen_random_uuid() || '/texto.pdf', now() from generate_series(1, 80)",
      ),
    );
    await expectDenied(
      as(null, (c) =>
        c.query("insert into storage.objects (bucket_id, name) values ('envios', $1)", [`recebidos/${crypto.randomUUID()}/texto.pdf`]),
      ),
    );
    await asRoot((c) => c.query("delete from storage.objects where bucket_id = 'envios'"));
  });
});
