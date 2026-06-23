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

    // Dynamically generate game textures to avoid external asset dependency issues
    const drawVBullet = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 24;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Add a soft glow behind/around it
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(6, 3);
        ctx.lineTo(26, 12);
        ctx.lineTo(6, 21);
        ctx.stroke();

        // White core
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(6, 3);
        ctx.lineTo(26, 12);
        ctx.lineTo(6, 21);
        ctx.stroke();

        this.textures.addCanvas("v_bullet", canvas);
      }
    };
    drawVBullet();

    const drawSpark = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.85)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(8, 8, 8, 0, Math.PI * 2);
        ctx.fill();
        this.textures.addCanvas("spark", canvas);
      }
    };
    drawSpark();

    const drawHealItem = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 24;
      canvas.height = 24;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Outer glowing circle
        const gradient = ctx.createRadialGradient(12, 12, 4, 12, 12, 12);
        gradient.addColorStop(0, "rgba(0, 240, 100, 1)");
        gradient.addColorStop(0.6, "rgba(0, 240, 100, 0.45)");
        gradient.addColorStop(1, "rgba(0, 240, 100, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(12, 12, 12, 0, Math.PI * 2);
        ctx.fill();

        // White cross
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(12, 6);
        ctx.lineTo(12, 18);
        ctx.moveTo(6, 12);
        ctx.lineTo(18, 12);
        ctx.stroke();

        this.textures.addCanvas("heal_item", canvas);
      }
    };
    drawHealItem();

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
