"""Local artifact checks. Run after npm ci and package-azure.py; no cloud calls."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import zipfile

spec = importlib.util.spec_from_file_location('azure_packager', Path(__file__).with_name('package-azure.py'))
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)
with contextlib.redirect_stdout(io.StringIO()):
    first = packager.build()
before = first.read_bytes()
probe = packager.STAGE / 'local.settings.json'
if probe.exists():
    raise RuntimeError('Staging already contains local settings; refusing to overwrite')
rejected = False
try:
    probe.write_text('synthetic secret exclusion probe', encoding='utf-8')
    try:
        packager.build()
    except ValueError:
        rejected = True
finally:
    probe.unlink()
if not rejected:
    raise AssertionError('Packager accepted local settings')
with contextlib.redirect_stdout(io.StringIO()):
    second = packager.build()
assert first == second and before == second.read_bytes(), 'ZIP is not reproducible'
with zipfile.ZipFile(second) as archive:
    assert archive.testzip() is None
    assert 'host.json' in archive.namelist() and 'function.cjs' in archive.namelist()
    assert not any('local.settings' in x or x.startswith('.git/') for x in archive.namelist())
manifest = json.loads((packager.WORK / 'azure-package-manifest.json').read_text(encoding='utf-8'))
print('PASS: exact ZIP rebuilt byte-for-byte; local settings rejected; ZIP CRC/root checks passed. SHA256=' + manifest['sha256'])
