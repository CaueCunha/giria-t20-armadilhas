"""Roda os testes e gera giria-t20-armadilhas.zip (module.json + scripts + README) para o manifesto."""
import json, subprocess, sys, zipfile
from pathlib import Path

AQUI = Path(__file__).parent
t = subprocess.run(["node", "--test", "testes/**/*.test.mjs"], cwd=AQUI, capture_output=True, text=True)
if t.returncode:
    print(t.stdout[-6000:])
    sys.exit("NÃO EMPACOTADO: algum teste falhou.")
mod = json.load(open(AQUI / "module.json"))
with zipfile.ZipFile(AQUI / f"{mod['id']}.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for f in ["module.json", "README.md", *sorted(str(p.relative_to(AQUI)) for p in (AQUI / "scripts").glob("*.mjs"))]:
        z.write(AQUI / f, f"{mod['id']}/{f}")
print("empacotado", mod["version"])
