# CK Promptmaker
Um assistente de atividades instalável, com identidade **Conscious Knowledge**, armazenamento local e prompts completos para levar à IA de sua escolha.

## O que faz
- Formulário em quatro etapas: contexto, entregas, materiais e revisão.
- Datas, matéria, professor, bimestre, modalidade individual/grupo, integrantes, enunciado, objetivos, critérios e limites.
- Múltiplos entregáveis por atividade: DOCX/PDF simples ou ABNT, slides PDF/PPTX/site, ZIP, SQL, HTML, Python, JS, JSON, Markdown e formato livre. Cada combinação gera instruções próprias.
- Direção de sites: identidade original/remaster/personalizada, interatividade, frequência 3D, ZIP de mídia e preparação para GitHub.
- Biblioteca de matérias com PTDs e notas dos quatro bimestres e plano anual. **Todos os PTDs da matéria** acompanham a exportação.
- Câmera pelo seletor nativo do celular; anexos ficam vinculados à atividade.
- Prompt copiável, TXT, Markdown e ZIP contendo arquivos reais, PTDs, logo, briefing estruturado e manual CPS completo por padrão (obrigatório em ABNT).
- Perfil de escrita, exemplo de texto, regras editáveis e marca/manual personalizados.
- Rascunhos com salvamento automático, busca, duplicação, conclusão e backup/restauração completa.
- PWA standalone, abertura animada, uso offline após o primeiro carregamento, alvos de toque e suporte a movimento reduzido.
- Sem conta, API de IA, telemetria ou upload automático. A geração do prompt acontece no navegador.

## Instalar no celular
A versão publicada precisa de HTTPS.
- **Android / Chrome:** abra o endereço do app e use “Instalar aplicativo” no menu ou no perfil.
- **iPhone / Safari:** Compartilhar → Adicionar à Tela de Início.
- Abra online uma vez antes de usar offline. A instalação, o seletor de câmera e o compartilhamento dependem do navegador/OS.

## Rodar localmente
Requer Node.js 22 ou superior. O app de produção **não tem dependências JavaScript de terceiros**.

```sh
npm run build
npm run dev -- --dist
```

Abra http://127.0.0.1:4173. Para editar, use `npm run dev`; o service worker é produzido no build.

## Verificar
```sh
npm install
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

O CI usa pnpm e o lockfile para instalar as ferramentas de teste. Os testes cobrem geração de prompts, regras condicionais, ZIP binário, formulário mobile, anexos/PTDs, persistência offline, backup, validação e dimensões responsivas.

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
- Os dados são específicos de navegador, origem e aparelho; não há sincronização entre dispositivos. Limpeza dos dados do navegador pode apagá-los.
- “Proteger armazenamento” solicita persistência ao navegador; a concessão depende dele.
- A câmera usa `input capture="environment"`, sem stream de vídeo permanente. Não há OCR automático: a foto segue como anexo; use Texto-base para transcrição.
- GitHub é uma instrução para o projeto que a IA vai criar. O app não armazena tokens nem faz push de atividades.
- Nenhuma PWA pode garantir ausência absoluta de lag em todos os aparelhos. A interface usa módulos nativos, logo WebP, animações de transform/opacidade e suporte a movimento reduzido.

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
src/db.js        IndexedDB, anexos e backup atômico
src/zip.js       Escrita de ZIP com CRC32 e nomes UTF-8
src/styles.css   Identidade visual e layouts responsivos
scripts/        Servidor local e build estático
tests/          Testes unitários e de navegador
sw.js           Template do service worker com cache versionado pelo conteúdo
```

