/* 界面与输入 */
(function () {
  'use strict';

  var stage = document.getElementById('stage');
  var canvas = document.getElementById('game');
  var hud = document.getElementById('hud');
  var menu = document.getElementById('menu');
  var pauseScreen = document.getElementById('pause');
  var overScreen = document.getElementById('gameover');
  var banner = document.getElementById('banner');
  var toasts = document.getElementById('toasts');
  var fxDamage = document.getElementById('fxDamage');
  var hintEl = document.getElementById('hint');
  var scoreEl = document.getElementById('scoreNum');
  var comboEl = document.getElementById('comboChip');
  var comboNum = document.getElementById('comboNum');
  var heartsEl = document.getElementById('hearts');
  var rivalsEl = document.getElementById('rivals');
  var weaponBadge = document.getElementById('weaponBadge');
  var wbIcon = document.getElementById('wbIcon');
  var wbName = document.getElementById('wbName');
  var wbEffect = document.getElementById('wbEffect');
  var wbTime = document.getElementById('wbTime');
  var wbRing = document.getElementById('wbRing');
  var sceneName = document.getElementById('sceneName');
  var sceneIndex = document.getElementById('sceneIndex');
  var startBtn = document.getElementById('startBtn');
  var soundBtn = document.getElementById('soundBtn');
  var charRow = document.getElementById('charRow');
  var passiveName = document.getElementById('passiveName');
  var passiveTitle = document.getElementById('passiveTitle');
  var passiveDesc = document.getElementById('passiveDesc');

  var CHARS = TG.CHARS;
  var ORDER = ['wukong', 'nezha', 'erlang'];
  var selected = 'wukong';
  var game = null;
  var rivalRefs = {};
  var lastScore = -1, lastCombo = -1, lastShield = -1;
  var hintTimer = 0, bannerTimer = 0;
  var soundOn = true;

  TG.sfx = new TG.Sfx();

  /* ---------- 舞台缩放 ---------- */
  function fitStage() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var s = Math.min(vw / 720, vh / 1280);
    var x = (vw - 720 * s) / 2;
    var y = (vh - 1280 * s) / 2;
    stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
  }
  fitStage();
  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', function () { setTimeout(fitStage, 260); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);

  /* ---------- 通用 UI ---------- */
  function showBanner(main, sub, kind) {
    banner.className = 'banner';
    banner.innerHTML = '<span class="b-main">' + main + '</span>' +
      (sub ? '<span class="b-sub">' + sub + '</span>' : '');
    void banner.offsetWidth;
    banner.className = 'banner ' + (kind || '') + ' show';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { banner.className = 'banner'; }, 1600);
  }

  function toast(text, kind) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = text;
    toasts.appendChild(el);
    while (toasts.children.length > 3) toasts.removeChild(toasts.firstChild);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1700);
  }

  var HEART = '<svg viewBox="0 0 24 22"><path d="M12 21C9.5 19 3 14.6 3 9.4 3 6.4 5.2 4.3 7.8 4.3c1.8 0 3.2.9 4.2 2.4 1-1.5 2.4-2.4 4.2-2.4C18.8 4.3 21 6.4 21 9.4 21 14.6 14.5 19 12 21Z"/></svg>';
  var SPEAKER = '<svg viewBox="0 0 24 24"><path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="M16.5 8.5c1.6 1.7 1.6 5.3 0 7"/><path d="M19 6c2.8 3 2.8 9 0 12"/></svg>';
  var SPEAKER_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="M16.5 9l5 6"/><path d="M21.5 9l-5 6"/></svg>';

  function updateSoundIcon() {
    soundBtn.innerHTML = soundOn ? SPEAKER : SPEAKER_OFF;
    soundBtn.style.opacity = soundOn ? '1' : '.55';
  }
  updateSoundIcon();

  function renderHearts(hp, maxHp, shields) {
    var html = '';
    for (var i = 0; i < maxHp; i++) {
      html += '<span class="heart' + (i < hp ? '' : ' empty') + '">' + HEART + '</span>';
    }
    if (shields > 0) html += '<span class="shield-chip">护体 ×' + shields + '</span>';
    heartsEl.innerHTML = html;
    lastShield = shields;
  }

  /* ---------- 选人卡 ---------- */
  ORDER.forEach(function (key) {
    var c = CHARS[key];
    var btn = document.createElement('button');
    btn.className = 'char-card' + (key === selected ? ' on' : '');
    btn.dataset.key = key;
    btn.innerHTML =
      '<img src="assets/char-' + key + '.jpg" alt="' + c.name + '">' +
      '<span class="cc-grad"></span>' +
      '<span class="cc-txt"><span class="cc-nm">' + c.name + '</span><span class="cc-ti">' + c.title + '</span></span>' +
      '<span class="cc-check"></span>';
    btn.addEventListener('click', function () {
      TG.sfx.play('click');
      selected = key;
      Array.prototype.forEach.call(charRow.children, function (n) {
        n.classList.toggle('on', n.dataset.key === key);
      });
      updatePassive(key);
    });
    charRow.appendChild(btn);
  });

  function updatePassive(key) {
    var c = CHARS[key];
    passiveName.textContent = c.name;
    passiveTitle.textContent = c.title;
    passiveDesc.textContent = c.desc;
  }
  updatePassive(selected);

  /* ---------- 游戏初始化 ---------- */
  var hooks = {
    onStart: function (ch) {
      hud.classList.remove('hidden');
      lastScore = -1; lastCombo = -1;
      scoreEl.textContent = '0';
      comboEl.classList.remove('on');
      renderHearts(3, 5, 0);
      sceneName.textContent = '蟠桃园';
      sceneIndex.textContent = '第一场';
      weaponBadge.classList.remove('on');
      buildRivals(ch);
      hintEl.classList.add('on');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function () { hintEl.classList.remove('on'); }, 4600);
    },
    onHp: function (hp, maxHp) {
      renderHearts(hp, maxHp, game ? game.shields : 0);
      var all = heartsEl.querySelectorAll('.heart');
      for (var i = 0; i < Math.min(hp, all.length); i++) all[i].classList.add('pulse');
    },
    onFrame: function (g) {
      if (g.score !== lastScore) {
        lastScore = g.score;
        scoreEl.textContent = g.score;
        scoreEl.classList.remove('pop');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('pop');
      }
      var comboShown = g.combo >= 2 ? g.combo : 0;
      if (comboShown !== lastCombo) {
        lastCombo = comboShown;
        if (comboShown) {
          comboEl.classList.add('on');
          comboNum.textContent = comboShown;
          comboNum.classList.toggle('hot', comboShown >= 5);
        } else {
          comboEl.classList.remove('on');
        }
      }
      if (g.shields !== lastShield) renderHearts(g.hp, g.maxHp, g.shields);

      // 武器环
      if (g.weapon.type && g.t < g.weapon.end) {
        var left = Math.max(0, g.weapon.end - g.t);
        weaponBadge.classList.add('on');
        wbRing.style.setProperty('--p', (left / 10).toFixed(3));
        wbTime.textContent = Math.ceil(left);
      } else {
        weaponBadge.classList.remove('on');
      }

      // 对手比分
      var maxScore = 80;
      var rows = [];
      rows.push({ key: g.charKey, score: g.score, me: true });
      g.rivals.forEach(function (r) { rows.push({ key: r.key, score: r.score, me: false }); });
      rows.forEach(function (r) { if (r.score > maxScore) maxScore = r.score; });
      rows.forEach(function (r) {
        var ref = rivalRefs[r.key];
        if (!ref) return;
        ref.fill.style.width = Math.min(100, r.score / maxScore * 100) + '%';
        ref.score.textContent = Math.round(r.score);
      });
    },
    onWeapon: function (type) {
      if (!type) { weaponBadge.classList.remove('on'); return; }
      var w = TG.WEAPONS[type];
      wbIcon.src = 'assets/' + w.icon + '.png';
      wbName.textContent = w.name;
      wbEffect.textContent = w.effect;
      weaponBadge.classList.add('on');
    },
    onScene: function (scene, idx) {
      sceneName.textContent = scene.name;
      sceneIndex.textContent = scene.index;
    },
    onBanner: showBanner,
    onToast: toast,
    onHalluc: function (on) { stage.classList.toggle('on-halluc', !!on); },
    onSlow: function (on) { stage.classList.toggle('on-slow', !!on); },
    onGameOver: function (res) {
      hud.classList.add('hidden');
      hintEl.classList.remove('on');
      stage.classList.remove('on-halluc', 'on-slow');
      var c = CHARS[res.charKey];
      document.getElementById('overKicker').textContent = c.name + ' · 蟠桃会终局';
      document.getElementById('overTitle').textContent =
        res.rank === 1 ? '独占鳌头' : res.rank === 2 ? '虽败犹荣' : '力竭退场';
      document.getElementById('overRank').textContent =
        '位列第' + ['一', '二', '三'][res.rank - 1] + ' · ' + ['大闹天宫', '稍逊一筹', '来日再战'][res.rank - 1];
      document.getElementById('overScore').textContent = res.score;
      document.getElementById('overCombo').textContent = res.maxCombo;
      document.getElementById('overFruits').textContent = res.fruits;
      document.getElementById('overBest').textContent = res.bestSlice;

      var boardEl = document.getElementById('overBoard');
      boardEl.innerHTML = '';
      var max = 1;
      res.board.forEach(function (b) { if (b.score > max) max = b.score; });
      res.board.forEach(function (b, i) {
        var row = document.createElement('div');
        row.className = 'ob-row' + (b.me ? ' me' : '');
        row.innerHTML =
          '<span class="ob-rank">' + (i + 1) + '</span>' +
          '<span class="ob-name">' + b.name + '</span>' +
          '<span class="ob-bar"><i style="width:0%"></i></span>' +
          '<span class="ob-score">' + b.score + '</span>';
        boardEl.appendChild(row);
        setTimeout(function () {
          row.querySelector('.ob-bar i').style.width = Math.max(4, b.score / max * 100) + '%';
        }, 40 + i * 80);
      });
      overScreen.classList.remove('hidden');
      TG.sfx.play('gameover');
    }
  };

  function buildRivals(ch) {
    rivalsEl.innerHTML = '';
    rivalRefs = {};
    var rows = [{ key: ch.key, name: ch.name, me: true }].concat(
      game.rivals.map(function (r) { return { key: r.key, name: r.name, me: false }; })
    );
    rows.forEach(function (r, i) {
      var el = document.createElement('div');
      el.className = 'rival' + (r.me ? ' me' : '') + (i === 2 ? ' r2' : '');
      el.innerHTML = '<span class="rname">' + r.name + '</span>' +
        '<span class="rtrack"><i class="rfill"></i></span>' +
        '<span class="rscore">0</span>';
      rivalsEl.appendChild(el);
      rivalRefs[r.key] = {
        fill: el.querySelector('.rfill'),
        score: el.querySelector('.rscore')
      };
    });
  }

  game = new TG.Game(canvas, hooks);
  TG.game = game;

  /* ---------- 输入 ---------- */
  function toLocal(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * 720,
      y: (e.clientY - r.top) / r.height * 1280
    };
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (!game || game.state !== 'playing') return;
    if (game._pointerId !== null) return;
    e.preventDefault();
    TG.sfx.unlock();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
    var p = toLocal(e);
    game.pointerDown(p.x, p.y, e.pointerId);
  }, { passive: false });

  canvas.addEventListener('pointermove', function (e) {
    if (!game || game.state !== 'playing') return;
    if (e.pointerId !== game._pointerId) return;
    e.preventDefault();
    var p = toLocal(e);
    game.pointerMove(p.x, p.y);
  }, { passive: false });

  function endPointer(e) {
    if (!game || game.state !== 'playing') return;
    if (e.pointerId !== game._pointerId) return;
    game.pointerUp();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------- 按钮 ---------- */
  function hideScreens() {
    menu.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
  }

  startBtn.addEventListener('click', function () {
    if (startBtn.dataset.retry) {
      location.reload();
      return;
    }
    hideScreens();
    stage.classList.remove('on-halluc', 'on-slow');
    game.start(selected);
    TG.sfx.unlock();
    TG.sfx.play('click');
    setTimeout(function () { showBanner('蟠 桃 会', '开 宴', ''); }, 220);
  });

  document.getElementById('pauseBtn').addEventListener('click', function () {
    if (game.state !== 'playing') return;
    TG.sfx.play('click');
    game.pause();
    game.pointerUp();
    pauseScreen.classList.remove('hidden');
  });

  document.getElementById('resumeBtn').addEventListener('click', function () {
    TG.sfx.play('click');
    pauseScreen.classList.add('hidden');
    game.resume();
  });

  document.getElementById('restartBtn').addEventListener('click', function () {
    TG.sfx.play('click');
    pauseScreen.classList.add('hidden');
    stage.classList.remove('on-halluc', 'on-slow');
    game.stop();
    game.start(selected);
    setTimeout(function () { showBanner('蟠 桃 会', '再 开 宴', ''); }, 220);
  });

  document.getElementById('quitBtn').addEventListener('click', function () {
    TG.sfx.play('click');
    goMenu();
  });

  document.getElementById('againBtn').addEventListener('click', function () {
    TG.sfx.play('click');
    overScreen.classList.add('hidden');
    stage.classList.remove('on-halluc', 'on-slow');
    game.start(selected);
    setTimeout(function () { showBanner('蟠 桃 会', '再 开 宴', ''); }, 220);
  });

  document.getElementById('menuBtn').addEventListener('click', function () {
    TG.sfx.play('click');
    goMenu();
  });

  function goMenu() {
    game.stop();
    game.pointerUp();
    hideScreens();
    hud.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    menu.classList.remove('hidden');
    stage.classList.remove('on-halluc', 'on-slow');
    weaponBadge.classList.remove('on');
    hintEl.classList.remove('on');
  }

  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    TG.sfx.setMuted(!soundOn);
    updateSoundIcon();
    if (soundOn) TG.sfx.play('click');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (game.state === 'playing') {
        game.pause();
        game.pointerUp();
        pauseScreen.classList.remove('hidden');
      } else if (game.state === 'paused') {
        pauseScreen.classList.add('hidden');
        game.resume();
      }
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && game.state === 'playing') {
      game.pause();
      game.pointerUp();
      pauseScreen.classList.remove('hidden');
    }
  });

  /* ---------- 资源 ---------- */
  startBtn.disabled = true;
  var sbSub = startBtn.querySelector('.sb-sub');
  sbSub.textContent = '铺 开 画 卷 …';
  TG.loadAssets(function () {
    delete startBtn.dataset.retry;
    startBtn.disabled = false;
    sbSub.textContent = '开始切果';
  }, function (done, total) {
    if (!startBtn.disabled) return;
    sbSub.textContent = '铺 开 画 卷 ' + done + '/' + total;
  }, function (done, total) {
    startBtn.dataset.retry = '1';
    startBtn.disabled = false;
    sbSub.textContent = '仙图未至 ' + done + '/' + total + ' · 点此重试';
  });
})();
