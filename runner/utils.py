#
#
#

import os
import sys
import platform
import glob
import inspect
import subprocess

# pylint:disable=W0102

############################################################

def simple_config():
    pwd = os.getcwd()
    turbulenz_os = { 'Linux': 'linux',
                     'Windows': 'win32',
                     'Darwin': 'macosx' }[platform.system()]
    if 'linux' == turbulenz_os:
        if 'x86_64' == platform.machine():
            turbulenz_os = 'linux64'
        else:
            turbulenz_os = 'linux32'
    turbulenz_root = pwd
    return (pwd, turbulenz_os, turbulenz_root)

############################################################

def get_ip_address():
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("gmail.com", 80))
    ip = s.getsockname()[0]
    s.close()
    return ip

############################################################

ISTTY = sys.stdout.isatty()
def console_err(message):
    print '[!ERROR!] - %s' % message

def console_warn(message):
    print '[WARNING] - %s' % message

def console_success(message):
    print '[SUCCESS] - %s' % message

############################################################

VERBOSE = False
def verbose(msg):
    if VERBOSE:
        print "[utils] %s: %s" % (inspect.stack()[2][3], msg)

# List all files satisfying the given glob pattern.  If 'filter_words'
# is not empty, only files that contain ALL of the filer words will be
# returned.
def glob_with_filter(glob_pattern, filter_words = []):

    _file_list = glob.glob(glob_pattern)
    verbose("_file_list = %s" % _file_list)

    verbose("filter words are: %s" % filter_words)

    # If no filter words, return the full list

    if 0 == len(filter_words):
        return _file_list

    # Filter

    _list = []
    for f in _file_list:
        b = os.path.basename(f)
        verbose("checking: %s (%s)" % (f, b))
        match = True
        for w in filter_words:
            if -1 == b.find(w):
                verbose("word '%s' not found, discarding %s" % (w, b))
                match = False
                break

        if match:
            _list.append(f)

    return _list

############################################################
# UNIX utils
############################################################

# Run killall, keeping error output hidden
def unix_killall(procname):
    subprocess.call(['killall', procname], stderr=open('/dev/null', 'w'))

# Kill any process that is listed in ps -A | grep <name>
def unix_killall_grep(name):
    cmd = "kill -9 `ps -A | grep %s | grep -oe '^ *[0-9]\\+'`" % name
    # print "KILLCMD: %s" % cmd
    subprocess.call(cmd, shell=True, stderr=open('/dev/null', 'w'))

# Return true if a command called 'cmd' exists
def unix_have_command(cmd):
    return 0 == subprocess.call(['which', cmd], stdout=open('/dev/null', 'w'))
