#
#
#

import os
import sys
import platform
import glob
import inspect
from subprocess import Popen, PIPE, STDOUT, call as subprocess_call

from logging import info

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
    subprocess_call(['killall', procname], stderr=open('/dev/null', 'w'))

# Kill any process that is listed in ps -A | grep <name>
def unix_killall_grep(name):
    cmd = "kill -9 `ps -A | grep %s | grep -oe '^ *[0-9]\\+'`" % name
    # print "KILLCMD: %s" % cmd
    subprocess_call(cmd, shell=True, stderr=open('/dev/null', 'w'))

# Return true if a command called 'cmd' exists
def unix_have_command(cmd):
    return 0 == subprocess_call(['which', cmd], stdout=open('/dev/null', 'w'))

#######################################################################################################################

# pylint: disable=W0231
class CalledProcessError(Exception):
    def __init__(self, retcode, cmd, output=None):
        self.retcode = retcode
        self.cmd = cmd
        self.output = output
    def __str__(self):
        cmd = self.cmd
        if isinstance(cmd, list):
            cmd = ' '.join(cmd)
        return "Command '%s' returned non-zero exit status %d" % (cmd, self.retcode)
# pylint: enable=W0231

# pylint: disable=C0103
def sh(command, cwd=None, env=None, verbose=True, console=False, ignore=False, shell=False, wait=True):
    if isinstance(command, list):
        command_list = command
        command_string = ' '.join(command)
    else:
        command_list = command.split()
        command_string = command

    if verbose:
        info('Executing: %s' % command_string)

    if wait:
        if console:
            process = Popen(command_list, stderr=STDOUT, cwd=cwd, shell=shell, env=env)
        else:
            process = Popen(command_list, stdout=PIPE, stderr=STDOUT, cwd=cwd, shell=shell, env=env)

        output, _ = process.communicate()
        output = str(output)
        retcode = process.poll()
        if retcode:
            if ignore is False:
                raise CalledProcessError(retcode, command_list, output=output)

        if output is not None:
            output = output.rstrip()

        return output
    else:
        if SYSNAME == 'Windows':
            DETACHED_PROCESS = 0x00000008
            return Popen(command_list, creationflags=DETACHED_PROCESS, cwd=cwd, shell=shell, env=env)
        else:
            return Popen(command_list, stdout=PIPE, stderr=STDOUT, cwd=cwd, shell=shell, env=env)
# pylint: enable=C0103

#######################################################################################################################