#!/usr/bin/env python

from optparse import OptionParser
import format_obj
import format_js
import sys
import os

formats = {
    'js': format_js,
    'obj': format_obj,
}

if __name__ == '__main__':
    # parse command line
    help = 'one of: ' + ', '.join(formats)
    parser = OptionParser('usage: [options] input_file output_file')
    parser.add_option('--scale', dest='scale', help='scales the model')
    parser.add_option('--center', action='store_true', help='centers the model above the origin')
    parser.add_option('--compute_normals', action='store_true', help='computes smoothed normals')
    parser.add_option('--in', dest='input_format', help=help)
    parser.add_option('--out', dest='output_format', help=help)
    options, args = parser.parse_args()

    # validate command line
    if len(args) != 2:
        parser.print_help()
        sys.exit()

    # parse formats
    in_path, out_path = args
    in_fmt, out_fmt = options.input_format, options.output_format
    in_fmt = in_fmt if in_fmt else os.path.splitext(in_path)[1][1:]
    out_fmt = out_fmt if out_fmt else os.path.splitext(out_path)[1][1:]
    if in_fmt not in formats:
        print 'error: unsupported format "%s"' % in_fmt
        sys.exit()
    if out_fmt not in formats:
        print 'error: unsupported format "%s"' % out_fmt
        sys.exit()

    # perform conversion
    try:
        # load model
        in_file = open(in_path, 'rb')
        print 'loading', os.path.basename(in_path)
        model = formats[in_fmt].load(in_file)

        # handle conversion options
        if options.center:
            print 'centering model'
            model.center()
        if options.compute_normals:
            print 'computing normals'
            model.compute_normals()
        if options.scale:
			print 'scaling model'
			model.scale(float(options.scale))

        # save model
        out_file = open(out_path, 'wb')
        print 'saving', os.path.basename(out_path)
        formats[out_fmt].dump(model, out_file)
    except IOError, e:
        print e
