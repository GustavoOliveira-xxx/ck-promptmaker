# CK Promptmaker

App instalável (PWA) da **Conscious Knowledge** para organizar atividades e gerar um prompt completo, com PTDs, materiais e regras de formatação, pronto para qualquer IA fazer a entrega.

Endereço principal: https://ck-promptmaker.vercel.app

## O que faz

**Atividade em quatro etapas**
- Contexto, entregas, materiais e prompt final. Não dá para avançar com campos obrigatórios vazios.
- Datas, matéria, professor, período, individual ou em grupo com os nomes de todos.
- Entregas: documento simples ou ABNT (DOCX/PDF), apresentação (PDF, PPTX ou site), ZIP, arquivos de TI e formato livre. Sites têm direção visual, interatividade, 3D, pacote de mídia e GitHub.
- ABNT sempre leva o manual CPS completo (PDF original e transcrição).

**IA dentro do app** (Gemini, pelo servidor da Vercel)
- Preencher com IA: foto do quadro, print, PDF ou DOCX viram campos preenchidos. Você revisa cada um antes de aplicar.
- Sua voz: a IA lê trabalhos seus e monta um guia do seu jeito de escrever, que entra em todos os prompts.
- PTDs: a IA organiza competências e conteúdos de cada período a partir dos arquivos.
- Revisor: aponta o que falta no briefing e faz até três perguntas.

**Câmera e arquivos**
- Scanner ao vivo: várias páginas seguidas, realce de documento, girar, apagar e lanterna. Vira PDF ou vai direto para a IA.
- No Android com o app instalado, o CK aparece no menu Compartilhar de fotos e PDFs.
- Segurar o ícone do app oferece "Fotografar e preencher com IA".
- Fotos grandes são comprimidas ao anexar.

**Envio para a IA**
- Copiar, .txt, .md, ZIP completo ou compartilhar.
- Abrir direto no ChatGPT, Gemini ou Claude.
- Página para IA: HTML com o texto de todos os documentos. Pode virar um link privado (1, 7, 30, 90 dias ou sem prazo) com um toque, ou ser publicada no GitHub Pages.

**Dia a dia**
- Próximas entregas com contagem regressiva na tela inicial.
- Status: a fazer, enviada à IA, revisando, entregue e nota recebida.
- Prazos para a agenda (.ics) com lembrete na véspera.
- Histórico de envios e links por atividade. O perfil e os PTDs usados na primeira exportação ficam guardados.
- Lixeira de 30 dias com desfazer.

**Para mais pessoas**
- Modelos: escola técnica, faculdade, cursinho e trabalho. Mudam nomes dos campos, períodos e o que é obrigatório.
- Perfis separados no mesmo aparelho.

**Dados**
- Tudo fica no aparelho (IndexedDB). Funciona offline depois do primeiro acesso.
- Backup completo, salvar no Drive pelo menu Compartilhar e backup automático em arquivo no computador, com lembrete semanal.
- Transferência entre computador e celular por arquivo: em cada item fica a versão editada por último. Exclusões também são levadas.
- Duas abas abertas ao mesmo tempo ficam sincronizadas.

**Desempenho**
- A tela atualiza só o que mudou. Animações usam apenas transformações aceleradas e pausam fora da tela.
- Modo econômico automático em aparelhos mais simples. Diagnóstico do aparelho no perfil.

## Vercel

O `vercel.json` gera o build, publica `dist/` e cria as funções em `api/`.

| Variável | Para quê |
| --- | --- |
| `GEMINI_API_KEY` | Chave do Google AI Studio. Fica só no servidor. |
| `CK_ACCESS_CODE` | Código pedido pelo app para usar a IA e criar links. |
| `BLOB_READ_WRITE_TOKEN` | Criada ao conectar o Blob Store ao projeto. Guarda as páginas com link. |
| `CRON_SECRET` | Protege a limpeza diária dos links vencidos. |
| `GEMINI_MODELS` | Opcional. Ordem dos modelos, separados por vírgula. |
| `ALLOWED_ORIGINS` | Opcional. Outros endereços autorizados a chamar a API. |

A cópia no GitHub Pages usa a API da Vercel.

## Rodar localmente

Node.js 22 ou superior e pnpm.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Abre em http://127.0.0.1:4173. Para usar a IA localmente, copie `.env.example` para `.env.local`, preencha e rode `pnpm run build && node --env-file=.env.local scripts/serve.mjs --dist`.

## Testes

```sh
pnpm test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:e2e
```

## Estrutura

```text
api/assist.js        IA: preencher, voz, PTDs e revisão
api/publish.js       Links privados (envio e exclusão)
api/page.js          Exibe a página de um link
api/purge.js         Limpeza diária dos links vencidos
src/app.js           Telas e fluxos
src/core.js          Modelo, validação, prompt, modelos de instituição e agenda
src/db.js            IndexedDB, lixeira, perfis, backup e transferência
src/morph.js         Atualização parcial da tela
src/assist.js        Preparo dos materiais e sugestões da IA
src/scanner.js       Scanner ao vivo
src/pdf.js           Páginas escaneadas em PDF
src/page-export.js   Página para IA e leitura de PDF/DOCX
src/device.js        Modo econômico, teclado e diagnóstico
src/sync.js          Sincronização entre abas
src/styles.css       Visual
sw.js                Offline e menu Compartilhar
```

## Créditos

- Logo Conscious Knowledge fornecida pelo dono do projeto.
- Manual para a elaboração do TCC das Etecs, Centro Paula Souza, 2015 (`assets/manual-cps.pdf`). Página oficial: https://dgui.cps.sp.gov.br/dguidocumentos/manual-de-trabalho-de-conclusao-de-curso-tcc-nas-etecs/
- PDF.js, Mammoth e a fonte Sora (OFL) são distribuídos com o app.
