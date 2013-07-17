#!/usr/bin/env python
# Copyright (c) 2012 Turbulenz Limited

import os
import base64
import simplejson

from logging import getLogger
from optparse import OptionParser, TitledHelpFormatter
from hashlib import md5 as hashlib_md5

from turbulenz_tools.tools.toolsexception import ToolsException
from turbulenz_tools.tools.stdtool import simple_options

__version__ = '0.1.0'
__dependencies__ = ['turbulenz.utils.dependencies']

LOG = getLogger(__name__)

###############
# Font Mapping
do_font_map = False
# try:
#     import socket
#     hostname = socket.gethostname()
#     if hostname.lower() == 'vancouver':
#         do_font_map = True
# except:
#     pass
###############

############################################################

def _parser():
    parser = OptionParser(description='Generate a mapping table from a '
                          'directory tree of asset source files',
                          usage="usage: %prog [options] <asset root>",
                          formatter=TitledHelpFormatter())

    parser.add_option("--version", action="store_true", dest="output_version",
                      default=False, help="output version number")
    parser.add_option("-v", "--verbose", action="store_true", dest="verbose",
                      default=False, help="verbose output")
    parser.add_option("-s", "--silent", action="store_true", dest="silent",
                      default=False, help="silent running")

    parser.add_option("-o", action="store", dest="output",
                      default="mapping_table.json",
                      help="mapping table output file")
    parser.add_option("--dep-file", action="store", dest="depfile",
                      help="optional output dependency file (in make format)")

    parser.add_option("--ignore-ext", action="append", dest="ignore_exts",
                      default=[], help="extension to be ignored")

    parser.add_option("--staticmax-root", action="store", dest="staticmax_root",
                      default="staticmax", help="location of fully static data")

    return parser

############################################################

def get_file_hash(filename, dependency_version):
    key = dependency_version + str(os.path.getmtime(filename)) + filename
    return base64.urlsafe_b64encode(hashlib_md5(key).digest()).strip('=')

############################################################

def gen_mapping(asset_dir, staticmax_root, ignore=None, optionalInfo=None, dependency_version=None):

    def _ext_format(ext):
        if ext[0] == '.':
            return ext
        else:
            return '.' + ext

    not_json = [ '.png', '.jpg', '.jpeg', '.dds', '.tga', '.mp3', '.ogg']
    if ignore:
        ignore = [ _ext_format(e) for e in ignore ]
    else:
        ignore = [ '.cgh', '.mb', '.txt' ]

    ###############
    # Font Mapping
    font_map = { 'museo500-16.fnt': 'museo500-16-c.fnt', 'museo500-32.fnt': 'museo500-32-c.fnt', 'museo500-64.fnt': 'museo500-64-c.fnt', 'museo500-16_0.dds': 'museo500-16-c_0.dds', 'museo500-32_0.dds': 'museo500-32-c_0.dds', 'museo500-64_0.dds': 'museo500-64-c_0.dds'}
    ###############

    mapping_table = {}
    build_deps = {}

    for root, dirs, files in os.walk(asset_dir):
        LOG.info("PATH: %s, dirs: %s, files: %s" % (root, dirs, files))

        root_rel = os.path.relpath(root, asset_dir)
        for f in files:

            f_fullpath = os.path.join(root, f).replace('\\', '/')
            f_path = os.path.join(root_rel, f).replace('\\', '/')

            if optionalInfo and f_fullpath in optionalInfo:
                children_files = optionalInfo[f_fullpath]
                for new_file in children_files:
                    new_file_path = os.path.join(root, new_file).replace('\\', '/')
                    open(new_file_path, "w")
                files.extend(optionalInfo[f_fullpath])
                continue

            f_hash = get_file_hash(f_fullpath, dependency_version)
            f_name, f_ext = os.path.splitext(f)

            if f_ext in ignore:
                continue
            if f_name.startswith('.'):
                continue

            ###############
            # Font Mapping
            if do_font_map:
                f_lower = f.lower()
                if f_lower in font_map:
                    c = font_map[f_lower]
                    c_fullpath = os.path.join(root, c).replace('\\', '/')
                    f_hash = get_file_hash(c_fullpath, dependency_version)
                    f_name, f_ext = os.path.splitext(c)
            ###############

            target_name = f_name + '_' + f_hash + f_ext
            if not f_ext in not_json:
                target_name = target_name + ".json"

            target_path = os.path.join(staticmax_root, target_name)
            target_path = target_path.replace('\\', '/')

            mapping_table[f_path] = target_name
            build_deps[f_fullpath] = target_path

            LOG.info("FILE: %s (%s) -> %s" % (f_path, f_ext, target_path))

    mapping_table_object = { "urnmapping" : mapping_table }
    return (mapping_table_object, build_deps)

def main():

    (options, args, parser) = simple_options(_parser, __version__,
                                             __dependencies__,
                                             input_required=False)

    if 0 == len(args):
        LOG.error('No input files specified')
        parser.print_help()
        exit(1)

    if not options.output:
        LOG.error('No output file specified')
        parser.print_help()
        exit(1)

    asset_dir = args[0]
    LOG.info("asset_dir = %s" % asset_dir)

    if not os.path.isdir(asset_dir):
        LOG.error('asset_dir must be a directory')
        parser.print_help()
        exit(1)

    staticmax_root = options.staticmax_root

    # Calc mapping table and build deps

    (mapping_table_object, build_deps) = gen_mapping(asset_dir,
                                                     staticmax_root,
                                                     options.ignore_exts)

    # Write the output(s)

    with open(options.output, 'wb') as f:
        simplejson.dump(mapping_table_object, f, separators=(',', ':'))

    if options.depfile:
        with open(options.depfile, 'wb') as f:
            for k in build_deps:
                v = build_deps[k]
                f.write("%s : %s\n\n" % (v, k))

    return 0

############################################################

if __name__ == "__main__":
    exit(main())
