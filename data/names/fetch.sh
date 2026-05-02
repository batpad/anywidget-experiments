#!/usr/bin/env bash
# Fetch and unpack the SSA national baby-names dataset.
# Public-domain. Idempotent: skips if data already present.
#
# SSA's direct URL (https://www.ssa.gov/oact/babynames/names.zip) is fronted by
# Akamai which 403s most non-browser clients. We pull from the Wayback Machine
# instead — same archival ZIP, just routed through archive.org.

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
URL="https://web.archive.org/web/2024/https://www.ssa.gov/oact/babynames/names.zip"
ZIP="$HERE/names.zip"

if compgen -G "$HERE/yob*.txt" > /dev/null; then
    echo "yob*.txt already present in $HERE — skipping fetch."
    exit 0
fi

echo "Fetching $URL ..."
curl -sSL --fail -A "Mozilla/5.0" -o "$ZIP" "$URL"
echo "Unpacking ..."
unzip -q -o "$ZIP" -d "$HERE"
rm "$ZIP"
echo "Done. Years available:"
ls "$HERE"/yob*.txt | wc -l
