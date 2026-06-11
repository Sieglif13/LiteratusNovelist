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
  private bgLayers: Phaser.GameObjects.TileSprite[] = [];

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

    // Load Parallax Background layers
    this.load.image('bg-back', 'assets/sprites/background/parallax-forest-back-trees.png');
    this.load.image('bg-middle', 'assets/sprites/background/parallax-forest-middle-trees.png');
    this.load.image('bg-lights', 'assets/sprites/background/parallax-forest-lights.png');
    this.load.image('bg-front', 'assets/sprites/background/parallax-forest-front-trees.png');
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

    // Store layers in an array so we can scroll them in update()
    this.bgLayers = [];
    
    // Create TileSprites for the parallax effect. We make them the size of the window.
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // We scale them up to cover the height of the screen exactly (so no vertical repeating)
    const addLayer = (key: string, scrollFactor: number) => {
      const layer = this.add.tileSprite(0, 0, width, height, key).setOrigin(0, 0);
      
      // Get the actual height of the loaded image
      const textureHeight = this.textures.get(key).getSourceImage().height;
      
      // Scale exactly to screen height
      layer.tileScaleY = height / textureHeight;
      layer.tileScaleX = layer.tileScaleY; 
      
      // Store the parallax speed factor
      layer.setData('parallaxSpeed', scrollFactor);
      this.bgLayers.push(layer);
    };

    addLayer('bg-back', 0.1);
    addLayer('bg-middle', 0.3);
    addLayer('bg-lights', 0.5);
    addLayer('bg-front', 0.8);

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

    // 1. TOUCH / MOBILE MOVEMENT
    const pointer = this.input.activePointer;
    if (pointer.isDown) {
      // Calculate distance between player and pointer
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
      
      // Only move if we are not already at the target (prevents jittering)
      if (distance > 10) {
        this.physics.moveToObject(this.player, { x: pointer.worldX, y: pointer.worldY }, speed);
        isMoving = true;
        
        // Determine direction based on velocity
        if (Math.abs(this.player.body.velocity.x) > Math.abs(this.player.body.velocity.y)) {
          currentDir = this.player.body.velocity.x < 0 ? 'left' : 'right';
        } else {
          currentDir = this.player.body.velocity.y < 0 ? 'up' : 'down';
        }
      }
    } 
    // 2. KEYBOARD MOVEMENT (Fallback for PC)
    else {
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

      // Normalize diagonal speed for keyboard
      if (isMoving) {
        this.player.body.velocity.normalize().scale(speed);
      }
    }

    // Play appropriate animation
    if (isMoving) {
      // Prioritize horizontal animation if moving diagonally
      if (this.player.body.velocity.x !== 0) {
        currentDir = this.player.body.velocity.x < 0 ? 'left' : 'right';
      }
      
      this.player.play(`run-${currentDir}`, true);
      this.player.setData('lastDir', currentDir);

      // PARALLAX EFFECT: If player is moving horizontally, scroll the backgrounds!
      if (this.bgLayers && this.player.body.velocity.x !== 0) {
        this.bgLayers.forEach((layer: Phaser.GameObjects.TileSprite) => {
          const speedFactor = layer.getData('parallaxSpeed');
          // If moving right (velocity > 0), tile position moves right
          layer.tilePositionX += (this.player.body.velocity.x * speedFactor * 0.016); // 0.016 is roughly delta time
        });
      }

    } else {
      const lastDir = this.player.getData('lastDir') || 'down';
      this.player.play(`idle-${lastDir}`, true);
    }
  }
}
