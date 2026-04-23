# Mapa Rápido de Módulos

## 📍 Onde encontrar cada funcionalidade

### Navegação & Temas
- **Mudar de página**: `ui.js` → `switchPage()`
- **Alternar tema**: `ui.js` → `toggleTheme()`
- **Login/Logout**: `app.js` → `handleLogin()`, `handleLogout()`

### Treinamentos
- **Listar**: `training.js` → `loadTrainings()`
- **Selecionar**: `training.js` → `selectTraining()`
- **Anexos**: `training.js` → `loadAttachments()`
- **Status**: `training.js` → `loadTrainingStatus()`
- **Renderizar**: `ui.js` → `renderTrainingContent()`

### Avaliações (Quiz)
- **Carregar questões**: `quiz.js` → `loadQuestions()`
- **Enviar respostas**: `quiz.js` → `submitQuiz()`
- **Bloquear formulário**: `ui.js` → `setQuizLocked()`

### Resultados
- **Meus resultados**: `training.js` → `loadMyResults()`
- **Resultados filtrados (admin)**: `admin.js` → `loadAdminResults()`
- **Exportar para Excel**: `admin.js` → `exportResultsToExcel()`

### Admin - Cadastros
- **Novo treinamento**: `app.js` → `setupTrainingForm()`
- **Anexo PDF**: `app.js` → `setupAttachmentForm()`
- **Nova questão**: `app.js` → `setupQuestionForm()`
- **Upload de vídeo**: `app.js` → `setupVideoUpload()`
- **Editar treinamento**: `ui.js` → `openEditTraining()`, `app.js` → `setupEditTrainingForm()`
- **Listar treinamentos**: `admin.js` → `loadAdminTrainings()`
- **Listar questões**: `admin.js` → `loadAdminQuestions()`

### Admin - Controles
- **Ativar/Desativar treinamento**: `admin.js` → `toggleTraining()`
- **Remover vídeo**: `admin.js` → `removeVideo()`
- **Ativar/Desativar questão**: `admin.js` → `toggleQuestion()`
- **Liberar retake**: `app.js` → `setupRetakeForm()`

### Utilitários
- **Chamadas API**: `utils.js` → `api()`
- **Alertas**: `utils.js` → `alertBox()`, `clearAlert()`
- **Seletor**: `utils.js` → `el()`
- **Abas**: `utils.js` → `setupSubtabs()`

---

## 🔄 Fluxo de Dados Típico

```
usuario clica → event listener → função handler → api() → state → renderização → UI atualizada
```

Exemplo:
```
click em "Treinamento" → switchPage('dashboardPage')
  → loadTrainings() → api('/api/trainings')
  → state.trainings = dados
  → selectTraining(id) → loadAttachments() + loadTrainingStatus()
  → renderTrainingContent() → UI renderizada
```

---

## 📊 Tamanho dos Módulos

| Arquivo | Tamanho | Linhas |
|---------|---------|--------|
| training-portal.html | 22K | ~350 |
| app.js | 7.8K | ~180 |
| admin.js | 5.6K | ~140 |
| training.js | 4.5K | ~110 |
| styles.css | 10K | ~600 |
| ui.js | 2.9K | ~80 |
| quiz.js | 2.5K | ~70 |
| utils.js | 1.2K | ~40 |
| state.js | 189B | ~12 |
| **TOTAL** | **56K** | **~1400** |

⚡ Comparado ao arquivo original: Mesma funcionalidade, agora legível e manutenível!
