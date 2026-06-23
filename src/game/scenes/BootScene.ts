import Phaser from "phaser";
import { soundSynth } from "../SoundSynth";

export default class BootScene extends Phaser.Scene {
  private targetLevel: number = 1;

  constructor() {
    super("BootScene");
  }

  init(data: { level: number }) {
    this.targetLevel = data.level || 1;
  }

  preload() {
    // Load character sprites and background
    this.load.image("player", "/assets/player.png");
    this.load.image("alien_easy", "/assets/alien_easy.png");
    this.load.image("alien_medium", "/assets/alien_medium.png");
    this.load.image("boss", "/assets/boss.png");
    this.load.image("background", "/assets/background.png");

    // Display a basic loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: "LOADING SYSTEM...",
      style: {
        font: "20px Orbitron, monospace",
        color: "#00f0ff",
      },
    });
    loadingText.setOrigin(0.5, 0.5);

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a0e2d, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 10, 320, 20);

    this.load.on("progress", (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xff007f, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 5, 300 * value, 10);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  create() {
    // Dynamically generate a simple glow particle texture for slashes
    // This avoids having to load a separate particle PNG
    const createCircleTexture = (name: string, radius: number, color: string, alpha: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = radius * 2;
      canvas.height = radius * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.fill();
        this.textures.addCanvas(name, canvas);
      }
    };

    createCircleTexture("spark", 8, "rgba(255, 255, 255, 1)", 1);
    createCircleTexture("slash_particle_cyan", 16, "rgba(0, 240, 255, 0.8)", 0.8);
    createCircleTexture("slash_particle_magenta", 16, "rgba(255, 0, 127, 0.8)", 0.8);
    createCircleTexture("player_laser", 6, "rgba(0, 240, 255, 1)", 1);

    // Initialize sound context
    soundSynth.resume();

    // Start the game scene
    this.scene.start("GameScene", { level: this.targetLevel });
  }
}
