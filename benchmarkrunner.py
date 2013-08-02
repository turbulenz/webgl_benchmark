# Copyright (c) 2013 Turbulenz Limited

from sys import argv
from argparse import ArgumentParser

from logging import basicConfig, CRITICAL, INFO, WARNING

from runner.browserrunner import BrowserRunner, list_browsers

__version__ = '0.0.1'

BROWSERRUNNER_DEVSERVER = "127.0.0.1:8070"
BROWSERRUNNER_TESTURLPATH = "/play/webgl-benchmark"
BROWSERRUNNER_TESTMODE = '/benchmark.canvas.debug.html'
BROWSERRUNNER_TESTURL = "http://" + BROWSERRUNNER_DEVSERVER + BROWSERRUNNER_TESTURLPATH + BROWSERRUNNER_TESTMODE

def main():
    parser = ArgumentParser(description="Run the benchmark with given settings.")
    parser.add_argument("-v", "--verbose", action="store_true", help="verbose output")
    parser.add_argument("-s", "--silent", action="store_true", help="silent running")
    parser.add_argument("--version", action='version', version=__version__)

    parser.add_argument("--browser", action='store', default='chrome',
        help="browser to run, must be one of [" + ','.join(list_browsers()) + "] (defaults to chrome)")

    args = parser.parse_args(argv[1:])

    if args.silent:
        basicConfig(level=CRITICAL)
    elif args.verbose:
        basicConfig(level=INFO)
    else:
        basicConfig(level=WARNING)

    browser_runner = BrowserRunner(None, args.browser)
    browser_runner.run(10)


if __name__ == '__main__':
    main()
