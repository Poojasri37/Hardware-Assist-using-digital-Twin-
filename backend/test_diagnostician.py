import sys
import asyncio
from diagnostician import Diagnostician

async def test():
    diag = Diagnostician(api_key=None)
    vr = [{"test_point":"TP-1","node":"VCC","measured_v":0.5,"measured_i":0.005,"expected_v":3.3,"expected_i":0.165,"delta_v":-2.8,"delta_i":-0.16,"status":"fail"}]
    
    try:
        res = getattr(diag, '_run_mock')(vr, None)
        print("Success:", res)
    except Exception as e:
        import traceback
        with open('test_error.txt', 'w', encoding='utf-8') as f:
            traceback.print_exc(file=f)

asyncio.run(test())
