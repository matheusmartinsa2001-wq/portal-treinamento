# Portal de Treinamentos - Arquitetura Modular

Este é um portal de treinamentos modularizado, com separação clara entre estilos, lógica de estado e funcionalidades.

## Estrutura de Arquivos

```
public/
├── training-portal.html    # HTML principal (estrutura limpa)
├── styles.css              # Todos os estilos CSS
├── state.js                # Gerenciamento de estado global
├── utils.js                # Funções utilitárias (API, alertas, etc)
├── ui.js                   # Lógica de UI (navegação, temas, modais)
├── training.js             # Funções de treinamento e anexos
├── quiz.js                 # Funções de quiz e avaliações
├── admin.js                # Funcionalidades administrativas
└── app.js                  # Inicialização e event listeners principais
```

## Descrição dos Módulos

### training-portal.html
- Arquivo HTML principal limpo e semântico
- Estrutura em seções por página (dashboard, quiz, resultados, admin)
- Importa todos os CSS e JS necessários
- Sem inline styles ou scripts (separação clara de responsabilidades)

### styles.css
- Design system com variáveis CSS (cores, espaçamento, tipografia)
- Suporte a temas light/dark
- Responsivo para mobile
- ~600 linhas, fácil manutenção

### state.js
- Estado global único compartilhado entre todos os módulos
- Inclui: usuário, treinamentos, respostas, resultados, etc

### utils.js
- `el()`: selector shortcut para getElementById
- `api()`: wrapper de fetch com tratamento de erros
- `alertBox()`: exibe alertas
- `clearAlert()`: limpa alertas
- `setupSubtabs()`: configura abas

### ui.js
- `switchPage()`: navegação entre páginas
- `toggleTheme()`: alternância entre temas light/dark
- `enterApp()`: inicializa a aplicação após login
- `setQuizLocked()`: controla estado de bloqueio do quiz
- `renderTrainingContent()`: renderiza conteúdo de treinamento
- Modal de edição: `openEditTraining()`, `closeEditTraining()`

### training.js
- `loadTrainings()`: carrega lista de treinamentos
- `selectTraining()`: seleciona um treinamento
- `loadAttachments()`: carrega anexos PDF
- `loadTrainingStatus()`: obtém status da avaliação
- `loadMyResults()`: carrega histórico de resultados

### quiz.js
- `loadQuestions()`: carrega questões de um treinamento
- `submitQuiz()`: envia respostas do quiz

### admin.js
- `loadAdminData()`: carrega todos os dados admin
- `loadAdminUsers()`: carrega usuários
- `loadAdminTrainings()`: carrega treinamentos para admin
- `loadAdminQuestions()`: carrega questões com filtros
- `loadAdminResults()`: carrega resultados com filtros
- `loadRetakes()`: carrega histórico de retakes
- `toggleTraining()`: ativa/desativa treinamento
- `removeVideo()`: remove vídeo de treinamento
- `toggleQuestion()`: ativa/desativa questão
- `exportResultsToExcel()`: exporta resultados em CSV

### app.js
- Inicialização geral da aplicação
- Setup de event listeners
- Login e logout
- Handlers de refresh e tema
- Setup de formulários de cadastro
- Inicialização do DOMContentLoaded

## Como Funciona

1. **Carregamento**: O DOMContentLoaded dispara a inicialização em `app.js`
2. **Login**: `loadSession()` verifica sessão ativa
3. **Autenticação**: Se não há sessão, exibe login; senão, `enterApp()` inicializa
4. **Navegação**: Botões na sidebar disparam `switchPage()` via event listeners
5. **Dados**: Cada página carrega dados via funções específicas de módulos
6. **Estado**: Tudo é centralizado no objeto `state` em `state.js`

## Benefícios da Arquitetura

✅ **Separação de Responsabilidades**: Cada arquivo tem um propósito claro
✅ **Fácil Manutenção**: Encontrar código é rápido (não há 1400+ linhas em um arquivo)
✅ **Reutilização**: Funções utilitárias centralizadas
✅ **Escalabilidade**: Adicionar novas funcionalidades é simples
✅ **Performance**: Browser carrega arquivos em paralelo (HTTP/2)
✅ **Organização**: Lógica agrupada por domínio (training, quiz, admin)

## Modificações Futuras

Para adicionar uma nova funcionalidade:

1. Se é uma nova página → edite `training-portal.html` e `app.js`
2. Se é lógica UI → adicione em `ui.js`
3. Se é lógica de dados → crie arquivo novo (ex: `notifications.js`)
4. Se são estilos → adicione em `styles.css` com organização por seção

## Versão Anterior

O arquivo monolítico original (`training-portal-old.html`) continha:
- ~1400 linhas em um arquivo
- CSS inline dentro de `<style>`
- JavaScript inline dentro de `<script>`
- Difícil navegar e manter

Esta refatoração resolve todos esses problemas.
