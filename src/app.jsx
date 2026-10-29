import { Rolagens } from './rolagens/PaginaRolagens.jsx';
import { useEffect, useState } from 'react';
import { Dashboard, Anotacoes } from './paginas.jsx';
import { Personagens, Ficha } from './fichas/PaginasFichas.jsx';

const ITENS = [
  { id: 'inicio', longo: 'Início', curto: 'Início' },
  { id: 'personagens', longo: 'Personagens', curto: 'Fichas' },
  { id: 'anotacoes', longo: 'Anotações', curto: 'Notas' },
  { id: 'rolagens', longo: 'Rolagens', curto: 'Dados' },
];

// Navegação por #/rota: funciona em hospedagem estática (Surge) sem configurar fallback.
const lerRota = () => window.location.hash.replace(/^#\/?/, '').split('/');

export default function App() {
  const [rota, setRota] = useState(lerRota);
  useEffect(() => {
    const aoMudar = () => {
      setRota(lerRota());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const [secao, sub] = rota;
  const ativa = ITENS.some((i) => i.id === secao) ? secao : 'inicio';

  let pagina = <Dashboard />;
  if (secao === 'personagens') pagina = sub ? <Ficha key={sub} id={sub} /> : <Personagens />;
  else if (secao === 'anotacoes') pagina = <Anotacoes />;
  else if (secao === 'rolagens') pagina = <Rolagens />;

  return (
    <div className="app">
      <header className="topo">DeadEssence RPG</header>
      <nav className="menu" aria-label="Principal">
        {ITENS.map((i) => (
          <a key={i.id} href={`#/${i.id}`} aria-current={ativa === i.id ? 'page' : undefined}>
            <span className="longo">{i.longo}</span>
            <span className="curto">{i.curto}</span>
          </a>
        ))}
      </nav>
      <main className="conteudo">{pagina}</main>
      <footer className="rodape">As fichas ficam salvas só neste dispositivo; não há sincronização entre aparelhos.</footer>
    </div>
  );
}