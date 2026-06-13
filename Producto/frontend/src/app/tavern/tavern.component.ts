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
      userId: this.authService.currentUser()?.id || 'anonymous',
      onSocratesInteract: () => this.openSocratesChat()
    });
  }

  // --- LOGICA DEL CHAT CON SOCRATES (MVP) ---
  isChatOpen = false;
  chatMessages: {sender: string, text: string}[] = [];
  currentMessage = '';
  isWaitingResponse = false;
  
  openSocratesChat() {
    if (!this.isChatOpen) {
      this.isChatOpen = true;
      if (this.chatMessages.length === 0) {
        this.chatMessages.push({ sender: 'Socrates', text: '¡Ho ho ho! Digo... ¡Saludos, viajero! Soy Sócrates. ¿De qué deseas conversar hoy? (Cuesta 5 💧 de Tinta)' });
        this.speakSanta('¡Ho ho ho! Saludos, viajero. Soy Sócrates. ¿De qué deseas conversar hoy?');
      }
    }
  }

  closeChat() {
    this.isChatOpen = false;
  }

  sendMessage(event?: Event) {
    if (event) event.preventDefault();
    if (!this.currentMessage.trim() || this.isWaitingResponse) return;

    // Aquí deducimos la tinta (Simulación)
    const user = this.authService.currentUser();
    // Lo ideal es llamar a un endpoint, pero simulamos aquí para el MVP.
    const cost = 5; 
    
    // Si no tiene tinta, mostraríamos un error. Asumimos que sí para el MVP.
    // this.authService.deductInk(cost) ...

    this.chatMessages.push({ sender: 'You', text: this.currentMessage });
    const userText = this.currentMessage;
    this.currentMessage = '';
    this.isWaitingResponse = true;

    // Simular llamada a la IA de Sócrates
    setTimeout(() => {
      this.isWaitingResponse = false;
      const resp = `Interesante punto sobre "${userText}". ¡Jo jo jo! La verdadera sabiduría está en reconocer la propia ignorancia... ¡y en los regalos de Navidad!`;
      this.chatMessages.push({ sender: 'Socrates', text: resp });
      this.speakSanta(resp);
      
      // Auto-scroll the chat
      setTimeout(() => {
        const chatBox = document.querySelector('.chat-messages');
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
      }, 50);
    }, 1500);
  }

  speakSanta(text: string) {
    if ('speechSynthesis' in window) {
      // Cancelar cualquier síntesis anterior
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.pitch = 0.3; // Voz grave tipo Santa
      utterance.rate = 0.85; // Habla un poco más pausado
      
      // Buscar una voz masculina profunda si es posible
      const voices = window.speechSynthesis.getVoices();
      const maleVoice = voices.find(v => v.name.includes('Google español') || v.name.includes('Microsoft Pablo') || v.lang === 'es-ES');
      if (maleVoice) utterance.voice = maleVoice;

      window.speechSynthesis.speak(utterance);
    }
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
  
  // Socrates properties
  private socrates!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private interactionPrompt!: Phaser.GameObjects.Text;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private onSocratesInteract!: () => void;
  private isNearSocrates = false;

  init(data: { isLoggedIn: boolean, multiplayerService: MultiplayerService, userId: string, onSocratesInteract: () => void }) {
    this.isLoggedIn = data.isLoggedIn;
    this.multiplayerService = data.multiplayerService;
    this.userId = data.userId;
    this.onSocratesInteract = data.onSocratesInteract;
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
    
    // Música de taberna (placeholder)
    this.load.audio('tavern_music', 'https://actions.google.com/sounds/v1/water/rain_on_roof.ogg'); // Reemplazar con MP3 real de taberna
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
    // NOTA: El usuario invirtió las capas en Tiled. 
    // "Capa de patrones 2" es el piso. "Capa de patrones 1" son los objetos.
    // En Phaser, se dibujan en el orden en que se crean, así que primero va el piso.
    const layer2 = map.createLayer('Capa de patrones 2', tilesets, 0, 0); // Piso
    const layer1 = map.createLayer('Capa de patrones 1', tilesets, 0, 0); // Objetos

    // Scale up the map by 2 to look better on modern screens
    const mapScale = 2;
    layer1?.setScale(mapScale);
    layer2?.setScale(mapScale);

    // Enable collisions for everything placed on Layer 1 (Obstacles)
    if (layer1) {
      layer1.setCollisionByExclusion([-1]);
      this.collisionLayer = layer1;
    }

    // Play Tavern Music (loop)
    try {
      const music = this.sound.add('tavern_music', { loop: true, volume: 0.3 });
      music.play();
    } catch (e) { console.error("Could not play tavern music", e); }

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
    
    // Reducimos enormemente la caja de colisión para que no existan "espacios invisibles"
    // Hacemos la caja muy pequeña (10x10) centrada en la base de los pies.
    this.player.body.setSize(10, 10); 
    this.player.body.setOffset(43, 70); 

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
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    
    // --- ADD SOCRATES NPC ---
    // Posicionamos a Sócrates cerca del centro
    this.socrates = this.physics.add.sprite(mapWidth / 2 + 100, mapHeight / 2, 'idle_down');
    this.socrates.setScale(1.5);
    this.socrates.body.setSize(16, 16);
    this.socrates.body.setOffset(40, 64);
    this.socrates.setImmovable(true);
    // Tinted red to simulate Santa's suit color
    this.socrates.setTint(0xff6666); 
    this.socrates.play('idle-down');
    if (this.collisionLayer) this.physics.add.collider(this.socrates, this.collisionLayer);
    this.physics.add.collider(this.player, this.socrates);

    // Texto de Socrates
    this.add.text(this.socrates.x, this.socrates.y - 45, 'Sócrates', {
      font: '12px Arial', color: '#ffea00', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);

    // Prompt de interacción (oculto por defecto)
    this.interactionPrompt = this.add.text(0, 0, '[ESPACIO] Charlar', {
      font: '14px EB Garamond', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 5, y: 5 }
    }).setOrigin(0.5).setVisible(false).setDepth(100);

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
      otherPlayer.body.setSize(16, 16); 
      otherPlayer.body.setOffset(40, 64);
      
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

    // Check distance to Socrates
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.socrates.x, this.socrates.y);
    if (dist < 80) {
      this.isNearSocrates = true;
      this.interactionPrompt.setPosition(this.socrates.x, this.socrates.y - 80);
      this.interactionPrompt.setVisible(true);
      
      // Press Space to chat
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        if (this.onSocratesInteract) this.onSocratesInteract();
      }
    } else {
      this.isNearSocrates = false;
      this.interactionPrompt.setVisible(false);
    }

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
