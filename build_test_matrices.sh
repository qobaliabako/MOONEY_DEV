#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
python3 tools/build_matrices.py matrix_source/TEMPLATE_filled_preserving_format.xlsx
