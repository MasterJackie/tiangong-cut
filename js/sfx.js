/* 轻量 WebAudio 合成音效：不依赖任何音频文件 */
(function () {
  'use strict';

  function Sfx() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.muted = false;
    this._last = {};
  }

  Sfx.prototype.unlock = function () {
    try {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);

      // 预生成 1 秒白噪声
      var len = this.ctx.sampleRate;
      var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch (e) {
      // 某些移动端内核对 WebAudio 支持不全，静默降级为无声
      this.ctx = null;
      this.master = null;
    }
  };

  Sfx.prototype.setMuted = function (m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  };

  Sfx.prototype._noise = function (dur, type, f0, f1, vol, q) {
    var c = this.ctx, t = c.currentTime;
    var src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 1;
    var flt = c.createBiquadFilter();
    flt.type = type || 'bandpass';
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    flt.Q.value = q || 1.2;
    var g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  };

  Sfx.prototype._tone = function (freq, dur, type, vol, delay, sweepTo) {
    var c = this.ctx, t = c.currentTime + (delay || 0);
    var o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, sweepTo), t + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  };

  Sfx.prototype.play = function (name) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    var now = performance.now();
    // 连续切割时做节流，避免爆音
    if ((name === 'slice' || name === 'splat') && this._last[name] && now - this._last[name] < 55) return;
    this._last[name] = now;

    switch (name) {
      case 'slice':
        this._noise(0.16, 'bandpass', 2600, 700, 0.34, 1.1);
        this._tone(740, 0.08, 'triangle', 0.05, 0, 300);
        break;
      case 'splat':
        this._noise(0.18, 'lowpass', 1200, 260, 0.3, 0.8);
        this._tone(180, 0.14, 'sine', 0.14, 0, 70);
        break;
      case 'combo':
        this._tone(880, 0.09, 'triangle', 0.12);
        this._tone(1320, 0.12, 'triangle', 0.09, 0.055);
        break;
      case 'bomb':
        this._noise(0.55, 'lowpass', 900, 60, 0.75, 0.7);
        this._tone(110, 0.5, 'sine', 0.3, 0, 28);
        this._tone(62, 0.65, 'square', 0.14, 0, 24);
        break;
      case 'heal':
        this._tone(660, 0.16, 'sine', 0.13);
        this._tone(990, 0.22, 'sine', 0.11, 0.1);
        this._tone(1320, 0.3, 'sine', 0.07, 0.2);
        break;
      case 'weapon':
        this._tone(196, 0.7, 'triangle', 0.15);
        this._tone(392, 0.6, 'triangle', 0.12, 0.04);
        this._tone(587, 0.55, 'triangle', 0.1, 0.09);
        this._tone(784, 0.6, 'sine', 0.07, 0.16);
        this._noise(0.5, 'highpass', 3000, 6000, 0.06, 0.7);
        break;
      case 'miss':
        this._tone(300, 0.22, 'square', 0.08, 0, 140);
        break;
      case 'gameover':
        this._tone(330, 1.1, 'sine', 0.16, 0, 82);
        this._tone(220, 1.3, 'triangle', 0.1, 0.1, 55);
        this._noise(0.9, 'lowpass', 600, 90, 0.12, 0.8);
        break;
      case 'click':
        this._tone(560, 0.05, 'sine', 0.08);
        break;
      case 'crystal':
        this._tone(1046, 0.35, 'sine', 0.08);
        this._tone(1568, 0.4, 'sine', 0.06, 0.12);
        break;
      case 'slow':
        this._noise(0.7, 'bandpass', 500, 120, 0.18, 2.4);
        this._tone(120, 0.8, 'sine', 0.12, 0, 70);
        break;
      default:
        break;
    }
  };

  window.TG = window.TG || {};
  window.TG.Sfx = Sfx;
})();
