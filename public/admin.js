async function loadAdminData() {
  await Promise.all([
    loadAdminUsers(),
    loadAdminTrainings(),
    loadAdminQuestions(),
    loadAdminResults(),
    loadAdminOverview(),
    loadRetakes()
  ]);
}

async function loadAdminUsers() {
  const rows = await api('/api/admin/users');
  state.adminUsers = rows;
  el('retakeUserSelect').innerHTML = rows.map(u => `<option value="${u.id}">${u.full_name} (${u.username})</option>`).join('');
}

async function loadAdminTrainings() {
  const rows = await api('/api/admin/trainings');
  state.adminTrainings = rows;
  el('trainingsAdminBody').innerHTML = rows.map(row => `<tr><td>${row.id}</td><td>${row.title}</td><td>${row.video_path ? '<span class="chip">Vídeo</span>' : '—'}</td><td>${row.slug}</td><td>${row.active ? 'Ativo' : 'Inativo'}</td><td><button class="btn" onclick="toggleTraining(${row.id})">${row.active ? 'Desativar' : 'Ativar'}</button></td><td>${row.video_path ? `<button class="btn" style="color:var(--color-error);border-color:var(--color-error)" onclick="removeVideo(${row.id})">Remover vídeo</button>` : '—'}</td><td><button class="btn btn-primary" onclick="openEditTraining(${row.id})">✏️ Editar</button></td></tr>`).join('') || '<tr><td colspan="8">Nenhum treinamento</td></tr>';
}

async function loadAdminQuestions() {
  const params = new URLSearchParams();
  const t = el('questionsTrainingFilter')?.value;
  if (t) params.set('training_id', t);
  const rows = await api('/api/admin/questions' + (params.toString() ? '?' + params.toString() : ''));
  el('questionsAdminBody').innerHTML = rows.length
    ? rows.map(row => `<tr><td>${row.id}</td><td>${row.training_title}</td><td>${row.category}</td><td>${row.question_text}</td><td>${row.correct_option}</td><td>${row.active ? 'Ativa' : 'Inativa'}</td><td><button class="btn" onclick="toggleQuestion(${row.id})">${row.active ? 'Desativar' : 'Ativar'}</button></td></tr>`).join('')
    : '<tr><td colspan="7">Nenhuma questão para o filtro informado</td></tr>';
}

async function loadAdminResults() {
  const params = new URLSearchParams();
  const t = el('resultsTrainingFilter').value;
  const max = el('resultsMaxPctFilter').value;
  if (t) params.set('training_id', t);
  if (max !== '') params.set('max_percentage', max);
  const rows = await api('/api/admin/results' + (params.toString() ? '?' + params.toString() : ''));
  state.adminResults = rows;
  el('adminResultsBody').innerHTML = rows.length
    ? rows.map(row => `<tr><td>${row.id}</td><td>${row.full_name}</td><td>${row.training_title}</td><td>${row.attempt_number}</td><td>${row.access_mode === 'retake' ? 'Retake' : 'Padrão'}</td><td>${new Date(row.finished_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td>${row.score}/${row.total_questions}</td><td>${row.percentage}%</td><td>${row.grant_note || ''}</td></tr>`).join('')
    : '<tr><td colspan="9">Nenhum resultado para o filtro informado</td></tr>';
}

async function loadRetakes() {
  const rows = await api('/api/admin/retakes');
  el('retakesAdminBody').innerHTML = rows.length
    ? rows.map(row => `<tr><td>${row.id}</td><td>${row.full_name}</td><td>${row.training_title}</td><td>${row.status}</td><td>${new Date(row.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td>${row.consumed_at ? new Date(row.consumed_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''}</td><td>${row.note || ''}</td></tr>`).join('')
    : '<tr><td colspan="7">Nenhum retake liberado</td></tr>';
}

async function loadAdminOverview() {
  const rows = await api('/api/admin/overview');
  const trainings = state.adminTrainings || [];
  el('overviewTrainingFilter').innerHTML = '<option value="">Todos os treinamentos</option>' + trainings.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
  el('overviewBody').innerHTML = rows.length
    ? rows.map(r => `<tr><td>${r.full_name}</td><td>${r.training_title}</td><td>${r.deadline ? new Date(r.deadline + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td><td>${r.completed ? '<span style="color:var(--success)">✔ Feito</span>' : '<span style="color:var(--danger)">✘ Pendente</span>'}</td></tr>`).join('')
    : '<tr><td colspan="4">Nenhum dado encontrado</td></tr>';
}

async function loadOverviewFiltered() {
  const t = el('overviewTrainingFilter').value;
  const params = t ? '?training_id=' + t : '';
  const rows = await api('/api/admin/overview' + params);
  el('overviewBody').innerHTML = rows.length
    ? rows.map(r => `<tr><td>${r.full_name}</td><td>${r.training_title}</td><td>${r.deadline ? new Date(r.deadline + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td><td>${r.completed ? '<span style="color:var(--success)">✔ Feito</span>' : '<span style="color:var(--danger)">✘ Pendente</span>'}</td></tr>`).join('')
    : '<tr><td colspan="4">Nenhum dado encontrado</td></tr>';
}

window.toggleTraining = async id => {
  await api(`/api/admin/trainings/${id}/toggle`, { method: 'POST' });
  await loadAdminData();
  await loadTrainings();
};

window.removeVideo = async id => {
  if (!confirm('Tem certeza que deseja remover o vídeo deste treinamento?')) return;
  try {
    await api(`/api/admin/trainings/${id}/video`, { method: 'DELETE' });
    await loadAdminTrainings();
    await loadTrainings();
    window.syncQuizTrainingSelect?.();
    alert('Vídeo removido com sucesso!');
  } catch (err) {
    alert(err.message);
  }
};

window.toggleQuestion = async id => {
  await api(`/api/admin/questions/${id}/toggle`, { method: 'POST' });
  await loadAdminData();
  if (state.currentTrainingId) {
    await Promise.all([loadQuestions(state.currentTrainingId), loadTrainingStatus(state.currentTrainingId)]);
  }
  window.syncQuizTrainingSelect?.();
};

window.exportResultsToExcel = () => {
  const rows = state.adminResults;
  if (!rows || !rows.length) {
    alert('Nenhum resultado para exportar. Aplique um filtro primeiro.');
    return;
  }
  const headers = ['ID', 'Colaborador', 'Treinamento', 'Tentativa', 'Tipo', 'Data', 'Acertos', 'Total', '%', 'Observação'];
  const data = rows.map(r => [r.id, r.full_name, r.training_title, r.attempt_number, r.access_mode === 'retake' ? 'Retake' : 'Padrão', new Date(r.finished_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), r.score, r.total_questions, r.percentage + '%', r.grant_note || '']);
  const BOM = '\uFEFF';
  const escape = v => {
    const s = String(v);
    return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = BOM + [headers, ...data].map(row => row.map(escape).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filtroTreinamento = el('resultsTrainingFilter').options[el('resultsTrainingFilter').selectedIndex]?.text || 'todos';
  const dataHoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/\//g, '-');
  a.href = url;
  a.download = `resultados_${filtroTreinamento}_${dataHoje}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

window.exportOverviewToExcel = () => {
  const rows = Array.from(document.querySelectorAll('#overviewBody tr')).map(tr => {
    const cells = tr.querySelectorAll('td');
    if (!cells.length) return null;
    return [
      cells[0]?.textContent.trim(),
      cells[1]?.textContent.trim(),
      cells[2]?.textContent.trim(),
      cells[3]?.textContent.trim()
    ];
  }).filter(Boolean);

  if (!rows.length) {
    alert('Nenhum dado para exportar.');
    return;
  }

  const headers = ['Colaborador', 'Treinamento', 'Data Limite', 'Status'];
  const BOM = '\uFEFF';
  const escape = v => {
    const s = String(v);
    return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = BOM + [headers, ...rows].map(row => row.map(escape).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dataHoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/\//g, '-');
  a.href = url;
  a.download = `visao_geral_${dataHoje}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};