const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MATERIALS_DIR = path.join(PUBLIC_DIR, 'materials');
const DB_PATH = path.join(DATA_DIR, 'training.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MATERIALS_DIR)) fs.mkdirSync(MATERIALS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MATERIALS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'))
});
const upload = multer({ storage });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS trainings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  content_html TEXT NOT NULL,
  video_path TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS training_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(training_id) REFERENCES trainings(id)
);
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  scenario_text TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  explanation TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(training_id) REFERENCES trainings(id)
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  training_id INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  percentage REAL DEFAULT 0,
  access_mode TEXT NOT NULL DEFAULT 'default',
  granted_by_user_id INTEGER,
  grant_note TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(training_id) REFERENCES trainings(id)
);
CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  selected_option TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(attempt_id) REFERENCES quiz_attempts(id),
  FOREIGN KEY(question_id) REFERENCES quiz_questions(id)
);
CREATE TABLE IF NOT EXISTS retake_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  training_id INTEGER NOT NULL,
  granted_by_user_id INTEGER NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consumed_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(training_id) REFERENCES trainings(id),
  FOREIGN KEY(granted_by_user_id) REFERENCES users(id)
);
`);

const cols = db.prepare('PRAGMA table_info(trainings)').all().map(c => c.name);
if (!cols.includes('video_path')) db.exec('ALTER TABLE trainings ADD COLUMN video_path TEXT');
if (!cols.includes('deadline')) db.exec('ALTER TABLE trainings ADD COLUMN deadline TEXT');

const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
if (userCount === 0) { const stmt = db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)'); [['admin','admin123','Administrador ITSM','admin'],['aluno1','treinamento123','Aluno Exemplo 1','student'],['aluno2','treinamento123','Aluno Exemplo 2','student']].forEach(u=>stmt.run(...u)); }
const trainingCount = db.prepare('SELECT COUNT(*) AS count FROM trainings').get().count;
if (trainingCount === 0) { const info = db.prepare('INSERT INTO trainings (title, slug, description, content_html, video_path, active) VALUES (?, ?, ?, ?, ?, 1)').run('Treinamento Teste', 'treinamento-teste', 'Material de teste para validação do portal.', "<article class='slide-article'><div class='content-kicker'>Treinamento teste</div><h2>Treinamento Teste</h2><p class='lead'>Conteúdo de teste para validar o portal.</p><section><h3>Objetivo</h3><p>Validar cadastro, vídeo, PDF e avaliação.</p></section></article>", null); const trainingId = info.lastInsertRowid; const qStmt = db.prepare('INSERT INTO quiz_questions (training_id, category, question_text, scenario_text, option_a, option_b, option_c, option_d, correct_option, explanation, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'); qStmt.run(trainingId, 'Teste', 'Esta é uma questão de teste?', 'Validação do portal.', 'Sim', 'Não', 'Talvez', 'Não sei', 'A', 'Questão para teste.'); }

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET || 'itsm-local-secret-change-this', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 } }));
app.use('/materials', express.static(MATERIALS_DIR));
app.use(express.static(PUBLIC_DIR));

function requireAuth(req, res, next) { if (!req.session.user) return res.status(401).json({ error: 'Não autenticado' }); next(); }
function requireAdmin(req, res, next) { if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' }); next(); }
function attemptSummary(userId, trainingId) { const attempts = db.prepare('SELECT COUNT(*) AS total FROM quiz_attempts WHERE user_id = ? AND training_id = ?').get(userId, trainingId).total; const availableRetakes = db.prepare("SELECT COUNT(*) AS total FROM retake_grants WHERE user_id = ? AND training_id = ? AND status = 'available'").get(userId, trainingId).total; return { attempts, availableRetakes, canAttempt: attempts === 0 || availableRetakes > 0 }; }

app.post('/api/login', (req, res) => { const { username, password } = req.body; const user = db.prepare('SELECT id, username, full_name, role FROM users WHERE username = ? AND password = ?').get(username, password); if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos' }); req.session.user = user; res.json({ user }); });
app.post('/api/logout', requireAuth, (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/session', (req, res) => res.json({ user: req.session.user || null }));

app.get('/api/trainings', requireAuth, (req, res) => res.json(db.prepare('SELECT id, title, slug, description, content_html, video_path FROM trainings WHERE active = 1 ORDER BY id DESC').all()));
app.get('/api/trainings/:id/attachments', requireAuth, (req, res) => res.json(db.prepare('SELECT id, title, file_path FROM training_attachments WHERE training_id = ? AND active = 1 ORDER BY id DESC').all(Number(req.params.id))));
app.get('/api/trainings/:id/questions', requireAuth, (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const all = db.prepare('SELECT id, category, question_text, scenario_text, option_a, option_b, option_c, option_d FROM quiz_questions WHERE training_id = ? AND active = 1').all(Number(req.params.id));
  // embaralha usando Fisher-Yates
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  res.json(all.slice(0, limit));
});
app.get('/api/trainings/:id/status', requireAuth, (req, res) => res.json(attemptSummary(req.session.user.id, Number(req.params.id))));

app.post('/api/submit-quiz', requireAuth, (req, res) => { const { training_id, answers } = req.body; if (!training_id || !answers || typeof answers !== 'object') return res.status(400).json({ error: 'Dados inválidos' }); const trainingId = Number(training_id); const summary = attemptSummary(req.session.user.id, trainingId); if (!summary.canAttempt) return res.status(400).json({ error: 'Você já utilizou a tentativa permitida deste treinamento. Aguarde liberação do administrador caso seja necessária uma exceção.' }); const questions = db.prepare('SELECT id, correct_option FROM quiz_questions WHERE training_id = ? AND active = 1 ORDER BY id ASC').all(trainingId); if (!questions.length) return res.status(400).json({ error: 'Este treinamento não possui questões ativas' }); const nextAttemptNumber = db.prepare('SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next FROM quiz_attempts WHERE user_id = ? AND training_id = ?').get(req.session.user.id, trainingId).next; const grant = summary.attempts > 0 ? db.prepare("SELECT * FROM retake_grants WHERE user_id = ? AND training_id = ? AND status = 'available' ORDER BY id ASC LIMIT 1").get(req.session.user.id, trainingId) : null; const accessMode = grant ? 'retake' : 'default'; let score = 0; const total = questions.length; const insertAttempt = db.prepare("INSERT INTO quiz_attempts (user_id, training_id, attempt_number, finished_at, score, total_questions, percentage, access_mode, granted_by_user_id, grant_note) VALUES (?, ?, ?, datetime('now','-3 hours'), ?, ?, ?, ?, ?, ?)"); const insertAnswer = db.prepare('INSERT INTO quiz_answers (attempt_id, question_id, selected_option, is_correct) VALUES (?, ?, ?, ?)'); const consumeGrant = db.prepare("UPDATE retake_grants SET status = 'consumed', consumed_at = datetime('now','-3 hours') WHERE id = ?"); const tx = db.transaction(() => { for (const q of questions) if (String((answers[q.id] || '')).toUpperCase() === q.correct_option) score += 1; const percentage = total ? Number(((score / total) * 100).toFixed(2)) : 0; const info = insertAttempt.run(req.session.user.id, trainingId, nextAttemptNumber, score, total, percentage, accessMode, grant ? grant.granted_by_user_id : null, grant ? grant.note : null); const attemptId = info.lastInsertRowid; for (const q of questions) { const selected = String((answers[q.id] || '')).toUpperCase() || 'N/A'; insertAnswer.run(attemptId, q.id, selected, selected === q.correct_option ? 1 : 0); } if (grant) consumeGrant.run(grant.id); return { attemptId, percentage }; }); const result = tx(); res.json({ ok: true, score, total, percentage: result.percentage, attemptId: result.attemptId, attemptNumber: nextAttemptNumber, accessMode }); });
app.get('/api/my-results', requireAuth, (req, res) => { res.json(db.prepare(`SELECT qa.id, qa.attempt_number, qa.access_mode, qa.grant_note, qa.finished_at, qa.score, qa.total_questions, qa.percentage, t.title AS training_title FROM quiz_attempts qa JOIN trainings t ON t.id = qa.training_id WHERE qa.user_id = ? ORDER BY qa.id DESC`).all(req.session.user.id)); });

app.get('/api/admin/users', requireAdmin, (req, res) => res.json(db.prepare("SELECT id, username, full_name FROM users WHERE role = 'student' ORDER BY full_name ASC").all()));
app.get('/api/admin/trainings', requireAdmin, (req, res) => res.json(db.prepare('SELECT id, title, slug, description, video_path, active, created_at FROM trainings ORDER BY id DESC').all()));
app.post('/api/admin/trainings', requireAdmin, (req, res) => { const { title, slug, description, content_html, deadline } = req.body; if (!title || !slug || !content_html) return res.status(400).json({ error: 'Título, slug e conteúdo HTML são obrigatórios' }); try { const info = db.prepare('INSERT INTO trainings (title, slug, description, content_html, active, deadline) VALUES (?, ?, ?, ?, 1, ?)').run(title, slug, description || '', content_html, deadline || null); res.json({ ok: true, id: info.lastInsertRowid }); } catch (e) { res.status(400).json({ error: 'Slug já existe ou dados inválidos' }); } });
app.post('/api/admin/trainings/:id/toggle', requireAdmin, (req, res) => { const id = Number(req.params.id); const row = db.prepare('SELECT active FROM trainings WHERE id = ?').get(id); if (!row) return res.status(404).json({ error: 'Treinamento não encontrado' }); db.prepare('UPDATE trainings SET active = ? WHERE id = ?').run(row.active ? 0 : 1, id); res.json({ ok: true }); });

app.get('/api/admin/trainings/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id, title, slug, description, content_html FROM trainings WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Treinamento não encontrado' });
  res.json(row);
});

app.put('/api/admin/trainings/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { title, slug, description, content_html, deadline } = req.body;
  if (!title || !slug || !content_html) return res.status(400).json({ error: 'Título, slug e conteúdo HTML são obrigatórios' });
  const row = db.prepare('SELECT id FROM trainings WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Treinamento não encontrado' });
  try {
    db.prepare('UPDATE trainings SET title = ?, slug = ?, description = ?, content_html = ?, deadline = ? WHERE id = ?').run(title, slug, description || '', content_html, deadline || null, id);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: 'Slug já existe ou dados inválidos' }); }
});
app.post('/api/admin/trainings/:id/video', requireAdmin, upload.single('video_file'), (req, res) => { const trainingId = Number(req.params.id); if (!trainingId || !req.file) return res.status(400).json({ error: 'Treinamento e vídeo são obrigatórios' }); const filePath = '/materials/' + req.file.filename; db.prepare('UPDATE trainings SET video_path = ? WHERE id = ?').run(filePath, trainingId); res.json({ ok: true, file_path: filePath }); });
app.delete('/api/admin/trainings/:id/video', requireAdmin, (req, res) => {
  const trainingId = Number(req.params.id);
  const row = db.prepare('SELECT video_path FROM trainings WHERE id = ?').get(trainingId);
  if (!row) return res.status(404).json({ error: 'Treinamento não encontrado' });
  if (!row.video_path) return res.status(400).json({ error: 'Este treinamento não possui vídeo para remover' });
  const absPath = path.join(PUBLIC_DIR, row.video_path.replace(/^\//, ''));
  try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (_) {}
  db.prepare('UPDATE trainings SET video_path = NULL WHERE id = ?').run(trainingId);
  res.json({ ok: true });
});
app.post('/api/admin/trainings/:id/attachments', requireAdmin, upload.single('pdf_file'), (req, res) => { const trainingId = Number(req.params.id); const title = req.body.title; if (!trainingId || !title || !req.file) return res.status(400).json({ error: 'Treinamento, título e PDF são obrigatórios' }); const filePath = '/materials/' + req.file.filename; const info = db.prepare('INSERT INTO training_attachments (training_id, title, file_path, active) VALUES (?, ?, ?, 1)').run(trainingId, title, filePath); res.json({ ok: true, id: info.lastInsertRowid, file_path: filePath }); });
app.get('/api/admin/questions', requireAdmin, (req, res) => { const trainingId = Number(req.query.training_id || 0); let sql = `SELECT q.id, q.training_id, t.title AS training_title, q.category, q.question_text, q.correct_option, q.active FROM quiz_questions q JOIN trainings t ON t.id = q.training_id`; const params = []; if (trainingId) { sql += ' WHERE q.training_id = ?'; params.push(trainingId); } sql += ' ORDER BY q.id DESC'; res.json(db.prepare(sql).all(...params)); });
app.post('/api/admin/questions', requireAdmin, (req, res) => { const { training_id, category, question_text, scenario_text, option_a, option_b, option_c, option_d, correct_option, explanation } = req.body; if (!training_id || !category || !question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' }); const correct = String(correct_option).toUpperCase(); if (!['A','B','C','D'].includes(correct)) return res.status(400).json({ error: 'Alternativa correta deve ser A, B, C ou D' }); const info = db.prepare(`INSERT INTO quiz_questions (training_id, category, question_text, scenario_text, option_a, option_b, option_c, option_d, correct_option, explanation, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(Number(training_id), category, question_text, scenario_text || '', option_a, option_b, option_c, option_d, correct, explanation || ''); res.json({ ok: true, id: info.lastInsertRowid }); });
app.post('/api/admin/questions/:id/toggle', requireAdmin, (req, res) => { const id = Number(req.params.id); const row = db.prepare('SELECT active FROM quiz_questions WHERE id = ?').get(id); if (!row) return res.status(404).json({ error: 'Questão não encontrada' }); db.prepare('UPDATE quiz_questions SET active = ? WHERE id = ?').run(row.active ? 0 : 1, id); res.json({ ok: true }); });
app.get('/api/admin/results', requireAdmin, (req, res) => { const trainingId = Number(req.query.training_id || 0); const maxPctRaw = req.query.max_percentage; let sql = `SELECT qa.id, qa.attempt_number, qa.access_mode, qa.grant_note, u.id AS user_id, u.username, u.full_name, t.id AS training_id, t.title AS training_title, qa.finished_at, qa.score, qa.total_questions, qa.percentage FROM quiz_attempts qa JOIN users u ON u.id = qa.user_id JOIN trainings t ON t.id = qa.training_id WHERE 1=1`; const params = []; if (trainingId) { sql += ' AND t.id = ?'; params.push(trainingId); } if (maxPctRaw !== undefined && maxPctRaw !== '') { sql += ' AND qa.percentage <= ?'; params.push(Number(maxPctRaw)); } sql += ' ORDER BY t.title ASC, qa.percentage ASC, qa.finished_at DESC'; res.json(db.prepare(sql).all(...params)); });
app.post('/api/admin/retakes', requireAdmin, (req, res) => { const { user_id, training_id, note } = req.body; if (!user_id || !training_id) return res.status(400).json({ error: 'Usuário e treinamento são obrigatórios' }); const existing = db.prepare("SELECT COUNT(*) AS total FROM retake_grants WHERE user_id = ? AND training_id = ? AND status = 'available'").get(Number(user_id), Number(training_id)).total; if (existing > 0) return res.status(400).json({ error: 'Já existe uma liberação de retake pendente para este usuário neste treinamento' }); const info = db.prepare("INSERT INTO retake_grants (user_id, training_id, granted_by_user_id, note, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now','-3 hours'))").run(Number(user_id), Number(training_id), req.session.user.id, note || '', 'available'); res.json({ ok: true, id: info.lastInsertRowid }); });
app.get('/api/admin/retakes', requireAdmin, (req, res) => { const rows = db.prepare(`SELECT rg.id, rg.status, rg.note, rg.created_at, rg.consumed_at, u.full_name, u.username, t.title AS training_title FROM retake_grants rg JOIN users u ON u.id = rg.user_id JOIN trainings t ON t.id = rg.training_id ORDER BY rg.id DESC`).all(); res.json(rows); });
app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const trainingId = Number(req.query.training_id || 0);
  let sql = `
    SELECT
      u.id AS user_id,
      u.full_name,
      u.username,
      t.id AS training_id,
      t.title AS training_title,
      t.deadline,
      CASE WHEN COUNT(qa.id) > 0 THEN 1 ELSE 0 END AS completed
    FROM users u
    CROSS JOIN trainings t
    LEFT JOIN quiz_attempts qa ON qa.user_id = u.id AND qa.training_id = t.id
    WHERE u.role != 'admin' AND t.active = 1`;
  const params = [];
  if (trainingId) { sql += ' AND t.id = ?'; params.push(trainingId); }
  sql += ' GROUP BY u.id, t.id ORDER BY u.full_name ASC, t.title ASC';
  res.json(db.prepare(sql).all(...params));
});
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'training-portal.html')));
app.listen(PORT, () => console.log(`ITSM portal v3.3 running on http://localhost:${PORT}`));
