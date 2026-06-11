import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import Phaser from 'phaser';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-tavern',
  templateUrl: './tavern.component.html',
  styleUrls: ['./tavern.component.css']
})
export class TavernComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true }) gameContainer!: ElementRef;
  
  authService = inject(AuthService);
  private game!: Phaser.Game;

  sidebarOpen = false;

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  ngOnInit(): void {
    // Initialization logic if needed before view initializes
  }

  ngAfterViewInit(): void {
    this.initPhaser();
  }

  ngOnDestroy(): void {
    if (this.game) {
      this.game.destroy(true);
    }
  }

  private initPhaser() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: this.gameContainer.nativeElement,
        width: '100%',
        height: '100%'
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      }
    };

    this.game = new Phaser.Game(config);
    this.game.scene.add('TavernScene', TavernScene, true, { isLoggedIn: this.isLoggedIn });
  }
}

class TavernScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isLoggedIn: boolean = false;

  init(data: { isLoggedIn: boolean }) {
    this.isLoggedIn = data.isLoggedIn;
  }

  constructor() {
    super({ key: 'TavernScene' });
  }

  preload() {
    if (!this.isLoggedIn) return;

    // Load IDLE spritesheets (8 frames each, 96x80)
    this.load.spritesheet('idle_down', 'assets/sprites/you/IDLE/idle_down.png', { frameWidth: 96, frameHeight: 80 });
    this.load.spritesheet('idle_left', 'assets/sprites/you/IDLE/idle_left.png', { frameWidth: 96, frameHeight: 80 });
    this.load.spritesheet('idle_right', 'assets/sprites/you/IDLE/idle_right.png', { frameWidth: 96, frameHeight: 80 });
    this.load.spritesheet('idle_up', 'assets/sprites/you/IDLE/idle_up.png', { frameWidth: 96, frameHeight: 80 });

    // Load RUN spritesheets (8 frames each, 96x80)
    this.load.spritesheet('run_down', 'assets/sprites/you/RUN/run_down.png', { frameWidth: 96, frameHeight: 80 });
    this.load.spritesheet('run_left', 'assets/sprites/you/RUN/run_left.png', { frameWidth: 96, frameHeight: 80 });
    this.load.spritesheet('run_right', 'assets/sprites/you/RUN/run_right.png', { frameWidth: 96, frameHeight: 80 });
    this.load.spritesheet('run_up', 'assets/sprites/you/RUN/run_up.png', { frameWidth: 96, frameHeight: 80 });
  }

  create() {
    if (!this.isLoggedIn) {
      // Escena Exterior (Cerrada)
      this.cameras.main.setBackgroundColor('#0A1914');
      this.add.text(400, 300, 'La Taberna está cerrada.\nInicia sesión para entrar.', {
        font: '32px EB Garamond',
        color: '#D4AF37',
        align: 'center'
      }).setOrigin(0.5);
      return;
    }

    // Basic background (placeholder for tavern map)
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // Instruction text
    this.add.text(this.cameras.main.centerX, 100, 'Taberna (Sin mapa aún)\nUsa las flechas para moverte', {
      font: '24px EB Garamond',
      color: '#D4AF37',
      align: 'center'
    }).setOrigin(0.5);

    // --- ANIMATIONS ---
    const directions = ['down', 'left', 'right', 'up'];
    
    // Create Idle animations
    directions.forEach(dir => {
      this.anims.create({
        key: `idle-${dir}`,
        frames: this.anims.generateFrameNumbers(`idle_${dir}`, { start: 0, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    });

    // Create Run animations
    directions.forEach(dir => {
      this.anims.create({
        key: `run-${dir}`,
        frames: this.anims.generateFrameNumbers(`run_${dir}`, { start: 0, end: 7 }),
        frameRate: 12,
        repeat: -1
      });
    });

    // --- PLAYER SPRITE ---
    this.player = this.physics.add.sprite(this.cameras.main.centerX, this.cameras.main.centerY, 'idle_down');
    
    // Scale up the pixel art slightly so it's not too small
    this.player.setScale(1.5);
    
    // Set the collision box to be smaller than the 96x80 canvas (just the feet/body)
    this.player.body.setSize(22, 34); 
    this.player.body.setOffset(37, 46); // Adjust offset to center the hitbox on the sprite

    this.player.setCollideWorldBounds(true);
    this.player.play('idle-down');

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
  }

  override update() {
    if (!this.isLoggedIn || !this.cursors) return;

    const speed = 200;
    this.player.setVelocity(0);

    let isMoving = false;
    let currentDir = 'down';

    // Vertical movement
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
      currentDir = 'up';
      isMoving = true;
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
      currentDir = 'down';
      isMoving = true;
    }

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      currentDir = 'left';
      isMoving = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      currentDir = 'right';
      isMoving = true;
    }

    // Normalize diagonal speed
    this.player.body.velocity.normalize().scale(speed);

    // Play appropriate animation
    if (isMoving) {
      // Prioritize horizontal animation if moving diagonally
      if (this.player.body.velocity.x !== 0) {
        currentDir = this.player.body.velocity.x < 0 ? 'left' : 'right';
      }
      
      this.player.play(`run-${currentDir}`, true);
      // Save last direction for idle state
      this.player.setData('lastDir', currentDir);
    } else {
      const lastDir = this.player.getData('lastDir') || 'down';
      this.player.play(`idle-${lastDir}`, true);
    }
  }
}
