/** @jsxImportSource @emotion/react */

import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { Storage } from "aws-amplify";

import { TurnData } from "../App";
import { turnDelaySeconds } from "../utils/constants";
import { AudioTooltip } from "./AudioTooltip";
import { AudioToggle } from "./AudioToggle";

interface CurrentAndNextData {
  current: TurnData | string;
  next: TurnData | string;
}

interface AudioPlayerProps {
  data?: CurrentAndNextData;
  ticker: boolean;
}

interface FileBatchPlaybackData {
  file: string;
  startTime: number;
  pan: number;
}

export const ipaMap = [
  "_Message",
  "Alpha",
  "Bravo",
  "Charlie",
  "Delta",
  "Echo",
  "Foxtrot",
  "Golf",
  "Hotel",
  "India",
  "Juliette",
  "Kilo",
  "Lima",
  "Mike",
  "November",
  "Oscar",
  "Pappa",
];

export const AudioPlayerBuffers: FC<AudioPlayerProps> = (props) => {
  const { data, ticker } = props;

  const firstClickOccurredRef = useRef(false);
  const [firstClickOccurred, setFirstClickOccurred] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioToggledOn, setAudioToggledOn] = useState(false);

  const [audioContext, setAudioContext] = useState<AudioContext>();
  const outputGainNodeRef = useRef<GainNode>();

  const [sounds, setSounds] = useState<Record<string, string>>({});
  const buffersRef = useRef<Record<string, AudioBuffer>>({});
  const tracksRef = useRef<Record<string, AudioBufferSourceNode>>({});

  const fetchBuffers = useCallback(
    async (filenames: string[]) => {
      if (!audioContext) return;

      filenames = filenames.filter(
        (f) => !Object.keys(buffersRef.current).includes(f)
      );

      await Promise.all(
        filenames.map((f) =>
          fetch(sounds[f]).then((resp) =>
            resp.arrayBuffer().then((b) => {
              audioContext
                .decodeAudioData(b)
                .then((a) => {
                  buffersRef.current[f] = a;
                })
                .catch((e) => console.error(e, f));
            })
          )
        )
      );
    },
    [audioContext, sounds]
  );

  // Get all sound sources and store locally
  // Initialize web audio context
  useEffect(() => {
    const getSounds = async () => {
      const getSoundsResponses = await Promise.all(
        files.map((filename) => Storage.get(filename))
      );

      const responsesMap = getSoundsResponses.map((s, i) => ({
        key: files[i],
        val: s,
      }));

      const hashMap: Record<string, string> = responsesMap.reduce(function (
        map,
        obj
      ) {
        map[obj.key] = obj.val;
        return map;
      },
      {} as Record<string, string>);

      setSounds(hashMap);
    };

    void getSounds();

    // for legacy browsers
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    setAudioContext(audioContext);

    const outputNode = audioContext.createGain();
    outputNode.gain.setValueAtTime(0, 0);
    outputNode.connect(audioContext.destination);
    outputGainNodeRef.current = outputNode;

    return () => {
      audioContext.close();
    };
  }, []);

  // If not yet loaded, load current and next set of buffers
  useEffect(() => {
    if (!data) return;

    const getCurrentBuffers = async () => {
      let nextFilesToPlay: FileBatchPlaybackData[] = [];
      if (typeof data.next !== "string") {
        nextFilesToPlay = getSourcesToPlay(data.next);
      }

      // fetch unique filenames once
      await fetchBuffers(
        nextFilesToPlay
          .map((f) => f.file)
          .filter((value, index, self) => self.indexOf(value) === index)
      );
    };

    void getCurrentBuffers();
  }, [data, fetchBuffers]);

  // On first tick after initializer clicked, set loading to false
  useEffect(() => {
    if (ticker === undefined) return;

    if (!firstClickOccurredRef?.current) return;

    setIsLoading(false);
  }, [ticker, firstClickOccurredRef]);

  // Play audio on data change interval
  useEffect(() => {
    if (!audioContext || !data || !outputGainNodeRef.current) return;

    if (!firstClickOccurredRef?.current) return;

    if (audioContext.state === "suspended") {
      // Check if context is in suspended state (autoplay policy)
      audioContext.resume();
    }

    let currentFilesToPlay: FileBatchPlaybackData[] = [];
    if (typeof data.current !== "string") {
      currentFilesToPlay = getSourcesToPlay(data.current);
    }

    currentFilesToPlay.forEach((playbackData, i) => {
      if (playbackData.file in buffersRef.current) {
        const usesPan = playbackData.pan !== 0;

        const newBufferNode = audioContext.createBufferSource();
        newBufferNode.buffer = buffersRef.current[playbackData.file];

        let newPanNode = audioContext.createStereoPanner();

        const newGainNode = audioContext.createGain();
        newGainNode.gain.setValueAtTime(
          playbackData.file.indexOf("ipa_") > -1
            ? 0.6
            : playbackData.file.indexOf("turn") > -1
            ? 0.5
            : 1,
          0
        );

        if (usesPan) {
          newPanNode.pan.setValueAtTime(playbackData.pan, 0);
          newBufferNode.connect(newPanNode);
          newPanNode.connect(newGainNode);
        } else {
          newBufferNode.connect(newGainNode);
        }

        newGainNode.connect(outputGainNodeRef.current as GainNode);

        tracksRef.current[playbackData.file] = newBufferNode;

        newBufferNode.start(
          audioContext.currentTime + currentFilesToPlay[i].startTime / 1000
        );

        setTimeout(() => {
          newBufferNode.stop();
          newBufferNode.buffer = null;

          if (usesPan) {
            newBufferNode.disconnect(newPanNode);
            newPanNode.disconnect(newGainNode);
          } else {
            newBufferNode.disconnect(newGainNode);
          }

          newGainNode.disconnect(outputGainNodeRef.current as GainNode);
        }, 9000);
      }
    });
  }, [audioContext, data, firstClickOccurredRef]);

  const getSourcesToPlay = (inputArray: TurnData) => {
    let currentFilesToPlay: FileBatchPlaybackData[] = [];

    if (!Array.isArray(inputArray) || inputArray.length < 2) return [];

    const isResetCycle = inputArray[1].length === 0;

    if (!isResetCycle) {
      const turnsArray = inputArray[0];
      const soundsArray = inputArray[1];

      // Zero values should be silence
      // Numbers go from 'zero' to 'fifteen', such that 1 or -1 map to zero. Not using the sixteen file

      currentFilesToPlay = [
        ...(soundsArray[0] !== 0
          ? [{ file: `Bass2-${soundsArray[0]}.m4a`, startTime: 0, pan: 0 }]
          : []),
        ...(soundsArray[1] !== 0
          ? [{ file: `Beep2-${soundsArray[1]}.m4a`, startTime: 1400, pan: 0 }]
          : []),
        ...(soundsArray[2] !== 0
          ? [
              {
                file: `ipa_${ipaMap[soundsArray[2]]}.m4a`,
                startTime: 2100,
                pan: 0,
              },
            ]
          : []),
        ...(soundsArray[3] !== 0
          ? [
              {
                file: `Num-${(soundsArray[3] > 0
                  ? String(Math.abs(soundsArray[3] - 1))
                  : String(Math.abs(soundsArray[3] + 1))
                ).padStart(2, "0")}${soundsArray[3] < 0 ? "L" : "H"}.m4a`,
                startTime: 2800,
                pan: 0,
              },
            ]
          : []),
        ...(soundsArray[4] !== 0
          ? [{ file: `Beep2-${soundsArray[4]}.m4a`, startTime: 3500, pan: 0 }]
          : []),
        ...(soundsArray[5] !== 0
          ? [{ file: `Beep2-${soundsArray[5]}.m4a`, startTime: 3700, pan: 0 }]
          : []),
        {
          file: `turn${Math.abs(turnsArray[0])}.m4a`,
          startTime: turnDelaySeconds * 1000,
          pan: -0.7,
        },
        {
          file: `turn${Math.abs(turnsArray[1])}.m4a`,
          startTime: turnDelaySeconds * 1000,
          pan: -0.3,
        },
        {
          file: `turn${Math.abs(turnsArray[2])}.m4a`,
          startTime: turnDelaySeconds * 1000,
          pan: 0.3,
        },
        {
          file: `turn${Math.abs(turnsArray[3])}.m4a`,
          startTime: turnDelaySeconds * 1000,
          pan: 0.7,
        },
      ];
    } else {
      // Reset cycle sounds
      currentFilesToPlay = [
        {
          file: `ipa__Message.m4a`,
          startTime: 2100,
          pan: 0,
        },
        { file: `turn8.m4a`, startTime: turnDelaySeconds * 1000, pan: -0.7 },
        { file: `turn8.m4a`, startTime: turnDelaySeconds * 1000, pan: -0.3 },
        { file: `turn8.m4a`, startTime: turnDelaySeconds * 1000, pan: 0.3 },
        { file: `turn8.m4a`, startTime: turnDelaySeconds * 1000, pan: 0.7 },
      ];
    }
    return currentFilesToPlay;
  };

  const handleToggleAudio = () => {
    if (isLoading) return;

    if (!firstClickOccurredRef?.current) {
      firstClickOccurredRef.current = true;
      setFirstClickOccurred(true);
      setIsLoading(true);
    }

    if (audioContext?.state === "suspended") {
      // Check if context is in suspended state (autoplay policy)
      audioContext?.resume();
    }

    audioToggledOn
      ? outputGainNodeRef.current?.gain?.setValueAtTime(0, 0)
      : outputGainNodeRef.current?.gain?.setValueAtTime(0.8, 0);

    setAudioToggledOn((t) => !t);
  };

  const handleContinueWithoutAudio = () => {
    if (!firstClickOccurredRef?.current) {
      firstClickOccurredRef.current = true;
      setFirstClickOccurred(true);
      setIsLoading(false);
    }
  };

  return (
    <div
      css={{
        position: "absolute",
        top: 20,
        right: 20,
        width: "100%",
      }}
    >
      <AudioToggle
        isLoading={isLoading}
        audioToggledOn={audioToggledOn}
        handleToggleAudio={handleToggleAudio}
      />
      {!firstClickOccurred && (
        <AudioTooltip
          handleToggleAudio={handleToggleAudio}
          handleContinueWithoutAudio={handleContinueWithoutAudio}
        />
      )}
    </div>
  );
};

const files = [
  "Bass2-1.m4a",
  "Bass2-2.m4a",
  "Bass2-3.m4a",
  "Bass2-4.m4a",
  "Beep2-1.m4a",
  "Beep2-2.m4a",
  "Beep2-3.m4a",
  "Beep2-4.m4a",
  "ipa__Message.m4a",
  "ipa_Alpha.m4a",
  "ipa_Bravo.m4a",
  "ipa_Charlie.m4a",
  "ipa_Delta.m4a",
  "ipa_Echo.m4a",
  "ipa_Foxtrot.m4a",
  "ipa_Golf.m4a",
  "ipa_Hotel.m4a",
  "ipa_India.m4a",
  "ipa_Juliette.m4a",
  "ipa_Kilo.m4a",
  "ipa_Lima.m4a",
  "ipa_Mike.m4a",
  "ipa_November.m4a",
  "ipa_Oscar.m4a",
  "ipa_Pappa.m4a",
  "Num-00H.m4a",
  "Num-00L.m4a",
  "Num-01H.m4a",
  "Num-01L.m4a",
  "Num-02H.m4a",
  "Num-02L.m4a",
  "Num-03H.m4a",
  "Num-03L.m4a",
  "Num-04H.m4a",
  "Num-04L.m4a",
  "Num-05H.m4a",
  "Num-05L.m4a",
  "Num-06H.m4a",
  "Num-06L.m4a",
  "Num-07H.m4a",
  "Num-07L.m4a",
  "Num-08H.m4a",
  "Num-08L.m4a",
  "Num-09H.m4a",
  "Num-09L.m4a",
  "Num-10H.m4a",
  "Num-10L.m4a",
  "Num-11H.m4a",
  "Num-11L.m4a",
  "Num-12H.m4a",
  "Num-12L.m4a",
  "Num-13H.m4a",
  "Num-13L.m4a",
  "Num-14H.m4a",
  "Num-14L.m4a",
  "Num-15H.m4a",
  "Num-15L.m4a",
  "Num-16H.m4a",
  "Num-16L.m4a",
  "turn1.m4a",
  "turn2.m4a",
  "turn3.m4a",
  "turn4.m4a",
  "turn5.m4a",
  "turn6.m4a",
  "turn7.m4a",
  "turn8.m4a",
  "turn10.m4a",
];
