/**
 * NOVASTRIKE — game scene.
 *
 * The conductor: owns the player, weapon system, object groups, collision
 * matrix, scoring, the wave director, boss sequences, level transitions and
 * the smart bomb. Implements the scene interfaces every subsystem talks to.
 */

import Phaser from 'phaser';
import {
  BOSS,
  DIFFICULTY,
  PLAYER,
  SCORING,
  SCREEN,
  SCROLL,
  SMART_BOMB,
  WeaponId,
} from '../config/Balance';
import { THEMES } from '../assets/TextureFactory';
import { Player } from '../entities/Player';
import { PlayerBullet, EnemyBullet } from '../entities/Bullets';
import { PowerUp, rollPowerUp } from '../entities/PowerUp';
import { Enemy } from '../enemies/Enemy';
import { Boss } from '../bosses/Boss';
import { WeaponSystem } from '../weapons/Weapons';
import { Explosions } from '../effects/Explosions';
import { ParallaxBackground } from '../effects/Parallax';
import { WaveDirector } from '../levels/WaveDirector';
import { LEVELS } from '../levels/Levels';
import { DirectorHost } from '../levels/Types';
import { topScore } from '../systems/HighScores';
import { sfx } from '../audio/Sfx';
import { music, SongKey } from '../audio/Music';
import type { CombatScene } from '../enemies/Enemy';

interface GameData {
  mode: 'arcade' | 'survival';
  levelIndex: number;
  score?: number;
  lives?: number;
  bombs?: number;
  weapon?: WeaponId;
  weaponLevel?: number;
}

export class GameScene extends Phaser.Scene implements DirectorHost {
  player!: Player;
  playerBullets!: Phaser.Physics.Arcade.Group;
  enemyBullets!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  powerups!: Phaser.Physics.Arcade.Group;
  explosions!: Explosions;

  private weapons!: WeaponSystem;
  private parallax!: ParallaxBackground;
  private director!: WaveDirector;

  private mode: 'arcade' | 'survival' = 'arcade';
  private levelIndex = 0;
  private score = 0;
  private lives = PLAYER.startLives;
  private bombs = PLAYER.startBombs;
  private levelTime = 0;
  private survAcc = 0;
  private gameOver = false;
  private clearing = false;
  private bossKind: 'mini' | 'end' | null = null;

  private banner!: Phaser.GameObjects.BitmapText;
  private bannerTween: Phaser.Tweens.Tween | null = null;

  private onPlayerDied = () => this.handlePlayerDeath();
  private onBossDefeated = () => this.handleBossDefeated();

  constructor() {
    super('Game');
  }

  init(data: GameData): void {
    this.mode = data.mode ?? 'arcade';
    this.levelIndex = data.levelIndex ?? 0;
    this.score = data.score ?? 0;
    this.lives = data.lives ?? PLAYER.startLives;
    this.bombs = data.bombs ?? PLAYER.startBombs;
    this.levelTime = 0;
    this.survAcc = 0;
    this.gameOver = false;
    this.clearing = false;
    this.bossKind = null;
    this.registry.set('carry-weapon', data.weapon ?? 'laser');
    this.registry.set('carry-weapon-level', data.weaponLevel ?? 1);
  }

  create(): void {
    this.physics.world.setBounds(0, 0, SCREEN.W, SCREEN.H);
    this.cameras.main.fadeIn(350, 0, 0, 0);

    const themeIdx =
      this.mode === 'survival'
        ? Phaser.Math.Between(0, THEMES.length - 1)
        : LEVELS[this.levelIndex].theme;
    this.parallax = new ParallaxBackground(this, THEMES[themeIdx]);

    /* groups */
    this.playerBullets = this.physics.add.group({
      classType: PlayerBullet,
      maxSize: 130,
    });
    this.enemyBullets = this.physics.add.group({
      classType: EnemyBullet,
      maxSize: 220,
    });
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group({ classType: PowerUp, maxSize: 12 });

    this.explosions = new Explosions(this);
    this.player = new Player(this, 36, SCREEN.H / 2);
    this.player.grantInvuln(1800);

    this.weapons = new WeaponSystem(this, this.player);
    this.weapons.weapon = this.registry.get('carry-weapon') as WeaponId;
    this.weapons.level = this.registry.get('carry-weapon-level') as number;

    this.director = new WaveDirector(
      this,
      this.mode === 'survival' ? null : LEVELS[this.levelIndex],
    );

    this.banner = this.add
      .bitmapText(SCREEN.W / 2, 64, 'retro', '')
      .setOrigin(0.5)
      .setScale(2)
      .setDepth(60)
      .setAlpha(0);

    /* collisions */
    this.physics.add.overlap(this.playerBullets, this.enemies, (b, e) =>
      this.bulletHitsEnemy(b as PlayerBullet, e as Enemy),
    );
    this.physics.add.overlap(this.player, this.enemies, (_p, e) =>
      this.playerCrash(e as Enemy),
    );
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) =>
      this.bulletHitsPlayer(b as EnemyBullet),
    );
    this.physics.add.overlap(this.player, this.powerups, (_p, pu) =>
      this.collect(pu as PowerUp),
    );

    /* events */
    this.events.on('player-died', this.onPlayerDied);
    this.events.on('boss-defeated', this.onBossDefeated);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('player-died', this.onPlayerDied);
      this.events.off('boss-defeated', this.onBossDefeated);
    });

    /* HUD */
    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.time.delayedCall(0, () => this.syncHud());

    /* music */
    const song: SongKey =
      this.mode === 'survival'
        ? (`level${themeIdx}` as SongKey)
        : LEVELS[this.levelIndex].song;
    music.play(song);
  }

  /* ------------------------------------------------------------------ */
  /*  frame loop                                                          */
  /* ------------------------------------------------------------------ */

  update(time: number, delta: number): void {
    this.player.update(time, delta);
    const firing = this.player.alive && (this.player.autofire || this.player.firingHeld);
    this.weapons.update(delta, firing);
    this.parallax.update(delta);
    if (!this.gameOver && !this.clearing) {
      this.levelTime += delta;
      this.director.update(delta);
    }
    if (this.player.alive && this.player.bombPressed) this.smartBomb();

    if (this.mode === 'survival' && this.player.alive && !this.gameOver) {
      this.survAcc += (SCORING.survivalPerSec * delta) / 1000;
      if (this.survAcc >= 1) {
        const add = Math.floor(this.survAcc);
        this.survAcc -= add;
        this.addScore(add);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  scene interface (CombatScene / ShooterScene / WeaponScene)          */
  /* ------------------------------------------------------------------ */

  playerPos(): Phaser.Math.Vector2 | null {
    return this.player.alive
      ? new Phaser.Math.Vector2(this.player.x, this.player.y)
      : null;
  }

  ebSpeed(): number {
    const d = Math.min(DIFFICULTY.cap, this.difficulty());
    return DIFFICULTY.enemyBulletSpeed * (1 + DIFFICULTY.bulletScale * d);
  }

  difficulty(): number {
    const ramp =
      this.mode === 'survival' ? DIFFICULTY.survivalRampPerSec : DIFFICULTY.rampPerSec;
    const base = this.mode === 'survival' ? 0.4 : DIFFICULTY.levelBase[this.levelIndex];
    return base + (this.levelTime / 1000) * ramp;
  }

  scrollSpeed(): number {
    return SCROLL.base * this.parallax.targetMul;
  }

  bossTargets(): Enemy[] {
    return []; // bosses and their parts live in the enemies group
  }

  nearestEnemy(x: number, y: number, range: number): Phaser.GameObjects.Sprite | null {
    let best: Enemy | null = null;
    let bestD = range;
    for (const child of this.enemies.getChildren() as Enemy[]) {
      if (!child.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, child.x, child.y);
      if (d < bestD) {
        bestD = d;
        best = child;
      }
    }
    return best;
  }

  addScore(n: number, x?: number, y?: number): void {
    const prev = this.score;
    this.score += n;
    if (
      Math.floor(this.score / PLAYER.extraLifeEvery) >
      Math.floor(prev / PLAYER.extraLifeEvery)
    ) {
      if (this.lives < PLAYER.maxLives) {
        this.lives++;
        this.events.emit('lives', this.lives);
      }
      sfx.extraLife();
      this.popup(this.player.x, this.player.y - 12, '1UP!');
    }
    this.events.emit('score', this.score, topScore());
    if (x !== undefined && n >= 50) this.popup(x, y ?? 0, `${n}`);
  }

  spawnPowerUp(x: number, y: number, letter?: string): void {
    const pu = this.powerups.get() as PowerUp | null;
    if (pu) pu.spawn(x, y, letter ?? rollPowerUp());
  }

  boom(x: number, y: number, big = false): void {
    if (big) this.explosions.big(x, y);
    else this.explosions.small(x, y);
  }

  showBanner(msg: string, ms = 2200): void {
    this.banner.setText(msg).setAlpha(1);
    this.bannerTween?.stop();
    this.bannerTween = this.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: ms,
      duration: 500,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  collisions                                                          */
  /* ------------------------------------------------------------------ */

  private bulletHitsEnemy(b: PlayerBullet, e: Enemy): void {
    if (!b.active || !e.active) return;
    if (b.pierce) {
      if (b.hitSet.has(e.uid)) return;
      b.hitSet.add(e.uid);
    }
    this.explosions.hitSpark(b.x, b.y);
    e.takeDamage(b.damage, b.x, b.y);
    sfx.hit();
    if (!b.pierce) b.kill();
  }

  private playerCrash(e: Enemy): void {
    if (!e.active || !this.player.alive) return;
    if (this.player.invulnMs > 0) {
      // star power: ram through regular enemies
      if (!(e instanceof Boss)) e.takeDamage(PLAYER.crashDamageToEnemy * 2);
      return;
    }
    this.player.takeHit(e.crashDamage);
    e.takeDamage(PLAYER.crashDamageToEnemy);
  }

  private bulletHitsPlayer(b: EnemyBullet): void {
    if (!b.active || !this.player.alive) return;
    if (this.player.invulnMs > 0) return;
    b.kill();
    this.player.takeHit(1);
  }

  private collect(pu: PowerUp): void {
    if (!pu.active || !this.player.alive) return;
    const letter = pu.letter;
    pu.kill();
    sfx.powerup();
    switch (letter) {
      case 'U':
      case 'S':
      case 'P':
      case 'H':
      case 'B':
      case 'L':
        this.weapons.pickup(letter);
        break;
      case 'E':
        this.player.rechargeShield(2);
        break;
      case '1':
        if (this.lives < PLAYER.maxLives) this.lives++;
        this.events.emit('lives', this.lives);
        sfx.extraLife();
        break;
      case 'X':
        this.bombs = Math.min(PLAYER.maxBombs, this.bombs + 1);
        this.events.emit('bombs', this.bombs);
        break;
      case 'I':
        this.player.grantInvuln(PLAYER.invulnStarMs);
        this.popup(this.player.x, this.player.y - 12, 'INVINCIBLE!');
        break;
    }
    this.addScore(200);
  }

  /* ------------------------------------------------------------------ */
  /*  smart bomb                                                          */
  /* ------------------------------------------------------------------ */

  private smartBomb(): void {
    if (this.bombs <= 0 || this.gameOver) return;
    this.bombs--;
    this.events.emit('bombs', this.bombs);
    sfx.smartBomb();

    const flash = this.add
      .rectangle(0, 0, SCREEN.W, SCREEN.H, 0xffffff)
      .setOrigin(0)
      .setDepth(90)
      .setAlpha(0.9);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: SMART_BOMB.flashMs,
      onComplete: () => flash.destroy(),
    });
    this.cameras.main.shake(260, 0.012);

    for (const b of [...(this.enemyBullets.getChildren() as EnemyBullet[])]) {
      if (b.active) b.kill();
    }
    for (const e of [...(this.enemies.getChildren() as Enemy[])]) {
      if (!e.active) continue;
      if (e instanceof Boss) e.applyBombDamage(SMART_BOMB.bossDamagePct);
      else e.takeDamage(SMART_BOMB.damage);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  boss sequences                                                      */
  /* ------------------------------------------------------------------ */

  startMiniboss(spawn: (s: CombatScene) => Boss): void {
    this.bossKind = 'mini';
    sfx.siren();
    this.flashWarning(1600);
    this.time.delayedCall(1600, () => {
      if (!this.gameOver) spawn(this);
    });
  }

  startEndBoss(spawn: (s: CombatScene) => Boss): void {
    this.bossKind = 'end';
    this.parallax.targetMul = SCROLL.bossSlowdown;
    music.play('boss');
    sfx.siren();
    this.flashWarning(BOSS.warningMs);
    this.time.delayedCall(BOSS.warningMs, () => {
      if (!this.gameOver) spawn(this);
    });
  }

  private flashWarning(ms: number): void {
    const t = this.add
      .bitmapText(SCREEN.W / 2, 64, 'retro', 'WARNING!')
      .setOrigin(0.5)
      .setScale(2)
      .setTint(0xe04658)
      .setDepth(60);
    this.tweens.add({
      targets: t,
      alpha: 0.15,
      duration: 240,
      yoyo: true,
      repeat: Math.floor(ms / 480),
      onComplete: () => t.destroy(),
    });
  }

  private handleBossDefeated(): void {
    if (this.bossKind === 'mini') {
      this.bossKind = null;
      this.spawnPowerUp(SCREEN.W - 60, SCREEN.H / 2, 'U');
      this.director.resume();
      return;
    }
    if (this.bossKind === 'end') {
      this.bossKind = null;
      this.levelComplete();
    }
  }

  private levelComplete(): void {
    if (this.clearing || this.gameOver) return;
    this.clearing = true;
    music.stop();
    sfx.levelClear();
    this.parallax.targetMul = 1;

    const bombBonus = this.bombs * SCORING.stageClearBombBonus;
    const lifeBonus = Math.max(0, this.lives) * SCORING.stageClearLifeBonus;
    this.showBanner('STAGE CLEAR!', 3400);
    this.time.delayedCall(900, () => {
      this.popup(SCREEN.W / 2, 92, `BOMB BONUS ${bombBonus}`);
      this.addScore(bombBonus);
    });
    this.time.delayedCall(1700, () => {
      this.popup(SCREEN.W / 2, 104, `LIFE BONUS ${lifeBonus}`);
      this.addScore(lifeBonus);
    });

    this.time.delayedCall(3800, () => {
      const next = this.levelIndex + 1;
      if (next < LEVELS.length) {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.restart({
            mode: this.mode,
            levelIndex: next,
            score: this.score,
            lives: this.lives,
            bombs: this.bombs,
            weapon: this.weapons.weapon,
            weaponLevel: this.weapons.level,
          } satisfies GameData);
        });
      } else {
        this.endRun(true);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  death & game over                                                    */
  /* ------------------------------------------------------------------ */

  private handlePlayerDeath(): void {
    this.explosions.big(this.player.x, this.player.y);
    this.lives--;
    this.events.emit('lives', Math.max(0, this.lives));
    this.weapons.downgrade(PLAYER.deathWeaponPenalty);
    if (this.lives < 0) {
      this.endRun(false);
      return;
    }
    this.time.delayedCall(PLAYER.respawnDelayMs, () => {
      if (!this.gameOver && !this.clearing) this.player.respawn();
      else if (this.clearing) this.player.respawn();
    });
  }

  private endRun(victory: boolean): void {
    if (this.gameOver) return;
    this.gameOver = true;
    music.stop();
    if (victory) this.showBanner('MISSION COMPLETE!', 2600);
    this.time.delayedCall(victory ? 2800 : 1500, () => {
      this.scene.stop('UI');
      this.scene.start('GameOver', {
        score: this.score,
        stage: this.levelIndex + 1,
        mode: this.mode,
        victory,
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  misc                                                                */
  /* ------------------------------------------------------------------ */

  private popup(x: number, y: number, msg: string): void {
    const t = this.add
      .bitmapText(x, y, 'retro', msg)
      .setOrigin(0.5)
      .setDepth(60)
      .setTint(0xffc933);
    this.tweens.add({
      targets: t,
      y: y - 14,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private syncHud(): void {
    this.events.emit('score', this.score, topScore());
    this.events.emit('lives', this.lives);
    this.events.emit('bombs', this.bombs);
    this.events.emit('shield-changed', this.player.shield);
    this.events.emit('weapon-changed', this.weapons.name, this.weapons.level);
    const stage =
      this.mode === 'survival' ? 'SURVIVAL' : LEVELS[this.levelIndex].name;
    this.events.emit('stage', stage);
  }
}
