import { PersonagensRecentes } from './fichas/PaginasFichas.jsx';

export function Dashboard() {
  return (
    <>
      <h1>Seu espaço de jogo</h1>
      <p className="suave">Fichas, rolagens e anotações são salvas neste aparelho.</p>
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