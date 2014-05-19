# Copyright (c) 2013 Turbulenz Limited

import StringIO
import errno
import json
import re
import csv
import calendar
import posixpath

from sys import argv
from argparse import ArgumentParser
from glob import glob
from os import getcwd, makedirs, walk, curdir, pardir
from os.path import join as path_join, exists as path_exists, abspath, dirname, normpath, relpath
from os.path import splitdrive as path_splitdrive, split as path_split, commonprefix as path_commonprefix
from json import load as json_load, dumps as json_dumps
from threading import Thread, BoundedSemaphore
from shutil import rmtree, copy as shutil_copy, copytree as shutil_copytree

from urllib2 import urlopen, HTTPError, URLError, unquote
from gzip import GzipFile
from socket import error as socket_error
from time import sleep
from datetime import datetime
from re import compile as re_compile

from traceback import format_exc

from logging import basicConfig, CRITICAL, INFO, WARNING, error, info, warn

from runner.browserrunner import BrowserRunner, list_browsers
from runner.utils import simple_config, sh, CalledProcessError

import urlparse
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from SimpleHTTPServer import SimpleHTTPRequestHandler
from SocketServer import TCPServer


(PWD, OS, _) = simple_config()

__version__ = '0.0.2'

BROWSERRUNNER_DEVSERVER = "127.0.0.1:8070"
BROWSERRUNNER_TESTURLPATH = "/#/play/webgl-benchmark"
BROWSERRUNNER_TESTMODE = '/benchmark.canvas.debug.html'

# The name used by the server
SERVERNAME = "WebGL Benchmark Server"

CONFIG_PATH = "scripts/config.js"
CONFIGS_DIR_PATH = "scripts/configurations/"

STREAM_MAPPING_PATH = "assets/config/stream_mapping.json"
CAPTURES_PATH = "capture/"
ASSETS_PATH = "capture/"
OUTPUT_PATH = "output/"

STATIC_TEMPLATE_PATH = "templates/page/"
STATIC_OUTPUT_PATH = "static_page/"

DEFAULT_SEQUENCE_NAME = "Story"
DEFAULT_CAPTURE_NAME = "story_high_particles"
DEFAULT_TEST_NAME = "story_flythrough_full"

BENCHMARK_TIMEOUT = 300

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
                    "    %s\n"
                    "    %s\n"
                    "    %s\n"
                    "    %s\n"
                    "    %s\n"
                    "    return config;\n"
                    "};" )

TEMPLATES_DIR = "assets/config/templates"
DATA_DIR = "data"
RESULTS_TEMPLATE_FILENAME = "results_template.json"

SYSTEM_INFO_FIELDS_WIN = ['OS Name', 'Host Name', 'Total Physical Memory', 'System Type', 'OS Version', 'Processor(s)']
SYSTEM_INFO_MAPPING_WIN = {
    'OS Name': ['osName'],
    'Host Name': ['machineName'],
    'Total Physical Memory': ['totalMemory'],
    'System Type': ['platformArchitecture'],
    'OS Version': ['osVersion'],
    'Processor(s)': ['processor']
}

RELEASE_FILES = [
    "benchmark.canvas.js",
    "benchmark.canvas.release.html",
    "mapping_table.json",
    "img/favicon.ico",
    "img/logo.png",
    "img/sidebar-item.png",
    "img/titlebar.png",
    "css/base_template.css",
    "assets/config/stream_mapping.json",
    "assets/config/templates/online/results_template-default.json",
    "assets/config/templates/offline/results_template-default.json",
    "js/d3.v3/d3.v3.js",
    "js/whichbrowser-js-min.js"
]

RELEASE_PAGE_FILES = [
    "favicon.ico",
    "favicon.ico.gz",
    "index.html",
    "css/*.css",
    "font/*",
    "img/*",
    "js/*"
]

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

def generate_filename(name):
    return re.sub(r'[^a-zA-Z0-9 ]', '-', name).lower().replace(' ', '_')

def generate_globals(globals_list=None):
    if globals_list is None:
        return ""

    globals_string = ""
    for g in globals_list:
        globals_string += "/*globals %s: false*/\n" % g

    return globals_string

def read_csv(filepath, fields=None):
    if not path_exists(filepath):
        raise Exception("File does not exist: %s" % filepath)

    file_dict = {}
    field_dict = {}

    def add_to_file_dict(fieldname, value):
        file_dict[fieldname] = value
        return fieldname


    def add_to_field_dict(index, fieldname):
        field_dict[index] = fieldname
        return index

    try:
        f = open(filepath, 'r')
        reader = csv.reader(f)

        rownum = 0
        for row in reader:
            if rownum == 0:
                if fields is None:
                    for i in range(len(row)):
                        add_to_field_dict(i, row[i])
                else:
                    for field in row:
                        if field in fields:
                            add_to_field_dict(row.index(field), field)
            else:
                for i in range(len(row)):
                    if i in field_dict:
                        add_to_file_dict(field_dict[i], row[i])

            rownum += 1
        f.close()
    except IOError:
        raise Exception("Failed to read CSV file: %s" % filepath)

    return file_dict


def get_systeminfo(hardware_name):
    hardware_dict = {}
    hardware_filename = generate_filename(hardware_name)
    hardware_dir = path_join(DATA_DIR, hardware_filename)
    if OS == 'win32':

        print "Gathering System Information..."
        timestamp = calendar.timegm(datetime.utcnow().utctimetuple()) * 1000
        systeminfo_filename = '%s-systeminfo.csv' % timestamp
        systeminfo_dir = path_join(PWD, hardware_dir)
        systeminfo_filepath = path_join(systeminfo_dir, systeminfo_filename)

        if not path_exists(systeminfo_dir):
            mkdir(systeminfo_dir)

        info("Generating systeminfo: %s" % systeminfo_filepath)
        systeminfo_command_win = ["systeminfo", "/FO", "CSV",  ">", systeminfo_filepath]
        try:
            sh(systeminfo_command_win, shell=True)
        except CalledProcessError as e:
            raise Exception("System information gathering failed: %s" % e)

        info("OS:%s: Looking for systeminfo.csv" % OS)
        systeminfo_filenames = []
        for _, _, files in walk(hardware_dir):
            for name in files:
                if name.lower().endswith('systeminfo.csv'):
                    info("Found systeminfo file: %s" % name)
                    systeminfo_filenames.append(name)

        info("Found %d systeminfo files" % len(systeminfo_filenames))
        latest_timestamp = -1
        latest_systeminfo_filename = None
        for systeminfo_filename in systeminfo_filenames:
            timestamp_endindex = systeminfo_filename.rfind("-systeminfo")
            if timestamp_endindex == -1:
                raise Exception("System info file is formatted incorrectly: %s" % systeminfo_filename)
            timestamp_str = systeminfo_filename[0:timestamp_endindex]
            if timestamp_str == "":
                raise Exception("System info file is missing timestamp: %s" % systeminfo_filename)
            try:
                timestamp = int(timestamp_str)
                if timestamp > latest_timestamp:
                    latest_timestamp = timestamp
                    latest_systeminfo_filename = systeminfo_filename
            except ValueError as e:
                raise Exception("Timestamp cannot be parsed: %s" % e)

        if latest_systeminfo_filename is None:
            info("No suitable file for systeminfo")
            return False

        info("Using file: %s" % latest_systeminfo_filename)
        try:
            timestamp_date = datetime.utcfromtimestamp(latest_timestamp / 1000.0)
            timestamp_format = "%Y-%m-%d %H:%M:%S UTC"
            timestamp_formatted_str = timestamp_date.strftime(timestamp_format)
            info("System Info recorded on: %s" % timestamp_formatted_str)
        except ValueError as e:
            raise Exception("System Info timestamp cannot be read: %s" % e)

        systeminfo_filepath = path_join(hardware_dir, latest_systeminfo_filename)
        systeminfo_dict = read_csv(systeminfo_filepath, fields=SYSTEM_INFO_FIELDS_WIN)

        def process_systeminfo_field(fieldname):
            #TODO: Process totalMemory
            if fieldname == 'System Type':
                processorArch = ''
                windowSystemType = systeminfo_dict[fieldname].lower()
                if windowSystemType.find('x64') != -1:
                    processorArch = 'x64'
                elif windowSystemType.find('x86'):
                    processorArch = 'x86'

                # Don't add system type if unknown
                if processorArch != '':
                    hardware_dict[SYSTEM_INFO_MAPPING_WIN[fieldname][0]] = processorArch
            else:
                hardware_dict[SYSTEM_INFO_MAPPING_WIN[fieldname][0]] = systeminfo_dict[fieldname]

        map(process_systeminfo_field, SYSTEM_INFO_FIELDS_WIN)
        return hardware_dict
    else:
        warn('System information not supported for OS: %s' % OS)
        return None

def generate_results_template(results_template_name=None, config_target=None, hardware_name=None):

    if config_target is None:
        raise Exception("Target missing from results template")

    if results_template_name is None:
        raise Exception("Template name is missing from results template")

    info("Generating results template for: %s" % results_template_name)

    base_template_path = normpath(path_join(TEMPLATES_DIR, config_target, RESULTS_TEMPLATE_FILENAME))
    results_template_filename = results_template_name + '.json'
    results_template_path = normpath(path_join(TEMPLATES_DIR, config_target, results_template_filename))

    if results_template_path == base_template_path:
        raise Exception("Template name is the same as the base template name")

    if not path_exists(base_template_path):
        raise Exception("Base template is missing: %s" % base_template_path)

    info("Using base template: %s" % base_template_path)

    try:
        f = open(base_template_path, 'r')
        base_template = json.load(f)
        f.close()
    except IOError:
        raise Exception("Failed to read base template file: %s" % base_template_path)

    if base_template['version'] != 0:
        raise Exception("Do not understand base template files with version: %s" % base_template['version'])

    try:
        results_config = base_template['config']

        # Add hardware information
        info("Adding configuration: hardware")
        hardware_config = results_config['hardware']

        if hardware_name is not None:
            info("Hardware name: %s" % hardware_name)
            # A blank hardware name will require the browser to prompt
            hardware_config['name'] = hardware_name

            # Add system info if it exists
            systeminfo_dict = get_systeminfo(hardware_name=hardware_name)
            if systeminfo_dict is not None:
                info("Adding systeminfo")
                for s in systeminfo_dict:
                    hardware_config[s] = systeminfo_dict[s]
        else:
            info("No hardware name, skipping systeminfo")

    except KeyError as e:
        raise Exception("Results template is missing section: %s" % e)

    try:
        f = open(results_template_path, 'w')
        json.dump(base_template, f)
        f.close()
    except IOError:
        raise Exception("Failed to write results template file: %s" % results_template_path)

def generate_config(config_name="default", config_target=None, allow_querystring=False, results_template_name=None):

    info("Generating config for %s" % config_name)
    config_inherit = "BaseConfig"
    if config_target == "online":
        config_inherit = "OnlineConfig"

    if config_target == "offline":
        config_inherit = "OfflineConfig"

    info("Base config: %s" % config_inherit)
    globals_list = [config_inherit]

    if allow_querystring:
        globals_list.append("updateDictFromQueryString")
        config_querystring = "updateDictFromQueryString(config);"
    else:
        config_querystring = ""

    config_globals = generate_globals(globals_list)

    config_default_sequence_name = "config.defaultSequenceName = \"%s\";" % DEFAULT_SEQUENCE_NAME
    config_default_test_name = "config.defaultTestName = \"%s\";" % DEFAULT_TEST_NAME
    config_stream_ids = ""

    try:
        with open(STREAM_MAPPING_PATH, 'r') as f:
            stream_mapping = json_load(f)
    except IOError:
        raise Exception("Missing required file: %s" % STREAM_MAPPING_PATH)

    try:
        stream_ids = stream_mapping['captureLookUp']
        config_stream_ids = "config.streamIDs = " + json_dumps(stream_ids) + ";"
    except KeyError:
        pass

    config_prefix_templates_url = ""
    if config_target == "online":
        config_desc = "The online configuration, targeting online data"
    elif config_target == "offline":
        config_desc = "The offline configuration, to run without an internet connection or local server"

    elif config_target == "local":
        config_desc = "The local configuration, to run with either online or offline data via the local server"
    else: #default
        config_desc = "The standard configuration, no changes to the base"

    config_override = "config.defaultCapture = \"" + config_name + "\";"

    if results_template_name is not None:
        info("Using resultsTemplate: %s" % results_template_name)
        config_results_template = "config.resultsTemplate = \"" + results_template_name + "\";"
    else:
        info("Using default resultsTemplate")
        config_results_template = ""

    #TODO: Output to file
    config_output = CONFIG_TEMPLATE % ( config_globals, \
                                        config_name, \
                                        config_desc, \
                                        config_inherit, \
                                        config_override, \
                                        config_results_template, \
                                        config_prefix_templates_url, \
                                        config_default_sequence_name, \
                                        config_default_test_name, \
                                        config_stream_ids, \
                                        config_querystring)

    try:
        info("Writing resultsTemplate: %s" % CONFIG_PATH)
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
            info('Error during download%s' % ' will retry in 2 secs' if num_attempts else '')
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
                error('Error during download%s' % ' will retry in 2 secs' if num_attempts else '')

        num_attempts -= 1
        if num_attempts:
            sleep(2)
    return None

def downloader(path, output_path, bounded_semaphore):
    download(path, output_path, retries=3)
    bounded_semaphore.release()

def download_assets(config_name="default", max_connections=20, force_download=False):
    try:
        with open(STREAM_MAPPING_PATH, 'r') as f:
            config = json_load(f)
    except IOError:
        error('Missing stream mapping file: %s' % STREAM_MAPPING_PATH)
        exit(1)
    except ValueError as e:
        error('Stream mapping file %s has invalid format: %s' % (STREAM_MAPPING_PATH, str(e)))
        exit(1)

    try:
        download_prefix = 'http://%s%s/' % (config['prefixCaptureURL'], config['captureLookUp'][config_name])
    except KeyError:
        error('No capture path for config name %s' % config_name)
        exit(1)

    info("Looking for config '%s' data: %s" % (config_name, download_prefix))

    output_prefix = capture_output_path = path_join(CAPTURES_PATH, config_name)

    # Create capture path if missing
    mkdir(CAPTURES_PATH)

    # Create path for capture data
    mkdir(output_prefix)

    bounded_semaphore = BoundedSemaphore(max_connections)
    threads = []
    paths = []

    if force_download:
        info("Force download enabled")

    def add_downloader(file_name):
        download_path = '%s%s' % (download_prefix, file_name)
        output_path = path_join(output_prefix, file_name)

        if not path_exists(output_path) or force_download:
            threads.append(Thread(target=downloader, args=[download_path, output_path, bounded_semaphore]))
            paths.append(download_path)

    add_downloader('meta.json')
    for start_frame in xrange(0, NUM_FRAMES, NUM_FRAMES_BLOCK):
        block_postfix = '%d-%d' % (start_frame, start_frame + NUM_FRAMES_BLOCK - 1)
        add_downloader('resources-%s.json' % block_postfix)
        add_downloader('frames-%s.json' % block_postfix)
        add_downloader('data-%s.bin' % block_postfix)

    for (i, t) in enumerate(threads):
        t.daemon = True
        bounded_semaphore.acquire()
        print('Downloading recording %-3d/%d (%s)' % (i + 1, len(threads), paths[i]))
        t.start()

    for t in threads:
        t.join()

    threads = []
    paths = []
    download_prefix = 'http://%s' % config['prefixAssetURL']
    output_prefix = ASSETS_PATH

    # Create assets path if missing
    mkdir(output_prefix)

    # Create path for assets
    output_staticmax_path = path_join(output_prefix, 'staticmax')
    mkdir(output_staticmax_path)

    for start_frame in xrange(0, NUM_FRAMES, NUM_FRAMES_BLOCK):
        block_postfix = '%d-%d' % (start_frame, start_frame + NUM_FRAMES_BLOCK - 1)
        with open(path_join(capture_output_path, 'resources-%s.json' % block_postfix)) as f:
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

    for (i, t) in enumerate(threads):
        t.daemon = True
        bounded_semaphore.acquire()
        print('Downloading assets %-3d/%d (%s)' % (i + 1, len(threads), paths[i]))
        t.start()

    for t in threads:
        t.join()

def copy_release():

    if path_exists(STATIC_OUTPUT_PATH):
        rmtree(STATIC_OUTPUT_PATH)

    for pattern in RELEASE_PAGE_FILES:
        for f in glob(path_join(STATIC_TEMPLATE_PATH, pattern)):
            srcfile = normpath(f)
            dstfile = normpath(path_join(STATIC_OUTPUT_PATH, relpath(f, STATIC_TEMPLATE_PATH)))
            dst_dir = dirname(dstfile)
            if dst_dir != "" and not path_exists(dst_dir):
                makedirs(dst_dir)
            shutil_copy(srcfile, dstfile)

    for f in RELEASE_FILES:
        srcfile = normpath(f)
        dstfile = normpath(path_join(STATIC_OUTPUT_PATH, f))
        dst_dir = dirname(dstfile)
        if dst_dir != "" and not path_exists(dst_dir):
            makedirs(dst_dir)
        shutil_copy(srcfile, dstfile)

    shutil_copytree(normpath('staticmax'), path_join(STATIC_OUTPUT_PATH, 'staticmax'))
    shutil_copytree(path_join(CAPTURES_PATH, DEFAULT_CAPTURE_NAME), path_join(STATIC_OUTPUT_PATH, CAPTURES_PATH, DEFAULT_CAPTURE_NAME))
    shutil_copytree(path_join(CAPTURES_PATH, 'staticmax'), path_join(STATIC_OUTPUT_PATH, CAPTURES_PATH, 'staticmax'))

class ServerOptions:
    def __init__(self, port = 8070, static = False):
        self.port = port
        self.static = static

def start_server(output_path, server_options):

    # This is a hack to patch slow socket.getfqdn calls that
    # BaseHTTPServer (and its subclasses) make.
    # See: http://bugs.python.org/issue6085
    # See: http://www.answermysearches.com/xmlrpc-server-slow-in-python-how-to-fix/2140/
    def _bare_address_string(self):
        host, _ = self.client_address[:2]
        return str(host)

    BaseHTTPRequestHandler.address_string = _bare_address_string

    class RequestsSaveHandler(BaseHTTPRequestHandler):

        # Forced regex to include 'data' to avoid overwriting any files with the API
        local_save_regex = re_compile('/local/v1/save/([^/]+)/data/([^/]+)/(.*)')

        def do_POST(self):  # pylint: disable=C0103

            def ok(msg='{"ok":true}'):  # pylint: disable=C0103
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Expires', '-1')

                self.end_headers()
                self.wfile.write(msg)
                self.wfile.close()

            def save_file(args):
                game_slug = args[0]
                username = args[1]
                filepath = args[2]

                info("Save file request: game_slug=%s, username=%s, filepath=%s" % (game_slug, username, filepath))

                content_type = self.headers.getheader('content-type')
                if not content_type or not 'application/x-www-form-urlencoded; charset=UTF-8' in content_type:
                    unsupported_error = 'Unsupported Content-Type: %s' % content_type
                    error(unsupported_error)
                    self.send_error(400, unsupported_error)
                    return

                if '..' in filepath:
                    subdir_error = 'Filename must be a sub directory (cannot contain "..")'
                    self.send_error(400, subdir_error)
                    return

                length = int(self.headers.getheader('content-length'))
                post_data = urlparse.parse_qs(self.rfile.read(length).decode('utf-8'))
                content = post_data['content'][0]
                if not content:
                    content_error = 'Missing argument: content'
                    error(content_error)
                    self.send_error(400, content_error)
                    return

                file_path = normpath(path_join(output_path, 'data', username, normpath(filepath)))

                info("Writing to path %s: " % file_path)
                mkdir(dirname(file_path))

                with open(file_path, 'w') as f:
                    f.write(content)

                ok()

            path = self.path
            info('POST request: %s' % path)

            try:
                match = self.local_save_regex.match(path)
                if match:
                    info(match.groups())
                    save_file(match.groups())
                else:
                    match_error = 'Not Found: %s' % self.path
                    error(match_error)
                    self.send_error(404, match_error)

            except IOError:
                io_error = 'File Not Found: %s' % self.path
                error(io_error)
                self.send_error(404, io_error)
            except Exception:
                log_msg = 'Exception when processing request: %s' % self.path
                trace_string = format_exc()

                error(log_msg)
                error(trace_string)

                self.send_error(500, 'Internal Server Error')

        def do_GET(self):
            # Respond with a blank page
            info('GET request: %s' % self.path)
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write("<html><head><title>%s</title></head><body></body></html>" % SERVERNAME)

    STATIC_ROUTES = (
        ['data', abspath(path_join(getcwd(), 'data'))],
        ['', output_path]
    )

    class StaticHTTPRequestHandler(SimpleHTTPRequestHandler):

        def translate_path(self, path):
            root = getcwd()
            for pattern, rootdir in STATIC_ROUTES:
                if path.startswith(pattern):
                    path = path[len(pattern):]
                    root = rootdir
                    break;

            path = path.split('?',1)[0]
            path = path.split('#',1)[0]
            path = posixpath.normpath(unquote(path))
            words = path.split('/')
            words = filter(None, words)

            path = root
            for word in words:
                drive, word = path_splitdrive(word)
                head, word = path_split(word)
                if word in (curdir, pardir):
                    continue
                path = path_join(path, word)

            return path

    print "Starting capture server: %s" % SERVERNAME
    info("Running in directory: %s" % output_path)
    try:
        server_handler = RequestsSaveHandler
        server_class = HTTPServer
        if server_options.static:
            server_handler = StaticHTTPRequestHandler
            server_class = TCPServer
        server = server_class(('', server_options.port), server_handler)
        def run_server_thread(server):
            server.serve_forever()

        t = Thread(target=run_server_thread, args=[server])
        t.daemon = True
        t.start()
        return server
    except socket_error:
        return None

def main():
    parser = ArgumentParser(description="Run the benchmark with given settings.")
    parser.add_argument("-v", "--verbose", action="store_true", help="verbose output")
    parser.add_argument("-s", "--silent", action="store_true", help="silent running")
    parser.add_argument("--version", action='version', version=__version__)

    browser_list = [browser for browser in list_browsers() if browser != 'explorer']

    parser.add_argument("--config", action='store', default=DEFAULT_CAPTURE_NAME,
        help="the configuration to run (by name)")
    parser.add_argument("--target", action='store', choices=['online', 'offline'], default='offline',
        help="the target to run")
    parser.add_argument("--browser", action='store', choices=browser_list, default='chrome',
        help="browser to run (defaults to chrome)")
    parser.add_argument("--server", action='store_true',
        help="only run the server (for saving data files to disk)")
    parser.add_argument("--hardware-name", action='store', default='default',
        help="the name of the hardware to save in the results")
    parser.add_argument("--no-run", action='store_true',
        help="do not run the browser after the configuration step")
    parser.add_argument("--force-download", action='store_true',
        help="download the capture date, even if the file(s) already exists")
    parser.add_argument("--browser-path", action='store', default=None,
        help="the path to the browser binary to run. This must be used in conjunction with the --browser option in " +
             "the case where the user wants to override the default browser path")
    parser.add_argument("--browser-profile", action='store', default=None,
        help="the name of the profile to launch the browser with if supported. On Firefox this is name of the" +
             " profile. On Chrome this the profile directory.")
    parser.add_argument("--copy-release", action='store_true',
        help="copy the release build of the benchmark to the '%s' directory." % STATIC_OUTPUT_PATH)
    parser.add_argument("--release", action='store_true',
        help="run the release build of the benchmark server in the '%s' directory." % STATIC_OUTPUT_PATH)

    args = parser.parse_args(argv[1:])

    if args.silent:
        basicConfig(level=CRITICAL)
    elif args.verbose:
        basicConfig(level=INFO)
    else:
        basicConfig(level=WARNING)

    if args.copy_release:
        info("Copying release files to '%s' directory" % STATIC_OUTPUT_PATH)
        copy_release()
        if not args.server:
            return

    if args.server:
        info("Starting server only mode")
        serve_dir = abspath('.')
        if args.release:
            server_options = ServerOptions(port = 8000, static = True)
            serve_dir = abspath(STATIC_OUTPUT_PATH)
        else:
            server_options = ServerOptions()

        server = start_server(serve_dir, server_options)
        if not server:
            print 'Address 127.0.0.1:8070 already in use'
            return
        print 'Press enter to stop ...'
        try:
            raw_input()
        except KeyboardInterrupt:
            pass
        server.shutdown()
        return

    hardware_name_filename = generate_filename(args.hardware_name)
    if args.hardware_name == 'default':
        hardware_name = None
    else:
        hardware_name = args.hardware_name

    info("Benchmark Runner Arguments: %s" % args)

    results_template_name = 'results_template-' + hardware_name_filename

    generate_config(config_name=args.config, config_target=args.target, allow_querystring=True,
                    results_template_name=results_template_name)
    generate_results_template(results_template_name=results_template_name, config_target=args.target,
                              hardware_name=hardware_name)
    if args.target == 'offline':
        download_assets(config_name=args.config, force_download=args.force_download)

    if args.browser != 'chrome':
        warn("Browser option: %s is untested. For a tested browser, use chrome." % args.browser)

    server = None
    try:
        if not args.no_run:
            warn("Browser will automatically close if benchmark takes longer than %d seconds to run" % BENCHMARK_TIMEOUT)
            command_line_args = None

            if args.target == 'offline':
                server = start_server(abspath('.'))
                if args.browser == 'chrome':
                    command_line_args = "--disable-web-security --allow-file-access-from-files --kiosk"
                BROWSERRUNNER_TESTURL = "file://" + getcwd() + BROWSERRUNNER_TESTMODE
            else:
                BROWSERRUNNER_TESTURL = "http://" + BROWSERRUNNER_DEVSERVER + \
                                        BROWSERRUNNER_TESTURLPATH + BROWSERRUNNER_TESTMODE

            browser_runner = BrowserRunner(None, args.browser, browser_bin=args.browser_path,
                                           profile=args.browser_profile)
            browser_runner.run(BROWSERRUNNER_TESTURL, timeout=BENCHMARK_TIMEOUT,
                               command_line_args=command_line_args) # 5 minute timeout
        else:
            info("No-run called")
    except Exception as e:
        # Catch exceptions to shutdown server correctly
        error(str(e))

    if server:
        server.shutdown()

    info("Done")
    return 0

if __name__ == '__main__':
    main()
