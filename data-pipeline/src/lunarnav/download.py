"""Descarga de ficheros listados en un manifiesto JSON (kernels SPICE, DEM LOLA…).

Manifiesto: {"base_url": "...", "<lista>": [{"file", "path", "sha256"|null, ...}]}
- Idempotente: no vuelve a descargar lo que ya existe.
- Integridad: registra el sha256 en la primera descarga (confianza en el primer uso) y lo comprueba después.
- TLS verificado con el almacén de certificados del sistema (truststore, D-020).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import requests
import truststore

truststore.inject_into_ssl()

USER_AGENT = "lunarnav-pipeline"


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: Path) -> None:
    tmp = dest.with_suffix(dest.suffix + ".part")
    with requests.get(url, stream=True, timeout=120, headers={"User-Agent": USER_AGENT}) as r:
        r.raise_for_status()
        with tmp.open("wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    tmp.replace(dest)


def fetch_manifest(manifest_path: Path, list_key: str, dest_dir: Path, verify_only: bool = False) -> bool:
    """Descarga/verifica todos los ficheros de `list_key`. Devuelve True si todo está bien."""
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    dest_dir.mkdir(parents=True, exist_ok=True)
    changed = False
    ok = True
    for item in manifest[list_key]:
        dest = dest_dir / item["file"]
        if not dest.exists():
            if verify_only:
                print(f"FALTA      {item['file']}")
                ok = False
                continue
            print(f"descargando {item['file']} ...", flush=True)
            download(manifest["base_url"] + item["path"], dest)
        digest = sha256_of(dest)
        if item.get("sha256") is None:
            item["sha256"] = digest
            changed = True
            print(f"REGISTRADO {item['file']}  sha256={digest[:16]}...")
        elif item["sha256"] != digest:
            print(f"ERROR      {item['file']}: sha256 no coincide")
            ok = False
        else:
            print(f"OK         {item['file']}")
    if changed:
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return ok
