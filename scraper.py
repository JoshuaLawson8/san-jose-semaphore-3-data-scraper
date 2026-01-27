import requests
import boto3
import time
import yaml
from datetime import datetime, timezone
import csv
import os
from aws_requests_auth.aws_auth import AWSRequestsAuth

CSV_FILE = './out/db.csv'
VISUAL_MAP = ['|', '/', '-', '\\']

def load_config():
    with open('./config.yaml') as stream:
        return yaml.safe_load(stream)

config = load_config()

def get_aws_auth():
    """Refreshes AWS Cognito Credentials"""
    cognito = boto3.client('cognito-identity', region_name=config['region'])
    identity = cognito.get_id(IdentityPoolId=config['id-pool'])
    creds = cognito.get_credentials_for_identity(IdentityId=identity['IdentityId'])['Credentials']
    return AWSRequestsAuth(
        aws_access_key=creds['AccessKeyId'],
        aws_secret_access_key=creds['SecretKey'],
        aws_token=creds['SessionToken'],
        aws_host=config['host'],
        aws_region=config['region'],
        aws_service='execute-api'
    )

def init_csv():
    """DN -> Dial position. RDN mod 4 value.
       RDN -> unrounded, current value of the semaphore
       PN -> parity of move. 1 = right, -1 = left. Dials always move one way it seems!
       MN -> value of move. RDN + MN+1 = RDN+1 % 8. 
       Aud values -> there is some mapping 

       """
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Timestamp', 'D1', 'D2', 'D3', 'D4', 'RD1', 'RD2', 'RD3', 'RD4', 'P1', 'P2', 'P3', 'P4',
                              'M1', 'M2', 'M3', 'M4', 'Aud_Bass', 'Aud_Beep1', 'Aud_IPA', 'Aud_Num', 'Aud_Beep2', 'Aud_Beep3'])

def log_to_csv(timestamp, dials, rawdials, parity, raw_moves, aud):
    with open(CSV_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([timestamp, *dials, *rawdials, *parity, *raw_moves, *aud])

def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def main():
    try:
        print(f"--- Semaphore Monitor Active ---")
        print(f"Logging to: {CSV_FILE}")
        
        init_csv()
        auth = get_aws_auth()
        
        # just request all info every time. why not? 
        params = {
            'isFirstFetch': 'true', 
            'sleepStartHour': 0, 'sleepEndHour': 0,
            'sleepStartMinute': 0, 'sleepEndMinute': 0
        }

        test_values_increasing = []
        dial_values = []
        
        while True:
            try:
                res = requests.get(config['endpoint'], auth=auth, params=params, timeout=5).json()
                if test_values_increasing == res['testValuesIncreasing']:
                    time.sleep(1)
                    continue
                else:
                    test_values_increasing = res['testValuesIncreasing']

                raw_dial_values = res['initializeRotation']
                dial_values = [ item % 4 for item in raw_dial_values]
                raw_moves = res['secretValues'][0][0]
                parity = [ "1" if item > 1 else "-1" for item in raw_moves]
                if config['verbose'] == True:
                    print(VISUAL_MAP[dial_values[0]] + VISUAL_MAP[dial_values[1]] + VISUAL_MAP[dial_values[2]] + VISUAL_MAP[dial_values[3]])
                log_to_csv(now_iso(), dial_values, raw_dial_values, parity, raw_moves, res['secretValues'][0][1] )
                        
            except Exception:
                # Re-auth on error (token expiry)
                try: auth = get_aws_auth()
                except: 
                    raise Exception
            
    except KeyboardInterrupt:
        print("\nStopped.")

if __name__ == "__main__":
    main()