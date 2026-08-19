export const dashboardHtml = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Open Camera Platform</title>
  <style>
    :root{color-scheme:dark;--bg:#09111f;--surface:#101c30;--surface-2:#15243c;--line:#294261;--text:#e8f0fb;--muted:#9eb2ca;--accent:#47d7a5;--danger:#ff7890;--warning:#ffd270}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top right,#183c5b 0,var(--bg) 42rem);color:var(--text);font:15px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{max-width:1400px;margin:auto;padding:28px 20px 52px}.top{display:flex;gap:18px;justify-content:space-between;align-items:flex-start;margin-bottom:24px}.eyebrow{color:var(--accent);font-size:12px;font-weight:750;letter-spacing:.12em;text-transform:uppercase;margin:0 0 4px}h1{font-size:clamp(25px,4vw,40px);margin:0;line-height:1.15}h2{font-size:18px;margin:0 0 14px}h3{font-size:16px;margin:0}.muted{color:var(--muted)}.panel,.camera-card{background:linear-gradient(145deg,rgba(21,36,60,.98),rgba(12,24,43,.98));border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.18)}.panel{padding:18px}.controls,.inline-form,.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.row{justify-content:space-between}.stack{display:grid;gap:14px}.data-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}.camera-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}.camera-card{overflow:hidden}.thumb{background:#07101c;aspect-ratio:16/9;display:grid;place-items:center;border-bottom:1px solid var(--line);position:relative}.thumb img,.thumb video{width:100%;height:100%;object-fit:cover;display:block}.thumb .status{position:absolute;top:10px;left:10px;background:#0d1a2cdd;border:1px solid #507098;border-radius:999px;padding:3px 8px;font-size:12px}.camera-body{padding:14px}.camera-body p{margin:4px 0;overflow-wrap:anywhere}button,input,select{font:inherit}button{border:0;border-radius:9px;padding:10px 13px;background:var(--accent);color:#052118;font-weight:750;cursor:pointer;transition:transform 150ms ease,filter 150ms ease}button:hover{filter:brightness(1.08)}button:active{transform:scale(.97)}button.secondary{background:#274769;color:var(--text)}button.danger{background:#712a3c;color:#fff}button:disabled{opacity:.55;cursor:not-allowed}input,select{min-width:0;padding:10px 11px;border-radius:9px;border:1px solid #3a587b;background:#091526;color:var(--text)}input:focus,select:focus,button:focus-visible{outline:3px solid #7becc8;outline-offset:2px}.form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.form-grid button{align-self:end}.list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.list li{border-top:1px solid rgba(92,129,166,.28);padding-top:8px}.list li:first-child{border-top:0;padding-top:0}.notice{padding:10px 12px;border:1px solid #765c2b;background:#302715;color:#ffe0a1;border-radius:10px}.error{color:#ffc0cb;min-height:1.45em}.metric{font-size:25px;font-weight:800}.auth{max-width:560px;margin:8vh auto}.auth .panel{padding:24px}.role{border:1px solid #4d739e;border-radius:999px;padding:5px 9px;font-size:12px;color:#c8d9ee}.hidden{display:none!important}.divider{height:1px;background:var(--line);margin:18px 0}.checkbox{display:flex;gap:8px;align-items:flex-start}.checkbox input{min-width:auto;margin-top:4px}@media(max-width:760px){.top{display:block}.top .controls{margin-top:14px}.data-grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.shell{padding:20px 13px}.camera-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top">
      <div><p class="eyebrow">локальное видеонаблюдение без обязательного облака</p><h1>Открытая платформа камер</h1><p class="muted">Open Camera Platform · управление совместимыми ONVIF/RTSP-камерами в своей сети. Учётные данные камер не отображаются в панели.</p></div>
      <div id="user-bar" class="controls hidden"><span id="user-name" class="role"></span><button id="logout" class="secondary">Выйти</button></div>
    </header>

    <section id="auth" class="auth">
      <div class="panel stack">
        <div><p class="eyebrow">Защищённый локальный доступ</p><h2 id="auth-title">Проверка доступа</h2><p id="auth-description" class="muted">Загрузка параметров локальной панели…</p></div>
        <form id="setup-form" class="stack hidden"><input name="login" autocomplete="username" placeholder="Логин владельца" required><input name="password" type="password" autocomplete="new-password" minlength="12" placeholder="Пароль — не менее 12 символов" required><button>Создать владельца и войти</button></form>
        <form id="login-form" class="stack hidden"><input name="login" autocomplete="username" placeholder="Логин" required><input name="password" type="password" autocomplete="current-password" placeholder="Пароль" required><button>Войти в панель</button></form>
        <p id="auth-error" class="error" aria-live="polite"></p>
      </div>
    </section>

    <section id="workspace" class="hidden">
      <p id="message" class="error" aria-live="polite"></p>
      <section class="panel stack" data-manager>
        <div class="row"><div><h2>Поиск и добавление камер</h2><p class="muted">Поиск выполняется только в локальной сети. Для живого просмотра и снимка добавьте RTSP-адрес профиля камеры.</p></div><button id="discover" class="secondary">Найти ONVIF-камеры</button></div>
        <p id="found" class="muted"></p>
        <form id="camera-form" class="form-grid"><input name="name" placeholder="Название камеры" required><select name="mode"><option value="rtsp">RTSP</option><option value="onvif">ONVIF</option></select><input name="address" placeholder="Основной RTSP или ONVIF-адрес" required><input name="subAddress" placeholder="Экономичный RTSP (необязательно)"><button>Добавить камеру</button></form>
      </section>

      <section id="policy-panel" class="panel stack" data-manager style="margin-top:18px">
        <div><h2>Политики локальной записи</h2><p class="muted">Непрерывный и плановый режимы пересматриваются сервисом каждые 30 секунд. Событийный режим запускается при поступлении события камеры через локальный API.</p></div>
        <form id="policy-form" class="form-grid"><select id="policy-camera" name="cameraId" required></select><select id="policy-mode" name="mode"><option value="continuous">Непрерывная</option><option value="schedule">По расписанию</option><option value="event">По событию</option></select><input id="policy-start" name="start" type="time" value="08:00"><input id="policy-end" name="end" type="time" value="20:00"><input id="policy-seconds" name="postEventSeconds" type="number" min="0" max="3600" value="60" placeholder="Секунд после события"><button>Сохранить политику</button></form>
        <ul id="policies" class="list"></ul>
      </section>

      <section class="stack" style="margin-top:18px"><div class="row"><div><h2>Камеры</h2><p class="muted">Сетка обновляется локально. HLS проигрывается браузерами с поддержкой HLS; для остальных используйте URL плейлиста через совместимый клиент.</p></div><div class="controls"><button id="evaluate-health" class="secondary" data-manager>Проверить состояние</button><button id="refresh" class="secondary">Обновить</button></div></div><div id="camera-grid" class="camera-grid"></div></section>

      <div class="data-grid">
        <section class="panel"><h2>Активные записи</h2><ul id="recordings" class="list"></ul></section>
        <section class="panel"><div class="row"><h2>Локальный архив</h2><span id="archive-bytes" class="metric">—</span></div><p id="archive-meta" class="muted"></p><ul id="archive" class="list"></ul><form id="export-form" class="stack" data-manager style="margin-top:16px"><div class="divider"></div><h3>Подготовка локального экспорта</h3><p class="muted">Создаётся манифест сегментов до 24 часов. Видео не отправляется в облако.</p><select id="export-camera" name="cameraId" required></select><label class="muted">Начало <input name="from" type="datetime-local" required></label><label class="muted">Окончание <input name="to" type="datetime-local" required></label><button>Подготовить манифест</button></form><ul id="exports" class="list" data-manager style="margin-top:16px"></ul><form id="retention-form" class="stack" data-manager style="margin-top:16px"><div class="divider"></div><h3>Очистка по политике хранения</h3><label class="muted">Удалить сегменты, завершившиеся раньше даты <input name="before" type="datetime-local" required></label><label class="muted">Ограничить архив, МиБ (необязательно) <input name="maxMib" type="number" min="0" step="1" placeholder="Например, 10240"></label><label class="checkbox"><input name="confirm" type="checkbox" required><span>Я понимаю, что подходящие файлы локального архива будут удалены без возможности восстановления.</span></label><button class="danger">Применить политику</button></form></section>
        <section class="panel"><h2>События</h2><ul id="events" class="list"></ul></section>
        <section id="notification-panel" class="panel hidden"><h2>Уведомления</h2><ul id="notifications" class="list"></ul></section>
        <section id="audit-panel" class="panel hidden"><h2>Аудит действий</h2><ul id="audit" class="list"></ul></section>
      </div>
    </section>
  </main>
  <script>
    const $ = selector => document.querySelector(selector);
    const message = $('#message'); let session; let cameras = []; let snapshots = []; let liveStreams = []; let policies = []; let healthChecks = []; let exportsData = [];
    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
    const formatBytes = bytes => bytes < 1024 ? bytes + ' Б' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' КиБ' : (bytes / 1048576).toFixed(1) + ' МиБ';
    const formatDate = value => value ? new Date(value).toLocaleString('ru-RU') : '—';
    const manager = () => ['owner','admin'].includes(session?.user?.role);
    const api = async (pathname, options = {}) => { const response = await fetch(pathname, options); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Не удалось выполнить локальный запрос'); return data; };
    const show = (element, entries, renderer, empty) => { element.innerHTML = entries.length ? entries.map(renderer).join('') : '<li class="muted">' + empty + '</li>'; };
    const sendJson = (pathname, body) => api(pathname, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
    function renderCameras() {
      const grid = $('#camera-grid');
      if (!cameras.length) { grid.innerHTML = '<div class="panel muted">Камеры ещё не добавлены. Владелец или администратор может добавить совместимое устройство выше.</div>'; return; }
      grid.innerHTML = cameras.map(camera => {
        const snapshot = snapshots.find(item => item.cameraId === camera.id);
        const cameraStreams = liveStreams.filter(item => item.cameraId === camera.id); const live = cameraStreams.find(item => item.profileId === 'main') || cameraStreams[0]; const health = healthChecks.find(item => item.cameraId === camera.id);
        const rtsp = camera.address.startsWith('rtsp:');
        const media = live ? '<video controls muted playsinline src="/streams/' + encodeURIComponent(live.streamId) + '/index.m3u8"></video>' : snapshot ? '<img src="' + escapeHtml(snapshot.url) + '?v=' + encodeURIComponent(snapshot.capturedAt) + '" alt="Последний снимок камеры ' + escapeHtml(camera.name) + '">' : '<span class="muted">Нет живого просмотра или снимка</span>';
        const profileControls = (camera.profiles || []).filter(profile => profile.address.startsWith('rtsp:')).map(profile => { const stream = cameraStreams.find(item => item.profileId === profile.id); return '<button data-action="live" data-camera="' + escapeHtml(camera.id) + '" data-profile="' + escapeHtml(profile.id) + '" class="secondary"' + (stream ? ' disabled' : '') + '>' + (stream ? 'HLS: ' + escapeHtml(profile.label) + ' запущен' : 'HLS: ' + escapeHtml(profile.label)) + '</button><button data-action="snapshot" data-camera="' + escapeHtml(camera.id) + '" data-profile="' + escapeHtml(profile.id) + '" class="secondary">Снимок: ' + escapeHtml(profile.label) + '</button>'; }).join('');
        const controls = manager() ? (rtsp || profileControls ? '<div class="controls" style="margin-top:12px">' + profileControls + '</div>' : '<p class="notice">Для HLS и снимка нужен RTSP-адрес профиля камеры.</p>') : '';
        const profiles = camera.profiles?.length ? '<p class="muted">Профили: ' + camera.profiles.map(profile => escapeHtml(profile.label)).join(' · ') + '</p>' : '';
        const activeProfiles = cameraStreams.length ? '<p class="muted">HLS: ' + cameraStreams.map(stream => escapeHtml(camera.profiles?.find(profile => profile.id === stream.profileId)?.label || stream.profileId) + ' · ' + formatDate(stream.startedAt)).join('; ') + '</p>' : '';
        return '<article class="camera-card"><div class="thumb">' + media + '<span class="status">' + escapeHtml(health?.state || camera.status) + '</span></div><div class="camera-body"><h3>' + escapeHtml(camera.name) + '</h3><p class="muted">' + escapeHtml(camera.mode.toUpperCase()) + ' · ' + escapeHtml(camera.address) + '</p>' + profiles + (health ? '<p class="muted">Проверка: ' + escapeHtml(health.detail || health.state) + ' · ' + formatDate(health.checkedAt) + '</p>' : '') + activeProfiles + (snapshot ? '<p class="muted">Снимок: ' + formatDate(snapshot.capturedAt) + '</p>' : '') + controls + '</div></article>';
      }).join('');
    }
    function renderPolicies() {
      const select = $('#policy-camera'); if (!select) return;
      const selected = select.value;
      select.innerHTML = cameras.filter(camera => camera.address.startsWith('rtsp:')).map(camera => '<option value="' + escapeHtml(camera.id) + '">' + escapeHtml(camera.name) + '</option>').join('') || '<option value="">Добавьте RTSP-камеру</option>';
      if ([...select.options].some(option => option.value === selected)) select.value = selected;
      const labels = { continuous:'Непрерывная', schedule:'По расписанию', event:'По событию' };
      show($('#policies'), policies, item => '<li><b>' + escapeHtml(cameras.find(camera => camera.id === item.cameraId)?.name || item.cameraId) + '</b><br><span class="muted">' + labels[item.mode] + (item.mode === 'schedule' ? ' · ' + item.start + '–' + item.end : '') + (item.mode === 'event' ? ' · ещё ' + item.postEventSeconds + ' с после события' : '') + (item.eventUntil ? ' · до ' + formatDate(item.eventUntil) : '') + '</span></li>', 'Политики ещё не заданы');
    }
    function updatePolicyFields() {
      const mode = $('#policy-mode').value; $('#policy-start').hidden = mode !== 'schedule'; $('#policy-end').hidden = mode !== 'schedule'; $('#policy-seconds').hidden = mode !== 'event';
    }
    function renderExportOptions() {
      const select = $('#export-camera'); const selected = select.value;
      select.innerHTML = cameras.map(camera => '<option value="' + escapeHtml(camera.id) + '">' + escapeHtml(camera.name) + '</option>').join('') || '<option value="">Добавьте камеру</option>';
      if ([...select.options].some(option => option.value === selected)) select.value = selected;
    }
    async function load() {
      message.textContent = '';
      try {
        const core = await Promise.all(['/api/cameras','/api/recordings','/api/live-streams','/api/archive','/api/archive/usage','/api/events','/api/snapshots','/api/health'].map(pathname => api(pathname)));
        [cameras, window.recordingsData, liveStreams, window.archiveData, window.storageData, window.eventsData, snapshots, healthChecks] = core;
        if (manager()) { policies = await api('/api/recording-policies'); exportsData = await api('/api/archive/exports'); }
        renderCameras();
        if (manager()) { renderPolicies(); renderExportOptions(); updatePolicyFields(); show($('#exports'), exportsData, item => '<li><b>' + escapeHtml(cameras.find(camera => camera.id === item.cameraId)?.name || item.cameraId) + '</b><br><span class="muted">' + formatDate(item.from) + ' — ' + formatDate(item.to) + ' · ' + item.segments.length + ' сегм. · ' + formatBytes(item.bytes) + '</span></li>', 'Экспорт ещё не подготовлен'); }
        show($('#recordings'), window.recordingsData, item => '<li><b>' + escapeHtml(item.cameraId) + '</b><br><span class="muted">' + escapeHtml(item.state) + '</span></li>', 'Нет активных записей');
        $('#archive-bytes').textContent = formatBytes(window.storageData.bytes);
        $('#archive-meta').textContent = window.storageData.segments + ' сегм. · от ' + formatDate(window.storageData.oldestAt) + ' до ' + formatDate(window.storageData.newestAt);
        show($('#archive'), window.archiveData.slice().reverse(), item => '<li><b>' + escapeHtml(item.cameraId) + '</b><br><span class="muted">' + formatDate(item.startedAt) + ' · ' + formatBytes(item.bytes || 0) + '</span></li>', 'Архив пока пуст');
        show($('#events'), window.eventsData, item => '<li><b>' + escapeHtml(item.type) + '</b><br><span class="muted">' + escapeHtml(item.cameraId) + ' · ' + formatDate(item.at) + '</span></li>', 'Событий пока нет');
        if (manager()) { const notifications = await api('/api/notifications'); $('#notification-panel').classList.remove('hidden'); show($('#notifications'), notifications, item => '<li><b>' + escapeHtml(item.title || item.type) + '</b><br><span class="muted">' + formatDate(item.createdAt) + (item.readAt ? ' · прочитано ' + formatDate(item.readAt) : ' · новое') + '</span>' + (item.readAt ? '' : '<div class="controls" style="margin-top:8px"><button class="secondary" data-notification-read="' + escapeHtml(item.id) + '">Отметить прочитанным</button></div>') + '</li>', 'Уведомлений пока нет'); }
        if (session.user.role === 'owner') { const audit = await api('/api/audit'); $('#audit-panel').classList.remove('hidden'); show($('#audit'), audit, item => '<li><b>' + escapeHtml(item.action) + '</b><br><span class="muted">' + escapeHtml(item.targetType) + ' · ' + formatDate(item.at) + '</span></li>', 'Действий пока нет'); }
      } catch (error) { message.textContent = error.message; }
    }
    async function refreshSession() {
      const data = await api('/api/session'); session = data;
      const authenticated = data.authenticated;
      $('#auth').classList.toggle('hidden', authenticated); $('#workspace').classList.toggle('hidden', !authenticated); $('#user-bar').classList.toggle('hidden', !authenticated);
      if (!authenticated) { $('#auth-title').textContent = data.setupRequired ? 'Первоначальная настройка' : 'Вход в локальную панель'; $('#auth-description').textContent = data.setupRequired ? 'Создайте единственную стартовую учётную запись владельца. Последующие пользователи создаются владельцем через API.' : 'Введите данные существующей локальной учётной записи.'; $('#setup-form').classList.toggle('hidden', !data.setupRequired); $('#login-form').classList.toggle('hidden', data.setupRequired); return; }
      $('#user-name').textContent = data.user.login + ' · ' + data.user.role; document.querySelectorAll('[data-manager]').forEach(element => element.classList.toggle('hidden', !manager())); if (data.user.role !== 'owner') $('#audit-panel').classList.add('hidden'); await load();
    }
    $('#setup-form').onsubmit = async event => { event.preventDefault(); $('#auth-error').textContent = ''; try { await sendJson('/api/setup', Object.fromEntries(new FormData(event.currentTarget))); await refreshSession(); } catch (error) { $('#auth-error').textContent = error.message; } };
    $('#login-form').onsubmit = async event => { event.preventDefault(); $('#auth-error').textContent = ''; try { await sendJson('/api/login', Object.fromEntries(new FormData(event.currentTarget))); await refreshSession(); } catch (error) { $('#auth-error').textContent = error.message; } };
    $('#logout').onclick = async () => { await sendJson('/api/logout', {}); $('#notification-panel').classList.add('hidden'); $('#audit-panel').classList.add('hidden'); await refreshSession(); };
    $('#refresh').onclick = load;
    $('#evaluate-health').onclick = async event => { event.currentTarget.disabled = true; try { const result = await sendJson('/api/health/evaluate', {}); message.textContent = 'Проверено камер: ' + result.length; await load(); } catch (error) { message.textContent = error.message; } finally { event.currentTarget.disabled = false; } };
    $('#discover').onclick = async event => { event.currentTarget.disabled = true; $('#found').textContent = 'Идёт поиск в локальной сети…'; try { const data = await sendJson('/api/discovery', {}); $('#found').textContent = data.addresses?.length ? 'Найдены службы: ' + data.addresses.join(', ') : 'Совместимые ONVIF-камеры не найдены.'; } catch (error) { $('#found').textContent = error.message; } finally { event.currentTarget.disabled = false; } };
    $('#camera-form').onsubmit = async event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const payload = { name: values.name, mode: values.mode, address: values.address }; if (values.subAddress) payload.profiles = [{ id:'main', label:'Основной', address: values.address }, { id:'sub', label:'Экономичный', address: values.subAddress }]; try { await sendJson('/api/cameras', payload); form.reset(); await load(); } catch (error) { message.textContent = error.message; } };
    $('#policy-mode').onchange = updatePolicyFields;
    $('#policy-form').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const mode = form.get('mode'); const payload = { cameraId: form.get('cameraId'), mode }; if (mode === 'schedule') { payload.start = form.get('start'); payload.end = form.get('end'); } if (mode === 'event') payload.postEventSeconds = Number(form.get('postEventSeconds')); try { await sendJson('/api/recording-policies', payload); message.textContent = 'Политика записи сохранена'; await load(); } catch (error) { message.textContent = error.message; } };
    $('#camera-grid').onclick = async event => { const button = event.target.closest('button[data-action]'); if (!button) return; const camera = cameras.find(item => item.id === button.dataset.camera); if (!camera) return; button.disabled = true; try { const payload = { profileId: button.dataset.profile || 'main' }; if (button.dataset.action === 'live') await sendJson('/api/live-streams', { cameraId: camera.id, ...payload }); else await sendJson('/api/cameras/' + encodeURIComponent(camera.id) + '/snapshot', payload); await load(); } catch (error) { message.textContent = error.message; } finally { button.disabled = false; } };
    $('#notifications').onclick = async event => { const button = event.target.closest('button[data-notification-read]'); if (!button) return; button.disabled = true; try { await sendJson('/api/notifications/' + encodeURIComponent(button.dataset.notificationRead) + '/read', {}); message.textContent = 'Уведомление отмечено прочитанным'; await load(); } catch (error) { message.textContent = error.message; } finally { button.disabled = false; } };
    $('#retention-form').onsubmit = async event => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const maxMib = form.get('maxMib'); try { const response = await sendJson('/api/archive/retention', { before: new Date(form.get('before')).toISOString(), maxBytes: maxMib === '' ? undefined : Number(maxMib) * 1024 * 1024, confirm: form.get('confirm') === 'on' }); message.textContent = 'Удалено сегментов: ' + response.removed; formElement.reset(); await load(); } catch (error) { message.textContent = error.message; } };
    $('#export-form').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { const result = await sendJson('/api/archive/exports', { cameraId: form.get('cameraId'), from: new Date(form.get('from')).toISOString(), to: new Date(form.get('to')).toISOString() }); message.textContent = 'Подготовлен манифест: ' + result.segments.length + ' сегм. · ' + formatBytes(result.bytes); await load(); } catch (error) { message.textContent = error.message; } };
    refreshSession().catch(error => { $('#auth-error').textContent = error.message; });
  </script>
</body>
</html>`;
