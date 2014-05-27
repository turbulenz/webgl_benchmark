============
POLYCRAFT.GL
============

About
=====
The goal of `Polycraft.gl <http://polycraft.gl>`_ is to provide a game benchmark that demonstrates the use of WebGL for gaming in the browser. Unlike other benchmarks that focus on testing a specific API, the benchmark is designed to use a range of WebGL APIs used in gaming, making it more representative of a game created with web technologies.

Polycraft.gl (the benchmark) uses the game `Polycraft <http://polycraftgame.com/>`_,  a 3D real-time base building and tower defense game targetting platforms capable of supporting HTML5 technologies such as WebGL, Web Audio and Websockets, to provide the real-world content of textures, shaders and rendering method. The Polycraft game has been developed by `Wonderstruck Games <http://wonderstruckgames.com/>`_, the in-house game development team at `Turbulenz <http://biz.turbulenz.com>`_, using the open source `Turbulenz Engine <https://github.com/turbulenz/turbulenz_engine>`_ and is available to play on `GA.ME <https://ga.me>`_. The experienced team at Wonderstruck/Turbulenz, whom collectively have worked on numerous console/PC titles at companies such as Lionhead, Criterion and EA have developed the benchmark as method of measuring the capabilities of browsers and hardware to deliver Polycraft and other games to a range of hardware such as mobiles, tablets, laptops and desktops.

The benchmark is built upon the open source Turbulenz Engine and the source code is available from the webgl_benchmark_ Github project, allowing the community to understand the methodology behind the benchmark and contribute to the development of the project. Turbulenz are the maintainers the project to keep it compatible with changes/additions to browsers and future hardware.

Benchmark Components
====================

The benchmark is comprised two key components.

- **Polycraft.gl** - An online benchmark hosted by Turbulenz for users to run the benchmark online.
- **webgl_benchmark** - A repository of source code including tools to build and run the benchmark offline.

The purpose of the benchmark is to compare performance of browsers and hardware by measuring the execution of content using WebGL and using the tools to measure the results. It is also to provide an online tool allowing users to understand their browser and hardware capabilities with respect to HTML5/WebGL games. Polycraft.gl is the 'online' benchmark. The source code in webgl_benchmark is the 'offline' benchmark.

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
- The ability to running as the sole, dedicated page of the browser (disabling extensions, add-ons etc)

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
The online benchmark is targeted at end-users who are interested in getting an overview of how their machine would fair using the benchmark. The purpose is to provide a simple to use tool allowing them to try the benchmark without needing to download and configure any software. Due to security and privacy restriction of browsers, the online version is only be able to gather a subset of information about the test browser and platform. This information is derived from the `User Agent <http://en.wikipedia.org/wiki/User_agent>`_ string and contains information such as:

- Browser version (e.g 27.0.1453.116)
- OS (e.g. Windows NT 6.1; WOW64)

The User Agent string also provides other information such as layout engine and information that can be used to help derive whether the machine is suspected to be a mobile, tablet or laptop/desktop. User Agent spoofing is common and hence the accuracy of the information cannot be guaranteed. With the help of browser detection libraries and additional information can be used to make a "good estimate".

For the purpose of ensuring content on the web is platform/hardware agnostic it is common practice to seperate the interface to a feature from the software/hardware that implements it. In the case of WebGL, only limited information is provided about the render that implements the standard. For example it is possible to detect that the WebGL context is WebGL version 1.0 based on OpenGL ES 2.0, but little information about how this is delivered to the user. This should stop content relying on implementation specific behavior.
Some browsers also expose a WebGL extension called WEBGL_DEBUG_RENDERER_INFO, which it can be used to derive more detailed information about the render including vendor and the underlying hardware it is running on. For example on certain Windows machines it is possible to identify that the WebGL implementation is provided by the `ANGLE project <https://code.google.com/p/angleproject/>`_ which is using DirectX 9.

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

When the benchmark starts, the story mode camera navigates the environment moving from one area of the map to the other demonstrating different visual effects visible within the game on its way. The stages of the story (referred to as "Tests") are designed to show more of a certain type of visual effect that occurs during gameplay. For example during the "Battle" test more particle effects for explosions, weapon fire are visible.

**Introduction**

The hero character intially starts alone on the beach next to a shipwreck. The test takes place at dawn where the sun is low in the sky, where the hero's dynamic shadow can be seen by the changing time of day. The camera then pans across the world revealing more geometry before resting at the hero's outpost. Very little geometry is visible initially so with the global effects applied this forms the baseline performance for the benchmark.

**Battle**

The hero standing at the outpost is involved in a battle defending the outpost from a wave of enemies. This visually includes defensive turrets, fortifications and a number of different enemy types each using different weapons and strategies to attack. The majority of visual content are the particles that make up the explosions, damage and projectile geometry. The scene itself is chaotic and these effects appear and disappear quickly demonstrating the updating of particles.

**Chopping Trees**

The friendly wildings (know as lumberlings and wildlings) on the island collect resources for the player by chopping trees and mining stone. This involves rendering trees and stones at different levels of destruction. The resources that are dropped are unique to resource gathering. The test is set in an area of the map with an abundance of these resources. The trees themselves are hardware-skinned, sway gently and shake when chopped.

**Base**

The base constructed by the user contains buildings, wall defenses and additional visual items such as lamp posts, statues etc. Each entity contains geometry that casts shadows. As players progress through the game their base becomes more advanced. More building types, more geometry, more additional visual items. The base in the benchmark represents a reasonably complex base for players of a high level. Buildings also follow a level system that and become increasingly complex meshes with each level. The camera starts by panning across the base rendering as much of it as possible. As the scene fades to night, the hero pulls out his torch, a shadow-casting light that includes particle system with flames and smoke. As the hero moves his torch lights the geometry casting shadows as he goes.

Benchmark Investigation
-----------------------
In order to build polycraft.gl different methods for measuring benchmark performance were investigated. The browser environment has some complex behaviors making it difficult to accurately measure performance consistently and reliably. The findings of the investigation led the Turbulenz team to the benchmarking approach in polycraft.gl. The following are a selection of observations made whilst developing the benchmark:

- The team were intially interested in measuring how long it would take a frame to execute. The multi-threaded behavior of the browser's renderer process and the compositing meant that this information is not easily accessible to the page running the benchmark. One attempt was to use gl.finish to force frame synchronization. This turned out to not be a reliable method and not consistent in all browsers (https://code.google.com/p/chromium/issues/detail?id=242210).

- When initially looking to use hardware anti-aliasing, it was discovered that support varies between platform, browser and driver. Some hardware is black listed because of bugs (http://codeflow.org/entries/2013/feb/22/how-to-write-portable-webgl/) and could not be enabled even if capable. The benchmark opts to disabled hardware anti-aliasing by default relying on an implementation of FXAA that would be consitently run on all machines.

- Although setting the resolution of the WebGL canvas element is possible, the page has no control over the native resolution of the machine. For this reason the online benchmark will inform the user of the resolution that content is being played back at, but makes no attempt to adjust it. The recommendation to users looking to compare scores is to have this resolution the same for each machine they are comparing. This is less of an issue for the offline benchmark, which has a benchmark runner script that attempts to set the native resolution on certain platforms before running the benchmark.

- Using a fixed resolution render targets for rendering of the game produced more consistent timing results across different machines. This also meant that all hardware would have to process the same resolution of the game. By enabling a fullscreen effects that used the entire render target it meant the measurements on different machines were more meaningful.

- Having attempted to use multiple methods of controlling the rate at which frames were dispatched in JavaScript including using *setInterval* and *requestAnimationFrame*, the team concluded that requestAnimationFrame was the most reliable across the majority of the browsers because it is usually linked to the vertical sync of the screen. This has the downside that on many devices the frame rate is limited to 60fps. Investigation showed that having vsync enabled meant that different machines behaved more consistently each execution (setInterval skipped rendering frames in some browsers), so this option was chosen.

- The performance with and without vsync differed visible during testing (see vsync graphs). Although the benchmark can be configured to run with vsync disabled. Not all browsers were capable of disabling it (https://bugzilla.mozilla.org/show_bug.cgi?id=856427). Some browsers also exposed their interval scheduling behaviors, which was apparent by the 'banding' of frame times (see vsync graphs).

- Garbage collection can occur at anytime and affects the frequency of the requestAnimationFrame interval. On some machines this is a small pause for a couple frames, but on others it can be much more significant. Controlling the time when memory is no longer referenced and reducing the construction and destruction of objects in memory is a way of reducing the impact, but ultimately it will need to happen at some point in time. The team concluded that it is a natural behavior of JavaScript and therefore should be visible in results.

Scoring Methodology
-------------------

The scoring system used for polycraft.gl attempts to provide end-users with a summary of their browser/platform/hardware capability in a method that is easy to run and understand. The final score the benchmark provides is a sum of the score from each of the tests run in the benchmark. Each test has an equal score weighting. The benchmark score attempts to compare the machine to a theoretical machine that is able to play the benchmark at real-time at the intended resolution. If a machine is able to achieve this then it will be awarded the maximum score for that test. For example if the benchmark contains a gameplay recording at 60 frames per second and the machine is able to play the same frames back at 45 frames per second the machine will be awarded 3/4 of the score available.

To measure how fast a machine can run the tests the benchmark measures from one point in a frame to the same point in the next frame. The benchmark has no visibility of whether or not the information it dispatched has been rendered so it relies on the frequency of the requestAnimationFrame callback to tell it whether it more frames can be dispatched. A machine that is unable to process WebGL commands at the rate at which they are dispatched will increase the time between frames which in turn will affect the score awarded.


Recommendations
---------------
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


.. _webgl_benchmark: https://github.com/turbulenz/webgl_benchmark