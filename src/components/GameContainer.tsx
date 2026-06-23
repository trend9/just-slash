"use client";

import { useEffect, useRef } from "react";
import { EventBus } from "@/game/EventBus";

interface GameContainerProps {
  level: number;
  onGameOver: (score: number, slashCount: number, time: number) => void;
  onGameClear: (score: number, slashCount: number, time: number) => void;
  onUpdateHud: (hudData: {
    hp: number;
    maxHp: number;
    score: number;
    slashCount: number;
    timeRemaining: number;
    bossHp: number | null;
    maxBossHp: number | null;
    slashCooldown: number; // 0 to 1 progress
    burstProgress: number;  // 0 to 1 progress
  }) => void;
  onFlashScreen: () => void;
}

export default function GameContainer({
  level,
  onGameOver,
  onGameClear,
  onUpdateHud,
  onFlashScreen,
}: GameContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    async function initPhaser() {
      // Phaser uses window/document, dynamically import it
      const Phaser = await import("phaser");
      const { default: BootScene } = await import("@/game/scenes/BootScene");
      const { default: GameScene } = await import("@/game/scenes/GameScene");

      if (!active || !containerRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 480,
        height: 800,
        parent: containerRef.current,
        backgroundColor: "#0d0714",
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scene: [BootScene, GameScene],
      };

      // Create Phaser game instance
      const game = new Phaser.Game(config);
      gameRef.current = game;

      // Start the BootScene, passing the target level
      game.scene.start("BootScene", { level });

      // Connect EventBus listeners
      EventBus.on("game-over", (data: any) => {
        if (active) onGameOver(data.score, data.slashCount, data.time);
      });

      EventBus.on("game-clear", (data: any) => {
        if (active) onGameClear(data.score, data.slashCount, data.time);
      });

      EventBus.on("hud-update", (data: any) => {
        if (active) onUpdateHud(data);
      });

      EventBus.on("flash-screen", () => {
        if (active) onFlashScreen();
      });
    }

    initPhaser();

    return () => {
      active = false;
      EventBus.off("game-over");
      EventBus.off("game-clear");
      EventBus.off("hud-update");
      EventBus.off("flash-screen");

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [level, onGameOver, onGameClear, onUpdateHud, onFlashScreen]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    />
  );
}
