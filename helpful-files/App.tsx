/** @jsxImportSource @emotion/react */
import React, { useCallback, useRef, useState } from "react";
import { API } from "aws-amplify";

import "./App.css";
import { useEffect } from "react";
import { AudioPlayerBuffers } from "./components/AudioPlayerBuffers";
import { DisksContainer } from "./components/DisksContainer";

const myAPI = "simulcastapi";
const path = "/getSimulcast";

const CHUNK_SIZE = 4;
const TURN_INTERVAL_SECONDS = 7.25;

interface ResponseType {
  testValuesIncreasing: (number | null)[];
  secretValues: (number[][] | string)[];
  initializeRotation: number[];
  initializeRotationTest: number[];
  secondsTilWake?: number;
}

export type TurnData = number[][];

function App() {
  const upcomingTestRes = useRef<(number | null)[]>([]);
  const [testRes, setTestRes] = useState<number | null>(-1);
  const [intervalTicker, setIntervalTicker] = useState(false);
  const upcomingDataRef = useRef<(TurnData | string)[]>([]);
  const [currentData, setCurrentData] = useState<TurnData | string>();
  const isFirstFetchRef = useRef(true);
  const [offline, setOffline] = useState(false);
  const [simulcastIsAsleep, setSimulcastIsAsleep] = useState(false);
  const [secondsTilWake, setSecondsTilWake] = useState<number>();

  const resetCurrent = useCallback(() => {
    if (!upcomingDataRef) return;

    const upcomingDataRefCopy = upcomingDataRef.current;
    const firstElement = upcomingDataRefCopy.shift();
    if (firstElement) {
      setCurrentData(firstElement);
      upcomingDataRef.current = upcomingDataRefCopy;
    }
    const upcomingTestResCopy = upcomingTestRes.current;
    const testResFirstElement = upcomingTestResCopy.shift();
    if (testResFirstElement !== undefined) {
      setTestRes(testResFirstElement);
      upcomingTestRes.current = upcomingTestResCopy;
    }
  }, [upcomingDataRef]);

  const fetchNextCycles = useCallback(async () => {
    try {
      const res: any = await API.get(myAPI, path, {
        queryStringParameters: {
          isFirstFetch: isFirstFetchRef.current,
          sleepStartHour: 0,
          sleepEndHour: 7,
          sleepStartMinute: 0,
          sleepEndMinute: 0,
        },
      });

      if (res.secondsTilWake) {
        setSimulcastIsAsleep(true);
        setSecondsTilWake(res.secondsTilWake);
        return;
      }

      upcomingTestRes.current = upcomingTestRes.current.concat(
        res.testValuesIncreasing as unknown as (number | null)[]
      );

      upcomingDataRef.current = upcomingDataRef.current.concat(
        res.secretValues as unknown as (TurnData | string)[]
      );

      if (isFirstFetchRef.current && upcomingDataRef.current[0] !== "SLEEP") {
        // First time, replace first value with the accumulated value up until and including first value
        upcomingDataRef.current[0] = [
          res.initializeRotation,
          [-1, -1, -1, -1, -1, -1],
        ];
      }

      // first time only, initialize current data too when finished fetching
      if (isFirstFetchRef.current === true) {
        resetCurrent();
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isFirstFetchRef.current) {
        isFirstFetchRef.current = false;
      }
    }
  }, [resetCurrent, isFirstFetchRef]);

  const resetData = useCallback(() => {
    upcomingTestRes.current = [];
    upcomingDataRef.current = [];
    setCurrentData([]);
    setTestRes(null);
    isFirstFetchRef.current = true;
  }, []);

  useEffect(() => {
    if (currentData === "SLEEP") {
      setSimulcastIsAsleep(true);
      resetData();
    }
  }, [currentData, resetData]);

  // Handle simulcast wake
  useEffect(() => {
    if (!secondsTilWake) return;

    const wakeHandler = () => {
      setSimulcastIsAsleep(false);
      isFirstFetchRef.current = true;
    };
    const timeout = setTimeout(wakeHandler, secondsTilWake * 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [secondsTilWake]);

  // Interval handler (handles both sequence changes and fetching next cycle of data once per sequence cycle)
  useEffect(() => {
    if (simulcastIsAsleep && secondsTilWake && secondsTilWake > 0) return;

    let counter = -1;

    const intervalHandler = () => {
      const firstRun = counter === -1;

      // fetch data for next cycle only when halfway through the current cycle
      counter = (counter + 1) % CHUNK_SIZE;

      if (counter === 0) {
        // console.log("data: FETCHING MORE");
        void fetchNextCycles();
      }

      // On every turn tick, update current data values:
      resetCurrent();

      // Boolean to mark an update, used to trigger updates in children components
      setIntervalTicker((t) => !t);
    };

    const interval = setInterval(intervalHandler, TURN_INTERVAL_SECONDS * 1000);

    intervalHandler();

    return () => clearInterval(interval);
  }, [fetchNextCycles, resetCurrent, secondsTilWake, simulcastIsAsleep]);

  // Detect offline status
  useEffect(() => {
    const onlineHandler = () => {
      setOffline(false);
    };
    const offlineHandler = () => {
      setOffline(true);

      resetData();
    };
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("online", onlineHandler);

    return () => {
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("online", onlineHandler);
    };
  }, [resetData]);

  return (
    <div className="App">
      <DisksContainer
        currentData={currentData}
        intervalTicker={intervalTicker}
        upcomingTestRes={upcomingTestRes}
        upcomingDataRef={upcomingDataRef}
        testRes={testRes}
        isOffline={offline}
        isAsleep={simulcastIsAsleep}
        secondsTilWake={secondsTilWake}
      />
      {!offline && !simulcastIsAsleep && currentData && currentData.length > 0 && (
        <AudioPlayerBuffers
          ticker={intervalTicker}
          data={
            currentData
              ? {
                  current: currentData,
                  next: upcomingDataRef.current[0],
                }
              : undefined
          }
        />
      )}
      {/* <button
        css={{ position: "fixed", right: 20, bottom: 20 }}
        onClick={() => setSimulcastIsAsleep((s) => !s)}
      >
        Toggle sleep (DEBUG)
      </button> */}
    </div>
  );
}

export default App;
