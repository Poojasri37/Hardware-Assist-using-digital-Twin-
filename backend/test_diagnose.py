import urllib.request
import json
data = json.dumps({'verification_results': []}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/api/diagnose', data=data, headers={'Content-Type': 'application/json'})
try:
    urllib.request.urlopen(req)
except Exception as e:
    print(e.read().decode())
