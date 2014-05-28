============
POLYCRAFT.GL
============

About
=====
The goal of Polycraft.gl_ is to provide a game benchmark that demonstrates the use of WebGL for gaming in the browser. Unlike other benchmarks that focus on testing a specific API, the benchmark is designed to use a range of WebGL APIs used in gaming, making it more representative of a game created with web technologies.

Polycraft.gl (the benchmark) uses the game Polycraft_, a 3D real-time base building and tower defense game targetting platforms capable of supporting HTML5 technologies such as WebGL, Web Audio and Websockets, to provide the real-world approach to rendering including the content of models, textures and shaders. The game Polycraft has been developed by `Wonderstruck Games`_, the in-house game development team at Turbulenz_, using the open source `Turbulenz Engine`_ and is available to play on `GA.ME`_. The experienced team at Wonderstruck/Turbulenz, whom collectively have worked on numerous console/PC titles at companies such as Lionhead, Criterion and EA have developed the benchmark as method of measuring the capabilities of browsers and hardware to deliver Polycraft and other games to a range of hardware such as mobiles, tablets, laptops and desktops.

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/mac-playing.jpg

The benchmark is built upon the open source Turbulenz Engine and the source code is available from the webgl_benchmark_ Github project, allowing the community to understand the methodology behind the benchmark and contribute to the development of the project. Turbulenz are the maintainers the project to keep it compatible with changes/additions to browsers and future hardware.

Benchmark Components
====================

The benchmark is comprised of two key components.

- Polycraft.gl_ - An online benchmark hosted by Turbulenz for users to run the benchmark online.
- webgl_benchmark_ - A repository of source code including tools to build and run the benchmark offline.

The purpose of the benchmark is to compare performance of browsers and hardware by measuring the execution of content using WebGL and using tools, such as graphing, to analyze the results. It is also to provide an online tool allowing users to understand their browser and hardware capabilities with respect to HTML5/WebGL games. Polycraft.gl is the 'online' benchmark. The source code in webgl_benchmark is the 'offline' benchmark.

Offline
-------
The offline benchmark is targeted at developers and advanced users who require the flexibility of running the benchmark under their own conditions. This allows them to specify a more controlled environment for calculating comparable results. This also allows them to remove any restrictions placed on the online version, such as security concerns that are there to protect users browsing online. The offline version allows advanced users more control over configuration such as:

- Detecting more detailed system information:

  - Hardware (e.g. CPU, RAM)
  - OS (e.g. version, build, edition)
  - Graphics (e.g. GPU, drivers)
  - Browser (e.g. name, version, custom build number)

- Browser command line launch options (e.g. http://www.chromium.org/developers/how-tos/run-chromium-with-flags)
- The ability to set the native screen resolution (for use with fullscreen execution)
- The ability to run custom browser builds (with features in development)
- Filesystem access for the browser to save and compare output results via a local webserver.
- The ability to launch the browser process with a single page (disabling extensions, add-ons etc)

Running the Offline Benchmark
-----------------------------
To run the offline benchmark advanced users will need to:

1) Clone the webgl_benchmark repository from Github
2) Run any required setup steps and/or install any browsers/software required to benchmark
3) Manually run the benchmark or run a script to automatically launch and test (detect platform information, configure screen resolution, launch browser with custom options)
4) Observe the specified test run in the benchmark on the browser
5) Inspect the results of the test from file or view and compare the results in the graphing tool provided

Online
------

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/online.png

The online benchmark is targeted at end-users who are interested in getting an overview of how their machine would fare using the benchmark. The purpose is to provide a simple to use tool allowing them to try the benchmark without needing to download and configure any software. Due to security and privacy restriction of browsers, the online version is only be able to gather a subset of information about the test browser and platform. This information is derived from the `User Agent <http://en.wikipedia.org/wiki/User_agent>`_ string and contains information such as:

- Browser version (e.g 27.0.1453.116)
- OS (e.g. Windows NT 6.1; WOW64)

The User Agent string also provides other information such as layout engine and information that can be used to help derive whether the machine is suspected to be a mobile, tablet or laptop/desktop. User Agent spoofing is common and hence the accuracy of the information cannot be guaranteed. With the help of browser detection libraries and User Agent information can be used to make a "good estimate".

For the purpose of ensuring that content on the web is platform/hardware agnostic it is common practice to separate the interface to a feature from the software/hardware that implements it. In the case of WebGL, only limited information is provided about the renderer that implements the standard. For example it is possible to detect that the WebGL context is WebGL version 1.0 based on OpenGL ES 2.0, but little information about how this is delivered to the user. This should stop content relying on implementation specific behavior.
Some browsers also expose a WebGL extension called WEBGL_DEBUG_RENDERER_INFO, which it can be used to derive more detailed information about the render including vendor and the underlying hardware it is running on. For example on certain Windows machines it is possible to identify that the WebGL implementation is provided by the `ANGLE project <https://code.google.com/p/angleproject/>`_ running on top of Direct X.

In the case of Polycraft.gl the platform and renderer information available is only used to inform the user what the configuration of the hardware was when the benchmark was run. It is not used to influence the behavior of the benchmark with the exception of detecting whether the user will be able to run the benchmark e.g. Is WebGL available to the browser? Are the required graphical capabilities available?

Running the Online Benchmark
----------------------------
To run the online benchmark users will need to:

1) Visit polycraft.gl
2) Read the recommendations
3) Run the benchmark
4) Observe their score and the configuration of the benchmark at the time of running
5) Take a screenshot and optionally restart the test

Benchmark Description
=====================

To make the benchmark representative of the game Polycraft, it runs a sequence of Polycraft referred to as "Story Mode", an accelerated narrative of the gameplay that can be found in the game.

Polycraft is based around a shipwrecked survivor landing on a foreign island and teaming up with the local friendly “Wildling” population to build a base and defend it against the hordes of enemy “Feral Wildlings”. The game encompasses elements of base construction, resource gathering, strategy and battles. The story mode includes these gameplay components.

When the benchmark starts, the story mode camera navigates the environment moving from one area of the map to the other demonstrating different visual effects visible within the game on its way. The stages of the story (referred to as "Tests") are designed to show more of a certain type of visual effect that occurs during gameplay. For example during the "Battle" test more particle effects for explosions and weapon fire are visible.

**Introduction**

The hero character initially starts alone on the beach next to a shipwreck. The test takes place at dawn where the sun is low in the sky, where the hero's dynamic shadow can be seen by the changing time of day. The camera then pans across the world revealing more geometry before resting at the hero's outpost. Very little geometry is visible initially so with the global effects applied this forms the baseline performance for the benchmark.

**Battle**

The hero standing at the outpost is involved in a battle defending the outpost from a wave of enemies. This visually includes defensive turrets, fortifications and a number of different enemy types each using different weapons and strategies to attack. The majority of visual content is the particles that make up the explosions, damage and projectile geometry. The scene itself is chaotic and these effects appear and disappear quickly demonstrating the updating of particles.

**Chopping Trees**

The friendly wildings (known as lumberlings and stonelings) on the island collect resources for the player by chopping trees and mining stone. This involves rendering trees and stones at different levels of destruction. The resources that are dropped are unique to resource gathering. The test is set in an area of the map with an abundance of these resources. The trees themselves are hardware-skinned, sway gently and shake when chopped.

**Base**

The base constructed by the user contains buildings, wall defenses and additional visual items such as lamp posts, statues etc. Each entity contains geometry that casts shadows. As players progress through the game their base becomes more advanced. More building types, more geometry, more additional visual items. The base in the benchmark represents a reasonably complex base for players of a high level. Buildings can be upgraded and have increasingly complex meshes the higher the level. The camera starts by panning across the base rendering as much of it as possible. As the scene fades to night, the hero pulls out his torch, a shadow-casting light that includes a particle system with flames and smoke. When the hero moves his torch lights the geometry casting shadows as he goes.

Benchmark Investigation
=======================
In order to build polycraft.gl different methods for measuring benchmark performance were investigated. The browser environment has some complex behaviors making it difficult to accurately measure performance consistently and reliably. The findings of the investigation led the Turbulenz team to the benchmarking approach in polycraft.gl. The following are a selection of observations made whilst developing the benchmark:

- The team were initially interested in measuring how long it would take a frame to execute. The multi-threaded behavior of the browser's renderer process and the compositing meant that this information is not easily accessible to the page running the benchmark. One attempt was to use gl.finish to force frame synchronization. This turned out to not be a reliable method and is not consistent in all browsers (https://code.google.com/p/chromium/issues/detail?id=242210).

- When initially looking to use hardware anti-aliasing, it was discovered that support varies between platform, browser and driver. Some hardware is black listed because of bugs (http://codeflow.org/entries/2013/feb/22/how-to-write-portable-webgl/) and could not be enabled even if capable. The benchmark opts to disabled hardware anti-aliasing by default relying on an implementation of FXAA that is run on all machines.

- Although setting the resolution of the WebGL canvas element is possible, the page has no control over the native resolution of the machine. For this reason the online benchmark will inform the user of the resolution that content is being played back at, but makes no attempt to adjust it. The recommendation to users looking to compare scores is to have this resolution the same for each machine they are comparing. This is less of an issue for the offline benchmark, which has a benchmark runner script that attempts to set the native resolution on certain platforms before running the benchmark.

- Using fixed resolution render targets for rendering of the game produced more consistent timing results across different machines. This also meant that all hardware would have to process the same resolution of the game. By enabling fullscreen effects that used the entire render target it meant the measurements on different machines were more meaningful.

- Having attempted to use multiple methods of controlling the rate at which frames were dispatched in JavaScript including using *setInterval* and *requestAnimationFrame*, the team concluded that requestAnimationFrame was the most reliable across the majority of the browsers because it is usually linked to the vertical sync of the screen. This has the downside that on many devices the frame rate is limited to 60fps. Investigation showed that having vsync enabled meant that different machines behaved more consistently each benchmark run (setInterval skipped rendering frames in some browsers), so this option was chosen.

- The performance with and without vsync differed visibly during testing (see vsync graphs). Although the benchmark can be configured to run with vsync disabled. Not all browsers were capable of disabling it (https://bugzilla.mozilla.org/show_bug.cgi?id=856427). Some browsers also exposed their interval scheduling behaviors, which was apparent by the 'banding' of frame times (see vsync graphs).

- Garbage collection can occur at any time and affects the frequency of the requestAnimationFrame interval. On some machines this is a small pause for a couple frames, but on others it can be much more significant. Controlling the time when memory is no longer referenced and reducing the construction and destruction of objects in memory is a way of reducing the impact, but ultimately it will need to happen at some point in time. The team concluded that it is a natural behavior of JavaScript and therefore should be visible in results.

Investigation Graphs
====================

Vsync
-----

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/graph/image11.png
    :alt: Macbook Pro 5.1, OSX 10.6.8, Chrome 27, vsync on

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/graph/image02.png
    :alt: Macbook Pro 5.1, OSX 10.6.8, Chrome 27, vsync off

Testing vsync on a Macbook Pro 5.1 running OSX 10.6.8 in Chrome 27 with the "Story mode benchmark" (without shadows).
With vsync on (left) and vsync off (right).
X-axis is number of frames through playback.
Y-axis is milliseconds between frames.
The graphs show the browser scheduling of requestAnimationFrame.

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/graph/image03.png
    :alt: Windows 8, Chrome 28, vsync on

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/graph/image10.png
    :alt: Windows 8, Chrome 28, vsync off

Testing vsync on hardware running Windows 8 in Chrome 28 with the "Story mode benchmark (without shadows).
With vsync on (left) and vsync off (right).
X-axis is number of frames through playback.
Y-axis is milliseconds between frames.
The graphs show different behavior on different platforms.

SetInterval
-----------

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/graph/image04.png
    :alt: setInterval(0), Chrome

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/graph/image09.png
    :alt: setInterval(0), Safari

On high spec machines (when vsync is still enabled) time between frames can drop below 16ms (60 fps) using setInterval(0).
Chrome (left) and Safari (right).
The graphs show that setInterval cannot be relied upon to update the rendering, especially between different browsers.

Render Target
-------------

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/graph/image07.png
    :alt: With render target, average 32ms per frame

.. image:: https://github.com/turbulenz/webgl_benchmark/raw/master/docs/readme/graph/image01.png
    :alt: Without render target, average 34ms per frame

No render target (left) average 32ms per frame and with render target (right) average 34ms per frame running on the same hardware.
The graphs show that the use of a full-screen render target had only small variance on the same hardware at the same resolution.
The use of a fixed size render target helped to ensure that all hardware would be rendering the same number of pixels.

Scoring Methodology
===================

The scoring system used for Polycraft.gl_ attempts to provide end-users with a summary of their browser/platform/hardware capability in a method that is easy to run and understand. The final score the benchmark provides is a sum of the score from each of the tests run in the benchmark. Each test has an equal score weighting. The benchmark score attempts to compare the machine to a theoretical machine that is able to play the benchmark at real-time at the intended resolution. If a machine is able to achieve this then it will be awarded the maximum score for that test. For example if the benchmark contains a gameplay recording at 60 frames per second and the machine is able to play the same frames back at 45 frames per second the machine will be awarded 3/4 of the score available.

To measure how fast a machine can run the tests the benchmark measures from one point in a frame to the same point in the next frame. The benchmark has no visibility of whether or not the information it dispatched has been rendered so it relies on the frequency of the requestAnimationFrame callback to tell it whether more frames can be dispatched. A machine that is unable to process WebGL commands at the rate at which they are dispatched will increase the time between frames which in turn will affect the score awarded.


Recommendations
===============
In order to run the benchmark in the most reliable way to generate comparable results our investigation has lead us to recommend the following approaches to achieving comparable scores.

**Browser Comparisons**

- Use the offline benchmark to configure the browsers with the correct launch options and build version of the browser
- Hardware anti-aliasing should be turned off for the benefit of browsers that don't support it
- Use the benchmark with requestAnimationFrame, with vsync enabled.
- Launch the browser with extensions/add-ons/plugins disabled.
- Render the game to a fixed resolution render target. (To reduce performance variance for browsers that don't have a fullscreen option).

**Hardware Comparisons**

- Where possible use the offline mode to ensure the correct setup. When running from polycraft.gl setup both browsers to playback the benchmark at the same resolution.
- Use the same browser with the same version on both hardware
- Where possible try to ensure both browsers are running the same rendering implementation e.g. ANGLE (DirectX 9)
- Set the native screen resolution to be the same for both pieces of hardware and run the benchmark in fullscreen
- When using the offline benchmark, gather the system information for the benchmark from an application that exposes more hardware details than the browser. For the online benchmark use the browser/platform detection via user agent where available.

Requirements (Offline)
======================
In order to use the webgl_benchmark_ project offline. Developers require the following:

* Python 2.7.x
* (Optional) `Turbulenz Engine`_ environment - Required to re-build the project and generate custom configurations. The environment is included as part of the turbulenz_engine_ repository
* (Optional) `Turbulenz local server`_ - Required to save benchmark result files. The server is included as part of the turbulenz_engine_ repository or as a `python package <https://pypi.python.org/pypi/turbulenz_local>`_

*Note*: The webgl_benchmark_ benchmark repository includes a basic server as part of the benchmarkrunner.py_ script.
This server provides simple hosting of static files and saving of results to the machine it is hosted on. The `Turbulenz local server`_ is a more advanced server designed to aid in the development of HTML5 games.

Usage
=====

The files required to run the benchmark in debug mode are included pre-built in the GitHub repository. To build the release version of the benchmark, see `building`_.
Start by cloning/downloading the benchmark git repository.

To play the benchmark you will need to:

1) Start a server

2) Open the benchmark in a browser

3) Wait for the benchmark to finish

4) Look at the score screen or graph screen (See `graphing`_ options)

5) Save the results (Depends on server and launch options)

The benchmark can be run using any of the following:

* Manually by adding the project to the `Turbulenz local server`_ and playing from the server.

* Manually by launching the benchmarkrunner.py script with the --server command and playing from the server.

* Automatically using the benchmarkrunner.py script.

* Automatically using the run.bat command (Windows Only).

**Running from the Turbulenz local server**

Hosting the project on the Turbulenz local server allows you to run any of the benchmark targets.
The *online* version will request the benchmark data directly from where it is hosted online. The *offline* version requires the data to be downloaded before running. This will be done automatically by running the benchmarkrunner.py. This step only needs to be done once per data stream:

1) Install the local server (follow the steps for any of the following)

   - `turbulenz_engine`_ repository
   - `python package <https://pypi.python.org/pypi/turbulenz_local>`_
   - `Turbulenz SDK`_

2) Run the following command to download the benchmark data:

::

    $ python benchmarkrunner.py

3) Start the server

4) Add the benchmark as project to the server via `<http://127.0.0.1:8070>`__. For local server usage see the `documentation <http://docs.turbulenz.com/local/user_guide.html#adding-an-existing-project>`_

5) Play the "benchmark.canvas.debug.html". The default configuration will start playing.

6) At the end of the benchmark the score will appear with the details of the configuration when the benchmark was run. These results can be saved in the form of a json file. When running from the Turbulenz local server the 'save' button will save the results in two locations:

   - As `userdata <http://docs.turbulenz.com/turbulenz_services/userdata_api.html>`_ for the given user
   - In the *data/* directory of the webgl_benchmark_ project

   If existing results have been saved by the user in userdata, those results will be viewable on the graph screen (See graphing_). The name of the user who is currently logged-in can be found on the main local server page.

**Running from the benchmarkrunner.py server command**

The benchmarkrunner.py server command will launch a simple web server that can be used to serve the benchmark files. To run the benchmark:

1) Run the following command to start the server:

::

    $ python benchmarkrunner.py --server

2) Navigate to `<http://127.0.0.1:8070>`__ to run the benchmark

3) Similar to the local server the benchmark results can be saved by pressing the 'save' button. The server will then save the results in the *data/* directory


**Running using the benchmarkrunner.py browser-launch command**

The benchmarkrunner.py server command will automatically launch a browser and navigate to the page where the benchmark is located. A server hosting the benchmark must already be running to use this option.

*WARNING*: Make sure you have closed the target browser and saved any information before running this command as it will attempt to close any existing processes before launching:

::

    $ python benchmarkrunner.py --browser-launch

    or

    $ python benchmarkrunner.py --target TARGET --browser-launch

The script will prepare the benchmark and launch the browser with any required arguments.
The available options for TARGET are listed in the *benchmarkrunner --help* command.
If switching between targets, building_ is essential.

**Running using the run.bat command**

*(Windows Only)*

Double-click the "run.bat" batch file, which will set the resolution of the machine before running the benchmarkrunner script.
::
    > run.bat

The script will use the defaults specified in:

- assets/config/default_config.txt
- assets/config/default_target.txt
- assets/config/default_resolution.txt

The defaults can be overridden by calling:
::
    > run.bat CONFIG TARGET

*Note*: The script will attempt to restore the previous resolution at the end of the benchmark. Make sure to close the browser correctly to trigger this.

Advanced Usage
==============

Building
--------

.. _building:

In order to use the release build of the benchmark or to generate the 'static' target the build system included in the open source turbulenz_engine_ is required.
This allows developers to clean and build the project, assets and configurations of the benchmark.
To build the benchmark:

1) Install the turbulenz_engine_ following the instructions

2) Activate the environment from the turbulenz_engine directory:

::

    $ source env/bin/activate - for bash and similar shells
    > env\scripts\activate.bat - for Windows

3) Run the benchmark command from the webgl_benchmark directory:

::

    $ python benchmarkrunner.py --build

This command will update the debug version of the benchmark with any changes and will generate the benchmark.canvas.js and benchmark.canvas.release.html files.

4) To clean all the code and asset files for the benchmark run the command:

::

    $ python benchmarkrunner.py --clean

Browser Options
---------------

The benchmark runner script can attempt to launch the browser with specific command line arguments.
If your browser is installed to a different location than expected by the launcher, you can specify the path to the executable using the argument --browser-path.
Note that you also need to specify the --browser argument which tells the runner which browser the path is pointing to.

Examples::

    $ python benchmarkrunner.py --browser-launch --browser chrome --browser-path "C:\Users\USER_NAME\AppData\Local\Chromium\Application\chrome.exe"

    $ python benchmarkrunner.py --browser-launch --browser chrome --browser-path "C:\Users\USER_NAME\AppData\Local\Google\Chrome SxS\Application\chrome.exe"

    $ python benchmarkrunner.py --browser-launch --browser chrome --browser-path /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary


You might need to specify a browser profile to run when the benchmark launches if you want the browser to load with certain options/add ons/extensions (This is essential in Firefox if you have multiple profiles). To launch a given profile by name use the --browser-profile argument. For Firefox this the name of the profile. For Chrome this is the profile directory name.

Examples::

    $ python benchmarkrunner.py --browser-launch --browser firefox --browser-profile webgl_benchmark

    $ python benchmarkrunner.py --browser-launch --browser chrome --browser-profile "Profile 3"


The browser-launch command can be used with a timeout that will force the browser to close after a given period of time.

Example::

    $ python benchmarkrunner.py --browser-launch --browser-timeout=300


In this example, the command will force the browser to close after 300 seconds (5 minutes).
Once the browser has been closed the benchmark runner will exit.

Hardware Detection
------------------

**(Currently Windows Only)**

In offline mode, when saving the results the browser can also save certain information about the hardware for later comparison.
This information is collected by the benchmark runner and passed to the benchmark.
Use the --hardware-name argument to specify the name of the hardware running the benchmark runner.
This name will be used when saving the results, so it should identify the machine the benchmark was run on to compare with other hardware.

Examples::

    $ python benchmarkrunner.py --hardware-name "My Work Laptop"

    $ python benchmarkrunner.py --hardware-name TestPC01-Win8

    $ python benchmarkrunner.py --hardware-name "John's Netbook"

Graphing
--------

.. _graphing:

The webgl_benchmark includes the ability to view the output of the test results in the form of a graph.
Graphs are typically displayed at the end of the benchmark run instead of the *score screen*, but can also be launched instead of the benchmark itself.
The graphing tools allow developers to look at the frame-by-frame output of the benchmark and analyse the output. There are two graphing options:

* graphOnEnd - Setting this option to 'true' will replace the final score screen with the graphing tool. It will start by adding the test that was just running, then if run from the Turbulenz local server, any other results saved by the same user currently running the benchmark.

* graphOnStart - Setting this option to 'true' will start the graphing tool instead of the benchmark. Useful when you already have results to analyse. Again this option is only possible if there are results saved for the current user on the Turbulenz local server.

These options can be enabled by:

* Modify the *config.js* to include the options:

  - config.graphOnEnd = true;
  - config.graphOnStart = true; (Turbulenz local server only)

* Run the benchmark with the query parameter: (Turbulenz local server only)

  - http://127.0.0.1:8070/#/play/webgl-benchmark/benchmark.canvas.debug.html?graphOnEnd=True
  - http://127.0.0.1:8070/#/play/webgl-benchmark/benchmark.canvas.debug.html?graphOnStart=True

Static page
-----------

.. _static:

Polycraft.gl_ is hosted on a static page, which can be generated by running the following command:

::

    $ python benchmarkrunner.py --clean --build --release --copy --server

This command will:

* Clean the project (Code and asset files)
* Force the project to the 'static' target using the --release flag
* Build the project release code and assets required for deployment
* Copy the project to the 'static_page' directory
* Run a static server with no saving features (on port 8000)

To try the benchmark as it would appear online navigate to `<http://127.0.0.1:8000>`__.
The release page can be modified by editing the files in *templates/page*.

Help
----

For more advanced commands run:

::

    $ python benchmarkrunner.py --help


Changelog
=========

The changelog for the webgl_benchmark can be found in the `changelog.rst <changelog.rst>`__ file

Licensing
=========

The webgl_benchmark Github project is licensed under the conditions in the `LICENSE <LICENSE>`__ file.


Contributing
============

Contributions are always encouraged whether they are small documentation tweaks, bug fixes or suggestions for larger
changes. You can check the `issues <https://github.com/turbulenz/webgl_benchmark/issues>`__ first to see if anybody else
is undertaking similar changes.

If you'd like to contribute any changes simply fork the project on Github and send us a pull request or send a Git
patch detailing the proposed changes.

*Note*: by contributing code to the webgl_benchmark project in any form, including sending a pull request via Github,
a code fragment or patch via private email or public discussion groups, you agree to release your code and any assets data
under the conditions in the `LICENSE <LICENSE>`__ file included in the source distribution.

Links
=====

**Benchmark**

| Polycraft.gl_
| webgl_benchmark_
| `webgl_benchmark Issue Tracker`_

**Games**

| GA.ME_
| `Polycraft (Game)`_
| `Wonderstruck Games`_

**Turbulenz**

| Turbulenz_
| `Turbulenz Engine`_
| `Turbulenz Engine Documentation`_
| `Turbulenz Developer Hub`_


.. _Turbulenz Developer Hub: https://hub.turbulenz.com/
.. _Turbulenz SDK: https://hub.turbulenz.com/#downloads
.. _benchmarkrunner.py: https://github.com/turbulenz/webgl_benchmark/blob/master/benchmarkrunner.py
.. _Turbulenz local server: https://github.com/turbulenz/turbulenz_local
.. _GA.ME: https://ga.me
.. _turbulenz_engine: https://github.com/turbulenz/turbulenz_engine
.. _Turbulenz Engine: https://github.com/turbulenz/turbulenz_engine
.. _Turbulenz Engine Documentation: http://docs.turbulenz.com/
.. _Turbulenz: http://biz.turbulenz.com
.. _Wonderstruck Games: http://wonderstruckgames.com
.. _Polycraft: http://polycraftgame.com
.. _Polycraft (Game): https://ga.me/polycraft
.. _Polycraft.gl: http://polycraft.gl
.. _webgl_benchmark: https://github.com/turbulenz/webgl_benchmark
.. _webgl_benchmark Issue Tracker: https://github.com/turbulenz/webgl_benchmark/issues