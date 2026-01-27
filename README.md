# SJS3 Scraper

Scrapes data from SJS3 into a .csv file. There is a roughly 30 sec delay from the API and the real semaphore, so data you see in the console will be in front of reality by roughly that same amount of time. 

Expect roughly .7MB of data to be produced per day, as each line of CSV is ~60 bytes. The semaphore changes every 7.2 seconds, for a transfer rate of 12000 messages per day (12kb).

Some example of what you get:
```
Timestamp,D1,D2,D3,D4,RD1,RD2,RD3,RD4,P1,P2,P3,P4,M1,M2,M3,M4,Aud_Bass,Aud_Beep1,Aud_IPA,Aud_Num,Aud_Beep2,Aud_Beep3
2026-01-27T22:28:32Z,3,1,3,0,7,1,-1,0,1,-1,-1,-1,4,-2,-8,-4,3,4,14,-13,3,2
2026-01-27T22:28:35Z,2,2,1,1,6,2,1,5,-1,-1,1,1,-1,1,2,5,4,4,11,6,2,4
```

## Running

Pretty basic python stuff.

- Download Python 3.4+ `https://www.python.org/downloads/`
- Mac/Linux
    ```
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    python3 ./scraper.py
    ```
- Windows
    ```
    python3 -m venv .venv
    .venv/Scripts/activate
    pip install -r requirements.txt
    python3 ./scraper.py
    ```

### Config

Only variable is verbose or not. Want to not see:

```
\---
--//
/---
-/\-
|/|-
-||\
```

in your command line? Turn it off. 

## Helpful Files

### aws-exports.js

Shows you the endpoints you need in order to aws auth and hit the endpoint continuously.

### SpinningDisk.tsx

The literal spinning disk component for the semaphore website. shows you how secretNumbers get translated into rotation.

### DiskContainer.tsx

Manages the spinningDisk objects. just passes down state.

### AudioPlayerBuffers.tsx

Shows the mapping of IPA (International Phonetic Alphabet) and singing voice, plus random notes and boops. Maybe there's more hidden info in the boops?? I'm writing them down as a result.

### App.tsx

what it sounds like. Does the API handling 