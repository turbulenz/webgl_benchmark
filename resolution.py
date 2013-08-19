# Copyright (c) 2013 Turbulenz Limited

from sys import argv
from argparse import ArgumentParser

from logging import basicConfig, CRITICAL, INFO, WARNING, error, info

import re

import os.path as path

__version__ = '0.0.1'

def main():
    parser = ArgumentParser(description="Run the benchmark with given settings.")
    parser.add_argument("-v", "--verbose", action="store_true", help="verbose output")
    parser.add_argument("-s", "--silent", action="store_true", help="silent running")
    parser.add_argument("--version", action='version', version=__version__)

    parser.add_argument("--parse", action='store', required=True, default='current_resolution.txt',
        help="parse the resolution stored in the file specified")

    args = parser.parse_args(argv[1:])

    if len(argv) == 0:
        error("Arguments required")
        args.print_help()
        return 1

    if args.silent:
        basicConfig(level=CRITICAL)
    elif args.verbose:
        basicConfig(level=INFO)
    else:
        basicConfig(level=WARNING)

    if not path.exists(args.parse):
        error("File to parse is missing: %s" % args.parse)
        return 1

    info('Reading parse file: %s' % args.parse)
    try:
        f = open(args.parse, 'r')
        res_str = f.readline()

        res_arr = res_str.split();
        if not len(res_arr) == 6:
            error("Unexpected resolution format: %s" % res_str)
            return 1
        resolution = res_arr[0][:-1].split("x")
        qres_str = "/X:%s /Y:%s /C:%s /R:%s" % (resolution[0], resolution[1], res_arr[1], res_arr[4])
        f.close()
        print qres_str
        return 0
    except IOError as e:
        msg = "Failed to read parse file({0}): {1}".format(e.errno, e.strerror)
        return 1

if __name__ == '__main__':
    main()