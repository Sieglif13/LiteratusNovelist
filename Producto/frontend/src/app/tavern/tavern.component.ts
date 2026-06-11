import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import Phaser from 'phaser';
import { AuthService } from '../core/services/auth.service';
import { MultiplayerService, PlayerPosition } from '../core/services/multiplayer.service';

@Component({
  selector: 'app-tavern',
  templateUrl: './tavern.component.html',
  styleUrls: ['./tavern.component.css']
})
export class TavernComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true }) gameContainer!: ElementRef;
  
  authService = inject(AuthService);
  multiplayerService = inject(MultiplayerService);
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
    this.game.scene.add('TavernScene', TavernScene, true, { 
      isLoggedIn: this.isLoggedIn,
      multiplayerService: this.multiplayerService,
      userId: this.authService.currentUser()?.id || 'anonymous'
    });
  }
}

class TavernScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isLoggedIn: boolean = false;
  private collisionLayer!: any;
  // Multiplayer properties
  private multiplayerService!: MultiplayerService;
  private userId!: string;
  private otherPlayers: Map<string, Phaser.Types.Physics.Arcade.SpriteWithDynamicBody> = new Map();
  private lastBroadcastTime = 0;

  init(data: { isLoggedIn: boolean, multiplayerService: MultiplayerService, userId: string }) {
    this.isLoggedIn = data.isLoggedIn;
    this.multiplayerService = data.multiplayerService;
    this.userId = data.userId;
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

    // Load Tilemap JSON and its required Tileset Images
    this.load.tilemapTiledJSON('mapa_taberna', 'assets/sprites/tavern/taberna.json');
    this.load.image('fondo', 'assets/sprites/tavern/Environment/Structures/Buildings/Floors.png');
    this.load.image('Alchemy_Table_01-Sheet', 'assets/sprites/tavern/Environment/Structures/Stations/Alchemy/Alchemy_Table_01-Sheet.png');
    this.load.image('Alchemy_Table_02-Sheet', 'assets/sprites/tavern/Environment/Structures/Stations/Alchemy/Alchemy_Table_02-Sheet.png');
    this.load.image('Alchemy_Table_03-Sheet', 'assets/sprites/tavern/Environment/Structures/Stations/Alchemy/Alchemy_Table_03-Sheet.png');
    this.load.image('Anvil', 'assets/sprites/tavern/Environment/Structures/Stations/Anvil/Anvil.png');
    this.load.image('Vegetation', 'assets/sprites/tavern/Environment/Props/Static/Vegetation.png');
    this.load.image('Dungeon_Props', 'assets/sprites/tavern/Environment/Props/Static/Dungeon_Props.png');
    this.load.image('Rocks', 'assets/sprites/tavern/Environment/Props/Static/Rocks.png');
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

    // Create the Tilemap
    const map = this.make.tilemap({ key: 'mapa_taberna' });

    // Add tilesets (must match the names inside Tiled JSON)
    const tilesets = [
      map.addTilesetImage('fondo', 'fondo'),
      map.addTilesetImage('Alchemy_Table_01-Sheet', 'Alchemy_Table_01-Sheet'),
      map.addTilesetImage('Alchemy_Table_02-Sheet', 'Alchemy_Table_02-Sheet'),
      map.addTilesetImage('Alchemy_Table_03-Sheet', 'Alchemy_Table_03-Sheet'),
      map.addTilesetImage('Anvil', 'Anvil'),
      map.addTilesetImage('Vegetation', 'Vegetation'),
      map.addTilesetImage('Dungeon_Props', 'Dungeon_Props'),
      map.addTilesetImage('Rocks', 'Rocks')
    ].filter(ts => ts !== null) as Phaser.Tilemaps.Tileset[];

    // Generate Layers
    const layer1 = map.createLayer('Capa de patrones 1', tilesets, 0, 0);
    const layer2 = map.createLayer('Capa de patrones 2', tilesets, 0, 0);

    // Scale up the map by 2 to look better on modern screens
    const mapScale = 2;
    layer1?.setScale(mapScale);
    layer2?.setScale(mapScale);

    // Enable collisions for everything placed on Layer 2
    if (layer2) {
      layer2.setCollisionByExclusion([-1]);
      this.collisionLayer = layer2;
    }

    // Set world physics and camera bounds based on scaled map size
    const mapWidth = map.widthInPixels * mapScale;
    const mapHeight = map.heightInPixels * mapScale;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

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
    // Start player in the middle of the map
    this.player = this.physics.add.sprite(mapWidth / 2, mapHeight / 2, 'idle_down');
    
    // Scale up the pixel art slightly so it's not too small
    this.player.setScale(1.5);
    
    // Set the collision box to be smaller than the 96x80 canvas (just the feet/body)
    this.player.body.setSize(22, 34); 
    this.player.body.setOffset(37, 46); // Adjust offset to center the hitbox on the sprite

    this.player.setCollideWorldBounds(true);
    
    // Add collision between player and layer 2 obstacles
    if (this.collisionLayer) {
      this.physics.add.collider(this.player, this.collisionLayer);
    }

    this.player.play('idle-down');
    
    // Make camera follow player
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Connect to multiplayer
    if (this.multiplayerService) {
      this.multiplayerService.connect(this.userId);
      
      // Listen for other players moving
      this.multiplayerService.playerMoved$.subscribe((pos: PlayerPosition) => {
        this.updateOtherPlayer(pos);
      });
    }
  }

  private updateOtherPlayer(pos: PlayerPosition) {
    let otherPlayer = this.otherPlayers.get(pos.userId);
    
    // Create sprite if it doesn't exist
    if (!otherPlayer) {
      otherPlayer = this.physics.add.sprite(pos.x, pos.y, 'idle_down');
      otherPlayer.setScale(1.5);
      otherPlayer.body.setSize(22, 34); 
      otherPlayer.body.setOffset(37, 46);
      
      // Also make other players collide with the world bounds and layer 2
      otherPlayer.setCollideWorldBounds(true);
      if (this.collisionLayer) {
        this.physics.add.collider(otherPlayer, this.collisionLayer);
      }
      
      this.otherPlayers.set(pos.userId, otherPlayer);
    }

    // Move to new position using tween for smoothness
    this.tweens.add({
      targets: otherPlayer,
      x: pos.x,
      y: pos.y,
      duration: 100, // Sync with broadcast rate
      onComplete: () => {
        // After movement, decide if they stopped (could be improved with explicit stop events)
      }
    });

    // Determine animation
    // If they are actively moving to a new spot, play RUN, otherwise IDLE
    const distance = Phaser.Math.Distance.Between(otherPlayer.x, otherPlayer.y, pos.x, pos.y);
    if (distance > 2) {
      otherPlayer.play(`run-${pos.dir}`, true);
    } else {
      otherPlayer.play(`idle-${pos.dir}`, true);
    }
  }

  override update(time: number, delta: number) {
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

      // Si se movió, actualizamos la posición del último broadcast
    } else {
      const lastDir = this.player.getData('lastDir') || 'down';
      this.player.play(`idle-${lastDir}`, true);
    }

    // BROADCAST POSITION (Throttle to ~10 times per second to save Supabase Quota)
    if (this.multiplayerService && time > this.lastBroadcastTime + 100) {
      // Only broadcast if we actually moved or changed direction
      const lastX = this.player.getData('lastX');
      const lastY = this.player.getData('lastY');
      
      if (lastX !== this.player.x || lastY !== this.player.y) {
        this.multiplayerService.broadcastPosition(this.player.x, this.player.y, currentDir);
        
        this.player.setData('lastX', this.player.x);
        this.player.setData('lastY', this.player.y);
        this.lastBroadcastTime = time;
      }
    }
  }
}
