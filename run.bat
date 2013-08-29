@echo off

set CONFIG=%1
set TARGET=%2

:CHECK_TARGET
if "%TARGET%" == "" goto DEFAULT_TARGET else goto CHECK_CONFIG

:DEFAULT_TARGET
if exist assets\config\default_target.txt set /p TARGET=<assets\config\default_target.txt
if "%TARGET%" == "" goto EXIT_TARGET_MISSING else goto CHECK_CONFIG

:CHECK_CONFIG
if "%CONFIG%" == "" goto DEFAULT_CONFIG else goto SET_QRES_PATH

:DEFAULT_CONFIG
if exist assets\config\default_config.txt set /p CONFIG=<assets\config\default_config.txt
if "%CONFIG%" == "" goto EXIT_CONFIG_MISSING else goto SET_QRES_PATH

:SET_QRES_PATH
set QRES_PATH=external\qres\bin\win32\qres.exe

if "%PYTHONPATH%" == "" goto SET_PYTHONPATH else goto CHECK_PYTHONPATH

:SET_PYTHONPATH
set PYTHONPATH="C:\Python27\python.exe"

:CHECK_PYTHONPATH
if not exist %PYTHONPATH% goto EXIT_PYTHON_MISSING else goto RUN

:RUN
%PYTHONPATH% --version

%QRES_PATH% /V /S > current_resolution.txt

set /p RUN_RESOLUTION=<assets\config\default_resolution.txt
if "%RUN_RESOLUTION%" == "" goto EXIT_RESOLUTION_MISSING
%PYTHONPATH% resolution.py --parse assets\config\default_resolution.txt > qres_run.txt
%PYTHONPATH% resolution.py --parse current_resolution.txt > qres_current.txt
set /p QRES_CURRENT_ARGS=<qres_current.txt
set /p QRES_NEW_ARGS=<qres_run.txt

echo Setting resolution: %RUN_RESOLUTION%
%QRES_PATH% %QRES_NEW_ARGS%
%PYTHONPATH% benchmarkrunner.py --target %TARGET% --config %CONFIG%
%QRES_PATH% %QRES_CURRENT_ARGS%

del qres_run.txt
del qres_current.txt
del current_resolution.txt

goto EXIT

:EXIT_RESOLUTION_MISSING
echo Resolution is not set. Add it to assets\config\default_resolution.txt

goto EXIT

:EXIT_TARGET_MISSING
echo Argument TARGET missing. Usage: run.bat CONFIG TARGET
echo e.g.
echo      run.bat sequence_name offline
echo or
echo      add TARGET to assets\config\default_target.txt

goto EXIT

:EXIT_CONFIG_MISSING
echo Argument CONFIG missing. Usage: run.bat CONFIG TARGET
echo e.g.
echo      run.bat sequence_name offline
echo or
echo      add CONFIG to assets\config\default_config.txt
goto EXIT

:EXIT_PYTHON_MISSING
echo Python 2.7 is required to run.

:EXIT
pause