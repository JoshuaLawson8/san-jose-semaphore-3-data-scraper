/** @jsxImportSource @emotion/react */

import { FC, useEffect, useState } from "react";
import { flexRow } from "../styles/cssFragments";
import { turnDelaySeconds, turnTimings } from "../utils/constants";

interface SpinningDiskProps {
  turnValue?: number | "RESET";
  ticker: boolean;
}

export const DISK_COLOR = "#f79b1b";
export const DISK_COLOR_LIGHTER = "#FFCA68";

export const SpinningDisk: FC<SpinningDiskProps> = (props) => {
  const { turnValue, ticker } = props;

  const [currentRotation, setCurrentRotation] = useState(0);
  const [transitionSeconds, setTransitionSeconds] = useState(2);
  const [fadeIn, setFadeIn] = useState(false);

  // Fade in css effect for disk initial appearance
  useEffect(() => {
    setFadeIn(true);
  }, []);

  useEffect(() => {
    if (turnValue === undefined) return;

    const handleStartSpin = () => {
      // TODO in old script, index is increased by 1

      if (turnValue === "RESET") {
        // TODO hard coding in longest reset time
        setTransitionSeconds(turnTimings[8]);
        setCurrentRotation((r) => -360);
      } else {
        setTransitionSeconds(turnTimings[Math.abs(turnValue)]);
        setCurrentRotation((r) => r + 45 * turnValue);
      }
    };

    const spinTimeout = setTimeout(handleStartSpin, turnDelaySeconds * 1000);

    // after rotation completes, reset rotation value to within 360 degrees (without animation)
    const handleResetTimeout = () => {
      setTransitionSeconds(0);
      setCurrentRotation((r) => r % 360);
    };

    const resetTimeout = setTimeout(
      handleResetTimeout,
      4000 + turnDelaySeconds * 1000
    );

    return () => {
      clearTimeout(spinTimeout);
      clearTimeout(resetTimeout);
    };
  }, [ticker, turnValue]); // important to leave ticker in here, as it triggers updates even if turnValue did not change

  return (
    <div
      css={[
        {
          width: "25%",
          height: "auto",
          opacity: fadeIn ? 1 : 0,
          transform: `rotate(${currentRotation}deg)`,
          transition: `transform ${transitionSeconds}s, opacity .5s`,
          flex: "0 1 auto",
        },
        flexRow,
      ]}
    >
      <svg width="200px" height="200px" viewBox="0 0 100 100">
        <defs>
          <filter id="blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <mask id="myMask">
          <rect width="42" height="100" fill="white" />
          <rect width="42" height="100" x="58" fill="white" />
        </mask>
        <g filter="url(#blur)">
          <circle
            r="26"
            cx="50"
            cy="50"
            fill={DISK_COLOR}
            mask="url(#myMask)"
          />
        </g>
      </svg>
    </div>
  );
};
