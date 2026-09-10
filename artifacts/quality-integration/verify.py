#!/usr/bin/env python3
"""Recheck the reviewed source-to-final ledger without touching branches or files."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEDGER = json.loads(Path(__file__).with_name('reconciliation.json').read_text())


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True).strip()


def tree_entry(commit, path):
    listing = git('ls-tree', commit, '--', path)
    return listing.split('\t')[0] if listing else None


def working_entry(path):
    file = ROOT / path
    if not file.exists():
        return None
    mode = '100755' if file.stat().st_mode & 0o111 else '100644'
    return f'{mode} blob {git("hash-object", "--", path)}'


for area, source in LEDGER['sources'].items():
    paths = set(git('diff', '--name-only', LEDGER['base'], source['commit']).splitlines())
    reviewed = {entry['path'] for entry in LEDGER['entries'] if entry['area'] == area}
    assert reviewed == paths, f'{area}: missing or extra source paths: {reviewed ^ paths}'

for entry in LEDGER['entries']:
    source = LEDGER['sources'][entry['area']]
    assert tree_entry(source['commit'], entry['path']) == entry['source'], entry
    assert tree_entry(LEDGER['sources']['integration']['commit'], entry['path']) == entry['integrated'], entry
    assert working_entry(entry['finalPath']) == entry['final'], f'Final content/mode changed: {entry["finalPath"]}'
    if entry['path'] != entry['finalPath']:
        assert not (ROOT / entry['path']).exists(), f'Duplicate legacy input: {entry["path"]}'
    assert entry['decision'], f'Missing content decision: {entry["path"]}'

# Preserve complete feedback entries; only normalize heading punctuation for the typography gate.
feedback = (ROOT / 'VENT.md').read_text()
for area in ['auth', 'contracts', 'readmodels', 'evidence']:
    original = git('show', f'{LEDGER["sources"][area]["commit"]}:VENT.md')
    for section in original.split('\n## ')[1:]:
        heading, body = section.strip().split('\n', 1)
        normalized = heading.replace('\u2014', '-')
        assert f'## {normalized}\n{body}' in feedback, f'{area}: lost feedback section'

# Negative linter programs retain the worker's exact bytes at inert paths.
for name in ['import-specifiers.ts', 'local-symbol.ts']:
    old = tree_entry(LEDGER['sources']['toolchain']['commit'], f'app/tools/oxlint/anti-slop/tests/fixtures/{name}')
    assert old == working_entry(f'app/tools/oxlint/anti-slop/tests/fixtures/{name}.txt'), name

print(f'PRESERVATION_OK: {len(LEDGER["sources"])} pinned snapshots, {len(LEDGER["entries"])} reviewed paths, exact final bytes/modes and whole feedback sections')
