# Portal ITSM Local v3.3

Versão com vídeo interno no topo do treinamento, conteúdo HTML abaixo, anexos PDF complementares e avaliação por treinamento.

## Instalação

```bash
npm install
npm start
```

Acesse `http://localhost:3000`

## Observações de implantação

- Vídeos curtos de até 30 MB por treinamento são viáveis para um ambiente interno leve.
- O ideal é armazenar os vídeos fora do disco local do app quando houver mais crescimento.
- O servidor deve suportar entrega de mídia estática com `Range requests` e `206 Partial Content` para reprodução e avanço no player.
- Para 7 treinamentos com vídeo, HTML e 0 ou 1 PDF complementar, a carga é pequena para um portal interno bem montado.
- Recomenda-se hospedar aplicação, banco e mídia de forma separada quando possível.

## O que pedir ao time técnico

- Uma VM ou servidor para o portal web.
- Um banco PostgreSQL ou SQLite para prova de conceito.
- Um storage de arquivos para vídeos e PDFs.
- Um web server ou proxy reverso que suporte streaming de arquivos grandes.
- Backup e controle de acesso internos.


## Avaliação prática de porte

Com 7 treinamentos e vídeos de até 30 MB, o total bruto de mídia fica em torno de 210 MB, sem contar o HTML e eventuais PDFs. Isso ainda é uma carga leve para um portal interno, desde que os arquivos sejam servidos com streaming adequado e não todos carregados de uma vez.

## Recomendação de infraestrutura

- Portal web em uma VM ou servidor interno com Node.js ou reverse proxy.
- Banco separado do app, se possível.
- Armazenamento de vídeos e PDFs em storage dedicado ou share interno.
- Entrega de vídeo via `Range requests` e `206 Partial Content`.
- Backup e monitoramento básicos.



## Dados de teste

- Treinamento Teste
- Questão de teste incluída
- Usuários: admin, aluno1 e aluno2
