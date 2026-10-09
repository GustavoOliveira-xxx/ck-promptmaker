# CK Promptmaker
Um assistente de atividades instalável, com identidade **Conscious Knowledge**, armazenamento local e prompts completos para levar à IA de sua escolha.

## O que faz
- Formulário em quatro etapas, com bloqueio de avanço: contexto obrigatório, entregas válidas e confirmação de revisão dos materiais antes de abrir o prompt. Alterar dados anteriores exige conferir os materiais novamente.
- Datas, matéria, professor, bimestre, modalidade individual/grupo, integrantes, enunciado, objetivos, critérios e limites.
- Múltiplos entregáveis por atividade: DOCX/PDF simples ou ABNT, slides PDF/PPTX/site, ZIP, SQL, HTML, Python, JS, JSON, Markdown e formato livre. Cada combinação gera instruções próprias.
- Direção de sites: identidade original/remaster/personalizada, interatividade, frequência 3D, ZIP de mídia e preparação para GitHub.
- Biblioteca de matérias com PTDs e notas dos quatro bimestres e plano anual. **Todos os PTDs da matéria** acompanham a exportação.
- Câmera pelo seletor nativo do celular; anexos ficam vinculados à atividade.
- Prompt copiável, TXT, Markdown e ZIP contendo arquivos reais, PTDs, logo, briefing estruturado e manual CPS completo por padrão (obrigatório em ABNT).
- Perfil de escrita, exemplo de texto, regras editáveis e marca/manual personalizados. Atividades individuais exigem o nome do perfil e o usam explicitamente como autoria no prompt.
- Rascunhos com salvamento automático, busca, duplicação, conclusão e backup/restauração completa.
- PWA standalone, abertura animada, efeitos de energia com a logo CK nos cliques e transições, uso offline após o primeiro carregamento e suporte a movimento reduzido. As animações não interceptam toques.
- Sem conta, API de IA, telemetria ou upload automático. A geração do prompt acontece no navegador.

## Instalar no celular
A versão publicada precisa de HTTPS.
- **Android / Chrome:** abra o endereço do app e use “Instalar aplicativo” no menu ou no perfil.
- **iPhone / Safari:** Compartilhar → Adicionar à Tela de Início.
- Abra online uma vez antes de usar offline. A instalação, o seletor de câmera e o compartilhamento dependem do navegador/OS.

## Rodar localmente
Requer Node.js 22 ou superior e pnpm (versão fixada no package.json). A interface usa módulos nativos. PDF.js e Mammoth são empacotados localmente para extrair texto de PDF/DOCX; não há CDN nem servidor de processamento.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Abra http://127.0.0.1:4173. O comando dev constrói e serve dist/. Depois de editar, reinicie o comando e atualize o app para receber o novo cache. Para apenas construir, use `pnpm run build`.

## Verificar
```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:e2e
```

O CI usa pnpm e o lockfile para instalar leitores e ferramentas de teste. Os testes cobrem geração de prompts, regras condicionais, ZIP binário, formulário mobile, anexos/PTDs, persistência offline, backup, validação, dimensões responsivas, transferência entre dois navegadores, autoria, publicação GitHub simulada sem alterar repositórios reais e leitura de PDF/DOCX em uma página sem JavaScript.

## Publicação no GitHub Pages
O workflow `.github/workflows/pages.yml` constrói o app e publica `dist/`.
Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions** se a configuração automática não estiver disponível. O endereço padrão é:
https://gustavooliveira-xxx.github.io/ck-promptmaker/

Todos os caminhos são relativos para funcionar em subdiretórios. Também é possível hospedar `dist/` em qualquer servidor estático com HTTPS. Nenhuma variável de ambiente ou chave secreta é necessária.

## Como enviar à IA
1. Revise o prompt e baixe o pacote ZIP.
2. Se a IA aceitar ZIP, envie o pacote. Caso contrário extraia e anexe `PROMPT.md` e os arquivos das pastas.
3. Confira se a IA realmente conseguiu ler os materiais. **Copiar texto não transporta fotos/PDFs**, e um caminho de arquivo não concede acesso a um anexo.
4. A IA receptora produz os entregáveis; o CK organiza contexto e instruções. Capacidades de geração e limites de anexos variam por IA.
5. Revise, compreenda e ajuste o resultado antes de entregar. O perfil adapta o tom da escrita, sem promessas de detecção/autoria e sem inventar fontes ou experiências.

## Dados e limites
- IndexedDB armazena atividades, perfil, matérias e blobs dos arquivos.
- Até 25 MB por arquivo e 120 MB no total de anexos. O limite é deliberado para manter a experiência viável em celulares. ZIP usa STORE, sem recompressão de mídia, preservando os bytes.
- Faça backups em **Meu perfil → Exportar backup**. O backup JSON contém também os arquivos. Restaurar substitui o banco inteiro em uma transação, após confirmação e validação.
- Os dados são específicos de navegador, origem e aparelho. Há transferência manual por arquivo (veja abaixo), sem sincronização automática. Limpeza dos dados do navegador pode apagá-los.
- “Proteger armazenamento” solicita persistência ao navegador; a concessão depende dele.
- A câmera usa `input capture="environment"`, sem stream de vídeo permanente. Não há OCR automático: a foto segue como anexo; use Texto-base para transcrição.
- A opção GitHub nas entregas instrui a IA a preparar o projeto. Separadamente, Página para IA permite publicar um briefing estático após consentimento explícito. O token é usado somente em memória, diretamente na API do GitHub, e não entra em perfil, backup ou página.
- Nenhuma PWA pode garantir ausência absoluta de lag em todos os aparelhos. A interface usa módulos nativos, logo WebP, animações de transform/opacidade e suporte a movimento reduzido.

## Levar os dados do computador ao celular
1. No computador, abra **Meu perfil → Levar meus dados → Exportar transferência**.
2. Envie o JSON ao celular por cabo, Quick Share, AirDrop ou um meio da sua preferência.
3. No CK do celular, abra **Meu perfil → Receber dados**, selecione o arquivo e confira o resumo.
4. Escolha se deseja trazer o perfil e confirme a importação.

O arquivo contém atividades, matérias, PTDs, anexos e perfil. Itens com o mesmo ID recebem a versão importada; itens exclusivos do destino permanecem. Importar novamente o mesmo arquivo não duplica os itens. Exclusões não são propagadas. Não há resolução automática de edições simultâneas: o arquivo importado prevalece nos itens com mesmo ID. Para retornar ao computador, repita o processo no sentido inverso. **Restaurar backup** continua sendo uma operação diferente: substitui todo o conteúdo local.

## Página para IA (alternativa ao ZIP)
Em **Seu prompt → Página para IA**, o app prepara um HTML estático com prompt, textos integrais extraíveis e links para todos os arquivos originais. Não depende de JavaScript para ser lido.

- **Baixar página HTML:** um arquivo autossuficiente com os originais embutidos. Pode ser aberto offline ou anexado à IA; não cria um link público.
- **Publicar e obter link:** envia os arquivos a um repositório público que você controla com GitHub Pages já habilitado. É necessário estar online, informar o repositório, um token com **Contents: Read and write** e **Pages: Read**, e confirmar que o conteúdo ficará público. Restrinja o token ao repositório escolhido. Nunca o compartilhe com uma IA ou o coloque nos arquivos do projeto.
- Para este repositório CK, use Pages via **GitHub Actions**. A publicação salva em `public/briefings/<id>/`, que o build copia para dist. Outro repositório pode usar **Deploy from a branch**, publicando a raiz ou `/docs`; nesse caso os briefings são escritos na pasta configurada.
- O app preserva os demais arquivos e não força alterações de histórico. Mudanças concorrentes na branch podem exigir uma nova tentativa.
- Depois do envio, aguarde o deploy em **Actions** e abra o link para confirmar a disponibilidade. Um endereço gerado não é confirmação de que o deploy terminou. Cada publicação cria um snapshot independente; alterações locais posteriores não mudam a página.
- O link **não tem expiração programada**, mas não é possível prometer que ficará disponível para sempre: depende de manter repositório, Pages e endereço. Páginas e anexos publicados são públicos; apagar o arquivo atual não remove automaticamente versões do histórico Git.

**Leitura por IAs:** o HTML inclui todo texto extraível de PDF/DOCX e arquivos textuais, além dos arquivos originais completos. PDF é processado página por página. O manual CPS padrão inclui também a transcrição integral fornecida com o app. Imagens, PDFs escaneados, tabelas complexas, arquivos protegidos e outros formatos podem exigir leitura visual ou ferramentas adicionais; não há OCR. Falhas de extração são exibidas, sem descartar o original. A IA precisa navegar na web e respeitar seus próprios limites de contexto/arquivos; não há garantia de leitura por qualquer IA. Para conteúdo visual essencial, preencha também Texto-base.

Referências técnicas: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages), [Git Trees API](https://docs.github.com/en/rest/git/trees), [PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html) e [Mammoth](https://github.com/mwilliamson/mammoth.js).

## Dependências e auditoria
A auditoria desta versão identificou um alerta moderado sem correção upstream em `sprintf-js`, dependência do parser de argumentos da CLI do Mammoth ([GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)). O app não usa essa CLI: nem `argparse` nem `sprintf-js` fazem parte do bundle de navegador distribuído. Execute `pnpm audit` ao atualizar as dependências.

## Referências e assets
- Logo CK original fornecida pelo proprietário do projeto. O PNG é preservado em `assets/ck-logo-original.png`; WebP e ícones são derivados.
- **Centro Paula Souza. Manual para a elaboração do Trabalho de Conclusão de Curso das Escolas Técnicas do Centro Paula Souza. São Paulo, 2015.** PDF de 65 páginas fornecido pelo criador, preservado byte a byte em `assets/manual-cps.pdf` (SHA-256: `5363cf1959ed9cc12c0afa0db5d3dd8be0e7a97907db82a09dfc7b8d4fe9e413`). Uma transcrição integral em texto acompanha o PDF para ampliar a compatibilidade de leitura; o PDF prevalece para layout.
  - Página oficial: https://dgui.cps.sp.gov.br/dguidocumentos/manual-de-trabalho-de-conclusao-de-curso-tcc-nas-etecs/
  - A página oficial pode oferecer versão posterior; o padrão do app é o PDF fornecido pelo criador. Consulte a instituição para a versão exigida. Enviar um manual no perfil substitui o padrão no pacote.
- PWA: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

## Estrutura
```text
src/app.js       Interface, navegação e fluxos
src/core.js      Modelo, validação e geração determinística de prompts
src/db.js        IndexedDB, anexos, backup e transferência por arquivo
src/stages.js    Regras de progressão e conferência
src/page-export.js HTML estático e extração local de documentos
src/github-publish.js Publicação opcional via GitHub API
src/motion.js    Efeitos da marca sem bloquear a interface
src/zip.js       Escrita de ZIP com CRC32 e nomes UTF-8
src/styles.css   Identidade visual e layouts responsivos
scripts/        Servidor local e build estático
tests/          Testes unitários e de navegador
sw.js           Template do service worker com cache versionado pelo conteúdo
```

