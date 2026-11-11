/* 大闹天宫 · 切果 —— 核心玩法 */
(function () {
  'use strict';

  var W = 720, H = 1280, GRAVITY = 1400;

  var CHARS = {
    wukong: {
      key: 'wukong', name: '孙悟空', title: '齐天大圣', seal: '悟',
      color: '#D9A441', trail: '#F2CE7E',
      desc: '连击判定窗口 +0.25 秒，连招更从容。',
      perk: '连击窗口 +0.25s'
    },
    nezha: {
      key: 'nezha', name: '哪吒', title: '三坛海会', seal: '哪',
      color: '#D6422E', trail: '#FF8A6B',
      desc: '每累计 100 分得一层护体，抵挡一次漏果。',
      perk: '护体免漏'
    },
    erlang: {
      key: 'erlang', name: '二郎神', title: '灌江真君', seal: '杨',
      color: '#5C9C92', trail: '#9FE3D5',
      desc: '每 30 秒天眼自行凝滞万物 1.5 秒。',
      perk: '天眼凝滞'
    }
  };

  var FRUITS = [
    { type: 'peach', img: 'spr-fruit-peach', value: 10, h: 150, weight: 28, color: '#FF9C9C' },
    { type: 'flatpeach', img: 'spr-fruit-flatpeach', value: 20, h: 145, weight: 20, color: '#FFD49A' },
    { type: 'ginseng', img: 'spr-fruit-ginseng', value: 30, h: 155, weight: 11, color: '#F7EEDC' },
    { type: 'lychee', img: 'spr-fruit-lychee', value: 10, h: 128, weight: 19, color: '#E8604C' },
    { type: 'cherry', img: 'spr-fruit-cherry', value: 20, h: 134, weight: 15, color: '#E23B3B' },
    { type: 'melon', img: 'spr-fruit-melon', value: 45, h: 192, weight: 7, color: '#F0503C' }
  ];

  var HAZARDS = [
    { type: 'bomb', img: 'spr-hazard-bomb', h: 156, radius: 62, color: '#FF6A3D' },
    { type: 'rotten', img: 'spr-hazard-rotten', h: 150, radius: 68, color: '#8FBF4A' },
    { type: 'mushroom', img: 'spr-hazard-mushroom', h: 146, radius: 64, color: '#B98BE8' }
  ];

  var WEAPONS = {
    staff: { name: '金箍棒', effect: '横扫千军 · 判定×2.5 得分×1.5', icon: 'wp-staff', color: '#D9A441' },
    spear: { name: '火尖枪', effect: '烈焰爆裂 · 0.6 秒后炸开', icon: 'wp-spear', color: '#D6422E' },
    trident: { name: '三尖两刃刀', effect: '天眼凝滞 · 万物减速 0.55×', icon: 'wp-trident', color: '#9FC4DE' }
  };

  var SCENES = [
    { name: '蟠桃园', index: '第一场', bg: 'bg-garden', tint: null, dim: 0.34 },
    { name: '瑶池', index: '第二场', bg: 'bg-yaochi', tint: 'rgba(24,100,110,.18)', dim: 0.26 },
    { name: '凌霄殿', index: '第三场', bg: 'bg-lingxiao', tint: 'rgba(16,22,64,.26)', dim: 0.10 }
  ];

  var ASSETS = [
    'bg-garden', 'bg-yaochi', 'bg-lingxiao',
    'spr-fruit-peach', 'spr-fruit-flatpeach', 'spr-fruit-ginseng',
    'spr-fruit-lychee', 'spr-fruit-cherry', 'spr-fruit-melon',
    'spr-hazard-bomb', 'spr-hazard-rotten', 'spr-hazard-mushroom',
    'spr-crystal', 'wp-staff', 'wp-spear', 'wp-trident',
    'char-wukong', 'char-nezha', 'char-erlang', 'hero'
  ];

  // 进场前必须到齐的素材：缺任何一张都会出现"看不见却被扣血"的物体
  var CORE_ASSETS = [
    'bg-garden',
    'spr-fruit-peach', 'spr-fruit-flatpeach', 'spr-fruit-ginseng',
    'spr-fruit-lychee', 'spr-fruit-cherry', 'spr-fruit-melon',
    'spr-hazard-bomb', 'spr-hazard-rotten', 'spr-hazard-mushroom',
    'spr-crystal'
  ];

  var IMG = {};
  var loadStarted = false;

  function assetSrc(key, retry) {
    var ext = (key.indexOf('char-') === 0 || key === 'hero' || key.indexOf('bg-') === 0) ? '.jpg' : '.png';
    return 'assets/' + key + ext + '?v=3' + (retry ? '&retry=' + retry : '');
  }

  function isReady(key) {
    var im = IMG[key];
    return !!(im && im.width);
  }

  // 单张加载，失败重试两次，最终失败也回调（isReady 会返回 false）
  function loadOne(key, onDone) {
    var im = new Image();
    var tries = 0;
    IMG[key] = im;
    function done() {
      im.onload = im.onerror = null;
      if (onDone) onDone();
    }
    im.onload = done;
    im.onerror = function () {
      if (++tries <= 2) {
        setTimeout(function () { im.src = assetSrc(key, tries); }, 500 * tries);
        return;
      }
      done();
    };
    im.src = assetSrc(key);
  }

  var CORE_FRUITS = ['spr-fruit-peach', 'spr-fruit-flatpeach', 'spr-fruit-ginseng', 'spr-fruit-lychee', 'spr-fruit-cherry', 'spr-fruit-melon'];
  var CORE_HAZARDS = ['spr-hazard-bomb', 'spr-hazard-rotten', 'spr-hazard-mushroom'];

  // 开局门槛：背景 + 至少 3 种水果 + 2 种凶物 + 水晶果。
  // 没到齐的类型一律不生成，避免出现看不见却会扣血的物体。
  function coreReady() {
    if (!isReady('bg-garden') || !isReady('spr-crystal')) return false;
    var f = 0, h = 0, i;
    for (i = 0; i < CORE_FRUITS.length; i++) if (isReady(CORE_FRUITS[i])) f++;
    for (i = 0; i < CORE_HAZARDS.length; i++) if (isReady(CORE_HAZARDS[i])) h++;
    return f >= 3 && h >= 2;
  }

  function loadAssets(cb, onProgress, onStall) {
    if (loadStarted) { cb(); return; }
    loadStarted = true;

    var done = 0, total = CORE_ASSETS.length, fired = false, fuse;
    function finish() {
      if (fired) return;
      fired = true;
      clearTimeout(fuse);
      cb();
    }

    CORE_ASSETS.forEach(function (key) {
      loadOne(key, function () {
        done++;
        if (onProgress) onProgress(done, total);
        if (coreReady()) finish();
      });
    });

    // 背景、角色、武器图标不阻塞开场，后台继续加载
    ASSETS.forEach(function (key) {
      if (CORE_ASSETS.indexOf(key) >= 0) return;
      loadOne(key, null);
    });

    // 保险丝：慢到连最低门槛都凑不齐时，提示用户重试，而不是放进空场景
    fuse = setTimeout(function () {
      if (coreReady()) { finish(); return; }
      if (onStall) onStall(done, total);
    }, 18000);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pickWeighted(list) {
    var sum = 0, i;
    for (i = 0; i < list.length; i++) sum += list[i].weight;
    var r = Math.random() * sum;
    for (i = 0; i < list.length; i++) {
      r -= list[i].weight;
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }
  function segCircle(x1, y1, x2, y2, cx, cy) {
    var dx = x2 - x1, dy = y2 - y1;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? ((cx - x1) * dx + (cy - y1) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    var px = x1 + dx * t, py = y1 + dy * t;
    return Math.hypot(cx - px, cy - py);
  }

  function Game(canvas, hooks) {
    this.canvas = canvas;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * this.dpr;
    canvas.height = H * this.dpr;
    this.ctx = canvas.getContext('2d');
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.hooks = hooks || {};
    this.state = 'idle';
    this.objects = [];
    this.halves = [];
    this.particles = [];
    this.popups = [];
    this.rings = [];
    this.bursts = [];
    this.queue = [];
    this.sliceQueue = [];
    this.trail = [];
    this.petals = [];
    this.rivals = [];
    this.shake = 0;
    this.t = 0;
    this.lastTs = 0;
    this.raf = 0;
    this.charKey = 'wukong';
    this.bgFade = 0;
    this.bgFrom = 0;
    this.sceneIndex = 0;
    this.weapon = { type: null, end: 0 };
    this._pointerId = null;
    this.pointerActive = false;
    this._buildPetals();
  }

  Game.prototype._buildPetals = function () {
    this.petals = [];
    for (var i = 0; i < 26; i++) {
      this.petals.push({
        x: rand(0, W), y: rand(0, H),
        vx: rand(-14, 26), vy: rand(10, 34),
        rot: rand(0, 6.28), spin: rand(-1.2, 1.2),
        s: rand(6, 15), hue: Math.random() < 0.65 ? 'pink' : 'gold'
      });
    }
  };

  Game.prototype.start = function (charKey) {
    var self = this;
    this.charKey = CHARS[charKey] ? charKey : 'wukong';
    var ch = CHARS[this.charKey];

    this.state = 'playing';
    this.t = 0;
    this.lastTs = 0;
    this.score = 0;
    this.hp = 3;
    this.maxHp = 5;
    this.combo = 0;
    this.maxCombo = 0;
    this.lastSlice = -9;
    this.comboWindow = 1.2 + (this.charKey === 'wukong' ? 0.25 : 0);
    this.fruitsSliced = 0;
    this.bestSlice = 0;
    this.strokeFruits = 0;
    this.shields = 0;
    this.nextShield = 100;
    this.hallucUntil = 0;
    this.hallucOn = false;
    this.slowUntil = 0;
    this.slowOn = false;
    this.erlangTimer = 30;
    this.dying = false;
    this.overAt = 0;
    this.spawnTimer = 0.55;
    this.crystalTimer = 14;
    this.waveIndex = 0;
    this.shake = 0;
    this.damageFlash = 0;
    this.sceneIndex = 0;
    this.bgFrom = 0;
    this.bgFade = 1;
    this.weapon = { type: null, end: 0 };
    this.objects.length = 0;
    this.halves.length = 0;
    this.particles.length = 0;
    this.popups.length = 0;
    this.rings.length = 0;
    this.bursts.length = 0;
    this.queue.length = 0;
    this.sliceQueue.length = 0;
    this.trail.length = 0;
    this.pointerActive = false;
    this._pointerId = null;
    this.hintUntil = 5;
    this._buildPetals();

    var others = ['wukong', 'nezha', 'erlang'].filter(function (k) { return k !== self.charKey; });
    this.rivals = others.map(function (k, i) {
      return { key: k, name: CHARS[k].name, short: CHARS[k].name.slice(0, 1), score: 0, rate: 6 + i * 0.7, burst: rand(2, 6) };
    });

    if (this.hooks.onStart) this.hooks.onStart(ch);
    if (this.hooks.onScene) this.hooks.onScene(SCENES[0], 0);
    if (this.hooks.onWeapon) this.hooks.onWeapon(null);
    if (this.hooks.onHalluc) this.hooks.onHalluc(false);

    this.raf = requestAnimationFrame(this._loop.bind(this));
  };

  Game.prototype.stop = function () {
    this.state = 'idle';
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  Game.prototype.pause = function () {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  Game.prototype.resume = function () {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lastTs = 0;
    this.raf = requestAnimationFrame(this._loop.bind(this));
  };

  Game.prototype._loop = function (ts) {
    if (this.state !== 'playing') return;
    if (!this.lastTs) this.lastTs = ts;
    var dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    this.update(dt);
    this.render();
    if (this.state === 'playing') this.raf = requestAnimationFrame(this._loop.bind(this));
  };

  Game.prototype.timeScale = function () {
    var s = 1;
    if (this.weapon.type === 'trident' && this.t < this.weapon.end) s = Math.min(s, 0.55);
    if (this.t < this.slowUntil) s = Math.min(s, 0.55);
    return s;
  };

  Game.prototype.update = function (dt) {
    this.t += dt;
    var ts = this.timeScale();

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 42);
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);
    if (this.hintUntil > 0) this.hintUntil -= dt;

    // 已到期的延迟切割（幻觉输入延迟）
    while (this.sliceQueue.length && this.sliceQueue[0].at <= this.t) {
      var item = this.sliceQueue.shift();
      this._doSlice(item.seg);
    }

    // 武器到期
    if (this.weapon.type && this.t >= this.weapon.end) {
      this.weapon.type = null;
      if (this.hooks.onWeapon) this.hooks.onWeapon(null);
      if (this.hooks.onToast) this.hooks.onToast('法宝威能耗尽', '');
    }

    // 幻觉 / 凝滞状态
    if (this.hallucOn && this.t >= this.hallucUntil) {
      this.hallucOn = false;
      if (this.hooks.onHalluc) this.hooks.onHalluc(false);
    }
    var slowNow = (this.weapon.type === 'trident' && this.t < this.weapon.end) || this.t < this.slowUntil;
    if (slowNow !== this.slowOn) {
      this.slowOn = slowNow;
      if (this.hooks.onSlow) this.hooks.onSlow(slowNow);
    }

    // 二郎神被动
    if (this.charKey === 'erlang' && !this.dying) {
      this.erlangTimer -= dt;
      if (this.erlangTimer <= 0) {
        this.erlangTimer = 30;
        this.slowUntil = this.t + 1.5;
        if (this.hooks.onBanner) this.hooks.onBanner('天眼 · 凝滞', '万物皆慢', '');
        if (this.hooks.onToast) this.hooks.onToast('天眼自行开启 1.5 秒', 'good');
        TG_SFX('slow');
      }
    }

    // 连击窗口
    if (this.combo > 0 && this.t - this.lastSlice > this.comboWindow) {
      this.combo = 0;
    }

    // 哪吒护体
    if (this.charKey === 'nezha' && this.score >= this.nextShield && this.shields < 2 && !this.dying) {
      this.shields++;
      this.nextShield += 100;
      if (this.hooks.onToast) this.hooks.onToast('三坛护体 · 可挡一次漏果', 'good');
    }

    // 出果节奏
    if (!this.dying) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this._spawnWave();
        var diff = Math.min(1, this.t / 95);
        this.spawnTimer = rand(1.25 - diff * 0.55, 1.75 - diff * 0.62);
      }
      this.crystalTimer -= dt;
      if (this.crystalTimer <= 0) {
        this._spawnCrystal();
        this.crystalTimer = rand(20, 28);
      }
    }

    // 延迟出场队列
    for (var q = this.queue.length - 1; q >= 0; q--) {
      if (this.queue[q].at <= this.t) {
        this.queue[q].fn();
        this.queue.splice(q, 1);
      }
    }

    // 物件
    for (var i = this.objects.length - 1; i >= 0; i--) {
      var o = this.objects[i];
      if (o.dead) { this.objects.splice(i, 1); continue; }
      o.x += o.vx * dt * ts;
      o.y += o.vy * dt * ts;
      o.vy += GRAVITY * dt * ts;
      o.rot += o.spin * dt * ts;
      o.age += dt;
      if (o.kind === 'crystal') o.pulse = (o.pulse || 0) + dt * 3.4;
      if (o.y - o.h * 0.5 > H + 130 && o.vy > 0) {
        this._miss(o);
        this.objects.splice(i, 1);
      }
    }

    // 火尖枪爆裂
    for (var b = this.bursts.length - 1; b >= 0; b--) {
      var bu = this.bursts[b];
      if (this.t >= bu.at) {
        this._explode(bu);
        this.bursts.splice(b, 1);
      }
    }

    // 果瓣
    for (var h = this.halves.length - 1; h >= 0; h--) {
      var half = this.halves[h];
      half.age += dt;
      half.x += half.vx * dt * ts;
      half.y += half.vy * dt * ts;
      half.vy += GRAVITY * 1.08 * dt * ts;
      half.rot += half.spin * dt * ts;
      if (half.age > 1.5) this.halves.splice(h, 1);
    }

    // 粒子
    for (var p = this.particles.length - 1; p >= 0; p--) {
      var pt = this.particles[p];
      pt.age += dt;
      pt.x += pt.vx * dt * ts;
      pt.y += pt.vy * dt * ts;
      pt.vy += (pt.g || 0) * dt * ts;
      pt.vx *= 0.992;
      if (pt.age >= pt.life) this.particles.splice(p, 1);
    }
    for (var r = this.rings.length - 1; r >= 0; r--) {
      var rg = this.rings[r];
      rg.age += dt;
      if (rg.age >= rg.life) this.rings.splice(r, 1);
    }
    for (var pp = this.popups.length - 1; pp >= 0; pp--) {
      var po = this.popups[pp];
      po.age += dt;
      po.y += po.vy * dt;
      po.vy *= 0.96;
      if (po.age >= po.life) this.popups.splice(pp, 1);
    }

    // 拖尾
    var now = this.t;
    while (this.trail.length && now - this.trail[0].t > 0.22) this.trail.shift();

    // 花瓣
    for (var f = 0; f < this.petals.length; f++) {
      var pe = this.petals[f];
      pe.x += pe.vx * dt;
      pe.y += pe.vy * dt;
      pe.rot += pe.spin * dt;
      if (pe.y > H + 30) { pe.y = -30; pe.x = rand(0, W); }
      if (pe.x < -30) pe.x = W + 20;
      if (pe.x > W + 30) pe.x = -20;
    }

    // 对手比分
    if (!this.dying) {
      for (var ri = 0; ri < this.rivals.length; ri++) {
        var rv = this.rivals[ri];
        var rate = 5.6 + ri * 0.55 + this.t * 0.045 + Math.sin(this.t * 0.7 + ri) * 1.2;
        rv.score += Math.max(0.8, rate) * dt;
        rv.burst -= dt;
        if (rv.burst <= 0) {
          rv.score += rand(10, 26);
          rv.burst = rand(4, 9);
        }
      }
    }

    // 场景切换
    var si = Math.min(SCENES.length - 1, Math.floor(this.score / 500));
    if (si !== this.sceneIndex) {
      this.bgFrom = this.sceneIndex;
      this.sceneIndex = si;
      this.bgFade = 0;
      if (this.hooks.onScene) this.hooks.onScene(SCENES[si], si);
      if (this.hooks.onBanner) this.hooks.onBanner(SCENES[si].name, SCENES[si].index + ' · 场地变换', '');
      TG_SFX('crystal');
    }
    if (this.bgFade < 1) this.bgFade = Math.min(1, this.bgFade + dt / 0.9);

    if (this.hooks.onFrame) this.hooks.onFrame(this);
  };

  Game.prototype._spawnWave = function () {
    var self = this;
    var diff = Math.min(1, this.t / 95);
    var n = 1;
    if (Math.random() < 0.38 + diff * 0.22) n++;
    if (Math.random() < 0.10 + diff * 0.18) n++;
    if (this.t > 45 && Math.random() < 0.06) n++;
    n = Math.min(n, 4);
    for (var i = 0; i < n; i++) {
      (function (idx) {
        self.queue.push({
          at: self.t + idx * rand(0.09, 0.17),
          fn: function () { self._spawnOne(diff); }
        });
      })(i);
    }
  };

  Game.prototype._baseObject = function (x, y, vx, vy) {
    var apexY = rand(150, 420);
    var vy0 = -Math.sqrt(2 * GRAVITY * Math.max(520, H + 150 - apexY));
    return {
      x: x, y: y, vx: vx, vy: vy0,
      rot: rand(-0.4, 0.4), spin: rand(-2.4, 2.4),
      age: 0, dead: false, sliced: false, pulse: 0
    };
  };

  Game.prototype._spawnOne = function (diff) {
    if (this.state !== 'playing' || this.dying) return;

    // 任何一张图没就绪都不生成，避免出现看不见却会扣血的物体
    var roll = Math.random();
    var hazardChance = 0.155 + diff * 0.105;
    var kind, ft, hz;
    if (roll < 0.035) {
      kind = 'heal';
    } else if (roll < 0.035 + hazardChance) {
      kind = 'hazard';
      hz = HAZARDS[Math.random() < 0.4 ? 0 : Math.random() < 0.55 ? 1 : 2];
      if (!isReady(hz.img)) return;
    } else {
      kind = 'fruit';
      var avail = [];
      for (var fi = 0; fi < FRUITS.length; fi++) {
        if (isReady(FRUITS[fi].img)) avail.push(FRUITS[fi]);
      }
      if (!avail.length) return;
      ft = pickWeighted(avail);
    }
    if (kind === 'heal' && !isReady('spr-fruit-peach')) return;

    var x = rand(100, W - 100);
    var obj = this._baseObject(x, H + 150, (W / 2 - x) * 0.14 + rand(-90, 90), 0);
    obj.kind = kind;

    if (kind === 'heal') {
      obj.img = IMG['spr-fruit-peach'];
      obj.h = 156;
      obj.w = obj.h * (obj.img.width / obj.img.height);
      obj.r = obj.h * 0.42;
      obj.glow = '#FFD978';
      obj.value = 0;
    } else if (kind === 'hazard') {
      obj.hazard = hz.type;
      obj.img = IMG[hz.img];
      obj.h = hz.h;
      obj.w = obj.h * (obj.img.width / obj.img.height);
      obj.r = hz.radius;
      obj.glow = hz.color;
    } else {
      obj.fruit = ft.type;
      obj.img = IMG[ft.img];
      obj.h = ft.h;
      obj.w = obj.h * (obj.img.width / obj.img.height);
      obj.r = Math.max(obj.w, obj.h) * 0.40;
      obj.value = ft.value;
      obj.juice = ft.color;
    }
    this.objects.push(obj);
  };

  Game.prototype._spawnCrystal = function () {
    if (this.state !== 'playing' || this.dying) return;
    if (!isReady('spr-crystal')) return;
    var x = rand(180, W - 180);
    var obj = this._baseObject(x, H + 140, rand(-50, 50), 0);
    obj.kind = 'crystal';
    obj.img = IMG['spr-crystal'];
    obj.h = 168;
    obj.w = obj.h * (obj.img.width / obj.img.height);
    obj.r = obj.h * 0.44;
    obj.vy *= 0.86;
    obj.spin = rand(-0.9, 0.9);
    obj.glow = '#B79CFF';
    obj.pulse = 0;
    this.objects.push(obj);
    if (this.hooks.onToast) this.hooks.onToast('水晶果现世 · 斩之夺法宝', 'good');
    TG_SFX('crystal');
    this._ringBurst(x, H - 200, '#B79CFF', 150);
  };

  Game.prototype.pointerDown = function (x, y, id) {
    if (this.state !== 'playing') return;
    this.pointerActive = true;
    this._pointerId = id;
    this.strokeFruits = 0;
    this.trail.push({ x: x, y: y, t: this.t });
    if (this.trail.length > 34) this.trail.shift();
  };

  Game.prototype.pointerMove = function (x, y) {
    if (this.state !== 'playing' || !this.pointerActive) return;
    var last = this.trail[this.trail.length - 1];
    if (!last) { this.trail.push({ x: x, y: y, t: this.t }); return; }
    var dx = x - last.x, dy = y - last.y;
    if (dx * dx + dy * dy < 16) return;
    this.trail.push({ x: x, y: y, t: this.t });
    if (this.trail.length > 34) this.trail.shift();

    var seg = { x1: last.x, y1: last.y, x2: x, y2: y };
    if (this.t < this.hallucUntil) {
      this.sliceQueue.push({ seg: seg, at: this.t + 0.15 });
      if (this.sliceQueue.length > 40) this.sliceQueue.shift();
    } else {
      this._doSlice(seg);
    }
  };

  Game.prototype.pointerUp = function () {
    this.pointerActive = false;
    this._pointerId = null;
    this.strokeFruits = 0;
  };

  Game.prototype._doSlice = function (seg) {
    if (this.state !== 'playing' || this.dying) return;
    var wide = this.weapon.type === 'staff' && this.t < this.weapon.end ? 2.5 : 1;
    var ang = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
    for (var i = 0; i < this.objects.length; i++) {
      var o = this.objects[i];
      if (o.sliced || o.dead) continue;
      var r = o.r * wide;
      if (segCircle(seg.x1, seg.y1, seg.x2, seg.y2, o.x, o.y) > r) continue;

      if (o.kind === 'hazard') {
        this._hitHazard(o);
      } else if (o.kind === 'crystal') {
        o.sliced = true;
        o.dead = true;
        this._grantWeapon(o.x, o.y);
      } else {
        this._sliceFruit(o, ang, 1, 0);
      }
    }
  };

  Game.prototype._sliceFruit = function (o, ang, factor, depth) {
    if (o.sliced || o.dead) return;
    o.sliced = true;
    o.dead = true;
    this._makeHalves(o, ang);
    this._juice(o, ang);

    if (o.kind === 'heal') {
      if (this.hp < this.maxHp) {
        this.hp++;
        if (this.hooks.onHp) this.hooks.onHp(this.hp, this.maxHp, 'heal');
        if (this.hooks.onToast) this.hooks.onToast('仙桃回春 · 气血 +1', 'good');
        this._popup(o.x, o.y - 12, '+1 气血', '#FFE3A8', 28);
      } else {
        this.score += 30;
        this._popup(o.x, o.y - 12, '+30', '#FFE3A8', 28);
      }
      TG_SFX('heal');
      this._ringBurst(o.x, o.y, '#FFD978', 100);
      return;
    }

    this.fruitsSliced++;
    this.strokeFruits++;
    if (this.strokeFruits > this.bestSlice) this.bestSlice = this.strokeFruits;

    var value = o.value || 0;
    if (value > 0) {
      var fresh = this.t - this.lastSlice <= this.comboWindow;
      this.combo = fresh ? this.combo + 1 : 1;
      this.lastSlice = this.t;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      var mult = Math.min(3, 1 + (this.combo - 1) * 0.1);
      var pts = Math.round(value * mult * (this.weapon.type === 'staff' && this.t < this.weapon.end ? 1.5 : 1) * factor);
      this.score += pts;
      this._popup(o.x, o.y - 10, '+' + pts, '#FFE3A8', 30);
      if (this.combo >= 5) this._popup(o.x, o.y + 32, '×' + mult.toFixed(1), '#FF8A5C', 20);
      if (this.combo >= 3 && this.combo % 3 === 0) TG_SFX('combo');
    }

    // 一刀多果
    if (this.strokeFruits === 3) {
      this.score += 50;
      this._popup(360, 430, '+50 一刀三断', '#D9A441', 26);
      if (this.hooks.onBanner) this.hooks.onBanner('一刀三断', '赏 50 分', '');
      TG_SFX('combo');
    } else if (this.strokeFruits === 5) {
      this.score += 50;
      this._popup(360, 470, '+50 一刀五断', '#FFD978', 28);
      if (this.hooks.onBanner) this.hooks.onBanner('一刀五断', '赏 50 分', 'big');
      TG_SFX('weapon');
    }

    TG_SFX('slice');
    TG_SFX('splat');

    // 火尖枪印记
    if (this.weapon.type === 'spear' && this.t < this.weapon.end && !depth) {
      this.bursts.push({ x: o.x, y: o.y, at: this.t + 0.6, depth: 0 });
    }
  };

  Game.prototype._hitHazard = function (o) {
    o.sliced = true;
    o.dead = true;
    TG_SFX('bomb');

    if (o.hazard === 'bomb') {
      this._explosion(o.x, o.y, '#FF6A3D');
      this.shake = 26;
      this.damageFlash = 1;
      this._damage('bomb');
    } else if (o.hazard === 'rotten') {
      this._ringBurst(o.x, o.y, '#8FBF4A', 110);
      this._burstParticles(o.x, o.y, '#8FBF4A', 18, 260);
      this.shake = 15;
      this._damage('rotten');
    } else {
      this._ringBurst(o.x, o.y, '#B98BE8', 130);
      this._burstParticles(o.x, o.y, '#B98BE8', 22, 240);
      this.hallucOn = true;
      this.hallucUntil = this.t + 2;
      if (this.hooks.onHalluc) this.hooks.onHalluc(true);
      if (this.hooks.onToast) this.hooks.onToast('毒菇入幻 · 五感颠倒', 'bad');
      TG_SFX('slow');
      this.shake = 10;
    }
  };

  Game.prototype._damage = function (reason) {
    if (this.dying) return;
    if (reason === 'miss' && this.shields > 0) {
      this.shields--;
      if (this.hooks.onToast) this.hooks.onToast('哪吒护体 · 免于漏果', 'good');
      return;
    }
    this.hp--;
    if (this.hooks.onHp) this.hooks.onHp(this.hp, this.maxHp, reason);
    this.damageFlash = 1;
    if (this.hooks.onBanner && reason !== 'miss') {
      this.hooks.onBanner('失血', '仙体受创', 'bad');
    }
    TG_SFX(reason === 'miss' ? 'miss' : 'bomb');
    if (this.hp <= 0) this._gameOver();
  };

  Game.prototype._miss = function (o) {
    if (o.kind === 'fruit') {
      this._damage('miss');
      if (this.hooks.onToast) this.hooks.onToast('漏果 · 气血 -1', 'bad');
    } else if (o.kind === 'crystal') {
      if (this.hooks.onToast) this.hooks.onToast('法宝遁走', '');
    } else if (o.kind === 'heal') {
      if (this.hooks.onToast) this.hooks.onToast('蟠桃落地，可惜', '');
    }
  };

  Game.prototype._gameOver = function () {
    if (this.dying) return;
    this.dying = true;
    this.overAt = this.t + 0.85;
    this.shake = 22;
    TG_SFX('gameover');
    var self = this;
    setTimeout(function () {
      if (self.state !== 'playing') return;
      self.state = 'over';
      cancelAnimationFrame(self.raf);
      self.raf = 0;
      var board = self.rivals.map(function (r) {
        return { name: r.name, score: Math.round(r.score), me: false, key: r.key };
      });
      board.push({ name: CHARS[self.charKey].name, score: self.score, me: true, key: self.charKey });
      board.sort(function (a, b) { return b.score - a.score; });
      var rank = 1;
      for (var i = 0; i < board.length; i++) if (board[i].me) rank = i + 1;
      if (self.hooks.onGameOver) self.hooks.onGameOver({
        score: self.score,
        maxCombo: self.maxCombo,
        fruits: self.fruitsSliced,
        bestSlice: self.bestSlice,
        rank: rank,
        board: board,
        charKey: self.charKey,
        time: self.t
      });
    }, 850);
  };

  Game.prototype._grantWeapon = function (x, y) {
    var roll = Math.random();
    var type = roll < 0.3 ? 'staff' : roll < 0.6 ? 'spear' : 'trident';
    var existed = this.weapon.type;
    this.weapon = { type: type, end: this.t + 10 };
    var wp = WEAPONS[type];
    this._explosion(x, y, wp.color, 26);
    if (this.hooks.onBanner) this.hooks.onBanner(wp.name, existed ? '神兵更替 · 再续十秒' : wp.effect, 'big');
    if (this.hooks.onToast) this.hooks.onToast((existed ? '神兵更替：' : '夺得法宝：') + wp.name, 'good');
    if (this.hooks.onWeapon) this.hooks.onWeapon(type);
    TG_SFX('weapon');
  };

  Game.prototype._explode = function (bu) {
    this._ringBurst(bu.x, bu.y, '#FF9A4D', 120);
    this._burstParticles(bu.x, bu.y, '#FFB05E', 18, 180);
    if (bu.depth < 2) {
      for (var i = 0; i < this.objects.length; i++) {
        var o = this.objects[i];
        if (o.sliced || o.dead || o.kind !== 'fruit') continue;
        if (Math.hypot(o.x - bu.x, o.y - bu.y) <= 120) {
          this._sliceFruit(o, rand(0, Math.PI), 0.8, bu.depth + 1);
          this.bursts.push({ x: o.x, y: o.y, at: this.t + 0.6, depth: bu.depth + 1 });
        }
      }
    }
  };

  Game.prototype._makeHalves = function (o, ang) {
    var perp = ang + Math.PI / 2;
    var px = Math.cos(perp), py = Math.sin(perp);
    var rel = ang - o.rot;
    for (var s = 0; s < 2; s++) {
      var dir = s === 0 ? 1 : -1;
      this.halves.push({
        img: o.img, w: o.w, h: o.h,
        x: o.x, y: o.y,
        vx: o.vx + px * dir * rand(90, 170),
        vy: o.vy + py * dir * rand(90, 170) - 40,
        rot: o.rot,
        spin: o.spin + dir * rand(0.4, 1.4),
        rel: rel, side: s,
        age: 0
      });
    }
  };

  Game.prototype._juice = function (o, ang) {
    var color = o.juice || '#FF9C9C';
    var count = o.fruit === 'melon' ? 24 : 16;
    for (var i = 0; i < count; i++) {
      var a = ang + rand(-0.9, 0.9);
      var sp = rand(80, 420);
      this.particles.push({
        x: o.x + rand(-10, 10), y: o.y + rand(-10, 10),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + rand(-80, 40),
        g: 760, life: rand(0.45, 0.95), age: 0,
        r: rand(2.5, 7), color: color, spark: false
      });
    }
    for (var j = 0; j < 7; j++) {
      this.particles.push({
        x: o.x, y: o.y,
        vx: rand(-360, 360), vy: rand(-360, 200),
        g: 420, life: rand(0.2, 0.42), age: 0,
        r: rand(1.4, 2.6), color: '#FFF3D6', spark: true
      });
    }
  };

  Game.prototype._burstParticles = function (x, y, color, n, sp) {
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2);
      var s = rand(sp * 0.25, sp);
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        g: 520, life: rand(0.35, 0.8), age: 0,
        r: rand(2, 6), color: color, spark: Math.random() < 0.5
      });
    }
  };

  Game.prototype._explosion = function (x, y, color, n) {
    this.rings.push({ x: x, y: y, r: 12, color: color, life: 0.5, age: 0, max: 110 });
    this.rings.push({ x: x, y: y, r: 4, color: '#FFF3D6', life: 0.28, age: 0, max: 52 });
    this._burstParticles(x, y, color, n || 22, 320);
  };

  Game.prototype._ringBurst = function (x, y, color, max) {
    this.rings.push({ x: x, y: y, r: 8, color: color, life: 0.55, age: 0, max: max });
  };

  Game.prototype._popup = function (x, y, text, color, size) {
    this.popups.push({
      x: clamp(x, 70, W - 70), y: y, text: text, color: color,
      size: size || 28, vy: -78, age: 0, life: 0.9
    });
  };

  function TG_SFX(name) {
    if (window.TG && window.TG.sfx) window.TG.sfx.play(name);
  }

  window.TG = window.TG || {};
  window.TG.Game = Game;
  window.TG.CHARS = CHARS;
  window.TG.WEAPONS = WEAPONS;
  window.TG.SCENES = SCENES;
  window.TG.FRUITS = FRUITS;
  window.TG.loadAssets = loadAssets;
  window.TG.IMG = IMG;
})();
