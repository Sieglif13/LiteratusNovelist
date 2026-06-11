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
    // Placeholder assets
    // this.load.image('tiles', 'assets/tavern_tiles.png');
    // this.load.tilemapTiledJSON('map', 'assets/tavern_map.json');
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

    // Basic background
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // Instruction text
    this.add.text(400, 300, 'Taberna en Construcción\nUsa las flechas para moverte', {
      font: '24px EB Garamond',
      color: '#D4AF37',
      align: 'center'
    }).setOrigin(0.5);

    // Create a placeholder player (a simple colored box)
    const graphics = this.add.graphics();
    graphics.fillStyle(0x8B0000, 1);
    graphics.fillRect(0, 0, 32, 48);
    graphics.generateTexture('player_placeholder', 32, 48);
    graphics.destroy();

    this.player = this.physics.add.sprite(400, 400, 'player_placeholder');
    this.player.setCollideWorldBounds(true);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
  }

  override update() {
    if (!this.isLoggedIn || !this.cursors) return;

    const speed = 160;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
    }
  }
}
