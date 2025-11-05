import { useEffect, useRef, useState } from "react";
import "./AppStyles.css";
import { motion } from "framer-motion";

export default function ValorantSpikeSimulator() {
  const TOTAL_DEFUSE = 7;
  const CHECKPOINT = 3.5;
  const BOMB_TIMER = 45;

  const [planted, setPlanted] = useState(false);
  const [status, setStatus] = useState<
    "대기중" | "설치됨" | "해체중" | "해체완료" | "폭발"
  >("대기중");

  const [savedProgress, setSavedProgress] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isDefused, setIsDefused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [volume, setVolume] = useState(0.1); // 🔊 볼륨 상태 (0~1)
  const [showBanner, setShowBanner] = useState(true);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const bombTimerRef = useRef<number | null>(null);

  const spikeImage = "/images/spike.gif";

  // 🔊 오디오 객체는 마운트 시 한 번만 생성하도록 lazy init
  const plantAudioRef = useRef<HTMLAudioElement | null>(null);
  const defuseAudioRef = useRef<HTMLAudioElement | null>(null);

  // 컴포넌트 마운트 시 오디오 생성(한 번만 실행)
  useEffect(() => {
    plantAudioRef.current = new Audio("/sounds/plant.mp3");

    if (plantAudioRef.current) plantAudioRef.current.volume = volume;
    if (defuseAudioRef.current) defuseAudioRef.current.volume = volume;

    return () => {
      // 언마운트 시 오디오 정리
      if (plantAudioRef.current) {
        plantAudioRef.current.pause();
        plantAudioRef.current.currentTime = 0;
      }
      if (defuseAudioRef.current) {
        defuseAudioRef.current.pause();
        defuseAudioRef.current.currentTime = 0;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (savedProgress === 3.5) {
      defuseAudioRef.current = new Audio("/sounds/halfdefuse.mp3");
    } else {
      defuseAudioRef.current = new Audio("/sounds/defuse.mp3");
    }
  }, [savedProgress]);

  useEffect(() => {
    if (plantAudioRef.current) plantAudioRef.current.volume = volume;
    if (defuseAudioRef.current) defuseAudioRef.current.volume = volume;
  }, [volume]);

  // 📦 설치 (시작)
  function handleStart() {
    setPlanted(true);
    setStatus("설치됨");
    setSavedProgress(0);
    setHoldProgress(0);
    setIsDefused(false);
    setTimeLeft(BOMB_TIMER);

    // 사운드 재생(객체 존재 확인 후)
    const plantAudio = plantAudioRef.current;
    if (plantAudio) {
      plantAudio.volume = volume;
      plantAudio.currentTime = 0;
      plantAudio.play().catch(() => {});
    }

    // 폭탄 타이머 시작
    if (bombTimerRef.current) clearInterval(bombTimerRef.current);
    bombTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = Math.max(prev - 0.01, 0);
        if (newTime <= 0) {
          if (bombTimerRef.current) {
            clearInterval(bombTimerRef.current);
            bombTimerRef.current = null;
          }
          setStatus("폭발");
          setPlanted(false);
        }
        return newTime;
      });
    }, 10); // 0.01초 단위
  }

  // ♻️ 리셋
  function handleReset() {
    setPlanted(false);
    setStatus("대기중");
    setSavedProgress(0);
    setHoldProgress(0);
    setIsDefused(false);
    setTimeLeft(0);
    setShowBanner(true);

    // 사운드 멈추기
    const plantAudio = plantAudioRef.current;
    const defuseAudio = defuseAudioRef.current;
    if (plantAudio) {
      plantAudio.pause();
      plantAudio.currentTime = 0;
    }
    if (defuseAudio) {
      defuseAudio.pause();
      defuseAudio.currentTime = 0;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (bombTimerRef.current) {
      clearInterval(bombTimerRef.current);
      bombTimerRef.current = null;
    }
  }

  // 🧠 해체 시작
  const beginHold = () => {
    if (!planted || isDefused || status === "폭발") return;
    if (isHolding) return;

    setIsHolding(true);
    setStatus("해체중");
    startTimeRef.current = Date.now();

    // B. 🔊 해체 사운드 재생
    const defuseAudio = defuseAudioRef.current;
    if (defuseAudio) {
      defuseAudio.volume = 1;
      defuseAudio.play().catch(() => {});
    }

    // C. 🗑️ 기존 타이머 정리 (안전 장치)
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // D. ⏱️ 새로운 타이머 시작
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        // savedProgress는 endHold 시점에만 확정적으로 저장되므로,
        // 현재 누르고 있는 진행도와 저장된 진행도를 합산하여 총 진행도를 계산합니다.
        const total = savedProgress + elapsed;

        // 시각적 진행
        setHoldProgress(elapsed);

        // TOTAL_DEFUSE 이상이면 바로 해체 완료 처리
        if (total >= TOTAL_DEFUSE) {
          setSavedProgress(TOTAL_DEFUSE);
          setIsDefused(true);
          setStatus("해체완료");
          setPlanted(false);

          // 스파이크 사운드 중지
          const plantAudio = plantAudioRef.current;
          if (plantAudio) {
            plantAudio.pause();
            plantAudio.currentTime = 0;
          }

          // 폭탄 타이머 중지
          if (bombTimerRef.current) {
            clearInterval(bombTimerRef.current);
            bombTimerRef.current = null;
          }

          // 해체 사운드 중지 (endHold가 호출되지 않아도 여기서 중지)
          if (defuseAudio) defuseAudio.pause();

          // 상태 초기화 및 타이머 정리
          setHoldProgress(0);
          startTimeRef.current = null;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsHolding(false); // 해체 완료 후 isHolding 상태 해제
        }
      }
    }, 10); // 0.01초 단위 감지 위해 10ms
  };

  // 🧠 해체 종료
  const endHold = () => {
    if (!isHolding) return;
    setIsHolding(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      startTimeRef.current = null;
      setHoldProgress(0);

      const total = savedProgress + elapsed;

      if (total >= TOTAL_DEFUSE) {
        setSavedProgress(TOTAL_DEFUSE);
        setIsDefused(true);
        setStatus("해체완료");
        setPlanted(false);
        if (bombTimerRef.current) {
          clearInterval(bombTimerRef.current);
          bombTimerRef.current = null;
        }
      } else if (total >= CHECKPOINT) {
        setSavedProgress(CHECKPOINT);
      } else {
        setSavedProgress(0);
      }
    }
  };

  const visualSeconds = Math.min(TOTAL_DEFUSE, savedProgress + holdProgress);
  const visualPercent = Math.min(100, (visualSeconds / TOTAL_DEFUSE) * 100);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (bombTimerRef.current) {
        clearInterval(bombTimerRef.current);
        bombTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="app-root">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="app-card"
      >
        <h1 className="title">발로란트 스파이크 해체 시뮬레이터</h1>

        <div className="controls">
          <button
            onClick={handleStart}
            className="btn btn--primary"
            disabled={planted}
            style={{ background: planted ? "#9aa7ff" : "#2563eb" }}
          >
            Start (설치)
          </button>
          <button
            onClick={handleReset}
            className="btn btn--muted"
            style={{ background: "#6b7280" }}
          >
            Reset
          </button>

          {/* 볼륨 조절 */}
          <input
            className="range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />

          <div className="status">
            상태:{" "}
            <strong className="status-value">{status.toUpperCase()}</strong>
          </div>
        </div>

        {planted && showBanner && (
          <div className="banner">
            💣 폭발까지 남은 시간: {timeLeft.toFixed(2)}s
          </div>
        )}

        {planted && (
          <button
            onClick={() => setShowBanner((prev) => !prev)}
            className="btn btn--secondary"
          >
            {showBanner ? "폭발시간 가리기" : "폭발시간 보이기"}
          </button>
        )}

        {status === "해체완료" && (
          <div className="success">
            ✅ 스파이크 해체 완료! 폭발까지 남은 시간: {timeLeft.toFixed(2)}s
          </div>
        )}

        <div className="layout">
          <div className="panel">
            {planted ? (
              <div className="centered">
                <img
                  src={spikeImage}
                  alt="Spike"
                  className="spike-image"
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    beginHold();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    setStatus("설치됨");
                    endHold();
                  }}
                  onMouseLeave={(e) => {
                    e.preventDefault();
                    endHold();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    beginHold();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    endHold();
                  }}
                />
                <div className="spike-help">
                  스파이크를 꾹 누르고 있으면 해체됩니다
                </div>
              </div>
            ) : status === "해체중" ? (
              <div className="state-info success">✅ 스파이크 해체 완료!</div>
            ) : status === "폭발" ? (
              <div className="state-info danger">💥 스파이크 폭발!</div>
            ) : (
              <div className="state-info muted">
                Start를 눌러 스파이크를 설치하세요
              </div>
            )}
          </div>

          <div className="side">
            <div className="subhead">해체 진행</div>

            <div className="progress-wrapper">
              {/* 진행 바 */}
              <motion.div
                className="progress-bar"
                style={{ height: "100%" }}
                animate={{ width: `${visualPercent}%` }}
                transition={{ duration: 0.04 }}
              />

              {/* 체크포인트 경계선 */}
              {[CHECKPOINT].map((checkpoint) => {
                const leftPercent = (checkpoint / TOTAL_DEFUSE) * 100;
                return (
                  <div
                    key={checkpoint}
                    className="checkpoint-line"
                    style={{ left: `${leftPercent}%` }}
                  />
                );
              })}
            </div>

            <div className="progress-info">
              <span>{visualSeconds.toFixed(2)}s</span>
              <span>{TOTAL_DEFUSE}s</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
