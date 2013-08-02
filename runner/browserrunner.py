# Copyright (c) 2010-2013 Turbulenz Limited

# pylint:disable=W0703

from time import time, sleep

import runner.browsercontrol as browsercontrol
from runner.utils import simple_config

(PWD, TURBULENZOS, TURBULENZROOT) = simple_config()

############################################################
# Utils
############################################################

def list_browsers():
    return browsercontrol.list_controls()

############################################################
# Browser Runner
############################################################

class BrowserRunner():

    def __init__(self, config, browser_name):
        self.browser_name = browser_name
        self.browsercontrol = None
        self.profile = None
        self.browser_bin = None

        self.verbose("BrowserRunner( %s )" % (browser_name))

    def verbose(self, msg):
        print "[enginetest] %s" % msg

    def shutdown(self):
        if self.browsercontrol:
            self.browsercontrol.shutdown()

    def run(self, url, timeout=60):

        def launch():
            self.verbose("Launching browsercontrol at url: %s" % url)
            self.browsercontrol = browsercontrol.get_control(self.browser_name,
                                                             url,
                                                             self.browser_bin,
                                                             profile=self.profile)

        # Start the browser if it hasn't been started.

        if not self.browsercontrol:
            launch()
        else:
            self.verbose("Reloading browser")
            if TURBULENZOS in [ 'win32', 'win64' ]:
                # Reload seems to not work half the time on firefox 15 windows, for now quit and relaunch
                self.browsercontrol.close()
                self.browsercontrol.shutdown()
                launch()
            else:
                self.browsercontrol.reload()

        # Setup some variables
        startTime = time()

        # If we are in browser-debug mode, we simply wait for the
        # browser to close, and then return.

        exec_tries = 3

        # Poll the file for up to n seconds, each time checking whether
        # the standalone process has crashed (so we can early out).

        try:

            deadline = startTime + timeout

            result = None

            while timeout > 0:
                curTime = time()
                self.verbose("(browser) tick %s (deadline: %s) ..." \
                                        % (curTime,  deadline))

                if curTime > deadline:
                    self.verbose("(browser) Timeout was hit.  Giving up ...")
                    result = 'timeout'

                    self.browsercontrol.shutdown()
                    self.browsercontrol = None
                    break

                appExit = self.browsercontrol.exit_value()
                if appExit is not None:
                    exec_tries = exec_tries - 1

                    self.verbose("(browser) App terminated.  Must have " \
                                     "crashed.  %d tries left" % exec_tries)

                    if exec_tries > 0:
                        self.browsercontrol.close()
                        self.browsercontrol.shutdown()
                        self.browsercontrol = None

                        self.verbose("(browser) retry url: %s" % self.html_file_url)
                        launch()
                        deadline = startTime + timeout
                        continue

                    result = 'crash'

                    self.browsercontrol.close()
                    self.browsercontrol = None

                    break

                sleep(0.1)

            return result

        # If anything goes wrong, make sure the standalone app is
        # terminated.

        except Exception:
            self.browsercontrol.shutdown()
            raise
