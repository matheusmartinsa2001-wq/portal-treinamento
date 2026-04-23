function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  el(pageId).classList.add('active');
  document.querySelector(`[data-page-target="${pageId}"]`)?.classList.add('active');
  el('pageTitle').textContent = {
    dashboardPage: 'Treinamento',
    quizPage: 'Avaliação',
    resultsPage: 'Meus resultados',
    adminPage: 'Painel admin'
  }[pageId] || 'Portal';

  if (pageId === 'resultsPage') loadMyResults();
  if (pageId === 'adminPage' && state.user?.role === 'admin') loadAdminData();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}

function enterApp() {
  el('loginView').classList.add('hidden');
  el('appView').classList.remove('hidden');
  el('userFullName').textContent = state.user.full_name;
  el('userRoleChip').textContent = state.user.role === 'admin' ? 'Administrador' : 'Aluno';
  document.querySelectorAll('.admin-only').forEach(x => x.classList.toggle('hidden', state.user.role !== 'admin'));
  loadTrainings();
  loadMyResults();
  if (state.user.role === 'admin') loadAdminData();
}

function setQuizLocked(locked) {
  const form = el('quizForm');
  const btn = el('submitQuizBtn');
  if (form) form.querySelectorAll('input,select,textarea,button').forEach(x => x.disabled = locked);
  if (btn) btn.disabled = locked;
  el('quizLockInfo').innerHTML = locked ? '<div class="empty">Selecione um treinamento para liberar a avaliação.</div>' : '';
}

function renderTrainingContent(training) {
  if (!training) {
    el('trainingContent').innerHTML = '<div class="empty">Sem conteúdo</div>';
    return;
  }
  const video = training.video_path ? `<div class="video-shell"><video controls preload="metadata" playsinline><source src="${training.video_path}" type="video/mp4">Seu navegador não suporta vídeo HTML5.</video></div>` : '';
  el('trainingContent').innerHTML = `${video}${training.content_html || '<div class="empty">Sem conteúdo</div>'}`;
}

function closeEditTraining() {
  el('editTrainingModal').style.display = 'none';
  document.body.style.overflow = '';
  clearAlert(el('editTrainingAlert'));
}

function openEditTraining(id) {
  api(`/api/admin/trainings/${id}`)
    .then(t => {
      el('editTrainingId').value = t.id;
      el('editTitle').value = t.title;
      el('editSlug').value = t.slug;
      el('editDescription').value = t.description || '';
      el('editContentHtml').value = t.content_html;
      el('editDeadline').value = t.deadline || '';
      el('editTrainingModal').style.display = 'block';
      document.body.style.overflow = 'hidden';
    })
    .catch(err => alert(err.message));
}

window.openEditTraining = openEditTraining;
window.closeEditTraining = closeEditTraining;
