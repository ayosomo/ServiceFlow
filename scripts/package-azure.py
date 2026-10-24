"""Build a deterministic local ZIP after package:azure and npm ci (Python 3.10+).

No Azure SDK, credentials or network calls. Refuse unexpected staging files,
symlinks, missing dependencies or lockfile/version mismatches.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORK = Path(os.environ.get('LAB_WORK_DIR', ROOT / 'work')).resolve()
STAGE = WORK / 'azure-package'
REQUIRED = {'function.cjs', 'host.json', 'package.json', 'package-lock.json'}


def build():
    actual = {p.name for p in STAGE.iterdir()}
    if actual != REQUIRED | {'node_modules'}:
        raise ValueError('Unexpected or missing package roots: ' + str(sorted(actual ^ (REQUIRED | {'node_modules'}))))
    manifest = json.loads((STAGE / 'package.json').read_text(encoding='utf-8'))
    lock = json.loads((STAGE / 'package-lock.json').read_text(encoding='utf-8'))
    if manifest['main'] != 'function.cjs' or manifest['dependencies'] != lock['packages']['']['dependencies']:
        raise ValueError('Runtime entry point/dependency lock mismatch')
    for name, entry in lock['packages'].items():
        if name and not entry.get('dev'):
            installed = json.loads((STAGE / name / 'package.json').read_text(encoding='utf-8'))
            if installed['version'] != entry['version']:
                raise ValueError('Installed runtime version differs from lock: ' + name)
    paths = sorted(STAGE.rglob('*'))
    if any(p.is_symlink() for p in paths):
        raise ValueError('Symlinks cannot enter the deployment package')
    files = [p for p in paths if p.is_file()]
    if any(p.suffix.lower() in {'.node', '.exe', '.dll'} for p in files):
        raise ValueError('Native binaries need a separate target-platform review')
    temporary = WORK / 'azure-quality-building.zip'
    with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            relative = path.relative_to(STAGE).as_posix()
            info = zipfile.ZipInfo(relative, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes(), compresslevel=9)
    with zipfile.ZipFile(temporary) as archive:
        if archive.testzip() is not None or not REQUIRED <= set(archive.namelist()):
            raise ValueError('ZIP integrity/root layout failed')
        if any(name.startswith(('/', '../')) or '\\' in name for name in archive.namelist()):
            raise ValueError('Unsafe ZIP path')
        members = [{'path': i.filename, 'bytes': i.file_size} for i in archive.infolist()]
    sha = hashlib.sha256(temporary.read_bytes()).hexdigest()
    destination = WORK / ('serviceflow-quality-' + sha + '.zip')
    temporary.replace(destination)
    evidence = {
        'kind': 'Local ZIP package verification; no Azure deployment',
        'zipFile': destination.name, 'sha256': sha, 'bytes': destination.stat().st_size,
        'uncompressedBytes': sum(x['bytes'] for x in members),
        'entryCount': len(members), 'runtimeDependency': manifest['dependencies'],
        'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'sourceWorkingTreeDirty': bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip()),
        'fixedZipTimestamps': True, 'nativeBinaries': False,
        'members': members,
    }
    (WORK / 'azure-package-manifest.json').write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in evidence.items() if k != 'members'}, indent=2))
    return destination


if __name__ == '__main__':
    build()
