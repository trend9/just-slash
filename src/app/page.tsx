"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { soundSynth } from "../game/SoundSynth";
import { EventBus } from "../game/EventBus";

// Import GameContainer with SSR disabled to prevent Server-Side Phaser errors
const GameContainer = dynamic(() => import("../components/GameContainer"), {
  ssr: false,
});

type GameState = "TITLE" | "PLAYING" | "GAME_OVER" | "GAME_CLEAR";

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("TITLE");
  const [level, setLevel] = useState<number>(1);
  const [muted, setMuted] = useState<boolean>(false);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // HUD values
  const [hud, setHud] = useState({
    hp: 100,
    maxHp: 100,
    score: 0,
    slashCount: 0,
    timeRemaining: 120,
    bossHp: null as number | null,
    maxBossHp: null as number | null,
    slashCooldown: 0,
    burstProgress: 0,
  });

  // Results values
  const [results, setResults] = useState({
    score: 0,
    slashCount: 0,
    time: 0,
  });

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const isTouch =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
      setIsMobile(!!isTouch);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLevelSelect = (lvl: number) => {
    soundSynth.resume();
    setLevel(lvl);
  };

  const handleStartGame = () => {
    soundSynth.resume();
    setHud({
      hp: 100,
      maxHp: 100,
      score: 0,
      slashCount: 0,
      timeRemaining: 120,
      bossHp: null,
      maxBossHp: null,
      slashCooldown: 0,
      burstProgress: 0,
    });
    setGameState("PLAYING");
  };

  const handleGameOver = (score: number, slashCount: number, time: number) => {
    setResults({ score, slashCount, time });
    setGameState("GAME_OVER");
  };

  const handleGameClear = (score: number, slashCount: number, time: number) => {
    setResults({ score, slashCount, time });
    setGameState("GAME_CLEAR");
  };

  const handleUpdateHud = (data: typeof hud) => {
    setHud(data);
  };

  const handleFlashScreen = () => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 300);
  };

  const toggleMute = () => {
    const nextMute = !muted;
    setMuted(nextMute);
    soundSynth.setMute(nextMute);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const triggerMobileSlash = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    EventBus.emit("trigger-slash-btn");
  };

  // Social sharing logic
  const getShareText = (isClear: boolean) => {
    const timeStr = formatTime(results.time);
    const scoreFormatted = results.score.toLocaleString();
    const statusText = isClear ? "GAME CLEAR" : "GAME OVER";
    return `宇宙人をジャストソードで切り刻んだ！
【JUST SLASH BURST】
難易度: レベル${level} (${statusText})
⏱ タイム: ${timeStr} / ⚔️ 斬ゲージ: ${scoreFormatted} pts
#JustSlashBurst `;
  };

  const handleShareX = (isClear: boolean) => {
    const shareText = getShareText(isClear);
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, "_blank");
  };

  const handleShareThreads = (isClear: boolean) => {
    const shareText = getShareText(isClear);
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const threadsUrl = `https://threads.net/intent/post?text=${encodeURIComponent(shareText + " " + url)}`;
    window.open(threadsUrl, "_blank");
  };

  return (
    <main className="arcade-container">
      {/* Scanline Overlay for retro vibe */}
      <div className="scanlines" />
      
      {/* Flash overlay for burst slash */}
      <div className={`flash-overlay ${flashActive ? "active" : ""}`} />

      {/* --- Mute Button (Top Right corner inside arcade container) --- */}
      <button
        onClick={toggleMute}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 100,
          background: "rgba(11, 5, 18, 0.6)",
          border: "1px solid var(--neon-purple)",
          color: muted ? "var(--neon-magenta)" : "var(--neon-cyan)",
          padding: "8px",
          borderRadius: "50%",
          width: "38px",
          height: "38px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 0 10px rgba(162, 0, 255, 0.3)",
          fontFamily: "var(--font-game)",
          fontSize: "12px",
        }}
      >
        {muted ? "🔇" : "🔊"}
      </button>

      {/* --- TITLE STATE --- */}
      {gameState === "TITLE" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            height: "100%",
            textAlign: "center",
            zIndex: 15,
            overflowY: "auto",
          }}
        >
          {/* Main Title Banner */}
          <h1
            className="glowing-text-magenta"
            style={{
              fontFamily: "var(--font-game)",
              fontSize: "36px",
              fontWeight: 900,
              letterSpacing: "3px",
              lineHeight: 1.2,
              marginBottom: "8px",
              textTransform: "uppercase",
            }}
          >
            JUST SLASH
          </h1>
          <h2
            className="glowing-text-cyan"
            style={{
              fontFamily: "var(--font-game)",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "6px",
              marginBottom: "28px",
              textTransform: "uppercase",
            }}
          >
            BURST
          </h2>

          {/* Level Selector */}
          <div
            className="glass-panel"
            style={{
              width: "100%",
              padding: "16px",
              marginBottom: "28px",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-game)",
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "12px",
                letterSpacing: "1px",
              }}
            >
              SELECT DIFFICULTY LEVEL
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "8px",
              }}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => {
                const isSelected = level === lvl;
                let lvlColor = "var(--neon-cyan)";
                if (lvl > 3) lvlColor = "var(--neon-purple)";
                if (lvl > 6) lvlColor = "var(--neon-magenta)";
                if (lvl === 10) lvlColor = "#ff0000";

                return (
                  <button
                    key={lvl}
                    onClick={() => handleLevelSelect(lvl)}
                    style={{
                      aspectRatio: "1/1",
                      background: isSelected
                        ? lvlColor
                        : "rgba(22, 11, 38, 0.4)",
                      border: `1.5px solid ${isSelected ? lvlColor : "rgba(162, 0, 255, 0.3)"}`,
                      color: isSelected ? "#050208" : "var(--text-primary)",
                      borderRadius: "6px",
                      fontFamily: "var(--font-game)",
                      fontWeight: "bold",
                      fontSize: "16px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      boxShadow: isSelected
                        ? `0 0 15px ${lvlColor}`
                        : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
            
            {/* Level difficulty tag */}
            <div style={{ marginTop: "12px", fontSize: "14px", fontWeight: "bold" }}>
              {level <= 3 && <span className="glowing-text-cyan">LEVEL {level}: EASY TRAINEE</span>}
              {level > 3 && level <= 6 && <span className="glowing-text-purple">LEVEL {level}: MODERATE SHOOTER</span>}
              {level > 6 && level <= 9 && <span className="glowing-text-magenta">LEVEL {level}: ULTRA BULLET HELL</span>}
              {level === 10 && <span style={{ color: "#ff0000", textShadow: "0 0 10px #ff0000" }}>LEVEL 10: COSMIC APOCALYPSE</span>}
            </div>
          </div>

          {/* Instructions */}
          <div
            className="glass-panel"
            style={{
              width: "100%",
              padding: "16px",
              textAlign: "left",
              fontSize: "13px",
              lineHeight: 1.5,
              color: "var(--text-secondary)",
              marginBottom: "32px",
            }}
          >
            <p
              className="glowing-text-cyan"
              style={{
                fontFamily: "var(--font-game)",
                marginBottom: "6px",
                fontWeight: "bold",
              }}
            >
              MISSION CONTROLS:
            </p>
            {isMobile ? (
              <ul style={{ paddingLeft: "16px", marginBottom: "10px" }}>
                <li>Drag anywhere to slide your cute ship.</li>
                <li>Tap the <strong style={{color: "var(--neon-magenta)"}}>SLASH</strong> button in the bottom-right corner.</li>
              </ul>
            ) : (
              <ul style={{ paddingLeft: "16px", marginBottom: "10px" }}>
                <li>Move: <strong style={{color: "var(--neon-cyan)"}}>W / A / S / D</strong> or <strong style={{color: "var(--neon-cyan)"}}>ARROW KEYS</strong></li>
                <li>Laser Sword: <strong style={{color: "var(--neon-magenta)"}}>SPACEBAR</strong></li>
              </ul>
            )}

            <p
              className="glowing-text-magenta"
              style={{
                fontFamily: "var(--font-game)",
                marginTop: "10px",
                marginBottom: "4px",
                fontWeight: "bold",
              }}
            >
              BURST MECHANIC:
            </p>
            <p>
              Slash bullets exactly with the <strong style={{color: "white"}}>outermost edge</strong> of your circular sword area. Triggering a <strong>JUST SLASH</strong> grants invulnerability and launches <strong>3 automatic ultra-fast mega cuts</strong>!
            </p>
          </div>

          {/* Play Button */}
          <button className="btn-cyber" onClick={handleStartGame}>
            LAUNCH MISSION
          </button>
        </div>
      )}

      {/* --- PLAYING STATE --- */}
      {gameState === "PLAYING" && (
        <div style={{ position: "relative", width: "100%", height: "100%", zIndex: 12 }}>
          {/* Dynamic Phaser game wrapper */}
          <GameContainer
            level={level}
            onGameOver={handleGameOver}
            onGameClear={handleGameClear}
            onUpdateHud={handleUpdateHud}
            onFlashScreen={handleFlashScreen}
          />

          {/* HUD Overlay (No-pointer events to let clicks reach Phaser, except buttons) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "16px",
            }}
          >
            {/* Top HUD Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                width: "100%",
              }}
            >
              {/* HP & LEVEL info */}
              <div
                className="glass-panel"
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  width: "170px",
                  pointerEvents: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    fontFamily: "var(--font-game)",
                    marginBottom: "4px",
                  }}
                >
                  <span className="glowing-text-cyan">HP</span>
                  <span>{Math.round(hud.hp)} / {hud.maxHp}</span>
                </div>
                {/* HP BAR Container */}
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    border: "1px solid rgba(162, 0, 255, 0.4)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(hud.hp / hud.maxHp) * 100}%`,
                      background: hud.hp > 30 ? "var(--neon-cyan)" : "var(--neon-magenta)",
                      boxShadow: hud.hp > 30 ? "0 0 10px var(--neon-cyan)" : "0 0 10px var(--neon-magenta)",
                      transition: "width 0.1s ease-out",
                    }}
                  />
                </div>
                {/* Level Display */}
                <div
                  style={{
                    fontFamily: "var(--font-game)",
                    fontSize: "12px",
                    marginTop: "6px",
                    color: "var(--text-secondary)",
                  }}
                >
                  LEVEL: <span style={{ color: "white", fontWeight: "bold" }}>{level}</span>
                </div>
              </div>

              {/* SCORE & TIME */}
              <div
                className="glass-panel"
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  width: "160px",
                  pointerEvents: "auto",
                  marginRight: "44px", // Keep space for mute button
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-game)",
                    fontSize: "10px",
                    color: "var(--text-secondary)",
                    letterSpacing: "1px",
                  }}
                >
                  SCORE
                </div>
                <div
                  className="glowing-text-magenta"
                  style={{
                    fontFamily: "var(--font-game)",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  {hud.score.toLocaleString()}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-game)",
                    fontSize: "12px",
                    marginTop: "4px",
                    color: hud.timeRemaining < 15 ? "var(--neon-magenta)" : "white",
                  }}
                >
                  ⏱ {formatTime(hud.timeRemaining)}
                </div>
              </div>
            </div>

            {/* Boss HP Bar Overlay (Center-top, appears dynamically) */}
            {hud.bossHp !== null && hud.maxBossHp !== null && (
              <div
                className="glass-panel"
                style={{
                  position: "absolute",
                  top: "92px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "80%",
                  padding: "8px 12px",
                  pointerEvents: "auto",
                  display: "flex",
                  flexDirection: "column",
                  border: "1.5px solid var(--neon-magenta)",
                  boxShadow: "0 0 15px rgba(255, 0, 127, 0.3)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    fontFamily: "var(--font-game)",
                    color: "var(--neon-magenta)",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    letterSpacing: "1px",
                  }}
                >
                  <span>⚠️ BOSS WARNING ⚠️</span>
                  <span>{hud.bossHp} / {hud.maxBossHp}</span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "10px",
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: "5px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(hud.bossHp / hud.maxBossHp) * 100}%`,
                      background: "linear-gradient(90deg, #ff0055, #ff0000)",
                      boxShadow: "0 0 8px #ff0000",
                      transition: "width 0.05s linear",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Bottom HUD Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                width: "100%",
              }}
            >
              {/* Stats: Slashed items count */}
              <div
                className="glass-panel"
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  pointerEvents: "auto",
                  width: "140px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-game)",
                    fontSize: "9px",
                    color: "var(--text-secondary)",
                  }}
                >
                  ⚔️ SLASH GAUGE
                </span>
                <span
                  className="glowing-text-cyan"
                  style={{
                    fontFamily: "var(--font-game)",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  {hud.slashCount.toLocaleString()} pts
                </span>
              </div>

              {/* Abort button / Back to Title */}
              <button
                className="btn-cyber btn-cyber-sec"
                onClick={() => {
                  soundSynth.stopBGM();
                  setGameState("TITLE");
                }}
                style={{
                  pointerEvents: "auto",
                  padding: "8px 14px",
                  fontSize: "10px",
                  letterSpacing: "1px",
                }}
              >
                ABORT
              </button>

              {/* Mobile Trigger Button (ONLY visible on mobile, positioned in bottom right) */}
              {isMobile && (
                <button
                  onTouchStart={triggerMobileSlash}
                  onMouseDown={triggerMobileSlash}
                  style={{
                    pointerEvents: "auto",
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, var(--neon-magenta), var(--neon-purple))",
                    border: "3px solid white",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "16px",
                    fontFamily: "var(--font-game)",
                    boxShadow: "0 0 20px rgba(255, 0, 127, 0.8)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    transition: "transform 0.1s ease",
                    transform: hud.slashCooldown > 0 ? "scale(0.85)" : "scale(1)",
                    opacity: hud.slashCooldown > 0 ? 0.6 : 1,
                  }}
                >
                  {hud.slashCooldown > 0 ? "CD" : "SLASH"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- RESULT STATES (GAME OVER / GAME CLEAR) --- */}
      {(gameState === "GAME_OVER" || gameState === "GAME_CLEAR") && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            height: "100%",
            zIndex: 15,
          }}
        >
          {/* Heading */}
          {gameState === "GAME_CLEAR" ? (
            <h1
              className="glowing-text-cyan"
              style={{
                fontFamily: "var(--font-game)",
                fontSize: "36px",
                fontWeight: 900,
                letterSpacing: "4px",
                marginBottom: "24px",
                textTransform: "uppercase",
              }}
            >
              MISSION CLEAR
            </h1>
          ) : (
            <h1
              className="glowing-text-magenta"
              style={{
                fontFamily: "var(--font-game)",
                fontSize: "36px",
                fontWeight: 900,
                letterSpacing: "4px",
                marginBottom: "24px",
                textTransform: "uppercase",
              }}
            >
              GAME OVER
            </h1>
          )}

          {/* Statistics Box */}
          <div
            className="glass-panel"
            style={{
              width: "100%",
              padding: "24px",
              marginBottom: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Selected Level:</span>
              <strong style={{ fontSize: "16px", color: "white" }}>Lv. {level}</strong>
            </div>

            <div style={{ height: "1px", background: "rgba(162, 0, 255, 0.2)" }} />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Clear Time:</span>
              <strong style={{ fontSize: "16px", color: "var(--neon-cyan)" }}>
                {formatTime(results.time)}
              </strong>
            </div>

            <div style={{ height: "1px", background: "rgba(162, 0, 255, 0.2)" }} />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Slash Gauge:</span>
              <strong style={{ fontSize: "16px", color: "var(--neon-purple)" }}>
                {results.slashCount.toLocaleString()} pts
              </strong>
            </div>

            <div style={{ height: "1px", background: "rgba(162, 0, 255, 0.2)" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "bold" }}>FINAL SCORE:</span>
              <strong
                className="glowing-text-magenta"
                style={{ fontSize: "24px", fontFamily: "var(--font-game)", fontWeight: "bold" }}
              >
                {results.score.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Social Share Actions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "100%",
              marginBottom: "32px",
              alignItems: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-game)",
                fontSize: "11px",
                color: "var(--text-secondary)",
                letterSpacing: "1px",
              }}
            >
              SHARE YOUR PERFORMANCE
            </p>
            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <button
                className="btn-cyber btn-cyber-sec"
                onClick={() => handleShareX(gameState === "GAME_CLEAR")}
                style={{ flex: 1, padding: "10px 0", fontSize: "11px" }}
              >
                𝕏 Share
              </button>
              <button
                className="btn-cyber btn-cyber-sec"
                onClick={() => handleShareThreads(gameState === "GAME_CLEAR")}
                style={{ flex: 1, padding: "10px 0", fontSize: "11px" }}
              >
                Threads Share
              </button>
            </div>
          </div>

          {/* Replay Actions */}
          <div style={{ display: "flex", gap: "16px", width: "100%" }}>
            <button
              className="btn-cyber btn-cyber-sec"
              onClick={() => setGameState("TITLE")}
              style={{ flex: 1 }}
            >
              TITLE
            </button>
            <button
              className="btn-cyber"
              onClick={handleStartGame}
              style={{ flex: 1.3 }}
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
