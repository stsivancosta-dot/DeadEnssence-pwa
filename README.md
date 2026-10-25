Guia completo de Git e GitHub — criar, editar e sincronizar projetos
Este guia é focado apenas no Git e GitHub, desde a criação de um repositório até o ciclo diário de edição, incluindo como trabalhar em dois computadores. Os comandos são para o PowerShell no Windows e o terminal do VS Code.

TREE da commit mais recente:

ens/
├── index.html
├── package.json                       ← minúscula
├── package-lock.json
├── vite.config.js
├── README.md
├── .gitignore
├── CNAME
├── public/                            ← MOVER para a raiz
│   ├── favicon.svg
│   ├── apple-touch-icon.png           ← .png, não .svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── maskable-512x512.png           ← corrigir o nome
├── scripts/                           ← CRIAR (ainda não existe)
│   └── verificar-pwa.mjs
└── src/
    ├── main.jsx
    ├── App.jsx                        ← app.jsx
    ├── paginas.jsx                    ← Paginas.jsx
    ├── dadosExemplo.js                ← dadosexemplos.js
    ├── estilo.css                     ← estilos.css
    ├── dados/
    │   └── banco.js                   ← Banco.js
    ├── modelos/
    │   └── ficha.js                   ← Ficha.js
    ├── fichas/
    │   ├── PaginasFichas.jsx          ← Paginasfichas.jsx
    │   └── fichas.css                 ← Fichas.css
    └── compartilhamento/
        ├── CompartilhamentoUI.jsx     ← Compartilhamentoui.jsx
        ├── compartilhamento.css       ← Compartilhamento.css
        ├── fichas.js                  ← Fichas.js
        ├── backup.js                  ← Backup.js
        └── formatos.js                ← Formatos.js



1. Tabela de comandos essenciais
Comando	Para que serve	Quando usar
git --version	Verifica se o Git está instalado	Primeira utilização
git config --global user.name "Seu Nome"	Define o nome dos commits	Configuração inicial
git config --global user.email "email@exemplo.com"	Define o e-mail dos commits	Configuração inicial
git init	Inicializa um repositório Git local	Criar um repositório em uma pasta existente
git clone URL	Baixa um repositório do GitHub e cria uma pasta	Pegar um projeto existente
git status	Mostra arquivos alterados, preparados ou pendentes	Durante todo o trabalho
git add .	Prepara todas as alterações para o próximo commit	Antes de registrar mudanças
git add arquivo.html	Prepara apenas um arquivo	Quando quiser selecionar alterações
git commit -m "Mensagem"	Registra as alterações preparadas no histórico local	Depois do git add
git push	Envia commits locais para o GitHub	Depois de fazer commits
git pull	Baixa e integra alterações do GitHub	Antes de continuar um projeto atualizado
git fetch	Busca informações novas do remoto sem integrar ao seu trabalho	Para verificar atualizações remotas
git log --oneline	Mostra o histórico resumido de commits	Consultar versões anteriores
git diff	Mostra alterações ainda não preparadas	Revisar o que você editou
git remote -v	Mostra os endereços remotos configurados	Conferir a conexão com GitHub
git branch	Lista as branches locais	Ver em qual linha de desenvolvimento está
git branch -M main	Renomeia a branch atual para main	Configuração inicial, se necessário

2. Como criar um projeto novo e enviá-lo ao GitHub
Use este fluxo quando você já criou uma pasta no VS Code e quer começar a versioná-la.
Etapa	Comando	O que acontece
1. Entrar na pasta	cd "C:\caminho\do\projeto"	Abre o diretório correto no terminal
2. Inicializar o Git	git init	Cria o repositório local
3. Conferir os arquivos	git status	Mostra o que será versionado
4. Preparar arquivos	git add .	Prepara os arquivos para o commit
5. Criar o primeiro registro	git commit -m "Primeiro commit"	Salva uma versão no histórico local
6. Usar a branch principal	git branch -M main	Define o nome da branch como main
7. Conectar ao GitHub	git remote add origin URL_DO_REPOSITORIO	Associa o repositório local ao remoto
8. Enviar ao GitHub	git push -u origin main	Envia a branch e configura o acompanhamento remoto

Antes de executar a etapa 7, crie um repositório no site do GitHub e copie sua URL HTTPS.

Exemplo de conexão:
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git


Atenção: se o repositório remoto já tiver commits, o primeiro push poderá ser rejeitado. Nesse caso, não force o envio automaticamente; primeiro verifique o conteúdo remoto e decida se precisa integrá-lo.
3. O ciclo de edição: o que você fará na maioria dos dias
Este é o fluxo mais importante para memorizar. Depois que o repositório estiver configurado, você não precisa repetir git init nem git remote add origin.
1. Editar o projeto

Alterar HTML, CSS, JavaScript ou outros arquivos no VS Code.


2. Conferir as alterações

git status

Verifique quais arquivos foram modificados.


3. Preparar as alterações

git add .

Seleciona as alterações para registrar no próximo commit.


4. Registrar uma versão

git commit -m "Corrige tela inicial"

Salva um ponto no histórico local.


5. Sincronizar com o GitHub

git push

Publica os commits locais no repositório remoto.


Os quatro comandos para decorar
git status
git add .
git commit -m "Descrição da alteração"
git push


Exemplos de mensagens de commit:
Mensagem	Significado
git commit -m "Cria página inicial"	Adicionou a página inicial
git commit -m "Corrige menu"	Corrigiu o menu
git commit -m "Adiciona formulário de cadastro"	Implementou um formulário
git commit -m "Ajusta responsividade"	Melhorou a adaptação a telas diferentes
git commit -m "Corrige erro de login"	Corrigiu um problema

As mensagens podem estar em português. O importante é serem curtas e descreverem o que mudou.
4. Como continuar o projeto em um segundo computador
Existem dois cenários diferentes.
Cenário A — você nunca baixou o projeto nesse computador
Etapa	Comando	Resultado
1. Ir ao local desejado	cd "$HOME\Documents"	Escolhe onde guardar o projeto
2. Clonar	git clone URL_DO_REPOSITORIO	Cria a pasta e baixa o projeto
3. Entrar na pasta	cd NOME_DO_REPOSITORIO	Abre o diretório do projeto
4. Abrir no VS Code	code .	Abre os arquivos

Você não precisa criar a pasta manualmente. O git clone cria a pasta do repositório.
Cenário B — você já tem o projeto nesse computador
Antes de editar, execute:
git pull


Depois de trabalhar, use:
git add .
git commit -m "Atualiza projeto"
git push


O primeiro comando baixa as atualizações remotas; os últimos três registram e enviam suas alterações.
5. Como trabalhar corretamente em dois computadores
Imagine que você edita o projeto no computador de casa e depois continua na escola.

Computador de casa

Edita os arquivos e executa:

git add .

git commit -m "Atualiza projeto"

git push


Sincronização pelo GitHub


Computador da escola

Antes de editar:

git pull

Depois de trabalhar, faça commit e push normalmente.



Regra principal: envie suas alterações antes de trocar de computador e faça git pull antes de continuar no outro. Isso reduz o risco de conflitos.

Se você editar o mesmo arquivo nos dois computadores antes de sincronizar, o Git pode solicitar que você resolva um conflito. Não significa que o projeto foi perdido.
6. Erros comuns e como resolver
Mensagem ou situação	Causa provável	O que fazer
git is not recognized	Git não está instalado ou não está no PATH	Verifique a instalação do Git
src refspec main does not match any	A branch main não existe localmente ou ainda não há commit	Faça o primeiro commit e confira git branch
remote origin already exists	O remoto origin já está configurado	Use git remote -v; não repita git remote add
Repository not found	URL incorreta ou falta de permissão	Confira a URL e a conta autenticada
rejected (fetch first)	O remoto tem commits que não estão na sua cópia	Faça git pull e resolva eventuais conflitos antes do push
nothing to commit, working tree clean	Não há alterações pendentes para registrar	Se esperava mudanças, confira se salvou os arquivos e está na pasta certa
Everything up-to-date	Não há novos commits para enviar	Nenhuma ação necessária
Esqueceu de fazer git add	As mudanças não foram preparadas	Execute git add . e faça o commit

7. O que cada conceito significa
Termo	Explicação simples
Git	Ferramenta que registra o histórico de alterações do projeto
GitHub	Serviço online que hospeda repositórios Git
Repositório local	A cópia do projeto no seu computador
Repositório remoto	A cópia do projeto hospedada no GitHub
Commit	Um registro de alterações no histórico
Push	Envia commits locais para o remoto
Pull	Busca e integra atualizações do remoto
Clone	Cria uma cópia local de um repositório remoto
Branch	Uma linha separada de desenvolvimento
Merge	Integra alterações de uma branch a outra
Conflito	Situação em que o Git precisa que você escolha como combinar alterações incompatíveis
.gitignore	Arquivo que indica quais arquivos o Git deve ignorar, como node_modules/ e .env