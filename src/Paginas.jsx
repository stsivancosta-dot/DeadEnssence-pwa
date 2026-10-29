import { notasExemplo } from './dadosExemplo.js';
import { PersonagensRecentes } from './fichas/PaginasFichas.jsx';

const Exemplo = () => <span className="etiqueta">Exemplo</span>;

export function Dashboard() {
  return (
    <>
      <h1>Seu espaço de jogo</h1>
      <p className="suave">Fichas e rolagens já são salvas neste aparelho. As anotações ainda são só estrutura.</p>
      <div className="grade">
        <a className="painel atalho" href="#/personagens"><strong>Personagens</strong><span className="suave">Fichas do seu grupo</span></a>
        <a className="painel atalho" href="#/anotacoes"><strong>Anotações</strong><span className="suave">Textos e pistas</span></a>
        <a className="painel atalho" href="#/rolagens"><strong>Rolagens</strong><span className="suave">Dados e testes</span></a>
      </div>
      <h2>Personagens recentes</h2>
      <PersonagensRecentes />
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