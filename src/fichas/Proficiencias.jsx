import { useState } from 'react';
import { ATRIBUTOS } from '../modelos/ficha.js';
import { GRAUS, PROFICIENCIAS, contagem, definirGrau, grauPorId, somaPorGrupo } from '../modelos/proficiencias.js';
import './proficiencias.css';

function Grafico({ treinadas }) {
  const dados = somaPorGrupo(treinadas);
  const escala = Math.max(1, ...dados.map((d) => d.total)); // a barra mais longa ocupa toda a largura
  return (
    <figure className="grafico">
      <figcaption>Especialização por atributo</figcaption>
      {dados.map((d) => (
        <div className="grafico-linha" key={d.id}>
          <span className="grafico-rotulo">{d.rotulo}</span>
          <div className="grafico-barra" role="img"
            aria-label={`${d.rotulo}: ${d.total}. Fracas ${d.por.fraco}, experientes ${d.por.experiente}, avançadas ${d.por.avancado}.`}>
            {GRAUS.map((g) => d.por[g.id] > 0 && (
              <i key={g.id} data-grau={g.id} style={{ width: `${(d.por[g.id] / escala) * 100}%`, background: g.cor }} />
            ))}
          </div>
          <strong className="grafico-total">{d.total}</strong>
        </div>
      ))}
      <div className="grafico-legenda">
        {GRAUS.map((g) => <span key={g.id} style={{ '--cor': g.cor }}>{g.rotulo} +{g.bonus}</span>)}
      </div>
    </figure>
  );
}

export function PaginaProficiencias({ ficha, alterar }) {
  const treinadas = ficha.proficiencias ?? {};
  const cont = contagem(treinadas);
  const [aviso, setAviso] = useState(null);

  function escolher(id, novoGrau) {
    const r = definirGrau(treinadas, id, novoGrau);
    if (!r.ok) return setAviso(r.motivo);
    setAviso(null);
    if (r.treinadas !== treinadas) alterar((f) => ({ ...f, proficiencias: r.treinadas }));
  }

  return (
    <>
      <h2>Proficiências treinadas</h2>
      <div className="contadores" role="group" aria-label="Vagas utilizadas">
        {GRAUS.map((g) => (
          <span key={g.id} className="contador-grau" style={{ '--cor': g.cor }}>
            {g.rotulo} (+{g.bonus}) <strong>{cont[g.id]}/{g.limite}</strong>
          </span>
        ))}
      </div>
      <p className="suave">Até 12 treinadas no total. Os limites são máximos: não é preciso preencher todas as vagas.</p>
      <p className="prof-aviso" role="status">{aviso}</p>

      <h2>Atributos</h2>
      <div className="grade">
        {ATRIBUTOS.map((a) => (
          <div className="painel" key={a.id}>
            <span className="rotulo">{a.rotulo}</span>
            <strong className="valor">{ficha.atributos?.[a.id] ?? '--'}</strong>
          </div>
        ))}
      </div>
      <p className="suave">Os valores dos atributos são editados na aba Geral e não entram na soma das proficiências.</p>

      <Grafico treinadas={treinadas} />

      <h2>Todas as proficiências</h2>
      <ul className="prof-lista">
        {PROFICIENCIAS.map((p) => {
          const grau = grauPorId(treinadas[p.id]);
          return (
            <li className="prof" key={p.id}>
              <span className="prof-nome">{p.nome}</span>
              <span className="prof-estado suave">{grau ? `${grau.rotulo} +${grau.bonus}` : 'Sem treino'}</span>
              <div className="prof-graus" role="group" aria-label={`Classificação de ${p.nome}`}>
                {GRAUS.map((g) => {
                  const ativo = treinadas[p.id] === g.id;
                  const cheio = !ativo && cont[g.id] >= g.limite;
                  return (
                    <button key={g.id} type="button" className={`grau${cheio ? ' cheio' : ''}`}
                      style={{ '--cor': g.cor, '--sobre': g.textoSobre }} aria-pressed={ativo} aria-disabled={cheio || undefined}
                      aria-label={`${p.nome}: ${g.rotulo} (+${g.bonus})`} title={`${g.rotulo} +${g.bonus}`}
                      onClick={() => escolher(p.id, g.id)}>+{g.bonus}</button>
                  );
                })}
                <button type="button" className="grau remover" disabled={!grau} aria-label={`${p.nome}: remover treino`}
                  title="Remover treino" onClick={() => escolher(p.id, null)}>×</button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}