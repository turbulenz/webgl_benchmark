# Copyright (c) 2013 Turbulenz Limited

import StringIO
import errno

from sys import argv
from argparse import ArgumentParser
from os import getcwd, makedirs
from os.path import join, exists as path_exists
from json import load as json_load
from threading import Thread, BoundedSemaphore

from urllib2 import urlopen, HTTPError, URLError
from gzip import GzipFile
from socket import error as socket_error
from time import sleep

from logging import basicConfig, CRITICAL, INFO, WARNING, error, info

from runner.browserrunner import BrowserRunner, list_browsers

__version__ = '0.0.1'

BROWSERRUNNER_DEVSERVER = "127.0.0.1:8070"
BROWSERRUNNER_TESTURLPATH = "/play/webgl-benchmark"
BROWSERRUNNER_TESTMODE = '/benchmark.canvas.debug.html'
#BROWSERRUNNER_TESTURL = "http://" + BROWSERRUNNER_DEVSERVER + BROWSERRUNNER_TESTURLPATH + BROWSERRUNNER_TESTMODE
BROWSERRUNNER_TESTURL = "file://" + getcwd() + BROWSERRUNNER_TESTMODE

CONFIG_PATH = "scripts/config.js"
CONFIGS_DIR_PATH = "scripts/configurations/"

STREAM_MAPPING_PATH = "config/stream_mapping.json"
CAPTURES_PATH = "test-captures/"
ASSETS_PATH = "test-captures/"

NUM_FRAMES = 3600
NUM_FRAMES_BLOCK = 60

CONFIG_TEMPLATE = ( "/* Generated by benchmarkrunner.py */\n"
                    "%s\n"
                    "//\n"
                    "// Name: %s\n"
                    "//\n"
                    "// Config - %s\n"
                    "//\n"
                    "\n"
                    "function Config() {}\n"
                    "Config.prototype = {};\n"
                    "\n"
                    "Config.create = function configCreateFn()\n"
                    "{\n"
                    "    var config = %s.create();\n"
                    "    %s\n"
                    "    %s\n"
                    "    return config;\n"
                    "};" )

def mkdir(path, verbose=True):
    if verbose:
        info('Creating: %s' % path)
    try:
        makedirs(path)
    except OSError as exc:
        if exc.errno == errno.EEXIST:
            pass
        else:
            raise

def generate_globals(globals_list=None):
    if globals_list is None:
        return ""

    globals_string = ""
    for g in globals_list:
        globals_string += "/*globals %s: false*/\n" % g

    return globals_string

def generate_config(config_name="default", config_target=None, allow_querystring=False):

    config_inherit = "BaseConfig"
    if config_target == "online":
        config_inherit = "OnlineConfig"

    if config_target == "offline":
        config_inherit = "OfflineConfig"

    globals_list = [config_inherit]

    if allow_querystring:
        globals_list.append("updateDictFromQueryString")
        config_querystring = "updateDictFromQueryString(config);"
    else:
        config_querystring = ""

    config_globals = generate_globals(globals_list)

    if config_target == "online":
        config_desc = "The online configuration, targeting online data"
    elif config_target == "offline":
        config_desc = "The offline configuration, to run without an internet connection or local server"
    elif config_target == "local":
        config_desc = "The local configuration, to run with either online or offline data via the local server"
    else: #default
        config_desc = "The standard configuration, no changes to the base"

    config_override = "config.defaultCapture = \"" + config_name + "\";"

    #TODO: Output to file
    config_output = CONFIG_TEMPLATE % (config_globals, config_name, config_desc, config_inherit, config_override, config_querystring)

    try:
        f = open(CONFIG_PATH, 'w')
        f.write(config_output)
        f.close()
        return True
    except IOError:
        raise Exception("Failed to write config file: %s" % CONFIG_PATH)

def download(url, target_filename=None, retries=0, return_data=False):
    num_attempts = retries + 1
    while num_attempts:
        try:
            connection = urlopen(url)
        except HTTPError as e:
            error('Failed downloading %s: HTTPError %s' % (url, e.code))
        except URLError as e:
            error('Failed downloading %s: URLError %s' % (url, e))
        except socket_error:
            print 'Error during download%s' % ' will retry in 2 secs' if num_attempts else ''
        else:
            output = StringIO.StringIO()
            try:
                if connection.headers.getheader('Content-Encoding', None) == 'gzip':
                    iobuf = StringIO.StringIO()
                    iobuf.write(connection.read())
                    iobuf.seek(0)
                    output.write(GzipFile(fileobj=iobuf).read())
                else:
                    output.write(connection.read())
                if target_filename:
                    with open(target_filename, 'wb') as f:
                        f.write(output.getvalue())
                if return_data:
                    return output.getvalue()
            except socket_error:
                print 'Error during download%s' % ' will retry in 2 secs' if num_attempts else ''

        num_attempts -= 1
        if num_attempts:
            sleep(2)
    return None

def downloader(path, output_path, bounded_semaphore):
    print 'Downloading %s' % path
    download(path, output_path, retries=3)
    bounded_semaphore.release()

def download_assets(config_name="default", max_connections=20):
    with open(STREAM_MAPPING_PATH, 'rt') as f:
        config = json_load(f)

    try:
        download_prefix = 'http://%s%s/' % (config['prefixCaptureURL'], config['captureLookUp'][config_name])
    except KeyError:
        error('No capture path for config name %s' % config_name)
        exit(1)

    output_prefix = capture_output_path = join(CAPTURES_PATH, config_name)
    mkdir(CAPTURES_PATH)
    mkdir(output_prefix)

    bounded_semaphore = BoundedSemaphore(max_connections)
    threads = []

    def add_downloader(file_name):
        download_path = '%s%s' % (download_prefix, file_name)
        output_path = join(output_prefix, file_name)

        if not path_exists(output_path):
            threads.append(Thread(target=downloader, args=[download_path, output_path, bounded_semaphore]))

    for start_frame in xrange(0, NUM_FRAMES, NUM_FRAMES_BLOCK):
        block_postfix = '%d-%d' % (start_frame, start_frame + NUM_FRAMES_BLOCK - 1)
        add_downloader('resources-%s.json' % block_postfix)
        add_downloader('frames-%s.json' % block_postfix)
        add_downloader('data-%s.bin' % block_postfix)

    for t in threads:
        bounded_semaphore.acquire()
        t.start()

    for t in threads:
        t.join()

    threads = []
    download_prefix = 'http://%s' % config['prefixAssetURL']
    output_prefix = ASSETS_PATH
    mkdir(output_prefix)
    mkdir(output_prefix + '/staticmax')

    for start_frame in xrange(0, NUM_FRAMES, NUM_FRAMES_BLOCK):
        block_postfix = '%d-%d' % (start_frame, start_frame + NUM_FRAMES_BLOCK - 1)
        with open(join(capture_output_path, 'resources-%s.json' % block_postfix)) as f:
            resources_data = json_load(f)
            if resources_data.has_key('resources'):
                resources_data = resources_data['resources']

                if resources_data.has_key('textures'):
                    textures = resources_data['textures']
                    for tex in textures.itervalues():
                        if tex.has_key('src'):
                            src = tex['src']
                            if src:
                                add_downloader(src)

                if resources_data.has_key('videos'):
                    videos = resources_data['videos']
                    for video in videos.itervalues():
                        if video.has_key('src'):
                            src = video['src']
                            if src:
                                add_downloader(src)

    for t in threads:
        bounded_semaphore.acquire()
        t.start()

    for t in threads:
        t.join()



def main():
    parser = ArgumentParser(description="Run the benchmark with given settings.")
    parser.add_argument("-v", "--verbose", action="store_true", help="verbose output")
    parser.add_argument("-s", "--silent", action="store_true", help="silent running")
    parser.add_argument("--version", action='version', version=__version__)

    parser.add_argument("--config", action='store', default='shadows_norendertarget',
        help="the configuration to run (by name)")
    parser.add_argument("--target", action='store', default='offline',
        help="the target to run [offline, online, local]")
    parser.add_argument("--browser", action='store', default='chrome',
        help="browser to run, must be one of [" + ','.join(list_browsers()) + "] (defaults to chrome)")

    args = parser.parse_args(argv[1:])

    if args.silent:
        basicConfig(level=CRITICAL)
    elif args.verbose:
        basicConfig(level=INFO)
    else:
        basicConfig(level=WARNING)

    try:
        generate_config(config_name=args.config, config_target=args.target, allow_querystring=True)
        if args.target == 'offline':
            download_assets(config_name=args.config)
    except Exception as ex:
        error(str(ex))
        return 1

    browser_runner = BrowserRunner(None, args.browser)
    browser_runner.run(BROWSERRUNNER_TESTURL, timeout=300) # 5 minute timeout

    return 0

if __name__ == '__main__':
    main()
