@echo off

set QRES_PATH=external\qres\bin\win32\qres.exe

if "%PYTHONPATH%" == "" goto SET_PYTHONPATH else goto CHECK_PYTHONPATH

:SET_PYTHONPATH
set PYTHONPATH="C:\Python27\python.exe"

:CHECK_PYTHONPATH
if not exist %PYTHONPATH% goto EXIT_PYTHON_MISSING else goto RUN

:RUN
%PYTHONPATH% --version
%QRES_PATH% /V /S > current_resolution.txt

set /p RUN_RESOLUTION=<run_resolution.txt
%PYTHONPATH% resolution.py --parse run_resolution.txt > qres_run.txt
%PYTHONPATH% resolution.py --parse current_resolution.txt > qres_current.txt
set /p QRES_CURRENT_ARGS=<qres_current.txt
set /p QRES_NEW_ARGS=<qres_run.txt

echo Setting resolution: %RUN_RESOLUTION%
%QRES_PATH% %QRES_NEW_ARGS%
%PYTHONPATH% benchmarkrunner.py --target offline --config shadows_rendertarget
%QRES_PATH% %QRES_CURRENT_ARGS%

del qres_run.txt
del qres_current.txt
del current_resolution.txt

goto EXIT

:EXIT_PYTHON_MISSING
echo Python 2.7 is required to run.

:EXIT
pause