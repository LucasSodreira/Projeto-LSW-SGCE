// Camada de acesso à API json-server
// Ajuste a porta conforme seu json-server: npx json-server --watch db.json --port 3000
const API_BASE = "http://localhost:3000";

// Detectar axios se carregado em <script>
const hasAxios = typeof window !== "undefined" && window.axios;

async function handleFetch(res) {
  if (!res.ok) {
    let txt = "";
    try {
      txt = await res.text();
    } catch {}
    throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
  }
  return res.status === 204 ? null : res.json();
}

function buildURL(resource, params) {
  const url = new URL(API_BASE + resource);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "")
        url.searchParams.append(k, v);
    });
  }
  return url.toString();
}

// Descoberta de aliases (suporta chaves em PT: partidas, times, competicoes)
// Ordem prioriza endpoints em português para evitar 404 iniciais quando json-server está usando dados em PT
const RESOURCE_ALIASES = {
  matches: ["/partidas", "/matches", "/jogos", "/partida", "/jogo"],
  teams: ["/times", "/teams", "/equipes", "/equipe", "/clubes", "/clube"],
  competitions: [
    "/competicoes",
    "/competitions",
    "/competicao",
    "/torneios",
    "/torneio",
  ],
};
const resolvedResources = { matches: null, teams: null, competitions: null };

// Debug detalhado de descoberta (mude para false se poluir o console)
const DEBUG_DISCOVERY = true;

async function resolveResource(baseKey) {
  if (resolvedResources[baseKey]) return resolvedResources[baseKey];
  const candidates = RESOURCE_ALIASES[baseKey] || ["/" + baseKey];
  const errors = [];
  for (const c of candidates) {
    try {
      const testUrl = buildURL(c, null);
      const res = await fetch(testUrl, { method: "GET" });
      if (!res.ok) {
        // Apenas guarda erro; reduz log de ruído para 404 comuns
        if (res.status !== 404 || DEBUG_DISCOVERY) {
          if (DEBUG_DISCOVERY)
            console.warn("[API discovery]", baseKey, "fail", c, res.status);
        }
        errors.push(`${c} -> HTTP ${res.status}`);
        continue;
      }
      let data = null;
      try {
        data = await res.clone().json();
      } catch {
        /* ignore */
      }
      if (Array.isArray(data)) {
        if (DEBUG_DISCOVERY)
          console.info("[API discovery]", baseKey, "resolved to", c);
        resolvedResources[baseKey] = c;
        return c;
      } else {
        errors.push(`${c} -> not array`);
      }
    } catch (e) {
      errors.push(`${c} -> ${e.message}`);
    }
  }
  const msg = `Nenhum alias válido encontrado para '${baseKey}'. Tentados: ${errors.join(
    "; "
  )}`;
  if (DEBUG_DISCOVERY) console.error(msg);
  throw new Error(msg);
}

// Métodos genéricos com tentativa de fallback de alias em caso de 404
async function tryAliases(baseKey, method, body, params) {
  const path = await resolveResource(baseKey); // pode lançar erro
  const doFetch = async (p) => {
    const url = method === "GET" ? buildURL(p, params) : API_BASE + p;
    const options =
      method === "GET"
        ? undefined
        : {
            method,
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
          };
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.status === 204 ? null : res.json();
  };
  // Se axios disponível e sem params especiais, usa axios direto
  if (hasAxios && method === "GET") {
    const full = buildURL(path, params);
    const { data } = await axios.get(full);
    return data;
  } else if (hasAxios && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const target = API_BASE + path;
    if (method === "POST") {
      const { data } = await axios.post(target, body);
      return data;
    }
    if (method === "PUT") {
      const { data } = await axios.put(target, body);
      return data;
    }
    if (method === "PATCH") {
      const { data } = await axios.patch(target, body);
      return data;
    }
    if (method === "DELETE") {
      await axios.delete(target);
      return true;
    }
  }
  return doFetch(path);
}

async function apiGet(resource, params) {
  return tryAliases(resource.replace(/^\//, ""), "GET", null, params);
}
async function apiPost(resource, body) {
  return tryAliases(resource.replace(/^\//, ""), "POST", body);
}
async function apiPut(resource, body) {
  return tryAliases(resource.replace(/^\//, ""), "PUT", body);
}
async function apiPatch(resource, body) {
  return tryAliases(resource.replace(/^\//, ""), "PATCH", body);
}
async function apiDelete(resource) {
  return tryAliases(resource.replace(/^\//, ""), "DELETE");
}

// Endpoints específicos
// As funções agora usam as chaves base (matches, competitions, teams) e o resolver ajusta para 'partidas', 'times', etc.
const MatchesAPI = {
  list: (params) => apiGet("/matches", params),
  get: async (id) => {
    const base = await resolveResource("matches");
    return apiGet(`${base}/${id}`);
  },
  create: (data) => apiPost("/matches", data),
  update: async (id, data) => {
    const base = await resolveResource("matches");
    return apiPut(`${base}/${id}`, data);
  },
  patch: async (id, data) => {
    const base = await resolveResource("matches");
    return apiPatch(`${base}/${id}`, data);
  },
  remove: async (id) => {
    const base = await resolveResource("matches");
    return apiDelete(`${base}/${id}`);
  },
};
const CompetitionsAPI = {
  list: () => apiGet("/competitions"),
  get: async (id) => {
    const base = await resolveResource("competitions");
    return apiGet(`${base}/${id}`);
  },
  create: (data) => apiPost("/competitions", data),
  update: async (id, data) => {
    const base = await resolveResource("competitions");
    return apiPut(`${base}/${id}`, data);
  },
  patch: async (id, data) => {
    const base = await resolveResource("competitions");
    return apiPatch(`${base}/${id}`, data);
  },
  remove: async (id) => {
    const base = await resolveResource("competitions");
    return apiDelete(`${base}/${id}`);
  },
};

const TeamsAPI = {
  list: () => apiGet("/teams"),
  get: async (id) => {
    const base = await resolveResource("teams");
    return apiGet(`${base}/${id}`);
  },
  create: (data) => apiPost("/teams", data),
  update: async (id, data) => {
    const base = await resolveResource("teams");
    return apiPut(`${base}/${id}`, data);
  },
  patch: async (id, data) => {
    const base = await resolveResource("teams");
    return apiPatch(`${base}/${id}`, data);
  },
  remove: async (id) => {
    const base = await resolveResource("teams");
    return apiDelete(`${base}/${id}`);
  },
};

async function loadAll() {
  const [competitions, teams, matches] = await Promise.all([
    CompetitionsAPI.list(),
    TeamsAPI.list(),
    MatchesAPI.list(),
  ]);
  return { competitions, teams, matches };
}

window.API = { MatchesAPI, CompetitionsAPI, TeamsAPI, loadAll };
