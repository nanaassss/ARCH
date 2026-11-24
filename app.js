const ACCESS_KEY = "OK9ZW8XQtnYfaRt8e1YvT7dkcaKFvCoYpuMipq7RrHE";
const APP_NAME = "arq_urb_teste";
const EUROPEANA_KEY = (window.ATLAS_CONFIG?.EUROPEANA_KEY || "").trim();
const TEMAS = {
  "Arquitetos brasileiros": [
    "Lina Bo Bardi",
    "Oscar Niemeyer",
    "Paulo Mendes da Rocha",
    "Affonso Eduardo Reidy",
    "Ruy Ohtake",
    "Vilanova Artigas",
    "Marcio Kogan",
    "Isay Weinfeld",
    "Severiano Porto",
    "Rosa Kliass",
  ],
  "Arquitetos internacionais": [
    "Tadao Ando",
    "Zaha Hadid",
    "Le Corbusier",
    "Frank Lloyd Wright",
    "Alvar Aalto",
    "Louis Kahn",
    "Peter Zumthor",
    "Álvaro Siza",
    "Norman Foster",
    "Renzo Piano",
    "Jeanne Gang",
    "Frank Gehry",
  ],
  "Estilos e movimentos": [
    "brutalismo",
    "modernismo",
    "art déco",
    "neoclássico",
    "arquitetura moderna",
    "pós-modernismo",
    "construtivismo russo",
    "expressionismo",
    "high-tech",
    "desconstrutivismo",
    "minimalismo japonês",
    "arquitetura islâmica",
    "metabolismo japonês",
  ],
  "Arquitetura no Brasil": [
    "Brasília",
    "arquitetura vernacular",
    "arquitetura colonial brasileira",
    "arquitetura brutalista brasileira",
    "arquitetura sustentável",
    "arquitetura paramétrica",
    "espaço público",
  ],
  Tipologias: [
    "museus",
    "casas modernas",
    "bibliotecas",
    "mercados públicos",
    "estações ferroviárias",
    "escolas",
    "habitação social",
    "torres corporativas",
    "igrejas modernistas",
  ],
};
const $ = (id) => document.getElementById(id),
  input = $("q"),
  limpar = $("limpar"),
  status = $("status"),
  tema = $("tema");
const UTM = `?utm_source=${APP_NAME}&utm_medium=referral`;
const cidades = {
  brasília: { nome: "Brasília", lat: -15.7939, lon: -47.8828 },
  "são paulo": { nome: "São Paulo", lat: -23.5505, lon: -46.6333 },
  "rio de janeiro": { nome: "Rio de Janeiro", lat: -22.9068, lon: -43.1729 },
  lisboa: { nome: "Lisboa", lat: 38.7223, lon: -9.1393 },
  "new york": { nome: "Nova York", lat: 40.7128, lon: -74.006 },
};
let termo = "brutalismo",
  carregando = false,
  buscaId = 0,
  mapaInterativo = null,
  camadaMapa = null,
  filtroGetty = "todos",
  gettyResultados = [];

const temaSalvo = localStorage.getItem("atlas-tema");
if (
  temaSalvo === "dark" ||
  (!temaSalvo && window.matchMedia("(prefers-color-scheme: dark)").matches)
)
  document.documentElement.dataset.theme = "dark";
function atualizarBotaoTema() {
  const escuro = document.documentElement.dataset.theme === "dark";
  tema.setAttribute("aria-pressed", String(escuro));
  tema.setAttribute(
    "aria-label",
    escuro ? "Ativar modo claro" : "Ativar modo escuro",
  );
}
tema.onclick = () => {
  const escuro = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = escuro ? "dark" : "light";
  localStorage.setItem("atlas-tema", escuro ? "dark" : "light");
  atualizarBotaoTema();
};
atualizarBotaoTema();

function esc(v) {
  return String(v || "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );
}
async function json(url, options = {}) {
  const ctrl = new AbortController(),
    timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal });
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}
function loading(el, text = "Consultando fonte…") {
  el.setAttribute("aria-busy", "true");
  el.innerHTML = `<p class="estado estado-carregando"><span class="loader" aria-hidden="true"></span><span>${text}</span></p>`;
}
function liberar(el) {
  el.removeAttribute("aria-busy");
}
const cacheConsultas = new Map(),
  CACHE_TTL = 5 * 60 * 1000;
function emCache(chave, request) {
  const agora = Date.now(),
    existente = cacheConsultas.get(chave);
  if (existente && existente.expira > agora) return existente.valor;
  const valor = request();
  cacheConsultas.set(chave, { valor, expira: agora + CACHE_TTL });
  valor.catch(() => cacheConsultas.delete(chave));
  return valor;
}
function cidadeAtual() {
  const s = termo.toLowerCase();
  return (
    Object.entries(cidades).find(([key]) => s.includes(key))?.[1] ||
    cidades["são paulo"]
  );
}
const ARQ_TOKENS =
  /architecture|architect|architectural|building|urban|urbanism|city|museum|monument|house|church|school|library|bridge|facade|brutal|modern|style|landscape|patrimônio|arquitetura|edifício|urbano|museu|monumento|casa|igreja|escola|biblioteca|ponte|fachada|brutalismo|modernismo/i;
function textoArquitetura(texto) {
  return ARQ_TOKENS.test(String(texto || ""));
}

async function unsplash(q) {
  const u = new URL("https://api.unsplash.com/search/photos");
  u.search = new URLSearchParams({
    query: `architecture ${q}`,
    per_page: 8,
    orientation: "landscape",
  });
  return json(u, {
    headers: {
      Authorization: `Client-ID ${ACCESS_KEY}`,
      "Accept-Version": "v1",
    },
  });
}
async function commons(q) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `incategory:Architecture ${q}`,
    gsrnamespace: 6,
    gsrlimit: 8,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: 700,
    format: "json",
    origin: "*",
  });
  return json(u);
}
function valorEuropeana(v) {
  return Array.isArray(v) ? v[0] : v || "";
}
async function europeana(q) {
  if (!EUROPEANA_KEY) return { configMissing: true };
  const u = new URL("https://api.europeana.eu/record/v2/search.json");
  u.search = new URLSearchParams({
    query: `${q} AND (architecture OR architectural OR building OR urbanism OR heritage)`,
    rows: 8,
    profile: "standard",
    qf: "TYPE:IMAGE",
    wskey: EUROPEANA_KEY,
  });
  return json(u);
}
async function getty(q) {
  const termoGetty = q.replace(/["\\]/g, " ").trim().slice(0, 80);
  const vocabularios = ["aat", "ulan", "tgn"];
  return Promise.all(
    vocabularios.map(async (vocab) => {
      const u = new URL("https://vocab.getty.edu/sparql");
      const prefix = "http://vocab.getty.edu/" + vocab + "/";
      const query = `SELECT DISTINCT ?concept ?label WHERE { ?concept <http://www.w3.org/2004/02/skos/core#prefLabel> ?label . FILTER regex(str(?label), "${termoGetty}", "i") . FILTER regex(str(?concept), "${prefix}") } LIMIT 8`;
      u.search = new URLSearchParams({ query, format: "json" });
      const data = await json(u);
      return (data.results?.bindings || []).map((row) => ({
        vocab,
        uri: row.concept?.value,
        label: row.label?.value || "",
      }));
    }),
  ).then((grupos) => grupos.flat());
}
async function wikidata(q) {
  async function buscar(texto) {
    const u = new URL("https://www.wikidata.org/w/api.php");
    u.search = new URLSearchParams({
      action: "wbsearchentities",
      search: texto,
      language: "pt",
      uselang: "pt",
      limit: 8,
      format: "json",
      origin: "*",
    });
    return json(u);
  }
  let data = await buscar(q);
  if (!(data.search || []).length) data = await buscar(`${q} arquitetura`);
  const filtrados = (data.search || []).filter((item) =>
    textoArquitetura(`${item.label} ${item.description}`),
  );
  return {
    results: {
      bindings: filtrados.map((item) => ({
        item: { value: `https://www.wikidata.org/wiki/${item.id}` },
        itemLabel: { value: item.label || item.id },
        architectLabel: {
          value:
            item.description || "obra ou entidade relacionada à arquitetura",
        },
      })),
    },
  };
}
async function overpass() {
  const c = cidadeAtual();
  const query = `[out:json][timeout:20];(nwr["building"]["name"](around:3500,${c.lat},${c.lon});nwr["historic"~"building|monument|heritage"]["name"](around:3500,${c.lat},${c.lon}););out center tags 24;`;
  return json("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  });
}

function renderFotos(data) {
  const el = $("fotos");
  liberar(el);
  const items = (data.results || []).filter((f) =>
    textoArquitetura(
      `${f.alt_description} ${f.description} ${f.tags?.map((t) => t.title).join(" ")}`,
    ),
  );
  if (!items.length) {
    el.innerHTML =
      '<p class="estado">Nenhuma imagem arquitetônica encontrada.</p>';
    return;
  }
  el.innerHTML = items
    .map(
      (f, i) =>
        `<figure class="foto" style="animation-delay:${i * 35}ms"><button type="button" aria-label="Abrir foto de ${esc(f.user?.name)}"><img loading="lazy" src="${f.urls.small}" alt="${esc(f.alt_description || "Referência de arquitetura")}" width="${f.width}" height="${f.height}"></button><figcaption>Foto de <a href="${f.user?.links?.html || f.links.html}${UTM}" target="_blank" rel="noopener">${esc(f.user?.name || "autor")}</a> · Unsplash</figcaption></figure>`,
    )
    .join("");
  el.querySelectorAll("button").forEach((b, i) =>
    b.addEventListener("click", () =>
      window.open(items[i].links.html + UTM, "_blank", "noopener"),
    ),
  );
}
function renderCommons(data) {
  const el = $("arquivo");
  liberar(el);
  const pages = Object.values(data.query?.pages || {}).filter((p) =>
    textoArquitetura(
      `${p.title} ${p.imageinfo?.[0]?.extmetadata?.ImageDescription?.value || ""}`,
    ),
  );
  if (!pages.length) {
    el.innerHTML =
      '<p class="estado">Nenhum item arquitetônico encontrado.</p>';
    return;
  }
  el.innerHTML = pages
    .map((p) => {
      const info = p.imageinfo?.[0] || {},
        meta = info.extmetadata || {},
        author =
          meta.Artist?.value?.replace(/<[^>]+>/g, "") || "Acervo Wikimedia";
      return `<article class="arquivo-item"><img loading="lazy" src="${info.thumburl || info.url}" alt="${esc(p.title)}"><div><h3>${esc(p.title.replace(/^File:/, ""))}</h3><p>${esc(author).slice(0, 90)}</p><a href="https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}" target="_blank" rel="noopener">Ver acervo ↗</a></div></article>`;
    })
    .join("");
}
function renderGetty(data) {
  gettyResultados = data || [];
  renderGettyFiltrado();
}
function renderGettyFiltrado() {
  const el = $("getty"),
    itens = gettyResultados.filter(
      (item) => filtroGetty === "todos" || item.vocab === filtroGetty,
    );
  if (!itens.length) {
    el.innerHTML =
      '<p class="estado">Nenhum termo Getty encontrado para esta busca.</p>';
    return;
  }
  el.innerHTML = itens
    .map(
      (item) =>
        `<article class="getty-card"><h3>${esc(item.label)}</h3><p>Getty ${item.vocab.toUpperCase()}</p><a href="${esc(item.uri.replace(/^http:/, "https:"))}" target="_blank" rel="noopener">Abrir vocabulário ↗</a></article>`,
    )
    .join("");
}
function renderEuropeana(data) {
  const el = $("europeana");
  liberar(el);
  if (data?.configMissing) {
    el.innerHTML =
      '<p class="config-aviso">A Europeana está integrada, mas precisa de uma chave gratuita. Copie <strong>config.example.js</strong> para <strong>config.js</strong>, informe sua chave e recarregue o site. <a href="https://www.europeana.eu/account/api-keys" target="_blank" rel="noopener">Solicitar chave ↗</a></p>';
    return;
  }
  const docs = data?.items || [];
  if (!docs.length) {
    el.innerHTML =
      '<p class="estado">Nenhum registro Europeana encontrado.</p>';
    return;
  }
  el.innerHTML = docs
    .map((item) => {
      const titulo = valorEuropeana(item.title) || "Registro sem título",
        imagem = valorEuropeana(item.edmPreview),
        criador = valorEuropeana(item.dcCreator) || "Instituição não informada",
        link = item.guid || item.edmIsShownAt || "https://www.europeana.eu/";
      const visual = imagem
        ? `<img loading="lazy" src="${esc(imagem)}" alt="${esc(titulo)}">`
        : '<div class="europeana-sem-imagem"></div>';
      return `<article class="europeana-card">${visual}<div><h3>${esc(titulo).slice(0, 100)}</h3><p>${esc(criador).slice(0, 80)}</p><a href="${esc(link)}" target="_blank" rel="noopener">Ver registro ↗</a></div></article>`;
    })
    .join("");
}
function renderWikidata(data) {
  const el = $("obras");
  liberar(el);
  const items = data.results?.bindings || [];
  if (!items.length) {
    el.innerHTML =
      '<p class="estado">Tente um nome de edifício ou arquiteto mais específico.</p>';
    return;
  }
  el.innerHTML = items
    .map((r, i) => {
      const label = r.itemLabel?.value || "Obra sem nome",
        architect = r.architectLabel?.value || "arquiteto não informado",
        date = r.date?.value?.slice(0, 4) || "data não informada",
        link = r.item?.value || "https://www.wikidata.org/";
      return `<article class="obra"><span class="obra-num">0${i + 1}</span><div><h3>${esc(label)}</h3><p>${esc(architect)} · ${date}</p></div><a href="${link}" target="_blank" rel="noopener">Wikidata ↗</a></article>`;
    })
    .join("");
}
function renderWikidata(data) {
  const el = $("obras");
  liberar(el);
  const items = data.results?.bindings || [];
  if (!items.length) {
    el.innerHTML =
      '<p class="estado">Tente um nome de edifício ou arquiteto mais específico.</p>';
    return;
  }
  el.innerHTML = items
    .map((r, i) => {
      const label = r.itemLabel?.value || "Obra sem nome",
        architect =
          r.architectLabel?.value || "entidade relacionada à arquitetura",
        link = r.item?.value || "https://www.wikidata.org/";
      return `<article class="obra"><span class="obra-num">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(label)}</h3><p>${esc(architect)}</p></div><button class="obra-open" type="button" data-wikidata="${esc(link)}" data-label="${esc(label)}" data-description="${esc(architect)}">Detalhes ↗</button></article>`;
    })
    .join("");
  el.querySelectorAll(".obra-open").forEach((button) =>
    button.addEventListener("click", () =>
      abrirDetalhe(
        button.dataset.wikidata,
        button.dataset.label,
        button.dataset.description,
      ),
    ),
  );
}
function atualizarMapa(items, c) {
  if (!window.L) return;
  if (!mapaInterativo) {
    mapaInterativo = L.map("mapa-interativo", {
      scrollWheelZoom: false,
    }).setView([c.lat, c.lon], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapaInterativo);
    camadaMapa = L.layerGroup().addTo(mapaInterativo);
  } else {
    mapaInterativo.setView([c.lat, c.lon], 13);
    camadaMapa.clearLayers();
  }
  items.forEach((x) => {
    const lat = x.center?.lat || x.lat,
      lon = x.center?.lon || x.lon,
      nome = x.tags?.name || "Edificação sem nome",
      uso = x.tags?.building || x.tags?.historic || "edificação";
    if (lat == null || lon == null) return;
    L.marker([lat, lon])
      .bindPopup(
        `<div class="popup-mapa"><strong>${esc(nome)}</strong><small>${esc(uso)} · ${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}</small></div>`,
      )
      .addTo(camadaMapa);
  });
  setTimeout(() => mapaInterativo.invalidateSize(), 80);
}
function renderOsm(data) {
  const el = $("urbano");
  liberar(el);
  const c = cidadeAtual();
  $("cidade").textContent =
    `${data.elements?.length || 0} referências mapeadas no entorno de ${c.nome}`;
  $("mapa").href =
    `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=14/${c.lat}/${c.lon}`;
  const items = (data.elements || []).filter((x) => x.tags?.name);
  atualizarMapa(items, c);
  const visiveis = items.slice(0, 12);
  if (!visiveis.length) {
    el.innerHTML =
      '<p class="estado">Nenhum edifício nomeado encontrado neste recorte.</p>';
    return;
  }
  el.innerHTML = visiveis
    .map((x) => {
      const lat = x.center?.lat || x.lat,
        lon = x.center?.lon || x.lon,
        nome = x.tags.name,
        uso = x.tags.building || x.tags.historic || "edificação";
      return `<article class="urbano-card"><h3>${esc(nome)}</h3><p>${esc(uso)}<br>${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}</p><a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}" target="_blank" rel="noopener">Ver no mapa ↗</a></article>`;
    })
    .join("");
}
function erro(el) {
  liberar(el);
  el.innerHTML =
    '<p class="estado">Fonte indisponível no momento. Tente novamente.</p>';
}
async function mostrarImagensRelacionadas(q) {
  const el = $("detalhe-imagens");
  el.innerHTML =
    '<p class="estado estado-carregando"><span class="loader" aria-hidden="true"></span><span>Buscando imagens relacionadas…</span></p>';
  try {
    const u = new URL("https://commons.wikimedia.org/w/api.php");
    u.search = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `incategory:Architecture ${q}`,
      gsrnamespace: 6,
      gsrlimit: 6,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: 500,
      format: "json",
      origin: "*",
    });
    const data = await json(u),
      pages = Object.values(data.query?.pages || {});
    if (!pages.length) {
      el.innerHTML =
        '<p class="estado">Nenhuma imagem relacionada encontrada.</p>';
      return;
    }
    el.innerHTML = pages
      .map((p) => {
        const info = p.imageinfo?.[0] || {},
          nome = p.title.replace(/^File:/, "");
        return `<figure><a href="https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}" target="_blank" rel="noopener"><img loading="lazy" src="${info.thumburl || info.url}" alt="${esc(nome)}"><figcaption>${esc(nome).slice(0, 70)} · Commons ↗</figcaption></a></figure>`;
      })
      .join("");
  } catch {
    el.innerHTML =
      '<p class="estado">Imagens relacionadas indisponíveis no momento.</p>';
  }
}
async function abrirDetalhe(link, label, description) {
  const dialog = $("detalhe"),
    titulo = $("detalhe-titulo"),
    desc = $("detalhe-descricao"),
    meta = $("detalhe-meta"),
    capa = $("detalhe-capa"),
    imagem = $("detalhe-imagem"),
    fonte = $("detalhe-fonte"),
    pagina = $("detalhe-pagina");
  titulo.textContent = label;
  desc.textContent =
    description || "Referência arquitetônica selecionada no Wikidata.";
  meta.replaceChildren();
  $("detalhe-imagens").replaceChildren();
  capa.hidden = true;
  imagem.removeAttribute("src");
  fonte.href = link;
  const id = link.split("/").pop();
  pagina.href = `?ref=${encodeURIComponent(id)}`;
  history.replaceState(null, "", `?ref=${encodeURIComponent(id)}`);
  dialog.showModal();
  mostrarImagensRelacionadas(label);
  link.split("/").pop();
  try {
    const u = new URL("https://www.wikidata.org/w/api.php");
    u.search = new URLSearchParams({
      action: "wbgetentities",
      ids: id,
      props: "claims|labels|descriptions",
      languages: "pt|en",
      format: "json",
      origin: "*",
    });
    const data = await json(u),
      entity = data.entities?.[id],
      claims = entity?.claims || {};
    const nomeWikidata = entity?.labels?.pt?.value || entity?.labels?.en?.value;
    if (nomeWikidata) titulo.textContent = nomeWikidata;
    const descricaoWikidata =
      entity?.descriptions?.pt?.value || entity?.descriptions?.en?.value;
    if (descricaoWikidata) desc.textContent = descricaoWikidata;
    const imagemNome = claims.P18?.[0]?.mainsnak?.datavalue?.value;
    const dataObra = claims.P571?.[0]?.mainsnak?.datavalue?.value?.time;
    const coordenadas = claims.P625?.[0]?.mainsnak?.datavalue?.value;
    if (imagemNome) {
      imagem.src = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imagemNome)}?width=1000`;
      imagem.alt = label;
      capa.hidden = false;
    }
    [
      ["Identificador", id],
      [dataObra ? "Data de origem" : null, dataObra?.slice(1, 5)],
      [
        coordenadas ? "Coordenadas" : null,
        coordenadas
          ? `${Number(coordenadas.latitude).toFixed(4)}, ${Number(coordenadas.longitude).toFixed(4)}`
          : null,
      ],
    ]
      .filter((item) => item[0] && item[1])
      .forEach(([chave, valor]) => {
        const span = document.createElement("span");
        span.textContent = `${chave}: ${valor}`;
        meta.append(span);
      });
  } catch {
    const span = document.createElement("span");
    span.textContent = "Metadados adicionais indisponíveis";
    meta.append(span);
  }
}
$("fechar-detalhe").addEventListener("click", () => $("detalhe").close());
$("detalhe").addEventListener("click", (event) => {
  if (event.target === $("detalhe")) $("detalhe").close();
});

async function explorar(q) {
  const novo = q.trim().replace(/\s+/g, " ");
  if (!novo) return;
  const id = ++buscaId;
  termo = novo;
  input.value = novo;
  limpar.hidden = false;
  carregando = true;
  status.textContent = `Cruzando referências para “${novo}”…`;
  ["fotos", "obras", "arquivo", "getty", "europeana", "urbano"].forEach(
    (bloco) => loading($(bloco)),
  );
  const tarefas = [
    ["fotos", `unsplash:${novo}`, () => unsplash(novo), renderFotos],
    ["obras", `wikidata:${novo}`, () => wikidata(novo), renderWikidata],
    ["arquivo", `commons:${novo}`, () => commons(novo), renderCommons],
    ["getty", `getty:${novo}`, () => getty(novo), renderGetty],
    ["europeana", `europeana:${novo}`, () => europeana(novo), renderEuropeana],
    ["urbano", `overpass:${cidadeAtual().nome}`, () => overpass(), renderOsm],
  ];
  tarefas.forEach(([bloco, chave, request, render]) =>
    emCache(chave, request)
      .then((data) => {
        if (id === buscaId) render(data);
      })
      .catch(() => {
        if (id === buscaId) erro($(bloco));
      }),
  );
  Promise.allSettled(
    tarefas.map(([, chave, request]) => emCache(chave, request)),
  ).then(() => {
    if (id === buscaId) {
      carregando = false;
      status.textContent = `Resultados relacionados a “${novo}” · vocabulários Getty e acervos abertos consultados`;
    }
  });
}

$("chips").replaceChildren(
  ...Object.entries(TEMAS).map(([grupo, lista]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "tema-grupo";
    const label = document.createElement("span");
    label.className = "tema-label";
    label.textContent = grupo;
    const botoes = document.createElement("div");
    botoes.className = "tema-botoes";
    lista.forEach((t) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.textContent = t;
      b.dataset.q = t;
      b.setAttribute("aria-pressed", "false");
      b.onclick = () => {
        document
          .querySelectorAll(".chip")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        explorar(t);
      };
      botoes.append(b);
    });
    wrapper.append(label, botoes);
    return wrapper;
  }),
);
document.querySelectorAll("[data-vocab]").forEach((btn) =>
  btn.addEventListener("click", () => {
    filtroGetty = btn.dataset.vocab;
    document
      .querySelectorAll("[data-vocab]")
      .forEach((x) => x.classList.toggle("filtro-ativo", x === btn));
    renderGettyFiltrado();
  }),
);
$("form").onsubmit = (e) => {
  e.preventDefault();
  explorar(input.value);
};
input.oninput = () => (limpar.hidden = !input.value);
limpar.onclick = () => {
  input.value = "";
  input.focus();
  limpar.hidden = true;
};
explorar(termo);
const referenciaInicial = new URLSearchParams(location.search).get("ref");
if (/^Q\d+$/.test(referenciaInicial || ""))
  setTimeout(
    () =>
      abrirDetalhe(
        `https://www.wikidata.org/wiki/${referenciaInicial}`,
        referenciaInicial,
        "Carregando referência…",
      ),
    700,
  );
