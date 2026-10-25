export const RACAS = ['Humano', 'Ressonante'];
export const ATRIBUTOS = [
  { id: 'fisico', rotulo: 'Físico' },
  { id: 'intelecto', rotulo: 'Intelecto' },
  { id: 'presenca', rotulo: 'Presença' },
];

export function novoId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Array.from(c.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Valores básicos do documento do sistema; todos editáveis.
// Atributos começam vazios porque não há valor inicial definido.
// Essencialidade guarda atual e total separados (o total é a referência da potência das Ressonâncias).
export function fichaNova() {
  const agora = new Date().toISOString();
  return {
    id: novoId(),
    nome: '',
    genero: '',
    raca: 'Humano',
    vida: { atual: 35, total: 35 },
    defesa: 8,
    defesaEspecial: 8,
    essencialidade: { atual: 30, total: 30 },
    fluxo: 0,
    atributos: { fisico: null, intelecto: null, presenca: null },
    criadoEm: agora,
    atualizadoEm: agora,
  };
}