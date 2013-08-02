# Copyright (c) 2010-2011 Turbulenz Limited

# pylint:disable=W0703

import subprocess
import time
import re
import os
import inspect
import shutil

import runner.utils as test_utils

# FIREFOX:
#   about:config:
#     browser.sessionstore.resume_from_crash -> false

############################################################

# In verbose mode, this is set to a logging function
BROWSERCONTROL_VERBOSE = None

def verbose(msg):
    if BROWSERCONTROL_VERBOSE:
        caller_name = inspect.stack()[1][3]
        # pylint:disable=E1102
        BROWSERCONTROL_VERBOSE("[browsercontrol] (%s) %s" % (caller_name, msg))

OURENV = None
def _popen(a, **kwargs):
    # pylint:disable=W0603
    global OURENV
    if OURENV is None:
        OURENV = os.environ.copy()
        OURENV['TZ_ENGINELOG'] = '1'
        OURENV['MOZ_CRASHREPORTER_DISABLE'] = '1'

    kwargs['env'] = OURENV
    return subprocess.Popen(a, **kwargs)

# Keep polling 'fn' every 'interval' seconds for up to 'timeout'
# seconds, until fn returns True.  False indicates a timeout
def _timeout(timeout, interval, fn):

    startTime = time.time()
    deadline = startTime + timeout

    while not fn():
        curTime = time.time()
        if curTime > deadline:
            verbose("_timeout: deadline reached")
            return False

        verbose("_timeout: %s seconds remaining" % (deadline - curTime))
        time.sleep(interval)

    return True

############################################################

class BrowserControl():

    def __init__(self, url):
        self.url = url

    def reload(self):
        raise Exception("unimplemented method on %s" % self)

    def set_geometry(self, x, y, width, height):
        raise Exception("unimplemented method on %s" % self)

    def maximize(self):
        raise Exception("unimplemented method on %s" % self)

    def screenshot(self, filename):
        raise Exception("unimplemented method on %s" % self)

    # Gracefuly shut down the browser
    def close(self):
        raise Exception("unimplemented method on %s" % self)

    # If the browser hasn't exited, return None
    def exit_value(self):
        raise Exception("unimplemented method on %s" % self)

    # Wait until the browser exits, return exit code
    def wait(self):
        raise Exception("unimplemented method on %s" % self)

    # Force the browser to close, no matter what
    def shutdown(self):
        raise Exception("unimplemented method on %s" % self)

    # Static check of whether this browser is available
    @classmethod
    def isvalid(cls):
        return True

############################################################
# LINUX
############################################################

def linux_checkenv():
    def _check(cmd, package):
        if not test_utils.unix_have_command(cmd):
            raise Exception("Command '%s' not found.  " % cmd +
                            "Install '%s' package." % package)
    _check('wmctrl', 'wmctrl')
    _check('xdotool', 'xdotool')
    _check('import', 'imagemagick')

# cmdline is string to append to wmctrl
# Returns stdout
def wmctrl_run(cmdline):
    verbose("wmctrl_run: wmctrl %s" % cmdline)
    w = _popen("wmctrl "+cmdline,
              shell=True,
              stdout=subprocess.PIPE,
              stderr=subprocess.PIPE)
    (resp, err) = w.communicate()
    if w.wait() != 0:
        print "FAILED CMD:  wmctrl %s" % cmdline
        print "wmctrl -lp:"
        subprocess.call(['wmctrl', '-lp'])
        raise Exception("command: wmctrl %s failed: %s : %s" % (cmdline, resp, err))
    return resp

def wmctrl_get_window_handle(pid):
    lineREStr = '(0x[a-fA-F0-9]+) .+ %d ' % pid
    #verbose("wmctrl_get_window_handle: re is %s" % lineREStr)
    lineRE = re.compile(lineREStr)

    # pylint: disable=E1103
    lines = wmctrl_run('-lp').splitlines()
    # pylint: enable=E1103
    for l in lines:
        #verbose("wmctrl_get_window_handle: matching line %s" % l)
        m = lineRE.match(l)
        if m:
            verbose("wmctrl_get_window_handle: match: %s" % m.group(1))
            return m.group(1)
    return None

def xdotool_run(cmdline):
    verbose("xdotool_run: xdotool %s" % cmdline)
    w = _popen("xdotool "+cmdline,
              shell=True,
              stdout=subprocess.PIPE,
              stderr=subprocess.STDOUT)
    (resp, _) = w.communicate()
    if w.wait() != 0:
        raise Exception("command: xdotool %s failed" % cmdline)
    return resp

def linux_findpids(procpattern):
    lineREStr = '\s*([0-9]+)\s+[a-z0-9\/]+\s+[0-9\:\.]+\s+(.*'+procpattern+'.*)'
    lineRE = re.compile(lineREStr)

    verbose("linux_findpid: RE is " + lineREStr)

    p = subprocess.Popen(['ps'], stdout=subprocess.PIPE)
    (out, _) = p.communicate()
    if 0 != p.wait():
        raise Exception("error executing ps")

    pids = []
    # pylint: disable=E1103
    lines = out.splitlines()
    # pylint: enable=E1103
    for l in lines:
        verbose("linux_findpid: line: %s" % l)
        m = lineRE.match(l)
        if m:
            pid = int(m.group(1))
            name = m.group(2)
            verbose("linux_findpid: match with pid %d, name %s" % (pid, name))
            if -1 == name.find('<defunct>'):
                pids.append(pid)

    return pids

def linux_get_winh_by_name(namepattern):
    verbose("linux_get_winh_by_name: pattern is %s" % namepattern)

    np = namepattern
    lineREStr = '(0x[a-fA-F0-9]+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*' + np + '.*)'
    verbose("linux_get_winh_by_name: RE si %s" % lineREStr)

    lineRE = re.compile(lineREStr)

    # pylint: disable=E1103
    lines = wmctrl_run('-lp').splitlines()
    # pylint: enable=E1103
    winhs = []
    for l in lines:
        #verbose("wmctrl_get_window_handle: matching line %s" % l)
        m = lineRE.match(l)
        if m:
            winh = m.group(1)
            other = m.group(2)
            pid = m.group(3)
            arch = m.group(4)
            name = m.group(5)
            verbose("  WINH: %s" % winh)
            verbose("  OTHER: %s" % other)
            verbose("  PID: %s" % pid)
            verbose("  ARCH: %s" % arch)
            verbose("  NAME: %s" % name)
            winhs.append(winh)

    if len(winhs) == 0:
        return None
    if len(winhs) > 1:
        raise Exception("Found multiple window handles: %s" % winhs)

    return winhs[0]

############################################################

class LinuxBrowserControl(BrowserControl):

    def __init__(self, url, procname, winname):
        BrowserControl.__init__(self, url)
        self.exitcode = None
        self.procname = procname
        self.winname = winname

        verbose("browser: procname %s  winname %s.  Waiting for launch" \
                    % (self.procname, self.winname))

        # Wait up to 10 seconds for a valid window handle, checking
        # that the process doens't complete finish (i.e. crash at
        # startup)

        def _browser_has_started_or_crashed():
            verbose(" _browser_has_started_or_crashed: getting winh")
            winh = linux_get_winh_by_name(self.winname)
            verbose(" _browser_has_started_or_crashed: got winh: %s" % winh)
            return winh is not None
        if not _timeout(10, 1, _browser_has_started_or_crashed):
            verbose("No browser window handle during startup.  Crash?")

    def _getwinh(self):
        return linux_get_winh_by_name(self.winname)

    def _poll(self):
        if self.exitcode is None:
            if self._getwinh() is None:
                self._finalize()
                self.exitcode = 1

        return self.exitcode

    def _wait(self):
        verbose("waiting (_wait) ...")
        if self.exitcode is None:
            while self.exitcode is None:
                if self._getwinh() is not None or len(linux_findpids(self.procname)):
                    verbose(" window is still present.  Sleeping ...")
                    time.sleep(0.5)
                    continue
                self.exitcode = 1
        verbose(" done")
        return self.exitcode

    def reload(self):
        winh = self._getwinh()
        if winh is not None:
            wmctrl_run('-i -R %s' % winh)
            time.sleep(0.1)
            xdotool_run('key Ctrl+r')
        else:
            verbose("reload: browser has been closed")

    def set_geometry(self, x, y, width, height):
        winh = self._getwinh()
        wmctrl_run('-i -r %s -b remove,maximized_vert,maximized_horz' % winh)
        wmctrl_run('-i -r %s -e 0,%d,%d,%d,%d' % (winh, x, y, width, height))

    def maximize(self):
        winh = self._getwinh()
        wmctrl_run('-i -r %s -b add,maximized_vert,maximized_horz' % winh)

    def screenshot(self, filename):
        verbose("Saving screenshot to %s" % filename)
        if 0 != subprocess.call(['import', '-window', 'root', filename]):
            raise Exception("couldn't grab screenshot")

    def close(self):
        verbose("closing ...")
        if self._poll() is None:
            winh = self._getwinh()
            wmctrl_run('-i -R %s' % winh)
            wmctrl_run('-i -c %s' % winh)
            self._finalize()
            self._wait()
            self.exitcode = 0
        else:
            verbose("close: browser process closed already")

    def exit_value(self):
        verbose("exit_value: polling ...")
        return self._poll()

    def wait(self):
        verbose("waiting (wait) ...")
        return self._wait()

    def shutdown(self):
        verbose("shutdown ...")
        self._finalize()
        verbose("shutdown done")

    def _finalize(self):
        pass

class FirefoxLinuxBrowserControl(LinuxBrowserControl):

    def __init__(self, url, browser_bin, profile):

        if browser_bin is not None:
            raise Exception("No support for custom browser binary")

        linux_checkenv()
        self._crash_restore_disabled = False
        self._finalize()

        # Wait up to 10 seconds for all firefox pids and window
        # handles to be gone

        def _firefox_is_dead():
            if 0 != len(linux_findpids('firefox')):
                return False
            if 0 != len(linux_findpids('plugin-container')):
                return False
            if 0 != len(linux_findpids('crashreporter')):
                return False
            if linux_get_winh_by_name('Firefox') is not None:
                return False
            return True
        if not _timeout(10, 1, _firefox_is_dead):
            raise Exception("Couldn't kill existing firefox process")

        # Settings

        proc_ = subprocess.Popen('ls -d ~/.mozilla/firefox/*.default',
                                 shell=True, stdout=subprocess.PIPE)
        (out, _) = proc_.communicate()
        if 0 == proc_.wait():
            # pylint: disable=E1103
            self._prefs_dir = out.splitlines()[0]
            # pylint: enable=E1103
            if len(self._prefs_dir) > 0:
                cmd = 'rm %s/sessionstore.*' % self._prefs_dir
                print "CMD: %s" % cmd
                subprocess.call(cmd, shell=True)
            else:
                print "WARNING: failed to find prefs dir"
        else:
            print "WARNING: failed to find preferences dir"

        # Launch

        verbose("Running: firefox "+url)
        _popen('firefox '+url, shell=True)

        # Sub processes can start and die.  Wait up to 10 seconds for
        # a window handle and a known good pid.

        def _firefox_has_started():
            if 0 == len(linux_findpids('firefox')):
                return False
            if linux_get_winh_by_name('Mozilla Firefox') is None:
                return False
            return True
        if not _timeout(10, 1, _firefox_has_started):
            verbose("Never got a window handle during startup.  Crash?")

        LinuxBrowserControl.__init__(self, url, 'firefox', 'Mozilla Firefox')

    def _finalize(self):
        verbose("FF finalize ...")
        test_utils.unix_killall('firefox')
        test_utils.unix_killall('firefox-bin')
        test_utils.unix_killall('plugin-container')
        test_utils.unix_killall('killall')

class ChromiumLinuxBrowserControl(LinuxBrowserControl):

    def __init__(self, url, browser_bin, profile):

        if browser_bin is not None:
            raise Exception("No support for custom browser binary")

        linux_checkenv()
        self._finalize()

        # Find the chromium command (can differ per distro)(

        self._chromium_bin = None
        if test_utils.unix_have_command('chromium'):
            self._chromium_bin = 'chromium'
        elif test_utils.unix_have_command('chromium-browser'):
            self._chromium_bin = 'chromium-browser'
        if self._chromium_bin is None:
            raise Exception("Chromium is not installed")

        # Create the 'First Run' file to stop chrome asking about
        # default dearch engines.

        _popen('mkdir -p ~/.config/chromium && ' +
               'touch ~/.config/chromium/First\ Run',
               shell=True)

        # Run

        _popen('"%s" %s ' % (self._chromium_bin, url), shell=True)
        LinuxBrowserControl.__init__(self, url, self._chromium_bin, 'Chromium')

    def _finalize(self):
        verbose("killing chromium")
        test_utils.unix_killall_grep('chromium')
        time.sleep(1)
        verbose("killing chromium again to make sure")
        test_utils.unix_killall_grep('chromium')

class ChromeLinuxBrowserControl(LinuxBrowserControl):

    def __init__(self, url, browser_bin, profile):

        if browser_bin is not None:
            raise Exception("No support for custom browser binary")

        linux_checkenv()
        self._finalize()

        # Find the chrome command (can differ per distro)(

        self._chrome_bin = None
        for command in ['chrome', 'google-chrome']:
            if test_utils.unix_have_command(command):
                self._chrome_bin = command
        if self._chrome_bin is None:
            raise Exception("Chrome is not installed")

        # Create the 'First Run' file to stop chrome asking about
        # default search engines.

        _popen('mkdir -p ~/.config/{0} && touch ~/.config/{0}/First\ Run'.format(self._chrome_bin), shell=True)

        # Run

        _popen('"%s" %s ' % (self._chrome_bin, url), shell=True)
        LinuxBrowserControl.__init__(self, url, self._chrome_bin, 'Chrome')

    def _finalize(self):
        verbose("killing chrome")
        test_utils.unix_killall_grep('chrome')
        time.sleep(1)
        verbose("killing chrome again to make sure")
        test_utils.unix_killall_grep('chrome')

############################################################
# WINDOWS
############################################################

# Return the string if the executable exists, None if not
def check_exe(p):
    verbose("checking path '%s'" % p)
    if p is not None and os.path.exists(p):
        verbose("exists")
        return p
    verbose("none")
    return None

# Find the appropriate program in 'Program Files', 'Program Files
# (x86)', etc.
def windows_get_program_path(program):
    env = os.environ

    vars_to_try = [ 'ProgramFiles(x86)', 'PROGRAMFILES(X86)', 'ProgramFiles',
                    'PROGRAMFILES' ]

    # Look through the various paths and try to find the correct
    # executable.

    prog = None
    for v in vars_to_try:
        if v in env:
            prog = check_exe(env[v] + program)
        if prog is not None:
            break

    # Exception if none was found

    if prog is None:
        paths_tried = [env[v] for v in vars_to_try if v in env]
        raise Exception("Couldn't find '%s' in any of %s" % (program, paths_tried))

    return prog

def windows_kill_exe(exename):
    subprocess.call(['taskkill', '/T', '/F', '/IM', exename],
                    stdout=open("NUL:", 'w'),
                    stderr=subprocess.STDOUT)

# Run windows browsercontrol.js script
def windows_script(pid, cmd):
    browser_js = 'tests\\enginetests\\framework\\browser.js'
    full_cmd = ['cscript', '//E:jscript', '//Nologo', browser_js, '%s' % pid, cmd]
    x = subprocess.call(full_cmd)
    if 0 != x:
        raise Exception("Failed to execute: %s" % " ".join(full_cmd))

# Get PID of a given image name
def windows_getpid(imgname):
    cmd = 'tasklist /FI "imagename eq %s" /NH' % imgname
    x = _popen(cmd, shell = True, stdout = subprocess.PIPE)
    (out, _) = x.communicate()
    r = x.wait()

    if 0 != r:
        raise Exception("Error %s running %s" % (r, cmd))

    pidRE = re.compile('%s +([0-9]+) .+' % imgname)

    # pylint:disable=E1103
    for l in out.splitlines():
        verbose("getpid: line: %s" % l)
        m = pidRE.match(l)
        if m:
            verbose("match: %s" % m.group(1))
            return m.group(1)

class WindowsBrowserControl(BrowserControl):

    def __init__(self, proc, pid, url):
        BrowserControl.__init__(self, url)
        self.pid = pid
        self.proc = proc
        self.url = url
        time.sleep(2)

    def reload(self):
        windows_script(self.pid, 'refresh')

    def set_geometry(self, x, y, width, height):
        #raise Exception("unimplemented method on %s" % self)
        # TODO
        pass

    def maximize(self):
        windows_script(self.pid, 'maximize')

    def screenshot(self, filename):
        r = subprocess.call(['external\\screenshot-cmd-r3\\bin\\win32\\screenshot-cmd.exe',
                         '-o', filename])
        if 0 != r:
            raise Exception("Error runnign screenshot tool")

    # Gracefuly shut down the browser
    def close(self):
        windows_script(self.pid, 'quit')

    # If the browser hasn't exited, return None
    def exit_value(self):
        return self.proc.poll()

    # Wait until the browser exits, return exit code
    def wait(self):
        verbose("waiting ...")
        return self.proc.wait()


class FirefoxWindowsBrowserControl(WindowsBrowserControl):

    def __init__(self, url, browser_bin, profile):

        # Find firefox executable

        exe = check_exe(browser_bin) or \
            windows_get_program_path('/Mozilla Firefox/firefox.exe')
        if exe is None:
            raise Exception("Can't find Firefox executable '%s'" % browser_bin)

        self.shutdown()

        if profile is None:
            cmdline = '"%s" %s' % (exe, url)
        else:
            cmdline = '"%s" -P %s %s' % (exe, profile, url)
        verbose("Browser CMDLINE: %s" % cmdline)
        ffproc = _popen(cmdline, shell=True)
        time.sleep(2)

        pid = windows_getpid('firefox.exe')
        verbose("Firefox old PID %s, new PID %s" % (ffproc.pid, pid))

        WindowsBrowserControl.__init__(self, ffproc, pid, url)

    def shutdown(self):
        windows_kill_exe('firefox.exe')
        windows_kill_exe('werfault.exe')


class ChromeWindowsBrowserControl(WindowsBrowserControl):

    def __init__(self, url, browser_bin, profile):

        if 'LOCALAPPDATA' in os.environ:
            localDataPath = os.environ['LOCALAPPDATA']
        elif 'HOMEDRIVE' in os.environ and 'HOMEPATH' in os.environ:
            # On XP
            homedrive = os.environ['HOMEDRIVE']
            homepath = os.environ['HOMEPATH']
            localDataPath = \
                os.path.join(homedrive, homepath, "Local Settings",
                             "Application Data")

        browser_bin = browser_bin or \
            localDataPath+'/Google/Chrome/Application/chrome.exe'

        exe = check_exe(browser_bin)
        if exe is None:
            raise Exception("no chrome executable at '%s'" % browser_bin)

        self.shutdown()

        cmdline = '"%s" --start-maximized %s' % (exe, url)
        verbose("Browser CMDLINE: %s" % cmdline)
        proc = _popen(cmdline, shell=True)
        time.sleep(2)

        WindowsBrowserControl.__init__(self, proc, proc.pid, url)

    def shutdown(self):
        windows_kill_exe('chrome.exe')
        windows_kill_exe('werfault.exe')


class ExplorerWindowsBrowserControl(WindowsBrowserControl):

    def __init__(self, url, browser_bin, profile):

        exe = check_exe(browser_bin) or \
            windows_get_program_path('/Internet Explorer/iexplore.exe')

        self.shutdown()

        cmdline = '"%s" %s' % (exe, url)
        verbose("Browser CMDLINE: %s" % cmdline)
        proc = _popen(cmdline, shell=True)
        time.sleep(2)

        WindowsBrowserControl.__init__(self, proc, proc.pid, url)

    def shutdown(self):
        windows_kill_exe('iexplore.exe')
        windows_kill_exe('werfault.exe')

    def exit_value(self):
        if windows_getpid('iexplore.exe') is None:
            return 0
        return None

    def wait(self):
        verbose("waiting for IE")
        while windows_getpid('iexplore.exe') is not None:
            verbose(" IE process found. waiting ...")
            time.sleep(1)


class SafariWindowsBrowserControl(WindowsBrowserControl):

    def __init__(self, url, browser_bin, profile):

        exe = check_exe(browser_bin) or \
            windows_get_program_path("/Safari/Safari.exe")
        self.shutdown()

        cmdline = '"%s" %s' % (exe, url)
        verbose("Browser CMDLINE: %s" % cmdline)
        proc = _popen(cmdline, shell=True)
        time.sleep(2)

        pid = windows_getpid('Safari.exe')
        verbose("Safari old PID %s, new PID %s" % (proc.pid, pid))

        WindowsBrowserControl.__init__(self, proc, pid, url)

    def shutdown(self):
        windows_kill_exe('Safari.exe')
        windows_kill_exe('WebKit2WebProcess.exe')
        windows_kill_exe('werfault.exe')


class OperaWindowsBrowserControl(WindowsBrowserControl):

    def __init__(self, url, browser_bin, profile):

        exe = check_exe(browser_bin) or \
            windows_get_program_path('/Opera/opera.exe')
        self.shutdown()

        operadir = os.path.dirname(exe)
        appdatadir = os.environ['APPDATA']

        remFiles = [operadir + '/profile/sessions/autosave.win',
                    operadir + '/profile/sessions/autosave.win.bak',
                    appdatadir + '/Opera/Opera/sessions/autopera.win']

        for f in remFiles:
            if os.path.exists(f):
                os.remove(f)

        cmdline = '"%s" %s' % (exe, url)
        verbose("Browser CMDLINE: %s" % cmdline)
        proc = _popen(cmdline, shell=True)
        time.sleep(2)

        WindowsBrowserControl.__init__(self, proc, proc.pid, url)

    def shutdown(self):
        windows_kill_exe('opera.exe')
        windows_kill_exe('werfault.exe')

############################################################
# MACOSX
############################################################

def macosx_check_app(app):
    if app is not None and os.path.exists(app):
        return app
    return None

def macosx_applescript(script):
    verbose("AppleScript: %s" % script)

    _tries = 3
    while 0 < _tries:
        p = subprocess.Popen(['osascript', '-e', script],
                             stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE)
        (out, err) = p.communicate()

        if 0 == p.wait():
            return (out, err)

        print "!! failed to execute script: %s, retrying ..." % script
        time.sleep(1)
        _tries = _tries - 1

    raise Exception("Too many retries failed executing script: %s" % script)

def macosx_get_screen_res():
    (valtext, _) = macosx_applescript('tell application "Finder" to get ' +
                                      'bounds of window of desktop')

    # pylint: disable=E1103
    vals = valtext.split(",")
    # pylint: enable=E1103
    w = int(vals[2])
    h = int(vals[3])

    verbose("Screen size: %d, %d" % (w, h))
    return (w, h)

def macosx_activate(winname):
    macosx_applescript('tell application "%s" to activate' % winname)

class MacOSXBrowserControl(BrowserControl):

    def __init__(self, url, proc, fullname):
        self.proc = proc
        self.browser_name = fullname
        self.desktop_size = macosx_get_screen_res()
        BrowserControl.__init__(self, url)

    def reload(self):
        macosx_activate(self.browser_name)
        macosx_applescript('tell application "System Events" to keystroke ' +
                           '"r" using { command down }')

    def set_geometry(self, x, y, width, height):
        macosx_activate(self.browser_name)
        macosx_applescript('tell application "%s" ' % self.browser_name +
                           'to set bounds of window 1 to ' +
                           '{ %d, %d, %d, %d }' % (x, y, width, height))

    def maximize(self):
        self.set_geometry(0, 0, self.desktop_size[0], self.desktop_size[1])

    def screenshot(self, filename):
        subprocess.call(['screencapture', '-x', filename])

    def close(self):
        try:
            macosx_activate(self.browser_name)
            macosx_applescript('tell application "System Events" to ' +
                               'keystroke "q" using { command down }')
        except Exception, ex:
            print "ERROR: exception during close(): %s" + ex

    def exit_value(self):
        return self.proc.poll()

    def wait(self):
        return self.proc.wait()

    def shutdown(self):
        self._finalize()

    def _finalize(self):
        pass

    app_bin = None

    @classmethod
    def isvalid(cls):
        if cls.app_bin is None:
            return True
        return None != macosx_check_app(cls.app_bin)

    @classmethod
    def _isvalid_arch(cls, arch):
        return 0 == subprocess.call("file %s | grep %s > /dev/null" % (cls.app_bin, arch),
                                    shell=True)

class ChromeMacOSXBrowserControl(MacOSXBrowserControl):

    app_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

    def __init__(self, url, browser_bin, profile):
        self._finalize()
        time.sleep(2)

        app = macosx_check_app(browser_bin)
        if app is None:
            app = macosx_check_app(self.app_bin)

        cmd = '"%s" --enable-webgl --ignore-gpu-blacklist %s' % (app, url)
        verbose("Browser cmd: %s" % cmd)
        proc = _popen(cmd, shell=True)

        MacOSXBrowserControl.__init__(self, url, proc, "Google Chrome")

    def _finalize(self):
        test_utils.unix_killall('Google Chrome')
        test_utils.unix_killall('Google Chrome Helper')
        test_utils.unix_killall('Google Chrome Helper EH')
        time.sleep(0.5)
        test_utils.unix_killall('Google Chrome')
        test_utils.unix_killall('Google Chrome Helper')
        test_utils.unix_killall('Google Chrome Helper EH')

class FirefoxMacOSXBrowserControl(MacOSXBrowserControl):

    app_bin = "/Applications/Firefox.app/Contents/MacOS/firefox-bin"

    def __init__(self, url, browser_bin, profile):

        # Kill existing browsers and give them time to die

        self._finalize()
        time.sleep(2)

        app = macosx_check_app(browser_bin) \
            or macosx_check_app(self.app_bin)

        # Remove any previous temporary profile data

        profile_dir = "/tmp/tz_p"
        if os.path.exists(profile_dir):
            shutil.rmtree(profile_dir)

        # Launch

        cmd = '"%s" -profile %s %s' % (app, profile_dir, url)
        verbose("Browser cmd: %s" % cmd)
        proc = _popen(cmd, shell=True)

        MacOSXBrowserControl.__init__(self, url, proc, "Firefox")

    def _finalize(self):
        test_utils.unix_killall('firefox')
        test_utils.unix_killall('firefox-bin')
        test_utils.unix_killall('plugin-container')

# pylint:disable=W0231
# pylint:disable=W0233
class SafariMacOSXBrowserControl(MacOSXBrowserControl):

    app_bin = "/Applications/Safari.app/Contents/MacOS/Safari"

    def __init__(self, url, browser_bin, profile):
        proc = self._safari_startup(url, browser_bin, self.app_bin, 'x86_64')
        MacOSXBrowserControl.__init__(self, url, proc, "Safari")

    def _safari_startup(self, url, browser_bin, fallback, arch):
        self._finalize()
        time.sleep(2)

        app = macosx_check_app(browser_bin)
        if app is None:
            app = macosx_check_app(fallback)
        if app is None:
            raise Exception("No browser binary at any of:"
                            "%s" % [ browser_bin, fallback ])

        # Safari requires that the URL be decoded to a local file
        # path.  http URLs cannot be opened with a direct command line
        # so we have to give up trying to set 32/64 bit mode and use
        # 'open'.

        if 0 == url.find('file://'):
            app ='arch -%s "%s"' % (arch, app)
            url = url[6:]
        elif 0 == url.index("http"):
            app = "open -W -a safari"

        cmd = '%s %s' % (app, url)
        verbose("Browser cmd: %s" % cmd)
        return _popen(cmd, shell=True)

    def _finalize(self):
        test_utils.unix_killall('Safari')
        test_utils.unix_killall('WebProcess')
        test_utils.unix_killall('PluginProcess')

    @classmethod
    def isvalid(cls):
        return cls._isvalid_arch('x86_64')

class Safari32MacOSXBrowserControl(SafariMacOSXBrowserControl):

    app_bin = "/Applications/Safari.app/Contents/MacOS/Safari"

    def __init__(self, url, browser_bin, profile):
        proc = self._safari_startup(url, browser_bin, self.app_bin, 'i386')
        MacOSXBrowserControl.__init__(self, url, proc, "Safari")

    @classmethod
    def isvalid(cls):
        return cls._isvalid_arch('i386')

class Safari5MacOSXBrowserControl(SafariMacOSXBrowserControl):

    app_bin = "/Applications/Safari-5.0.app/Contents/MacOS/Safari"

    def __init__(self, url, browser_bin, profile):
        proc = self._safari_startup(url, browser_bin, self.app_bin, 'x86_64')
        MacOSXBrowserControl.__init__(self, url, proc, "Safari")

# pylint:disable=C0103
class Safari5_32_MacOSXBrowserControl(SafariMacOSXBrowserControl):

    app_bin = "/Applications/Safari-5.0.app/Contents/MacOS/Safari"

    def __init__(self, url, browser_bin, profile):
        proc = self._safari_startup(url, browser_bin, self.app_bin, 'i386')
        MacOSXBrowserControl.__init__(self, url, proc, "Safari-5.0")

############################################################

CONTROLS = {
    'linux64' : { 'firefox': FirefoxLinuxBrowserControl,
                  'chrome': ChromeLinuxBrowserControl,
                  'chromium': ChromiumLinuxBrowserControl,
                  },
    'win32' : { 'firefox': FirefoxWindowsBrowserControl,
                'chrome': ChromeWindowsBrowserControl,
                'explorer' : ExplorerWindowsBrowserControl,
                'safari' : SafariWindowsBrowserControl,

                # Test Runner doesn't currently work with Opera
                # 'opera' : OperaWindowsBrowserControl
                },
    'macosx' : { 'chrome' : ChromeMacOSXBrowserControl,
                 'firefox' : FirefoxMacOSXBrowserControl,
                 'safari' : SafariMacOSXBrowserControl,
                 'safari-32' : Safari32MacOSXBrowserControl,
                 'safari5-32' : Safari5_32_MacOSXBrowserControl,

                 # TZ_ENGINELOG not passed to plugin process
                 # 'safari5' : Safari5MacOSXBrowserControl,
                 }
    }

(A, TURBULENZOS, A) = test_utils.simple_config()
def list_controls():
    controls = CONTROLS[TURBULENZOS]
    ks = controls.keys()
    return [c for c in ks if controls[c].isvalid()]

def get_control(name, url, browser_bin = None, profile = None):
    control_type = CONTROLS[TURBULENZOS][name]
    return control_type(url, browser_bin, profile)

############################################################

def test_browsercontrol(controlname):
    b = get_control(controlname, 'samples/device_initialization.release.html')
#    time.sleep(2)

    verbose("set geom ...")
    b.set_geometry(0, 0, 600, 600)
    time.sleep(1)

    verbose("maximize ...")
    b.maximize()
    time.sleep(1)

    verbose("reload ...")
    b.reload()
    time.sleep(2)

    verbose("screenshot ...")
    b.screenshot('%s.png' % controlname)
    time.sleep(1)

    verbose("closing ...")
    b.close()
    verbose("Browser exited: %d" % b.wait())

if __name__ == "__main__":

    for browser in list_controls():
        verbose("browser: %s" % browser)
        test_browsercontrol(browser)
