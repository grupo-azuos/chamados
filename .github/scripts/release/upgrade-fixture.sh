#!/usr/bin/env bash
# Replica o pacote antigo: PE versionado, mas File.Version ausente no MSI.
# Somente para o runner descartável; nunca é publicado ou assinado.
set -euo pipefail
source_msi="${1:?Pass the current MSI}"
fixture="${2:?Pass the fixture output path}"
cp "$source_msi" "$fixture"
product_code="$(node -p 'require("node:crypto").randomUUID().toUpperCase()')"
package_code="$(node -p 'require("node:crypto").randomUUID().toUpperCase()')"
msibuild "$fixture" -s 'Azuos Agent upgrade fixture' 'Azuos' 'x64;1046' "{$package_code}"
msibuild "$fixture" -q "UPDATE \`Property\` SET \`Value\` = '{$product_code}' WHERE \`Property\` = 'ProductCode'"
msibuild "$fixture" -q "UPDATE \`Property\` SET \`Value\` = '0.0.0' WHERE \`Property\` = 'ProductVersion'"
msibuild "$fixture" -q "UPDATE \`File\` SET \`Version\` = '' WHERE \`File\` = 'AgentExe'"
# O MajorUpgrade mantém o UpgradeCode e deve reconhecer esta versão anterior.
upgrade_table="$(mktemp)"
trap 'rm -f "$upgrade_table"' EXIT
# VersionMin/Max são parte da chave da tabela; libmsi não aceita UPDATE da chave.
msiinfo export "$fixture" Upgrade | awk 'BEGIN { FS = OFS = "\t" } NR > 3 { if ($2 != "") $2 = "0.0.0"; if ($3 != "") $3 = "0.0.0" } { print }' > "$upgrade_table"
msibuild "$fixture" -i "$upgrade_table"
