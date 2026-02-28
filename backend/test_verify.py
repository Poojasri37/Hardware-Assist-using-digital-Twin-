import urllib.request, json
req = urllib.request.Request('http://localhost:8000/api/circuit/verify', data=b'{"test_point":"TP-1","measured_v":3.3,"measured_i":0.5}', headers={'Content-Type':'application/json'})
print(json.dumps(json.loads(urllib.request.urlopen(req).read().decode()), indent=2))
