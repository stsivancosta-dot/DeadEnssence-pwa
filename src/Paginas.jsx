import { personagemExemplo as p, notasExemplo } from "./dadosexemplos.js";

const Exemplo = () => <span className="etiqueta">Exemplo</span>;

function Medidor({ rotulo, atual, max }) {
  const pct = max ? Math.round((atual / max) * 100) : 0;
  return (
    <div className="painel">
      <span className="rotulo">{rotulo}</span>
      <strong className="valor">{atual} / {max}</strong>
      <div className="barra" role="img" aria-label={`${rotulo}: ${atual} de ${max}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const Valor = ({ rotulo, valor }) => (
  <div className="painel">
    <span className="rotulo">{rotulo}</span>
    <strong className="valor">{valor}</strong>
  </div>
);

function CartaoPersonagem() {
  return (
    <a className="painel cartao" href="#/personagens/exemplo">
      <span><strong>{p.nome}</strong> <Exemplo /></span>
      <span className="suave">Origem: {p.origem}, tipo: {p.tipo}</span>
      <span className="suave">Vida {p.vida.atual}, Estamina {p.estamina.atual}, Fluxo {p.fluxo}</span>
    </a>
  );
}

export function Dashboard() {
  return (
    <>
      <h1>Seu espaço de jogo</h1>
      <p className="suave">Esta é a Etapa 1: só a estrutura visual. Itens marcados como exemplo não são registros reais.</p>
      <div className="grade">
        <a className="painel atalho" href="#/personagens"><strong>Personagens</strong><span className="suave">Fichas do seu grupo</span></a>
        <a className="painel atalho" href="#/anotacoes"><strong>Anotações</strong><span className="suave">Textos e pistas</span></a>
        <a className="painel atalho" href="#/rolagens"><strong>Rolagens</strong><span className="suave">Dados e testes</span></a>
      </div>
      <h2>Personagens recentes</h2>
      <CartaoPersonagem />
    </>
  );
}

export function Personagens() {
  return (
    <>
      <h1>Personagens</h1>
      <p className="vazio">Você ainda não criou fichas. A criação chega na Etapa 2.</p>
      <h2>Como a lista vai ficar</h2>
      <CartaoPersonagem />
    </>
  );
}

export function Ficha() {
  return (
    <>
      <p className="trilha"><a href="#/personagens">Personagens</a> &gt; {p.nome}</p>
      <h1>{p.nome} <Exemplo /></h1>
      <p className="suave">Origem: {p.origem}, tipo: {p.tipo}</p>
      <h2>Status</h2>
      <div className="grade">
        <Medidor rotulo="Vida" atual={p.vida.atual} max={p.vida.max} />
        <Valor rotulo="Defesa" valor={p.defesa} />
        <Valor rotulo="Defesa especial" valor={p.defesaEspecial} />
        <Medidor rotulo="Estamina" atual={p.estamina.atual} max={p.estamina.max} />
        <Valor rotulo="Pontos de Fluxo" valor={p.fluxo} />
      </div>
      <h2>Atributos básicos</h2>
      <div className="grade">
        <Valor rotulo="Físico" valor="--" />
        <Valor rotulo="Intelecto" valor="--" />
        <Valor rotulo="Presença" valor="--" />
      </div>
      <p className="suave">Proficiências, habilidades, equipamentos, inventário, anotações e histórico entram nas próximas etapas.</p>
    </>
  );
}

export function Anotacoes() {
  return (
    <>
      <h1>Anotações</h1>
      <div className="duas">
        <section>
          <h2>Minhas notas</h2>
          <p className="vazio">Nenhuma anotação criada ainda.</p>
          {notasExemplo.map((n) => (
            <div className="painel" key={n.id}><strong>{n.titulo}</strong> <Exemplo /></div>
          ))}
        </section>
        <section>
          <h2>Editor</h2>
          <p className="vazio">O editor de texto chega na Etapa 3.</p>
        </section>
      </div>
    </>
  );
}

export function Rolagens() {
  return (
    <>
      <h1>Rolagens e testes</h1>
      <div className="duas">
        <section className="painel">
          <h2>Rolagem simples</h2>
          <p className="vazio">Chega na Etapa 4: escolher o dado, rolar e ver cada resultado.</p>
        </section>
        <section className="painel">
          <h2>Teste de atributo</h2>
          <p className="vazio">Será ativado quando as regras de teste forem integradas (Etapa 5).</p>
        </section>
      </div>
      <h2>Histórico de rolagens</h2>
      <p className="vazio">Nenhuma rolagem registrada.</p>
    </>
  );
}