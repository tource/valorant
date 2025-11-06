import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import "./AppStyles.css";
import KakaoAdFit from "./components/KakaoAdFit";
import KakaoAdFit2 from "./components/KakaoAdFit2";
import KakaoAdFit3 from "./components/KakaoAdFit3";

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
  const [failTime, setFailTime] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const bombTimerRef = useRef<number | null>(null);
  const timeLeftRef = useRef(timeLeft);

  const spikeImage = "/images/spike.gif";

  // 🔊 오디오 객체는 마운트 시 한 번만 생성하도록 lazy init
  const plantAudioRef = useRef<HTMLAudioElement | null>(null);
  const defuseAudioRef = useRef<HTMLAudioElement | null>(null);
  const boomAudioRef = useRef<HTMLAudioElement | null>(null);

  const spikeRef = useRef<HTMLDivElement | null>(null);

  // 컴포넌트 마운트 시 오디오 생성(한 번만 실행)
  useEffect(() => {
    plantAudioRef.current = new Audio("/sounds/설치.mp3");

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
    if (status === "폭발") {
      boomAudioRef.current = new Audio("/sounds/터짐.mp3");
      if (boomAudioRef.current) {
        boomAudioRef.current.volume = volume;
        boomAudioRef.current.play().catch(() => {});
      }
    }
    return () => {
      if (boomAudioRef.current) {
        boomAudioRef.current.pause();
        boomAudioRef.current.currentTime = 0;
      }
    };
  }, [status, volume]);

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
    if (boomAudioRef.current) boomAudioRef.current.volume = volume;
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
          // 해체 중이었다면 부족한 시간 계산
          if (isHolding) {
            const remainingDefuseTime =
              TOTAL_DEFUSE - (savedProgress + holdProgress);
            const message = `스파이크 폭발! 해체까지 ${remainingDefuseTime.toFixed(
              1
            )}초 부족했습니다`;
            alert(message);
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
    if (boomAudioRef.current) {
      boomAudioRef.current.pause();
      boomAudioRef.current.currentTime = 0;
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

  const beginHold = useCallback(() => {
    if (!planted || isDefused || status === "폭발") return;
    if (isHolding) return;

    setIsHolding(true);
    setStatus("해체중");
    startTimeRef.current = Date.now();

    const defuseAudio = defuseAudioRef.current;
    if (defuseAudio) {
      defuseAudio.volume = 1;
      defuseAudio.play().catch(() => {});
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const total = savedProgress + elapsed;

      // 실시간 진행률 반영
      setHoldProgress(elapsed);

      // 🚨 폭발 여부를 ref로 실시간 감지
      if (timeLeftRef.current <= 0) {
        const totalProgress =
          savedProgress + (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(TOTAL_DEFUSE - totalProgress, 0);
        setFailTime(remaining);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (defuseAudio) defuseAudio.pause();
        setIsHolding(false);
        setStatus("폭발");
        return;
      }

      // ✅ 정상 해체 완료
      if (total >= TOTAL_DEFUSE) {
        setSavedProgress(TOTAL_DEFUSE);
        setIsDefused(true);
        setStatus("해체완료");
        setPlanted(false);

        if (plantAudioRef.current) {
          plantAudioRef.current.pause();
          plantAudioRef.current.currentTime = 0;
        }

        if (bombTimerRef.current) {
          clearInterval(bombTimerRef.current);
          bombTimerRef.current = null;
        }

        if (defuseAudio) defuseAudio.pause();

        setHoldProgress(0);
        startTimeRef.current = null;
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setIsHolding(false);
      }
    }, 10);
  }, [planted, isDefused, status, isHolding, savedProgress]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // 🧠 해체 종료
  const endHold = useCallback(() => {
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
  }, [isHolding, savedProgress]);

  const visualSeconds = Math.min(TOTAL_DEFUSE, savedProgress + holdProgress);
  const visualPercent = Math.min(100, (visualSeconds / TOTAL_DEFUSE) * 100);

  // 네이티브 터치 리스너 등록 (passive:false) - preventDefault 허용
  useEffect(() => {
    const el = spikeRef.current;
    if (!el) return;

    const onTouchStartNative = (ev: TouchEvent) => {
      ev.preventDefault();
      beginHold();
    };

    const onTouchEndNative = (ev: TouchEvent) => {
      ev.preventDefault();
      // 상태를 설치됨으로 바꾸려면 setStatus("설치됨") 호출
      setStatus("설치됨");
      endHold();
    };

    el.addEventListener("touchstart", onTouchStartNative, { passive: false });
    el.addEventListener("touchend", onTouchEndNative);
    el.addEventListener("touchcancel", onTouchEndNative);

    return () => {
      el.removeEventListener("touchstart", onTouchStartNative as EventListener);
      el.removeEventListener("touchend", onTouchEndNative as EventListener);
      el.removeEventListener("touchcancel", onTouchEndNative as EventListener);
    };
  }, [beginHold, endHold]);

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
    <>
      <div className="app-root">
        <KakaoAdFit2 />
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
              <div className="timer-controls">
                <button
                  onClick={() => {
                    setTimeLeft((prev) => {
                      const newTime = Math.max(prev - 20, 0);
                      const plantAudio = plantAudioRef.current;
                      if (plantAudio) {
                        // BOMB_TIMER 전체 시간 대비 오디오 위치 비율 계산
                        const progress = (BOMB_TIMER - newTime) / BOMB_TIMER;
                        plantAudio.currentTime = plantAudio.duration * progress;
                      }
                      return newTime;
                    });
                  }}
                  className="btn btn--danger"
                >
                  -20초
                </button>
                <button
                  onClick={() => {
                    setTimeLeft((prev) => {
                      const newTime = Math.max(prev - 5, 0);
                      const plantAudio = plantAudioRef.current;
                      if (plantAudio) {
                        // BOMB_TIMER 전체 시간 대비 오디오 위치 비율 계산
                        const progress = (BOMB_TIMER - newTime) / BOMB_TIMER;
                        plantAudio.currentTime = plantAudio.duration * progress;
                      }
                      return newTime;
                    });
                  }}
                  className="btn btn--danger"
                >
                  -5초
                </button>
              </div>
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
                  <div
                    ref={spikeRef}
                    role="img"
                    aria-label="Spike"
                    className="spike-image"
                    style={{ backgroundImage: `url(${spikeImage})` }}
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
                  />
                  <div className="spike-help">
                    스파이크를 꾹 누르고 있으면 해체됩니다
                  </div>
                </div>
              ) : status === "해체중" ? (
                <div className="state-info success">✅ 스파이크 해체 완료!</div>
              ) : status === "폭발" ? (
                <div className="state-info danger">
                  💥 스파이크 폭발!
                  {failTime !== null && (
                    <div className="fail-info">
                      ⏱️ 해체까지 {failTime.toFixed(2)}초 부족했습니다.
                    </div>
                  )}
                </div>
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
          <KakaoAdFit />
        </motion.div>
        <KakaoAdFit3 />
      </div>
    </>
  );
}
