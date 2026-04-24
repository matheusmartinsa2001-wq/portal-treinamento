async function loadTrainings() {
  const rows = await api('/api/trainings');
  state.trainings = rows;

  const optionsAll = '<option value="">Todos</option>' + rows.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
  const opts = rows.map(t => `<option value="${t.id}">${t.title}</option>`).join('');

  el('trainingSelect').innerHTML = opts;
  el('attachmentTrainingSelect').innerHTML = opts;
  el('questionTrainingSelect').innerHTML = opts;
  el('retakeTrainingSelect').innerHTML = opts;
  document.getElementById('videoTrainingSelect').innerHTML = '<option value="">Selecione um treinamento</option>' + opts;
  el('resultsTrainingFilter').innerHTML = optionsAll;
  el('questionsTrainingFilter').innerHTML = optionsAll;

  const quizSelect = document.getElementById('quizTrainingSelect');
  if (quizSelect) {
    quizSelect.innerHTML = '<option value="">Selecione um treinamento</option>' + opts;
  }

  if (rows.length) {
    const selected = state.currentTrainingId && rows.some(r => String(r.id) === String(state.currentTrainingId)) ? state.currentTrainingId : rows[0].id;
    await selectTraining(selected);
    if (quizSelect) {
      quizSelect.value = '';
      document.getElementById('quizCurrentTrainingChip').textContent = 'Nenhum';
      document.getElementById('quizTrainingDescription').textContent = 'Selecione o curso para ver a avaliação.';
      setQuizLocked(true);
      el('quizForm').innerHTML = '';
    }
  } else {
    state.currentTrainingId = null;
    el('trainingContent').innerHTML = '<div class="empty">Nenhum treinamento ativo.</div>';
    el('attachmentsList').innerHTML = '<div class="empty">Sem anexos.</div>';
    el('quizForm').innerHTML = '';
    setQuizLocked(true);
  }
}

async function selectTraining(trainingId) {
  state.currentTrainingId = Number(trainingId);
  el('trainingSelect').value = String(trainingId);
  const training = state.trainings.find(t => String(t.id) === String(trainingId));
  el('currentTrainingChip').textContent = training?.title || 'Nenhum';
  el('trainingDescription').textContent = training?.description || '';
  state.answers = {};
  clearAlert(el('quizAlert'));
  await Promise.all([loadAttachments(trainingId), loadTrainingStatus(trainingId)]);
  renderTrainingContent(training);
}

async function loadAttachments(trainingId) {
  const rows = await api(`/api/trainings/${trainingId}/attachments`);
  state.attachments = rows;
  el('attachmentsList').innerHTML = rows.length
    ? rows.map(a => `<div class="attachment-item"><div><strong>${a.title}</strong><div class="muted">Anexo complementar</div></div><a class="btn" href="${a.file_path}" target="_blank" rel="noopener noreferrer">Abrir PDF</a></div>`).join('')
    : '<div class="empty">Nenhum anexo complementar para este treinamento.</div>';
}

async function loadTrainingStatus(trainingId) {
  const status = await api(`/api/trainings/${trainingId}/status`);
  state.trainingStatus = status;
  el('trainingStatusBox').innerHTML = `<strong>Status da avaliação</strong><p class="muted">Tentativas registradas: ${status.attempts}</p><p class="muted">Retakes liberados e ainda não usados: ${status.availableRetakes}</p><p><span class="chip">${status.canAttempt ? 'Pode responder agora' : 'Bloqueado até nova liberação'}</span></p>`;
  el('submitQuizBtn').disabled = !status.canAttempt;
  el('quizLockInfo').innerHTML = status.canAttempt ? '' : `<div class="alert error">Você já utilizou a tentativa disponível deste treinamento. Se houver decisão administrativa, o gestor do processo poderá liberar um retake sem apagar seu histórico anterior.</div>`;
}

async function loadMyResults() {
  const rows = await api('/api/my-results');
  el('resultsList').innerHTML = rows.length
    ? rows.map(row => `<article class="result-card" style="padding:1.25rem;margin-bottom:1rem"><div class="toolbar-inline" style="justify-content:space-between"><strong>${row.training_title}</strong><span class="chip">${row.percentage}%</span></div><p><strong>Tentativa:</strong> ${row.attempt_number}</p><p><strong>Tipo:</strong> ${row.access_mode === 'retake' ? 'Retake liberado' : 'Tentativa padrão'}</p><p><strong>Acertos:</strong> ${row.score}/${row.total_questions}</p>${row.grant_note ? `<p><strong>Observação do retake:</strong> ${row.grant_note}</p>` : ''}<p><strong>Finalizado em:</strong> ${new Date(row.finished_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p></article>`).join('')
    : '<div class="panel empty">Nenhuma tentativa registrada até o momento.</div>';
}
