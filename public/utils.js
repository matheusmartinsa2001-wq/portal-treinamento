const el = id => document.getElementById(id);

async function api(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: isFormData ? {} : {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Erro inesperado' }));
    throw new Error(err.error || 'Erro na requisição');
  }
  return response.json();
}

function alertBox(target, msg, type = 'error') {
  target.innerHTML = `<div class="alert ${type}">${msg}</div>`;
}

function clearAlert(target) {
  target.innerHTML = '';
}

function setupSubtabs(buttonSelector, panelSelector, dataAttr) {
  document.querySelectorAll(buttonSelector).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(buttonSelector).forEach(b => b.classList.remove('active'));
      document.querySelectorAll(panelSelector).forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset[dataAttr];
      document.getElementById(target)?.classList.add('active');
    });
  });
}
