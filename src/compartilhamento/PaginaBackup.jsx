import { useCallback, useEffect, useState } from 'react';
import { obterArmazenamentoGeral } from '../dados/Banco.js';
import { obterUltimoBackup } from '../dados/preferencias.js';
import { GerenciadorBackup } from './Compartilhamentoui.jsx';
import './compartilhamento.css';

export function PaginaBackup() {
  const [armazenamento, setArmazenamento] = useState(null);
  const [ultimoBackup, setUltimoBackup] = useState(obterUltimoBackup);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const arm = await obterArmazenamentoGeral();
      setArmazenamento(arm);
      setUltimoBackup(obterUltimoBackup());
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aoAtualizar = () => {
    setUltimoBackup(obterUltimoBackup());
  };

  const dataFormatada = ultimoBackup
    ? new Date(ultimoBackup).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="pagina-backup">
      <h1>Gerenciamento de Dados</h1>
      <p className="suave">
        Exporte ou importe seus dados entre computadores e celulares de maneira 100% local e segura, sem depender de internet ou servidores externos.
      </p>

      <div className="painel status-backup-painel">
        <span className="rotulo">Status do backup</span>
        <strong>
          {dataFormatada
            ? `Último backup realizado neste aparelho: ${dataFormatada}`
            : 'Nenhum backup realizado ainda neste dispositivo.'}
        </strong>
      </div>

      {carregando ? (
        <p className="suave">Carregando armazenamento local...</p>
      ) : (
        <GerenciadorBackup armazenamento={armazenamento} aoAtualizar={aoAtualizar} />
      )}
    </div>
  );
}
