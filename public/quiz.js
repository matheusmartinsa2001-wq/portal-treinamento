async function loadQuestions(trainingId) {
  const rows = await api(`/api/trainings/${trainingId}/questions`);
  state.questions = rows;
  el('quizForm').innerHTML = rows.length
    ? rows.map((q, index) => `<article class="question-card"><h4>${index + 1}. ${q.question_text}</h4>${q.scenario_text ? `<p><strong>Cenário:</strong> ${q.scenario_text}</p>` : ''}<div class="options">${['a', 'b', 'c', 'd'].map(letter => `<label class="option"><input type="radio" name="question_${q.id}" value="${letter.toUpperCase()}" ${state.answers[q.id] === letter.toUpperCase() ? 'checked' : ''} ${state.trainingStatus && !state.trainingStatus.canAttempt ? 'disabled' : ''}/><span><strong>${letter.toUpperCase()}.</strong> ${q['option_' + letter]}</span></label>`).join('')}</div></article>`).join('')
    : '<div class="empty">Este treinamento ainda não possui questões ativas.</div>';

  el('quizForm').querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.name.replace('question_', '');
      state.answers[id] = input.value;
    });
  });
}

async function submitQuiz() {
  clearAlert(el('quizAlert'));

  if (!state.currentTrainingId) {
    alertBox(el('quizAlert'), 'Selecione um treinamento.');
    return;
  }

  if (state.trainingStatus && !state.trainingStatus.canAttempt) {
    alertBox(el('quizAlert'), 'Esta avaliação está bloqueada para novas tentativas.');
    return;
  }

  if (!state.questions.length) {
    alertBox(el('quizAlert'), 'Este treinamento não possui avaliação ativa.');
    return;
  }

  const unanswered = state.questions.filter(q => !state.answers[q.id]);
  if (unanswered.length) {
    alertBox(el('quizAlert'), `Existem ${unanswered.length} questão(ões) sem resposta.`);
    return;
  }

  try {
    const result = await api('/api/submit-quiz', {
      method: 'POST',
      body: JSON.stringify({
        training_id: state.currentTrainingId,
        answers: state.answers
      })
    });

    alertBox(el('quizAlert'), `Avaliação enviada com sucesso. Tentativa ${result.attemptNumber}. Resultado: ${result.score}/${result.total} (${result.percentage}%).`, 'success');
    state.answers = {};
    await loadQuestions(state.currentTrainingId);
    await loadTrainingStatus(state.currentTrainingId);
    await loadMyResults();
    if (state.user?.role === 'admin') await loadAdminData();
  } catch (err) {
    alertBox(el('quizAlert'), err.message);
  }
}

window.submitQuiz = submitQuiz;
