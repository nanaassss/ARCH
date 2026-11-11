# ARCH

ARCH é uma interface editorial para pesquisa e descoberta de referências de arquitetura, urbanismo e patrimônio. O projeto combina imagens, obras, acervos históricos e contexto geográfico em uma experiência responsiva para desktop e celular.

> Projeto pessoal desenvolvido para estudo de interfaces, integração de Web APIs e organização de referências arquitetônicas.

## Visão geral

O ARCH permite pesquisar estilos, arquitetos, edifícios, cidades e tipologias arquitetônicas. Os resultados são organizados em quatro frentes:

- **Referência visual:** imagens arquitetônicas do Unsplash.
- **Obras e autores:** entidades relacionadas consultadas no Wikidata.
- **Memória:** fotografias e documentos do Wikimedia Commons.
- **Contexto urbano:** edifícios nomeados próximos à cidade detectada, usando OpenStreetMap e Overpass.

## Recursos

- Busca por texto e temas rápidos categorizados.
- Filtros semânticos para priorizar arquitetura, urbanismo, patrimônio e tipologias construídas.
- Carregamento progressivo das fontes, para mostrar cada resultado assim que estiver disponível.
- Cache em memória por cinco minutos para pesquisas repetidas.
- Estados de carregamento, erro e ausência de resultados.
- Modo claro e modo escuro com preferência persistente.
- Fichas detalhadas de obras e arquitetos.
- Imagens relacionadas do Wikimedia Commons com créditos e links de origem.
- Mapa interativo com marcadores de edifícios e contexto urbano.
- URLs compartilháveis para referências, por exemplo `?ref=Q994776`.
- Favoritos e coleções personalizadas salvos no `localStorage`.
- Exportação da biblioteca em JSON ou impressão para PDF.
- Layout responsivo para telefones, tablets e desktops.

## Tecnologias

- HTML5 sem framework.
- CSS3 com layout responsivo.
- JavaScript moderno no navegador.
- Leaflet para o mapa interativo.
- OpenStreetMap e Overpass para dados geográficos.
- Unsplash API para referências visuais.
- Wikidata API para obras, arquitetos e entidades.
- Wikimedia Commons API para acervo histórico e imagens.

## Como executar localmente

É recomendado executar o projeto por um servidor local, pois algumas APIs podem bloquear páginas abertas diretamente via `file://`.

### Python

```bash
cd arch
python -m http.server 4173
```

Depois abra:

```text
http://localhost:4173
```

### VS Code

1. Abra a pasta `arch` no VS Code.
2. Abra o terminal integrado.
3. Execute `python -m http.server 4173`.
4. Acesse `http://localhost:4173` no navegador.

Também é possível usar uma extensão de servidor estático, como Live Server.

## Estrutura do projeto

```text
arch/
├── index.html          # Estrutura principal da interface
├── style.css           # Identidade visual e responsividade
├── app.js              # Consultas, filtros, mapa e interações
├── manus-routes.json   # Manifesto de rota para o preview estático
└── README.md           # Documentação do projeto
```

## Compartilhar uma referência

Quando uma ficha é aberta, o Atlas gera uma URL compartilhável baseada no identificador Wikidata:

```text
http://localhost:4173/?ref=Q994776
```

Em uma hospedagem pública, o mesmo formato pode ser usado no domínio publicado:

```text
https://seu-dominio.com/?ref=Q994776
```

## Favoritos e coleções

A biblioteca pessoal funciona sem login e salva os dados no armazenamento local do navegador. No painel **Salvos**, é possível:

- salvar ou remover favoritos;
- criar coleções personalizadas;
- reabrir referências salvas;
- baixar a biblioteca como JSON;
- imprimir a biblioteca e escolher “Salvar como PDF”.

Como os dados usam `localStorage`, eles permanecem no navegador e dispositivo atuais. Para sincronizar entre dispositivos, seria necessário adicionar autenticação e um banco de dados.

## Publicação

O projeto pode ser publicado em serviços de hospedagem estática, como GitHub Pages, Netlify, Vercel ou Cloudflare Pages.

Para GitHub Pages:

1. Envie o conteúdo da pasta `arch` para um repositório.
2. No GitHub, abra **Settings → Pages**.
3. Selecione a branch `main` e a pasta raiz (`/root`).
4. Salve e aguarde a geração do endereço público.

## APIs e atribuições

O projeto usa fontes externas abertas. As informações exibidas pertencem às respectivas fontes:

- [Unsplash API](https://unsplash.com/developers)
- [Wikidata](https://www.wikidata.org/)
- [Wikimedia Commons API](https://commons.wikimedia.org/wiki/Commons:API)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Leaflet](https://leafletjs.com/)

As imagens devem manter seus créditos e links de origem. Antes de publicar em produção, verifique as licenças específicas de cada item retornado pelas APIs.

## Chave do Unsplash

A versão atual usa uma chave pública de demonstração no JavaScript para consultar o Unsplash. Para uma publicação aberta e de maior escala, recomenda-se:

- restringir a chave por domínio no painel do Unsplash;
- usar um proxy ou backend para ocultar credenciais;
- aplicar limites e cache no servidor;
- monitorar o uso e os erros da API.

As APIs Wikimedia, Wikidata e Overpass também possuem limites de uso e podem ficar temporariamente indisponíveis.

## Próximos passos

- Criar páginas permanentes para projetos, arquitetos, estilos e cidades.
- Adicionar filtros combináveis por período, material e tipologia.
- Implementar agrupamento de marcadores no mapa.
- Adicionar linha do tempo da arquitetura.
- Sincronizar favoritos entre dispositivos.
- Criar uma camada editorial com ensaios e curadorias.

## Licença

Este projeto é experimental e pessoal. O código pode ser adaptado para fins de estudo. Conteúdos, imagens, dados e marcas de terceiros permanecem sujeitos às licenças e condições de suas respectivas fontes.
