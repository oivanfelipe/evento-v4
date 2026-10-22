#!/usr/bin/env bash
# Roda todas as checagens locais do diagnóstico. Uso: bash diagnostico/testar.sh
set -e
cd "$(dirname "$0")/.."
for f in app.js motor.mjs gargalos.mjs; do
  node --input-type=module --check < "diagnostico/$f" && echo "sintaxe (módulo) ok: $f"
done
node --check api/mapa.js && echo "sintaxe ok: api/mapa.js"
node diagnostico/teste-motor.mjs | tail -1
node diagnostico/teste-cobertura.mjs | tail -1
python3 -c "
import json
d=json.load(open('data/pesquisa/casos-final.json'))
assert all(c['forca'] in ('forte','media') and c['verificado'] for c in d), 'caso fraco ou nao verificado no banco'
assert len({c['id'] for c in d})==len(d), 'ids duplicados'
print('banco ok:', len(d), 'casos')"
