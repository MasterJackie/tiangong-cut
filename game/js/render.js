/* 渲染层 */
(function () {
  'use strict';

  var W = 720, H = 1280;
  var SERIF = '"Songti SC","STSong","Noto Serif CJK SC","SimSun",serif';

  function rand(a, b) { return a + Math.random() * (b - a); }

  TG.Game.prototype.render = function () {
    var ctx = this.ctx;
    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var sh = this.shake;
    if (sh > 0.4) {
      ctx.translate(rand(-sh, sh) * 0.7, rand(-sh, sh) * 0.7);
    }
    ctx.fillStyle = '#0B0908';
    ctx.fillRect(-40, -40, W + 80, H + 80);

    this._drawBackground(ctx);
    this._drawPetals(ctx);
    this._drawHalves(ctx);
    this._drawObjects(ctx);
    this._drawBurstTelegraph(ctx);
    this._drawRings(ctx);
    this._drawParticles(ctx);
    this._drawTrail(ctx);
    this._drawPopups(ctx);
    this._drawOverlay(ctx);
  };

  TG.Game.prototype._drawBackground = function (ctx) {
    var to = TG.SCENES[this.sceneIndex];
    var from = TG.SCENES[this.bgFrom];
    var imgTo = TG.IMG[to.bg];
    var imgFrom = TG.IMG[from.bg];

    ctx.globalAlpha = 1;
    if (this.bgFade < 1 && from !== to && imgFrom) {
      ctx.drawImage(imgFrom, 0, 0, W, H);
      ctx.globalAlpha = this.bgFade;
      if (imgTo) ctx.drawImage(imgTo, 0, 0, W, H);
      ctx.globalAlpha = 1;
    } else {
      if (imgTo) ctx.drawImage(imgTo, 0, 0, W, H);
    }

    // 场景色调与整体压暗
    if (to.tint) {
      ctx.fillStyle = to.tint;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = 'rgba(8,6,5,' + (to.dim || 0.24) + ')';
    ctx.fillRect(0, 0, W, H);

    // 暗角 + 上下压暗，保证果实可读
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(8,6,5,.66)');
    g.addColorStop(0.22, 'rgba(8,6,5,.14)');
    g.addColorStop(0.55, 'rgba(8,6,5,0)');
    g.addColorStop(0.82, 'rgba(8,6,5,.22)');
    g.addColorStop(1, 'rgba(8,6,5,.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var rg = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.24, W / 2, H * 0.5, H * 0.72);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, 'rgba(0,0,0,.38)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // 廷内薄雾
    ctx.save();
    ctx.globalAlpha = 0.18;
    var mist = ctx.createLinearGradient(0, H * 0.55, 0, H);
    mist.addColorStop(0, 'rgba(255,244,220,0)');
    mist.addColorStop(1, 'rgba(255,238,200,.5)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    ctx.restore();
  };

  TG.Game.prototype._drawPetals = function (ctx) {
    ctx.save();
    for (var i = 0; i < this.petals.length; i++) {
      var p = this.petals[i];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.55);
      ctx.beginPath();
      ctx.arc(0, 0, p.s, 0, Math.PI * 2);
      ctx.fillStyle = p.hue === 'pink' ? 'rgba(255,196,206,.42)' : 'rgba(240,200,120,.30)';
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  TG.Game.prototype._drawObjects = function (ctx) {
    var now = this.t;
    for (var i = 0; i < this.objects.length; i++) {
      var o = this.objects[i];
      if (o.dead || !o.img || !o.img.width) continue;
      ctx.save();
      ctx.translate(o.x, o.y);

      var pulse = 1 + Math.sin(now * 4 + i) * 0.04;

      // 光晕
      if (o.glow) {
        var gr = ctx.createRadialGradient(0, 0, o.r * 0.3, 0, 0, o.r * 1.65);
        gr.addColorStop(0, hexA(o.glow, o.kind === 'crystal' ? 0.34 : 0.26));
        gr.addColorStop(1, hexA(o.glow, 0));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(0, 0, o.r * (o.kind === 'crystal' ? 1.75 + Math.sin(now * 3) * 0.14 : 1.65), 0, Math.PI * 2);
        ctx.fill();
      }

      // 法宝旋转光环
      if (o.kind === 'crystal') {
        ctx.save();
        ctx.rotate(now * 0.8);
        ctx.strokeStyle = 'rgba(220,205,255,.55)';
        ctx.lineWidth = 1.4;
        for (var d = 0; d < 4; d++) {
          ctx.beginPath();
          ctx.arc(0, 0, o.r * 1.28, d * Math.PI / 2 + 0.2, d * Math.PI / 2 + 0.75);
          ctx.stroke();
        }
        ctx.restore();
        ctx.font = '600 13px ' + SERIF;
        ctx.fillStyle = 'rgba(235,225,255,.9)';
        ctx.textAlign = 'center';
        ctx.fillText('法 宝', 0, -o.h * 0.62);
      }

      ctx.rotate(o.rot);
      ctx.scale(pulse, pulse);

      if (o.glow) {
        ctx.shadowColor = o.glow;
        ctx.shadowBlur = o.kind === 'hazard' ? 16 : 22;
      } else {
        ctx.shadowColor = 'rgba(6,5,4,.65)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
      }
      ctx.drawImage(o.img, -o.w / 2, -o.h / 2, o.w, o.h);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 蟠桃回血标记
      if (o.kind === 'heal') {
        ctx.restore();
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.globalAlpha = 0.75 + Math.sin(now * 5) * 0.25;
        ctx.font = '700 26px ' + SERIF;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFE9A8';
        ctx.shadowColor = '#FFD978';
        ctx.shadowBlur = 14;
        ctx.fillText('+', 0, -o.h * 0.55);
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // 危险物警示环（三尖两刃刀时更醒目）
      if (o.kind === 'hazard') {
        ctx.save();
        ctx.translate(o.x, o.y);
        var strong = this.weapon.type === 'trident' && now < this.weapon.end;
        var warn = o.hazard === 'bomb' ? '#FF6A4D' : o.hazard === 'rotten' ? '#9FD45C' : '#C497F2';
        ctx.setLineDash([7, 7]);
        ctx.lineDashOffset = -now * 22;
        ctx.strokeStyle = hexA(warn, strong ? 0.85 : 0.42);
        ctx.lineWidth = strong ? 2.4 : 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, o.r * (1.1 + Math.sin(now * 4.5) * 0.04), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  TG.Game.prototype._drawHalves = function (ctx) {
    for (var i = 0; i < this.halves.length; i++) {
      var h = this.halves[i];
      if (!h.img || !h.img.width) continue;
      var fade = h.age > 1.1 ? Math.max(0, 1 - (h.age - 1.1) / 0.4) : 1;
      var R = Math.max(h.w, h.h) * 0.85;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot);

      // 以切割线为界裁出半个果身
      ctx.save();
      ctx.rotate(h.rel);
      ctx.beginPath();
      if (h.side === 0) ctx.rect(-R, -R, R * 2, R);
      else ctx.rect(-R, 0, R * 2, R);
      ctx.restore();
      ctx.clip();

      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowBlur = 12;
      ctx.drawImage(h.img, -h.w / 2, -h.h / 2, h.w, h.h);
      ctx.restore();
    }
  };

  TG.Game.prototype._drawBurstTelegraph = function (ctx) {
    if (this.weapon.type !== 'spear' || this.t >= this.weapon.end) return;
    for (var i = 0; i < this.bursts.length; i++) {
      var b = this.bursts[i];
      var left = Math.max(0, b.at - this.t);
      var p = 1 - left / 0.6;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.globalAlpha = 0.22 + p * 0.45;
      ctx.strokeStyle = '#FF8A4D';
      ctx.lineWidth = 2 + p * 2;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -this.t * 40;
      ctx.beginPath();
      ctx.arc(0, 0, 120 * (0.35 + p * 0.65), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.16 + p * 0.16;
      ctx.fillStyle = '#FF6A3D';
      ctx.beginPath();
      ctx.arc(0, 0, 120 * (0.3 + p * 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  TG.Game.prototype._drawRings = function (ctx) {
    for (var i = 0; i < this.rings.length; i++) {
      var r = this.rings[i];
      var p = r.age / r.life;
      var rad = r.r + (r.max - r.r) * easeOut(p);
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * (1 - p) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  TG.Game.prototype._drawParticles = function (ctx) {
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      var a = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, a);
      if (p.spark) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.r * 0.7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.6 + a * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  TG.Game.prototype._drawTrail = function (ctx) {
    var pts = this.trail;
    if (pts.length < 2) return;
    var ch = TG.CHARS[this.charKey];
    var color = ch ? ch.trail : '#F2CE7E';
    var wide = 1;
    if (this.weapon.type === 'staff' && this.t < this.weapon.end) { color = '#FFD978'; wide = 1.35; }
    else if (this.weapon.type === 'spear' && this.t < this.weapon.end) { color = '#FF7F4F'; wide = 1.2; }
    else if (this.weapon.type === 'trident' && this.t < this.weapon.end) { color = '#B7E4F5'; wide = 1.15; }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var n = pts.length;
    // 外层光
    for (var pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (var i = 1; i < n; i++) {
        var p0 = pts[i - 1], p1 = pts[i];
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
      }
      if (pass === 0) {
        ctx.strokeStyle = hexA(color, 0.22);
        ctx.lineWidth = 22 * wide;
        ctx.shadowColor = color;
        ctx.shadowBlur = 26;
      } else {
        ctx.strokeStyle = hexA(color, 0.95);
        ctx.lineWidth = 6.5 * wide;
        ctx.shadowBlur = 12;
      }
      ctx.stroke();
    }
    // 白色刀芯
    ctx.beginPath();
    for (var j = 1; j < n; j++) {
      ctx.moveTo(pts[j - 1].x, pts[j - 1].y);
      ctx.lineTo(pts[j].x, pts[j].y);
    }
    ctx.strokeStyle = 'rgba(255,250,238,.92)';
    ctx.lineWidth = 2 * wide;
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#fff';
    ctx.stroke();
    ctx.restore();
  };

  TG.Game.prototype._drawPopups = function (ctx) {
    ctx.textAlign = 'center';
    for (var i = 0; i < this.popups.length; i++) {
      var p = this.popups[i];
      var t = p.age / p.life;
      ctx.globalAlpha = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.55) / 0.45);
      ctx.font = '700 ' + p.size + 'px ' + SERIF;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10,8,6,.75)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  };

  TG.Game.prototype._drawOverlay = function (ctx) {
    // 受伤红晕
    if (this.damageFlash > 0) {
      var g = ctx.createRadialGradient(W / 2, H / 2, H * 0.26, W / 2, H / 2, H * 0.68);
      g.addColorStop(0, 'rgba(214,66,46,0)');
      g.addColorStop(1, 'rgba(214,66,46,' + (0.55 * this.damageFlash).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // 幻觉重影
    if (this.hallucOn) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < 2; k++) {
        ctx.save();
        ctx.translate((k ? 1 : -1) * 10, (k ? -1 : 1) * 7);
        for (var i = 0; i < this.objects.length; i++) {
          var o = this.objects[i];
          if (o.dead || !o.img || !o.img.width) continue;
          ctx.save();
          ctx.translate(o.x, o.y);
          ctx.rotate(o.rot);
          ctx.drawImage(o.img, -o.w / 2, -o.h / 2, o.w, o.h);
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.restore();
    }
    // 凝滞时的一圈冷光
    if (this.slowOn) {
      ctx.save();
      ctx.strokeStyle = 'rgba(140,220,210,.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 300 + Math.sin(this.t * 2) * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function hexA(hex, a) {
    if (!hex) return 'rgba(255,255,255,' + a + ')';
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
})();
