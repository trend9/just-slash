import Phaser from "phaser";
import { EventBus } from "../EventBus";
import { soundSynth } from "../SoundSynth";

export default class GameScene extends Phaser.Scene {
  // Game state
  private level: number = 1;
  private score: number = 0;
  private slashCount: number = 0;
  private playerHp: number = 100;
  private maxPlayerHp: number = 100;
  
  // Game timeline (2 minutes = 120 seconds total)
  private timeRemaining: number = 120;
  private timelineTimer: Phaser.Time.TimerEvent | null = null;
  private isGameOver: boolean = false;
  private isGameClear: boolean = false;

  // Level-specific variables
  private scrollSpeed: number = 2;
  private enemySpawnInterval: number = 1500;
  private enemySpawnTimer: Phaser.Time.TimerEvent | null = null;
  private bulletSpeed: number = 180;
  private isBossStage: boolean = false;

  // Boss state
  private activeBoss: any = null;
  private bossHp: number = 0;
  private maxBossHp: number = 0;
  private bossShootTimer: Phaser.Time.TimerEvent | null = null;

  // Physics groups
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private enemies: Phaser.Physics.Arcade.Group | null = null;
  private enemyBullets: Phaser.Physics.Arcade.Group | null = null;
  
  // Background
  private bg1: Phaser.GameObjects.TileSprite | null = null;

  // Slashing logic
  private slashCooldown: number = 0; // ms
  private maxSlashCooldown: number = 400; // 0.4 seconds
  private isSlashActive: boolean = false;
  private slashVisualRing: Phaser.GameObjects.Graphics | null = null;
  
  // Burst mode
  private isBurstMode: boolean = false;
  private burstTimer: Phaser.Time.TimerEvent | null = null;
  private burstSlashCount: number = 0;
  private burstSlashVisuals: Phaser.GameObjects.Graphics[] = [];

  // Keys
  private wasdKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;

  // Mobile support variables
  private isTouchDevice: boolean = false;
  private isDragging: boolean = false;

  constructor() {
    super("GameScene");
  }

  init(data: { level: number }) {
    this.level = data.level || 1;
    this.score = 0;
    this.slashCount = 0;
    this.playerHp = 100;
    this.timeRemaining = 120;
    this.isGameOver = false;
    this.isGameClear = false;
    this.isBossStage = false;
    this.activeBoss = null;
    this.slashCooldown = 0;
    this.isBurstMode = false;
    
    // Scaling calculations based on level (1 to 10)
    // Scale scroll speed, bullet speed, spawn rates
    this.scrollSpeed = 1.5 + (this.level * 0.35); // 1.85 to 5.0
    this.bulletSpeed = 150 + (this.level * 22);   // 172 to 370
    this.enemySpawnInterval = Math.max(2000 - (this.level * 160), 500); // 1840ms down to 500ms
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Detect if the device supports touch input
    this.isTouchDevice = this.sys.game.device.input.touch;

    // Scrolling background
    this.bg1 = this.add.tileSprite(0, 0, width, height, "background").setOrigin(0, 0);
    
    // Set physics world bounds - left and right bounce, top and bottom open
    // setBounds(x, y, width, height, left, right, top, bottom)
    this.physics.world.setBounds(0, 0, width, height, true, true, false, false);

    // Create Groups
    this.enemies = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();

    // Create Player Sprite
    this.player = this.physics.add.sprite(width / 2, height - 100, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);
    
    // Scale player sprite display size to 48px width
    const playerScale = 48 / this.player.width;
    this.player.setScale(playerScale);
    
    // Shrink hitbox relatively for fairer gameplay
    this.player.body?.setSize(this.player.width * 0.6, this.player.height * 0.6);

    // Setup input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Touch controls: dragging player on mobile
    if (this.isTouchDevice) {
      this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        // Only trigger drag if clicking near player (within 80px)
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.player!.x, this.player!.y);
        if (dist < 80) {
          this.isDragging = true;
        }
      });

      this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        if (this.isDragging && this.player && !this.isGameOver && !this.isGameClear) {
          this.player.x = pointer.x;
          // Offset Y slightly upward so finger doesn't block player visibility
          this.player.y = pointer.y - 30;
          
          // Clamp player values manually to canvas
          this.player.x = Phaser.Math.Clamp(this.player.x, 20, width - 20);
          this.player.y = Phaser.Math.Clamp(this.player.y, 40, height - 40);
        }
      });

      this.input.on("pointerup", () => {
        this.isDragging = false;
      });
    }

    // Listen to React buttons for slash event
    EventBus.on("trigger-slash-btn", () => {
      this.executeSlash();
    });

    // Main game timeline timer (counts down every second)
    this.timelineTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.timeRemaining > 0 && !this.isGameOver && !this.isGameClear) {
          this.timeRemaining--;
          
          // Spawn Boss at 30 seconds remaining (90 seconds elapsed)
          if (this.timeRemaining === 30 && !this.isBossStage) {
            this.spawnBoss();
          }

          // Trigger Mid-Boss at 90 seconds remaining (30 seconds elapsed)
          if (this.timeRemaining === 90 && !this.isBossStage) {
            this.spawnMidBoss();
          }
        }
      },
      callbackScope: this,
      loop: true,
    });

    // Enemy wave spawning timer
    this.enemySpawnTimer = this.time.addEvent({
      delay: this.enemySpawnInterval,
      callback: this.spawnEnemyWave,
      callbackScope: this,
      loop: true,
    });

    // Overlap checks
    this.physics.add.overlap(this.player, this.enemyBullets, this.handleBulletPlayerCollision, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyPlayerCollision, undefined, this);

    // Initial audio setup and BGM start
    soundSynth.startBGM(this.level);

    // Push initial HUD state
    this.updateHudData();
  }

  update(time: number, delta: number) {
    if (this.isGameOver || this.isGameClear) return;

    // Scroll background
    if (this.bg1) {
      this.bg1.tilePositionY -= this.scrollSpeed;
    }

    // Handle slash cooldown
    if (this.slashCooldown > 0) {
      this.slashCooldown -= delta;
      if (this.slashCooldown < 0) this.slashCooldown = 0;
      this.updateHudData();
    }

    // Player keyboard movement (only check keyboard inputs on desktop)
    if (!this.isTouchDevice && this.player) {
      const speed = 300;
      let vx = 0;
      let vy = 0;

      if (this.cursors?.left.isDown || this.wasdKeys?.A.isDown) {
        vx = -speed;
      } else if (this.cursors?.right.isDown || this.wasdKeys?.D.isDown) {
        vx = speed;
      }

      if (this.cursors?.up.isDown || this.wasdKeys?.W.isDown) {
        vy = -speed;
      } else if (this.cursors?.down.isDown || this.wasdKeys?.S.isDown) {
        vy = speed;
      }

      this.player.setVelocity(vx, vy);

      // Attack check
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey!)) {
        this.executeSlash();
      }
    }

    // Destroy out of bounds bullets & update bounces
    if (this.enemyBullets) {
      this.enemyBullets.getChildren().forEach((b: any) => {
        // If bullet moves beyond top or bottom screen limits, destroy it
        if (b.y > 850 || b.y < -50) {
          b.destroy();
        }
      });
    }

    // Auto cleanup of enemies that slip by below the screen
    if (this.enemies) {
      this.enemies.getChildren().forEach((e: any) => {
        if (e.y > 850 && !e.isBoss) {
          e.destroy();
        }
      });
    }
  }

  // --- Attack / Slash Logic ---

  private executeSlash() {
    if (this.isGameOver || this.isGameClear || this.isBurstMode) return;
    if (this.slashCooldown > 0) return; // Wait for cooldown

    this.slashCooldown = this.maxSlashCooldown;
    this.isSlashActive = true;

    // Normal slash radius is 100 pixels
    const slashRadius = 100;
    const playerX = this.player!.x;
    const playerY = this.player!.y;

    // 1. Visually draw the slash circle
    this.drawSlashVisual(playerX, playerY, slashRadius);

    // Play standard slash sound
    soundSynth.playSlash();

    // 2. Perform distance-based hit check
    let targetBullets: any[] = [];
    let targetEnemies: any[] = [];

    // Outer edge check: "最先端エッジ" (Just Slash trigger zone: 90px to 100px)
    let isJustSlashTriggered = false;

    // Get all bullets in range
    if (this.enemyBullets) {
      this.enemyBullets.getChildren().forEach((bulletObj: any) => {
        const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;
        const dist = Phaser.Math.Distance.Between(playerX, playerY, bullet.x, bullet.y);
        
        if (dist <= slashRadius) {
          targetBullets.push(bullet);
          if (dist >= 88 && dist <= 102) {
            isJustSlashTriggered = true;
          }
        }
      });
    }

    // Get all enemies in range
    if (this.enemies) {
      this.enemies.getChildren().forEach((enemyObj: any) => {
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
        const dist = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);
        
        if (dist <= slashRadius) {
          targetEnemies.push(enemy);
          if (dist >= 85 && dist <= 105) { // Slightly wider window for large enemy assets
            isJustSlashTriggered = true;
          }
        }
      });
    }

    // 3. Process Slash Actions
    if (isJustSlashTriggered) {
      this.triggerJustSlashBurst();
    } else {
      // Normal Slash resolution
      targetBullets.forEach(b => {
        this.score += 50;
        this.createSparks(b.x, b.y, 0x00f0ff);
        b.destroy();
      });

      targetEnemies.forEach((e: any) => {
        this.damageEnemy(e, 25); // normal slash damage
      });

      this.slashCount += targetBullets.length + targetEnemies.length;
    }

    // Clear slash active flag after a moment
    this.time.delayedCall(150, () => {
      this.isSlashActive = false;
      if (this.slashVisualRing) {
        this.slashVisualRing.destroy();
        this.slashVisualRing = null;
      }
    });

    this.updateHudData();
  }

  // DRAW circular slash visual
  private drawSlashVisual(x: number, y: number, r: number) {
    if (this.slashVisualRing) this.slashVisualRing.destroy();

    this.slashVisualRing = this.add.graphics();
    this.slashVisualRing.setDepth(4);

    // Cyan glowing outer ring
    this.slashVisualRing.lineStyle(4, 0x00f0ff, 0.8);
    this.slashVisualRing.strokeCircle(x, y, r);

    // Semi-transparent center fill
    this.slashVisualRing.fillStyle(0x00f0ff, 0.1);
    this.slashVisualRing.fillCircle(x, y, r);

    // Add tween to fade out the ring
    this.tweens.add({
      targets: this.slashVisualRing,
      alpha: 0,
      scale: 1.1,
      duration: 150,
      onComplete: () => {
        if (this.slashVisualRing) {
          this.slashVisualRing.destroy();
          this.slashVisualRing = null;
        }
      }
    });
  }

  // --- Just-Slash BURST Mode ---

  private triggerJustSlashBurst() {
    if (this.isBurstMode) return;
    this.isBurstMode = true;
    this.burstSlashCount = 0;

    // Trigger visual flash
    EventBus.emit("flash-screen");

    // Play intense chime audio
    soundSynth.playJustSlash();

    // 1. Brief game freeze frame (slow down/pause physics) to feel hits heavy
    this.physics.world.pause();
    this.cameras.main.shake(200, 0.015);
    
    // Resume physics after 120ms
    this.time.delayedCall(120, () => {
      this.physics.world.resume();
      this.startBurstContinuousSlashes();
    });
  }

  private startBurstContinuousSlashes() {
    // 3 rapid automatic circular sweeps
    this.burstTimer = this.time.addEvent({
      delay: 200,
      callback: () => {
        if (this.isGameOver || this.isGameClear || !this.player) return;

        this.burstSlashCount++;
        
        // Spawn automatic high-speed slash
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // Burst radius is wider (160 pixels)
        const burstRadius = 160;

        // Visual slash sweep (magenta neon)
        const sweep = this.add.graphics();
        sweep.setDepth(6);
        sweep.lineStyle(6, 0xff007f, 1);
        sweep.strokeCircle(playerX, playerY, burstRadius);
        sweep.fillStyle(0xff007f, 0.15);
        sweep.fillCircle(playerX, playerY, burstRadius);
        
        this.tweens.add({
          targets: sweep,
          alpha: 0,
          scale: 1.2,
          duration: 180,
          onComplete: () => sweep.destroy()
        });

        // Clear all bullets in the wider burst area
        if (this.enemyBullets) {
          this.enemyBullets.getChildren().forEach((bulletObj: any) => {
            const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;
            const dist = Phaser.Math.Distance.Between(playerX, playerY, bullet.x, bullet.y);
            
            if (dist <= burstRadius) {
              this.score += 150; // Triple score for burst clears!
              this.slashCount++;
              this.createSparks(bullet.x, bullet.y, 0xff007f);
              bullet.destroy();
            }
          });
        }

        // Damage all enemies in wide area
        if (this.enemies) {
          this.enemies.getChildren().forEach((enemyObj: any) => {
            const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
            const dist = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);
            
            if (dist <= burstRadius) {
              this.slashCount++;
              this.createSparks(enemy.x, enemy.y, 0xff007f);
              this.damageEnemy(enemy, 150); // Massive damage!
            }
          });
        }

        soundSynth.playSlash();
        this.cameras.main.shake(100, 0.008);
        this.updateHudData();

        // After 3 slashes, exit Burst mode
        if (this.burstSlashCount >= 3) {
          this.isBurstMode = false;
          this.updateHudData();
        }
      },
      callbackScope: this,
      repeat: 2 // runs 3 times total
    });
  }

  // --- Spawning System ---

  private spawnEnemyWave() {
    if (this.isGameOver || this.isGameClear || this.isBossStage) return;

    const width = this.cameras.main.width;
    
    // Spawn 2 to 4 enemies at the top
    const count = Phaser.Math.Between(2, Math.min(3 + Math.floor(this.level / 3), 5));
    for (let i = 0; i < count; i++) {
      const type = Phaser.Math.Between(1, 10) > (6 - Math.min(this.level / 2, 4)) ? "alien_medium" : "alien_easy";
      const xPos = Phaser.Math.Between(40, width - 40);
      const yPos = -50 - (i * 30);
      
      const enemy = this.enemies!.create(xPos, yPos, type) as any;
      enemy.setDepth(3);
      enemy.isBoss = false;
      enemy.enemyType = type;

      // Scale enemy to fit exactly 40px (easy) or 52px (medium) width
      const targetSize = type === "alien_easy" ? 40 : 52;
      const enemyScale = targetSize / enemy.width;
      enemy.setScale(enemyScale);
      enemy.body?.setSize(enemy.width * 0.7, enemy.height * 0.7);

      // Stats based on level
      if (type === "alien_easy") {
        enemy.hp = 10 + (this.level * 8);
        enemy.maxHp = enemy.hp;
        // Move straight down
        enemy.setVelocityY(80 + (this.level * 15));
      } else {
        enemy.hp = 25 + (this.level * 15);
        enemy.maxHp = enemy.hp;
        // Diagonal slow movement
        enemy.setVelocityY(50 + (this.level * 10));
        enemy.setVelocityX(Phaser.Math.Between(-30, 30));
        enemy.setCollideWorldBounds(true);
        enemy.setBounce(1, 0); // bounce off walls
      }

      // Add a firing timer for this enemy
      this.time.addEvent({
        delay: Phaser.Math.Between(1500, 3500 - (this.level * 150)),
        callback: () => {
          if (enemy.active && !this.isGameOver) {
            this.enemyShoot(enemy);
          }
        },
        callbackScope: this,
        loop: true
      });
    }
  }

  private enemyShoot(enemy: any) {
    if (!enemy.active || this.isGameOver || this.isGameClear) return;

    const bSpeed = this.bulletSpeed;
    const px = this.player ? this.player.x : 240;
    const py = this.player ? this.player.y : 700;

    if (enemy.enemyType === "alien_easy") {
      // Straight shot at player
      const bullet = this.enemyBullets!.create(enemy.x, enemy.y, "player_laser");
      bullet.setTint(0xa200ff); // Purple
      bullet.setDepth(2);
      this.physics.moveTo(bullet, px, py, bSpeed);
      bullet.setCollideWorldBounds(true);
      bullet.setBounce(1, 0);
    } else {
      // 2-Way spread shot
      for (let i = -1; i <= 1; i += 2) {
        const bullet = this.enemyBullets!.create(enemy.x, enemy.y, "player_laser");
        bullet.setTint(0xff007f); // Magenta
        bullet.setDepth(2);
        
        // Calculate angle to player and add offset
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, px, py) + (i * 0.25);
        bullet.setVelocity(Math.cos(angle) * bSpeed, Math.sin(angle) * bSpeed);
        bullet.setCollideWorldBounds(true);
        bullet.setBounce(1, 0);
      }
    }
  }

  private spawnMidBoss() {
    this.isBossStage = true;
    const width = this.cameras.main.width;

    this.activeBoss = this.physics.add.sprite(width / 2, -100, "boss");
    this.activeBoss.isBoss = true;
    this.activeBoss.setDepth(4);
    this.activeBoss.setCollideWorldBounds(true);
    this.activeBoss.setBounce(1, 0);
    
    // Scale boss to fit exactly 110px width
    const bossScale = 110 / this.activeBoss.width;
    this.activeBoss.setScale(bossScale);
    this.activeBoss.body?.setSize(this.activeBoss.width * 0.75, this.activeBoss.height * 0.75);

    // HP Scaling
    this.maxBossHp = 1000 + (this.level * 400);
    this.bossHp = this.maxBossHp;

    // Tween boss onto the screen
    this.tweens.add({
      targets: this.activeBoss,
      y: 180,
      duration: 2000,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (this.activeBoss && this.activeBoss.active) {
          // Patrol horizontally
          this.activeBoss.setVelocityX(100 + (this.level * 10));
          this.startBossShootPattern(true); // Mid-boss firing patterns
        }
      }
    });

    this.updateHudData();
  }

  private spawnBoss() {
    this.isBossStage = true;
    const width = this.cameras.main.width;

    // If mid boss is still alive, destroy it cleanly
    if (this.activeBoss) {
      this.bossShootTimer?.destroy();
      this.activeBoss.destroy();
    }

    this.activeBoss = this.physics.add.sprite(width / 2, -100, "boss");
    this.activeBoss.isBoss = true;
    this.activeBoss.setDepth(4);
    this.activeBoss.setCollideWorldBounds(true);
    this.activeBoss.setBounce(1, 0);
    
    // Scale boss to fit exactly 175px width
    const bossScale = 175 / this.activeBoss.width;
    this.activeBoss.setScale(bossScale);
    this.activeBoss.body?.setSize(this.activeBoss.width * 0.8, this.activeBoss.height * 0.8);

    // HP Scaling
    this.maxBossHp = 2500 + (this.level * 800);
    this.bossHp = this.maxBossHp;

    // Tween boss onto the screen
    this.tweens.add({
      targets: this.activeBoss,
      y: 200,
      duration: 2500,
      ease: "Back.easeOut",
      onComplete: () => {
        if (this.activeBoss && this.activeBoss.active) {
          // Fast patrol
          this.activeBoss.setVelocityX(140 + (this.level * 15));
          this.startBossShootPattern(false); // Final boss intense patterns
        }
      }
    });

    this.updateHudData();
  }

  private startBossShootPattern(isMidBoss: boolean) {
    if (this.bossShootTimer) this.bossShootTimer.destroy();

    const fireInterval = Math.max(1200 - (this.level * 80), 400);

    this.bossShootTimer = this.time.addEvent({
      delay: fireInterval,
      callback: () => {
        if (!this.activeBoss || !this.activeBoss.active || this.isGameOver) return;

        const bx = this.activeBoss.x;
        const by = this.activeBoss.y;
        const px = this.player ? this.player.x : 240;
        const py = this.player ? this.player.y : 700;

        if (isMidBoss) {
          // MID BOSS SHOOT PATTERNS
          // Level 1-4: 3-way fan towards player
          // Level 5+: 5-way fan
          const ways = this.level >= 5 ? 5 : 3;
          const spreadAngle = 0.2; // angle between bullets
          const baseAngle = Phaser.Math.Angle.Between(bx, by, px, py);

          for (let i = 0; i < ways; i++) {
            const bullet = this.enemyBullets!.create(bx, by, "player_laser");
            bullet.setTint(0x00f0ff); // Cyan
            bullet.setDepth(2);
            
            const offset = (i - (ways - 1) / 2) * spreadAngle;
            const angle = baseAngle + offset;

            bullet.setVelocity(Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed);
            bullet.setCollideWorldBounds(true);
            bullet.setBounce(1, 0);
          }
        } else {
          // FINAL BOSS SHOOT PATTERNS
          // Level 1-4: 360-degree radial blast (12 bullets)
          // Level 5-8: Spiral waves
          // Level 9+: High density 360-degree blast (24 bullets) + bouncing
          if (this.level >= 7) {
            // Spiral Pattern
            const count = 18;
            const time = this.time.now / 1000;
            for (let i = 0; i < count; i++) {
              const bullet = this.enemyBullets!.create(bx, by, "player_laser");
              bullet.setTint(0xff007f);
              bullet.setDepth(2);
              
              const angle = (i * (Math.PI * 2 / count)) + (time * 1.5);
              bullet.setVelocity(Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed);
              bullet.setCollideWorldBounds(true);
              bullet.setBounce(1, 0);
            }
          } else {
            // Full 360 Degree Blast
            const count = 8 + (this.level * 2);
            for (let i = 0; i < count; i++) {
              const bullet = this.enemyBullets!.create(bx, by, "player_laser");
              bullet.setTint(0xa200ff);
              bullet.setDepth(2);
              
              const angle = i * (Math.PI * 2 / count);
              bullet.setVelocity(Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed);
              bullet.setCollideWorldBounds(true);
              bullet.setBounce(1, 0);
            }
          }
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  // --- Collision Handlers ---

  private handleBulletPlayerCollision(player: any, bullet: any) {
    if (this.isBurstMode || this.isGameOver || this.isGameClear) return;
    
    // Destroy the bullet
    bullet.destroy();

    // Damage player
    this.playerHp -= 10 + (this.level * 1.5);
    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.triggerGameOver();
    } else {
      soundSynth.playPlayerHit();
      // Flicker player to represent damage
      this.tweens.add({
        targets: this.player,
        alpha: 0.2,
        duration: 80,
        yoyo: true,
        repeat: 2
      });
    }

    this.updateHudData();
  }

  private handleEnemyPlayerCollision(player: any, enemy: any) {
    if (enemy.isBoss) return; // Boss collision is ignored, only bullets damage
    if (this.isBurstMode || this.isGameOver || this.isGameClear) return;

    // Destroy enemy
    this.createSparks(enemy.x, enemy.y, 0xff007f);
    enemy.destroy();

    // Heavy damage for crashing into enemies
    this.playerHp -= 25;
    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.triggerGameOver();
    } else {
      soundSynth.playPlayerHit();
      this.cameras.main.shake(150, 0.01);
      this.tweens.add({
        targets: this.player,
        alpha: 0.2,
        duration: 80,
        yoyo: true,
        repeat: 3
      });
    }

    this.updateHudData();
  }

  private damageEnemy(enemy: any, dmg: number) {
    if (!enemy.active) return;
    enemy.hp -= dmg;
    
    // Visual flash on hit
    this.tweens.add({
      targets: enemy,
      tint: 0xffffff,
      duration: 50,
      yoyo: true,
      repeat: 0
    });

    if (enemy.hp <= 0) {
      this.createSparks(enemy.x, enemy.y, 0x00f0ff);
      soundSynth.playEnemyExplode();

      if (enemy.isBoss) {
        this.handleBossDefeat();
      } else {
        this.score += enemy.enemyType === "alien_medium" ? 300 : 100;
        enemy.destroy();
      }
    }
  }

  private handleBossDefeat() {
    if (!this.activeBoss) return;

    soundSynth.playBossExplode();
    this.cameras.main.shake(1000, 0.02);

    // Stop boss shoot loop
    if (this.bossShootTimer) {
      this.bossShootTimer.destroy();
      this.bossShootTimer = null;
    }

    this.activeBoss.setVelocity(0, 0);

    // Epic boss explosion sequence
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(i * 120, () => {
        if (this.activeBoss) {
          const rx = this.activeBoss.x + Phaser.Math.Between(-50, 50);
          const ry = this.activeBoss.y + Phaser.Math.Between(-50, 50);
          this.createSparks(rx, ry, i % 2 === 0 ? 0xff007f : 0x00f0ff);
        }
      });
    }

    // Tween scale down to 0 and transit
    this.tweens.add({
      targets: this.activeBoss,
      scale: 0,
      angle: 720,
      alpha: 0,
      duration: 1500,
      onComplete: () => {
        this.activeBoss?.destroy();
        this.activeBoss = null;
        
        // Final boss defeat triggers Game Clear
        // Mid boss defeat returns game to normal spawning waves
        if (this.timeRemaining <= 30) {
          this.triggerGameClear();
        } else {
          // Mid boss defeated, clear flag and resume waves
          this.isBossStage = false;
          this.score += 2000; // Bonus for mid boss
        }
        this.updateHudData();
      }
    });
  }

  // --- Game Ends ---

  private triggerGameOver() {
    if (this.isGameOver || this.isGameClear) return;
    this.isGameOver = true;
    
    // Stop systems
    soundSynth.stopBGM();
    if (this.enemySpawnTimer) this.enemySpawnTimer.destroy();
    if (this.bossShootTimer) this.bossShootTimer.destroy();
    
    if (this.player) {
      this.createSparks(this.player.x, this.player.y, 0xff0000);
      this.player.destroy();
      this.player = null;
    }

    // Push Result to React
    EventBus.emit("game-over", {
      score: this.score,
      slashCount: this.slashCount,
      time: 120 - this.timeRemaining
    });
  }

  private triggerGameClear() {
    if (this.isGameOver || this.isGameClear) return;
    this.isGameClear = true;

    soundSynth.stopBGM();
    if (this.enemySpawnTimer) this.enemySpawnTimer.destroy();
    if (this.bossShootTimer) this.bossShootTimer.destroy();

    // Score calculations
    // Quick clear bonus: add time remaining * 100
    const timeBonus = this.timeRemaining * 150;
    this.score += timeBonus;

    // Push Result to React
    EventBus.emit("game-clear", {
      score: this.score,
      slashCount: this.slashCount,
      time: 120 - this.timeRemaining
    });
  }

  // --- HUD Updates ---

  private updateHudData() {
    EventBus.emit("hud-update", {
      hp: this.playerHp,
      maxHp: this.maxPlayerHp,
      score: this.score,
      slashCount: this.slashCount,
      timeRemaining: this.timeRemaining,
      bossHp: this.activeBoss && this.activeBoss.active ? this.bossHp : null,
      maxBossHp: this.activeBoss && this.activeBoss.active ? this.maxBossHp : null,
      slashCooldown: this.slashCooldown > 0 ? this.slashCooldown / this.maxSlashCooldown : 0,
      burstProgress: this.isBurstMode ? (3 - this.burstSlashCount) / 3 : 0
    });
  }

  // --- Visuals helper ---

  private createSparks(x: number, y: number, color: number) {
    const particles = this.add.particles(x, y, "spark", {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      blendMode: "ADD",
      lifespan: 400,
      maxParticles: 15,
      tint: color,
    });
    particles.setDepth(6);
  }
}
