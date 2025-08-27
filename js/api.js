// Camada de acesso à API json-server
// Ajuste a porta conforme seu json-server: npx json-server --watch db.json --port 3000
const API_BASE = 'http://localhost:3000';

// Detectar axios se carregado em <script>
const hasAxios = typeof window !== 'undefined' && window.axios;

async function handleFetch(res){
  if(!res.ok){
    let txt = '';
    try{ txt = await res.text(); }catch{}
    throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
  }
  return res.status === 204 ? null : res.json();
}

function buildURL(resource, params){
  const url = new URL(API_BASE + resource);
  if(params){
    Object.entries(params).forEach(([k,v])=>{
      if(v!==undefined && v!==null && v!=='') url.searchParams.append(k,v);
    });
  }
  return url.toString();
}

// Métodos genéricos
async function apiGet(resource, params){
  const url = buildURL(resource, params);
  if(hasAxios){ const {data}= await axios.get(url); return data; }
  return handleFetch(await fetch(url));
}
async function apiPost(resource, body){
  if(hasAxios){ const {data}= await axios.post(API_BASE+resource, body); return data; }
  return handleFetch(await fetch(API_BASE+resource,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
}
async function apiPut(resource, body){
  if(hasAxios){ const {data}= await axios.put(API_BASE+resource, body); return data; }
  return handleFetch(await fetch(API_BASE+resource,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
}
async function apiPatch(resource, body){
  if(hasAxios){ const {data}= await axios.patch(API_BASE+resource, body); return data; }
  return handleFetch(await fetch(API_BASE+resource,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
}
async function apiDelete(resource){
  if(hasAxios){ await axios.delete(API_BASE+resource); return true; }
  await handleFetch(await fetch(API_BASE+resource,{method:'DELETE'}));
  return true;
}

// Endpoints específicos
const MatchesAPI = {
  list: (params) => apiGet('/matches', params),
  get: (id) => apiGet(`/matches/${id}`),
  create: (data) => apiPost('/matches', data),
  update: (id,data) => apiPut(`/matches/${id}`, data),
  patch: (id,data) => apiPatch(`/matches/${id}`, data),
  remove: (id) => apiDelete(`/matches/${id}`)
};
const CompetitionsAPI = {
  list: () => apiGet('/competitions'),
  get: (id) => apiGet(`/competitions/${id}`)
};
const TeamsAPI = {
  list: () => apiGet('/teams'),
  get: (id) => apiGet(`/teams/${id}`)
};

async function loadAll(){
  const [competitions, teams, matches] = await Promise.all([
    CompetitionsAPI.list(), TeamsAPI.list(), MatchesAPI.list()
  ]);
  return { competitions, teams, matches };
}

window.API = { MatchesAPI, CompetitionsAPI, TeamsAPI, loadAll };