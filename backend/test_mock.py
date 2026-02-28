import traceback
from diagnostician import Diagnostician

d = Diagnostician()
try:
    d._run_mock([], None)
except Exception as e:
    with open("mock_error.txt", "w") as f:
        f.write(traceback.format_exc())
