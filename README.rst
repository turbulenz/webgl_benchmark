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


Changing benchmark config
-------------------------

To change the benchmark config see the "scripts/config.js" file.

Saving benchmark results
------------------------

Benchmark results will be saved under "data/" with under the folder name you specify when you click Save.

Creating graphs
---------------

You can create graphs by installing `gnuplot <http://www.gnuplot.info/>_`. To create a frame rate graph run::

    $> python plotgraph.py -t plot-frametimes.gnuplot -i data/mydatafolder/mydatafile.csv -o output.png --var y_axis_max=120

You might want to change "y_axis_max" depending on your results.
