import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import Phaser from 'phaser';

@Component({
  selector: 'app-tavern',
  templateUrl: './tavern.component.html',
  styleUrls: ['./tavern.component.css']
})
export class TavernComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true }) gameContainer!: ElementRef;
  
  private game!: Phaser.Game;

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
      width: 800,
      height: 600,
      parent: this.gameContainer.nativeElement,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: TavernScene
    };

    this.game = new Phaser.Game(config);
  }
}

class TavernScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'TavernScene' });
  }

  preload() {
    // Placeholder assets
    // this.load.image('tiles', 'assets/tavern_tiles.png');
    // this.load.tilemapTiledJSON('map', 'assets/tavern_map.json');
  }

  create() {
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
    if (!this.cursors) return;

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
