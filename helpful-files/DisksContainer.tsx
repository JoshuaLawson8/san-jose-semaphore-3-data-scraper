/** @jsxImportSource @emotion/react */

import { FC, useEffect, useState } from "react";
import { TurnData } from "../App";
import { flexRow } from "../styles/cssFragments";
import { ipaMap } from "./AudioPlayerBuffers";
import { DISK_COLOR, SpinningDisk } from "./SpinningDisk";
import buildingImg from "../assets/building_backdrop.png";
import mullionsImg from "../assets/building_mullions.png";

interface DisksContainerProps {
  currentData?: TurnData | string;
  intervalTicker: boolean;
  upcomingTestRes: React.MutableRefObject<(number | null)[]>;
  upcomingDataRef: React.MutableRefObject<(TurnData | string)[]>;
  testRes: number | null;
  isOffline: boolean;
  isAsleep: boolean;
  secondsTilWake?: number;
}

export const DisksContainer: FC<DisksContainerProps> = (props) => {
  const {
    currentData,
    intervalTicker,
    upcomingTestRes,
    upcomingDataRef,
    testRes,
    isOffline,
    isAsleep,
    secondsTilWake = 0,
  } = props;

  const [showStats, setShowStats] = useState(false);
  const [showSimulcast, setShowSimulcast] = useState(false);
  const [countdownTicker, setCountdownTicker] = useState<number>(
    secondsTilWake || 0
  );

  // used for initial fade in animation
  useEffect(() => {
    setShowSimulcast(true);
  }, []);

  useEffect(() => {
    if (!secondsTilWake) return;

    setCountdownTicker(secondsTilWake);
    const handler = () => {
      setCountdownTicker((c) => c - 1);
    };

    const interval = setInterval(handler, 1000);

    return () => clearInterval(interval);
  }, [secondsTilWake]);

  // Also sets to undefined if it is a reset cycle
  const isResetCycle =
    Array.isArray(currentData) &&
    currentData.length > 1 &&
    currentData[1].length === 0;

  const currentDiscs =
    Array.isArray(currentData) && currentData.length > 0 && !isResetCycle
      ? currentData[0]
      : undefined;

  const currentSounds =
    Array.isArray(currentData) && currentData.length > 1 && !isResetCycle
      ? currentData[1]
      : undefined;

  const currentTurn = isResetCycle
    ? "RESET"
    : Array.isArray(currentData) && currentData.length > 1
    ? currentData[0]
    : "SLEEP";
  const currentTurnSounds = isResetCycle
    ? "RESET"
    : Array.isArray(currentData) && currentData.length > 1
    ? currentData[1]
    : "SLEEP";

  const isReady = !isAsleep && currentData && currentData.length > 0;

  const distance = countdownTicker * 1000;
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  return (
    <div
      css={{
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexFlow: "column nowrap",
      }}
    >
      <div
        css={{
          position: "relative",
          overflow: "hidden",
          width: "800px",
          height: "auto",
          maxWidth: "100%",
          pointerEvents: "none",
        }}
      >
        <div
          css={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background: isAsleep ? "rgba(0,0,0,.3)" : "transparent",
            transition: "background 2s",
          }}
        />
        <img
          css={{
            width: "100%",
            height: "auto",
            maxHeight: "100vh",
            zIndex: 0,
            pointerEvents: "none",
          }}
          src={buildingImg}
          alt="building with semaphore animation"
        />
        <img
          css={{
            width: "100%",
            height: "auto",
            maxHeight: "100vh",
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 10,
            pointerEvents: "none",
          }}
          src={mullionsImg}
          alt="overlay mullions on building"
        />
        <div
          css={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              overflow: "hidden",
              transform: "translate(.9%, -8.5%) scale(0.46)",
              zIndex: 5,
              pointerEvents: "none",
              opacity: showSimulcast && !isAsleep && !isOffline ? 0.9 : 0,
              transition: "opacity 0.7s",
            },
            flexRow,
          ]}
        >
          {!isOffline && isReady && (
            <>
              <SpinningDisk
                turnValue={currentDiscs ? currentDiscs[0] : "RESET"}
                ticker={intervalTicker}
              />
              <SpinningDisk
                turnValue={currentDiscs ? currentDiscs[1] : "RESET"}
                ticker={intervalTicker}
              />
              <SpinningDisk
                turnValue={currentDiscs ? currentDiscs[2] : "RESET"}
                ticker={intervalTicker}
              />
              <SpinningDisk
                turnValue={currentDiscs ? currentDiscs[3] : "RESET"}
                ticker={intervalTicker}
              />
            </>
          )}
        </div>
        {
          <div
            css={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                zIndex: 15,
                pointerEvents: "none",
                opacity: isAsleep || isOffline ? 0.9 : 0,
                transition: "opacity .7s",
              },
              flexRow,
            ]}
          >
            <div css={{ display: "flex", flexFlow: "column nowrap" }}>
              {isOffline && (
                <h2
                  css={{
                    fontSize: "1.75rem",
                    color: DISK_COLOR,
                    lineHeight: 1.5,
                    textAlign: "center",
                    margin: "0 20px",
                  }}
                >
                  Network connection failed, will attempt to reconnect
                </h2>
              )}
              {isAsleep && (
                <>
                  <h2
                    css={{
                      fontSize: "1.75rem",
                      color: DISK_COLOR,
                      lineHeight: 1.5,
                      textAlign: "center",
                      margin: "0 20px",
                    }}
                  >
                    Simulcast is now asleep until 8AM in San José
                  </h2>
                  <h2
                    css={{
                      fontSize: "1.75rem",
                      color: DISK_COLOR,
                      lineHeight: 1.5,
                      textAlign: "center",
                      margin: "0 20px",
                    }}
                  >{`${String(hours).padStart(2, "0")}:${String(
                    minutes
                  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}</h2>
                </>
              )}
            </div>
          </div>
        }
      </div>

      {showStats ? (
        <div css={{ position: "fixed", left: 0, top: 0, padding: "20px" }}>
          <br />
          <br />

          <p>CURRENT:</p>
          <p>
            [
            {Array.isArray(currentTurn)
              ? currentTurn.map((d) => (d * 45).toString() + "°")!.join(", ")
              : currentTurn}
            ]
          </p>
          <p>
            {Array.isArray(currentTurn)
              ? `[${currentTurn.join(", ")}]`
              : currentTurn}
          </p>
          <p>
            {Array.isArray(currentTurnSounds)
              ? ipaMap[currentTurnSounds[2]]
              : currentTurnSounds}
          </p>
          <br />

          <div css={{ opacity: 0.5 }}>
            <p>NEXT:</p>

            <p css={{ fontSize: "0.7em" }}>
              {upcomingDataRef?.current?.length > 0
                ? upcomingDataRef.current.map(
                    (d) => `[${Array.isArray(d) ? d[0].join(", ") : d}]`
                  )
                : upcomingDataRef.current}
            </p>
            <p>
              {upcomingDataRef?.current?.length > 0 &&
              Array.isArray(upcomingDataRef.current[0]) &&
              upcomingDataRef.current[0].length > 1 &&
              upcomingDataRef.current[0][1].length > 2
                ? ipaMap[upcomingDataRef.current[0][1][2]]
                : upcomingDataRef.current[0]}
            </p>

            <br />
            <p>CONTROL GROUP:</p>

            <p css={{ fontSize: "0.7em" }}>{testRes}</p>

            <p css={{ fontSize: "0.7em" }}>
              {upcomingTestRes?.current?.length > 0
                ? upcomingTestRes.current
                    .map((v) => (v === null ? "NULL" : v))
                    .join(", ")
                : null}
            </p>
          </div>
        </div>
      ) : null}

      {/* <button
        css={{ position: "absolute", bottom: 20, left: 20 }}
        onClick={() => setShowStats((s) => !s)}
      >
        Toggle Stats (DEBUG)
      </button> */}
    </div>
  );
};
