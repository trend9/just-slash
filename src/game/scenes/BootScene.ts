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
    // Process loaded sprite textures to make their solid backgrounds transparent
    // Commented out so that the user can drop in pre-transparent PNGs directly.
    // this.makeBackgroundTransparent("player", 35);
    // this.makeBackgroundTransparent("alien_easy", 35);
    // this.makeBackgroundTransparent("alien_medium", 35);
    // this.makeBackgroundTransparent("boss", 35);

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
        gradient.addColorStop(0.3, color);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)"); // Fade to white transparent to prevent WebGL black outlines
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
    createCircleTexture("player_laser", 12, "rgba(255, 255, 255, 1)", 1); // Large glowing bullet sphere, white base for custom tinting

    // Generate glowing green cross texture for HP recovery items
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Glow background circle
      ctx.fillStyle = "rgba(0, 240, 100, 0.25)";
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // Green neon cross
      ctx.fillStyle = "#00f064";
      ctx.fillRect(13, 6, 6, 20); // vertical block
      ctx.fillRect(6, 13, 20, 6); // horizontal block
      
      this.textures.addCanvas("heal_item", canvas);
    }

    // Initialize sound context
    soundSynth.resume();

    // Start the game scene
    this.scene.start("GameScene", { level: this.targetLevel });
  }

  private makeBackgroundTransparent(textureKey: string, threshold = 35) {
    const img = this.textures.get(textureKey).getSourceImage() as HTMLImageElement;
    if (!img || !img.width || !img.height) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];
      const bgA = data[3];

      // If it's already transparent, we don't need to do anything
      if (bgA < 10) return;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        if (dist < threshold) {
          data[i+3] = 0; // set alpha to 0
        }
      }
      ctx.putImageData(imgData, 0, 0);
      this.textures.remove(textureKey);
      this.textures.addCanvas(textureKey, canvas);
    } catch (e) {
      console.warn("Failed to process background transparency for texture: " + textureKey, e);
    }
  }
}
