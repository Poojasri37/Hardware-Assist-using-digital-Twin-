import asyncio, os, traceback
os.environ['GEMINI_API_KEY'] = 'AIzaSyAlP9DBuRjWkPMLNA-7VXsSqK5E8fp7LtI'
from diagnostician import Diagnostician

async def test():
    d = Diagnostician()
    try:
        await d.diagnose([{'test_point': 'TP-1', 'node': 'N1', 'measured_v': 0, 'measured_i': 0, 'expected_v': 3.3, 'expected_i': 0.1, 'delta_v': -3.3, 'status': 'FAIL'}], {})
    except Exception as e:
        traceback.print_exc()

asyncio.run(test())
