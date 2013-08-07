# Copyright (c) 2013 Turbulenz Limited

from sys import argv
from argparse import ArgumentParser

__version__ = '0.0.1'

from subprocess import Popen, PIPE, STDOUT

def sh(command, cwd=None, shell=False):
    if isinstance(command, list):
        command_list = command
    else:
        command_list = command.split()

    process = Popen(command_list, stdout=PIPE, stderr=STDOUT, cwd=cwd, shell=shell)

    output, _ = process.communicate()
    output = str(output)

    if output is not None:
        output = output.rstrip()

    return output

def main():
    parser = ArgumentParser(description="Run the benchmark with given settings.")
    parser.add_argument("--version", action='version', version=__version__)

    parser.add_argument("-t", "--template", action='store', help="GNUPlot script template to use")
    parser.add_argument("-i", "--input", action='append', help="An input file in CSV format (first row headers)")
    parser.add_argument("-o", "--output", action='store', help="Output PNG file")
    parser.add_argument("--var", action='append', help="Set a variable")

    args = parser.parse_args(argv[1:])

    template_path = args.template
    with open(template_path, 'rt') as f:
        template_script = f.read()

    for (i, input) in enumerate(args.input):
        template_script = template_script.replace('$fileinput%s' % i, input)

    template_script = template_script.replace('$output', args.output)

    if args.var:
        for var in args.var:
            (property, value) = var.split('=')
            template_script = template_script.replace('$%s' % property, value)

    with open('plotgraph.gnuplot', 'wt') as f:
        f.write(template_script)

    print(sh(['gnuplot', 'plotgraph.gnuplot']))

if __name__ == '__main__':
    main()
