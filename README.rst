Building
--------

Currently, you can build the Turbulenz WebGL Benchmark by downloading and setting up
the `Open Source Turbulenz Engine <https://github.com/turbulenz/turbulenz_engine>`_.

Once you have the engine set up:

- Change the variable ``TZROOT`` in the file ``Makefile`` to be point at the root of the engine repository
- Start the engine environment from the engine directory
  ::

        $ source env/bin/activate - for bash and similar shells
        > env\scripts\activate.bat - for Windows
- Build the Turbulenz WebGL Benchmark by running
  ::

        $ python manage.py apps PATH_TO_WEBGL_BENCHMARK
