// DADOS DE EXEMPLO: servem só para mostrar a interface. Não são registros do jogador.
// Os valores de Vida, Defesa, Defesa Especial e Estamina são os padrões do documento do sistema.
export const personagemExemplo = {
  id: 'exemplo',
  nome: 'Personagem de exemplo',
  origem: '--',
  tipo: 'Humano',
  vida: { atual: 35, max: 35 },
  defesa: 8,
  defesaEspecial: 8,
  estamina: { atual: 30, max: 30 },
  fluxo: 0,
};

export const notasExemplo = [
  { id: 'n1', titulo: 'Pistas da sessão' },
  { id: 'n2', titulo: 'NPCs importantes' },
];