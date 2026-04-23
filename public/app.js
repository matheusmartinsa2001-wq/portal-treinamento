async function loadSession() {
  const data = await api('/api/session');
  if (data.user) {
    state.user = data.user;
    enterApp();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  clearAlert(el('loginAlert'));
  const fd = new FormData(e.target);
  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: fd.get('username'),
        password: fd.get('password')
      })
    });
    state.user = data.user;
    enterApp();
  } catch (err) {
    alertBox(el('loginAlert'), err.message);
  }
}

async function handleLogout() {
  await api('/api/logout', { method: 'POST' });
  location.reload();
}

async function handleRefresh() {
  await loadTrainings();
  window.syncQuizTrainingSelect?.();
  await loadMyResults();
  if (state.user?.role === 'admin') await loadAdminData();
}

async function handleQuizTrainingChange(e) {
  const id = e.target.value;
  if (!id) {
    setQuizLocked(true);
    document.getElementById('quizCurrentTrainingChip').textContent = 'Nenhum';
    document.getElementById('quizTrainingDescription').textContent = 'Selecione o curso para ver a avaliação.';
    el('quizForm').innerHTML = '';
    clearAlert(el('quizAlert'));
    return;
  }
  const cur = state.trainings.find(t => String(t.id) === String(id));
  document.getElementById('quizCurrentTrainingChip').textContent = cur ? cur.title : 'Nenhum';
  document.getElementById('quizTrainingDescription').textContent = cur ? (cur.description || '') : '';
  state.currentTrainingId = Number(id);
  state.answers = {};
  setQuizLocked(false);
  clearAlert(el('quizAlert'));
  el('quizForm').innerHTML = '';
  await Promise.all([loadQuestions(Number(id)), loadTrainingStatus(Number(id))]);
}

function setupTrainingForm() {
  el('trainingForm').addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert(el('trainingAlert'));
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    try {
      const result = await api('/api/admin/trainings', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      alertBox(el('trainingAlert'), `Treinamento criado com sucesso! ID: ${result.id}`, 'success');
      e.target.reset();
      await loadTrainings();
      window.syncQuizTrainingSelect?.();
      await loadAdminTrainings();
    } catch (err) {
      alertBox(el('trainingAlert'), err.message);
    }
  });
}

function setupAttachmentForm() {
  el('attachmentForm').addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert(el('attachmentAlert'));
    const fd = new FormData(e.target);
    try {
      await api(`/api/admin/trainings/${fd.get('training_id')}/attachments`, {
        method: 'POST',
        body: fd
      });
      alertBox(el('attachmentAlert'), 'Anexo enviado com sucesso!', 'success');
      e.target.reset();
    } catch (err) {
      alertBox(el('attachmentAlert'), err.message);
    }
  });
}

function setupQuestionForm() {
  el('questionForm').addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert(el('questionAlert'));
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    try {
      await api('/api/admin/questions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      alertBox(el('questionAlert'), 'Questão cadastrada com sucesso!', 'success');
      e.target.reset();
      await loadAdminQuestions();
    } catch (err) {
      alertBox(el('questionAlert'), err.message);
    }
  });
}

function setupRetakeForm() {
  el('retakeForm').addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert(el('retakeAlert'));
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    try {
      await api('/api/admin/retakes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      alertBox(el('retakeAlert'), 'Retake liberado com sucesso!', 'success');
      e.target.reset();
      await loadRetakes();
    } catch (err) {
      alertBox(el('retakeAlert'), err.message);
    }
  });
}

function setupEditTrainingForm() {
  el('editTrainingForm').addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert(el('editTrainingAlert'));
    const id = el('editTrainingId').value;
    const data = {
      title: el('editTitle').value,
      slug: el('editSlug').value,
      description: el('editDescription').value,
      content_html: el('editContentHtml').value
    };
    try {
      await api(`/api/admin/trainings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      alertBox(el('editTrainingAlert'), 'Treinamento atualizado com sucesso!', 'success');
      await loadTrainings();
      window.syncQuizTrainingSelect?.();
      await loadAdminTrainings();
      setTimeout(closeEditTraining, 1500);
    } catch (err) {
      alertBox(el('editTrainingAlert'), err.message);
    }
  });
}

function setupVideoUpload() {
  document.getElementById('videoUploadInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    const trainingId = document.getElementById('videoTrainingSelect').value;
    if (!file) return;
    if (!trainingId) {
      alert('Selecione um treinamento antes de escolher o vídeo.');
      e.target.value = '';
      return;
    }
    const fd = new FormData();
    fd.append('video_file', file);
    try {
      await api(`/api/admin/trainings/${trainingId}/video`, {
        method: 'POST',
        body: fd
      });
      await loadAdminTrainings();
      await loadTrainings();
      window.syncQuizTrainingSelect?.();
      alertBox(document.getElementById('trainingAlert'), 'Vídeo enviado com sucesso para o treinamento selecionado!', 'success');
      e.target.value = '';
      document.getElementById('videoTrainingSelect').value = '';
    } catch (err) {
      alert(err.message);
    }
  });
}

function setupModalClickOutside() {
  el('editTrainingModal').addEventListener('click', e => {
    if (e.target === el('editTrainingModal')) closeEditTraining();
  });
}

function setupEventListeners() {
  document.querySelectorAll('[data-page-target]').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.pageTarget));
  });

  el('themeToggle').addEventListener('click', toggleTheme);
  el('loginForm').addEventListener('submit', handleLogin);
  el('logoutBtn').addEventListener('click', handleLogout);
  el('refreshBtn').addEventListener('click', handleRefresh);
  el('trainingSelect').addEventListener('change', () => selectTraining(el('trainingSelect').value));
  el('submitQuizBtn').addEventListener('click', submitQuiz);

  const quizSelect = document.getElementById('quizTrainingSelect');
  if (quizSelect) {
    quizSelect.addEventListener('change', handleQuizTrainingChange);
  }

  document.getElementById('applyQuestionsFilterBtn').addEventListener('click', loadAdminQuestions);
  document.getElementById('applyResultsFilterBtn').addEventListener('click', loadAdminResults);

  setupTrainingForm();
  setupAttachmentForm();
  setupQuestionForm();
  setupRetakeForm();
  setupEditTrainingForm();
  setupVideoUpload();
  setupModalClickOutside();

  setupSubtabs('[data-admin-tab]', '.admin-subtab', 'adminTab');
  setupSubtabs('[data-cadastro-tab]', '.cadastro-subtab', 'cadastroTab');
  setupSubtabs('[data-resultado-tab]', '.resultado-subtab', 'resultadoTab');
}

document.addEventListener('DOMContentLoaded', () => {
  loadSession().catch(() => {});
  window.syncQuizTrainingSelect?.();
  setQuizLocked(true);
  const quizSelect = document.getElementById('quizTrainingSelect');
  if (quizSelect) {
    quizSelect.value = '';
    document.getElementById('quizCurrentTrainingChip').textContent = 'Nenhum';
    document.getElementById('quizTrainingDescription').textContent = 'Selecione o curso para ver a avaliação.';
  }
  el('quizForm').innerHTML = '';
  setupEventListeners();
});
