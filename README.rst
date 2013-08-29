Turbulenz WebGL Benchmark
=========================

About
-----

The Turbulenz WebGL Benchmark is a game benchmark that demonstrates the use of WebGL for gaming in the browser.
It uses the open source `Turbulenz Engine <https://github.com/turbulenz/turbulenz_engine>`_ to play recorded content from the game `Polycraft <http://polycraftgame.com>`_, representative of a game created with web technologies.

Requirements
------------

The benchmark requires Python 2.7.x to run in offline mode.

Usage
-----

The code files required to run the benchmark are included pre-built in the GitHub repository.
The benchmark can be run by:

1)  Adding the project folder to the `Turbulenz local server <https://github.com/turbulenz/turbulenz_local>`_ and playing the debug or release build html files.

2)  Running using the benchmark_runner script:
    ::
        $ python benchmark_runner.py

        or

        $ python benchmark_runner.py --config CONFIG --target TARGET

    The script will prepare the benchmark and launch the browser with any require arguments.
    The benchmark will run and the user can choose to save the results.
    Once the browser has been closed the benchmark runner will exit.
    The runner has a timeout which will force the browser to close if it is reached.

    The CONFIG is the name of benchmark sequence that will be played when the benchmark starts.
    The available options for CONFIG are listed in the file *assets/config/stream_mapping.json*

    The available options for TARGET are:

    * offline - The runner will download the data files required for the CONFIG specified before running the benchmark.

    * online - The runner will stream the data files required for the CONFIG specified from an online source hosted on Amazon S3.

    Examples::

        $ python benchmark_runner.py --config zoom2_shadows_tiltshift --target offline

        $ python benchmark_runner.py --config story_shadows_rendertarget --target online

        $ python benchmark_runner.py --target online

    For more options::

        $ python benchmark_runner.py --help

**WINDOWS ONLY**

3)  Double-clicking the "run.bat" batch file, which will set the resolution of the machine before running the benchmark_runner script.
    Once the browser has closed the screen resolution will be restored.
    ::
        > run.bat

    The script will use the defaults specified in:

    - assets/config/default_config.txt
    - assets/config/default_target.txt
    - assets/config/default_resolution.txt

    The defaults can be overridden by calling:
    ::
        > run.bat CONFIG TARGET

Re-building
-----------

The benchmark can be rebuilt by downloading and configuring the open source `turbulenz_engine <https://github.com/turbulenz/turbulenz_engine>`_.

Once you have the repository set up:

- Change the variable ``TZROOT`` in the file ``Makefile`` of the benchmark to point at the root of the turbulenz_engine repository
- Start the engine environment from the engine directory
  ::

        $ source env/bin/activate - for bash and similar shells
        > env\scripts\activate.bat - for Windows
- Build the Turbulenz WebGL Benchmark by running
  ::

        $ python manage.py apps PATH_TO_WEBGL_BENCHMARK

