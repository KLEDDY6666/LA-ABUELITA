#!/usr/bin/env python3
"""Diagnóstico Firebase Rules :test. Solo GET y POST :test; nunca Firestore.
Python 3.9+, biblioteca estándar y gcloud autenticado. No instala paquetes.
No habilita APIs, no cambia IAM ni el proyecto/configuración de gcloud.
Los únicos archivos creados son resultados locales en un directorio nuevo.
Contrato REST: https://firebase.google.com/docs/reference/rules/rest/v1/projects/test
Esquema: https://firebaserules.googleapis.com/$discovery/rest?version=v1
"""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

PROJECT = "la-abuelita-7e630"
BASE = "https://firebaserules.googleapis.com/v1/"
EXPECTED_HASH = "6c244b03bac43975ee0abc0b0ef9080ae657536d1e1bc69e2e994babcc0000e4"
DIAGNOSTICO = json.loads(r'''{"tipo": "EJECUCION_EN_SECO_SIN_COMMIT", "proyecto": "la-abuelita-7e630", "fechaPreparada": "2026-10-19T00:38:23.187Z", "lecturas": [{"ruta": "usuarios/USUARIO_ACTUAL", "dentroTransaccion": false, "existe": true, "desdeCache": false}, {"ruta": "clientes/1792349707857", "dentroTransaccion": true, "existe": true, "desdeCache": false}, {"ruta": "cuentas/1792349707857", "dentroTransaccion": true, "existe": false, "desdeCache": false}, {"ruta": "ventas/dc008bf4-ab69-48ea-ad57-183bff43f4d5", "dentroTransaccion": true, "existe": false, "desdeCache": false}, {"ruta": "configuracion/inventarioInicial", "dentroTransaccion": true, "existe": true, "desdeCache": false}, {"ruta": "productos/7750243052658", "dentroTransaccion": true, "existe": true, "desdeCache": false}], "documentosLeidos": {"usuarios/USUARIO_ACTUAL": {"existe": true, "tipos": {"estado": "stringValue", "nombre": "DATO_PRIVADO_1", "rol": "stringValue", "correo": "DATO_PRIVADO_1"}, "camposRelevantes": {"estado": {"stringValue": "activo"}, "nombre": {"stringValue": "DATO_PRIVADO_2"}, "rol": {"stringValue": "admin"}}}, "clientes/1792349707857": {"existe": true, "tipos": {"creadoPor": "DATO_PRIVADO_1", "activo": "booleanValue", "id": "integerValue", "nombre": "DATO_PRIVADO_1"}, "camposRelevantes": {"activo": {"booleanValue": true}, "id": {"integerValue": "1792349707857"}, "nombre": {"stringValue": "DATO_PRIVADO_3"}}}, "cuentas/1792349707857": {"existe": false, "tipos": {}, "camposRelevantes": {}}, "ventas/dc008bf4-ab69-48ea-ad57-183bff43f4d5": {"existe": false, "tipos": {}, "camposRelevantes": {}}, "configuracion/inventarioInicial": {"existe": true, "tipos": {"estado": "stringValue", "iniciadoEn": "stringValue"}, "camposRelevantes": {"estado": {"stringValue": "en_proceso"}, "iniciadoEn": {"stringValue": "2026-10-18T13:08:34.629Z"}}}, "productos/7750243052658": {"existe": true, "tipos": {"codigo": "stringValue", "importadoPor": "DATO_PRIVADO_1", "creado": "stringValue", "nombre": "DATO_PRIVADO_1", "precio": "doubleValue", "cantidad": "integerValue"}, "camposRelevantes": {"codigo": {"stringValue": "7750243052658"}, "nombre": {"stringValue": "DATO_PRIVADO_4"}, "precio": {"doubleValue": 1.3}, "cantidad": {"integerValue": "0"}}}}, "errorPreparacion": null, "escriturasSoloEnMemoria": [{"metodo": "set", "ruta": "ventas/dc008bf4-ab69-48ea-ad57-183bff43f4d5", "fields": {"id": {"stringValue": "dc008bf4-ab69-48ea-ad57-183bff43f4d5"}, "fecha": {"stringValue": "2026-10-19T00:38:23.187Z"}, "medio": {"stringValue": "CREDITO"}, "total": {"doubleValue": 1.3}, "totalCent": {"integerValue": "130"}, "items": {"arrayValue": {"values": [{"mapValue": {"fields": {"codigo": {"stringValue": "7750243052658"}, "nombre": {"stringValue": "DATO_PRIVADO_4"}, "precio": {"doubleValue": 1.3}, "cantidad": {"integerValue": "1"}}}}]}}, "cantidades": {"mapValue": {"fields": {"7750243052658": {"integerValue": "1"}}}}, "clienteId": {"integerValue": "1792349707857"}, "clienteNombre": {"stringValue": "DATO_PRIVADO_3"}, "registradoPor": {"stringValue": "USUARIO_ACTUAL"}}, "mascara": null}, {"metodo": "set", "ruta": "cuentas/1792349707857", "fields": {"clienteId": {"integerValue": "1792349707857"}, "clienteNombre": {"stringValue": "DATO_PRIVADO_3"}, "totalCent": {"integerValue": "130"}, "pagadoCent": {"integerValue": "0"}, "saldoCent": {"integerValue": "130"}, "ultimaOperacionId": {"stringValue": "dc008bf4-ab69-48ea-ad57-183bff43f4d5"}, "ultimaOperacionTipo": {"stringValue": "CREDITO"}}, "mascara": null}], "verificacionesPrevistasSinEnviar": [{"ruta": "clientes/1792349707857", "operacion": "verify", "nota": "Prevista por el SDK para un documento leído y no modificado; no se envió."}, {"ruta": "configuracion/inventarioInicial", "operacion": "verify", "nota": "Prevista por el SDK para un documento leído y no modificado; no se envió."}, {"ruta": "productos/7750243052658", "operacion": "verify", "nota": "Prevista por el SDK para un documento leído y no modificado; no se envió."}], "condiciones": [{"condicion": "ventas.id == ruta && registradoPor == usuario actual", "resultado": true}, {"condicion": "ventas: campos permitidos y requeridos", "resultado": true}, {"condicion": "fechaMovimientoPermitida: ISO y no anterior a iniciadoEn", "resultado": true}, {"condicion": "ventas.total is number && >= 0", "resultado": true}, {"condicion": "ventas y cuenta: clienteNombre is string", "resultado": true}, {"condicion": "totalCorrecto: precios numéricos para la multiplicación en reglas", "resultado": true}, {"condicion": "ventas.totalCent is int && > 0", "resultado": true}, {"condicion": "ventas.clienteId is int", "resultado": true}, {"condicion": "ventas: cliente activo", "resultado": true}, {"condicion": "ventas: entre 1 y 3 productos y mapa cantidades del mismo tamaño", "resultado": true}, {"condicion": "ventas: total y totalCent coherentes", "resultado": true}, {"condicion": "itemCreditoValido[0]: tipo, cantidad y mapa", "resultado": true}, {"condicion": "itemCreditoValido[0]: nombre y precio de Firestore", "resultado": true}, {"condicion": "itemCreditoValido[0]: stock almacenado is int", "resultado": true}, {"condicion": "itemCreditoValido[0]: pendiente no modifica producto", "resultado": true}, {"condicion": "getAfter(cuenta): misma venta y tipo CREDITO", "resultado": true}, {"condicion": "cuentaCampos: siete campos requeridos", "resultado": true}, {"condicion": "cuentaCampos: identificador y centavos is int", "resultado": true}, {"condicion": "cuentaCampos: importes no negativos y saldo = total - pagado", "resultado": true}, {"condicion": "cuentaCredito: registradoPor, cliente y total de venta", "resultado": true}, {"condicion": "cuentaCredito: venta no existía", "resultado": true}, {"condicion": "cuentaCreditoNuevo: cuenta inicial y saldo", "resultado": true}], "observacion": "Las lecturas son independientes. Las condiciones se calculan localmente; no son una traza del evaluador de producción. No se envió Commit, Write ni BatchWrite."}''')


def decode(value):
    if "integerValue" in value:
        result = int(value["integerValue"])
        if abs(result) > 2**53 - 1:
            raise ValueError("Entero no representable exactamente en el JSON genérico de :test")
        return result
    for kind in ("stringValue", "booleanValue", "doubleValue"):
        if kind in value:
            return value[kind]
    if "nullValue" in value:
        return None
    if "arrayValue" in value:
        return [decode(v) for v in value["arrayValue"].get("values", [])]
    if "mapValue" in value:
        return fields(value["mapValue"].get("fields", {}))
    raise ValueError("Tipo Firestore no admitido por este diagnóstico: " + str(list(value)))


def fields(values):
    return {key: decode(value) for key, value in values.items()}


def document_path(relative):
    return "/databases/(default)/documents/" + relative


def fixture():
    before = {}
    for path, document in DIAGNOSTICO["documentosLeidos"].items():
        before[path] = fields(document["camposRelevantes"]) if document["existe"] else None
    after = dict(before)
    writes = DIAGNOSTICO["escriturasSoloEnMemoria"]
    for write in writes:
        if write["metodo"] != "set" or before.get(write["ruta"]) is not None:
            raise ValueError("Se esperaban exclusivamente dos creaciones")
        after[write["ruta"]] = fields(write["fields"])
    if len(writes) != 2:
        raise ValueError("Número inesperado de escrituras")
    uid = after[writes[0]["ruta"]]["registradoPor"]
    if "usuarios/" + uid not in before:
        raise ValueError("UID anonimizado incoherente")
    return before, after, writes, uid


def mocks_for(before, after):
    mocks = []
    for path, data in before.items():
        args = [{"exactValue": document_path(path)}]
        mocks.append({"function": "exists", "args": args, "result": {"value": data is not None}})
        # No se inventa un documento para get() de una ruta inexistente.
        mocks.append({"function": "get", "args": args,
                      "result": {"value": {"data": data}} if data is not None else {"undefined": {}}})
        post = after.get(path)
        mocks.append({"function": "getAfter", "args": args,
                      "result": {"value": {"data": post}} if post is not None else {"undefined": {}}})
    return mocks


def case(path, method, uid, mocks, data=None):
    request = {"path": document_path(path), "method": method,
               "auth": {"uid": uid, "token": {}},
               "time": DIAGNOSTICO["fechaPreparada"]}
    if data is not None:
        request["resource"] = {"data": data}
    return {"expectation": "ALLOW", "request": request,
            "functionMocks": mocks, "expressionReportLevel": "FULL", "pathEncoding": "PLAIN"}


def build():
    before, after, writes, uid = fixture()
    mocks = mocks_for(before, after)
    labels, cases = [], []
    for write in writes:
        labels.append("CREATE " + write["ruta"])
        cases.append(case(write["ruta"], "create", uid, mocks, after[write["ruta"]]))
    # :test no tiene un Commit multiescritura. Los verify del SDK se representan
    # por el permiso get del documento; no se comprueban sus updateTime reales.
    for read in DIAGNOSTICO["lecturas"]:
        labels.append("GET " + read["ruta"])
        c = case(read["ruta"], "get", uid, mocks)
        if before[read["ruta"]] is not None:
            c["resource"] = {"data": before[read["ruta"]]}
        cases.append(c)
    return labels, {"testSuite": {"testCases": cases}}


def validate_body(body):
    # Validación del contrato estructural oficial; la calibración remota valida
    # los valores dependientes del servicio que el esquema declara como 'any'.
    assert set(body) <= {"source", "testSuite"} and "testSuite" in body
    for c in body["testSuite"]["testCases"]:
        assert set(c) <= {"expectation", "request", "resource", "functionMocks",
                          "expressionReportLevel", "pathEncoding"}
        assert c["expectation"] == "ALLOW" and c["expressionReportLevel"] == "FULL"
        for mock in c["functionMocks"]:
            assert set(mock) == {"function", "args", "result"}
            assert mock["function"] in {"get", "getAfter", "exists"}
            assert len(mock["args"]) == 1 and set(mock["args"][0]) == {"exactValue"}
            assert set(mock["result"]) in ({"value"}, {"undefined"})
    json.dumps(body, allow_nan=False)


class Api:
    def __init__(self):
        try:
            result = subprocess.run(["gcloud", "auth", "print-access-token", "--quiet"],
                                    capture_output=True, text=True, check=False, timeout=60)
        except (OSError, subprocess.TimeoutExpired):
            raise RuntimeError("No se pudo usar gcloud. Ejecuta este archivo en Cloud Shell autenticado.") from None
        if result.returncode or not result.stdout.strip():
            raise RuntimeError("gcloud no proporcionó credenciales. Revisa tu sesión en Cloud Shell.")
        self.token = result.stdout.strip()  # Solo memoria; nunca se guarda ni imprime.
        self.calls = []

    def call(self, method, route, body=None):
        # Lista cerrada: ni releases PATCH/CREATE, ni rulesets CREATE, ni Firestore.
        allowed_get = re.fullmatch(r"projects/" + re.escape(PROJECT) +
                                   r"/(?:releases/cloud\.firestore|rulesets/[A-Za-z0-9_-]+)", route)
        allowed_test = re.fullmatch(r"projects/" + re.escape(PROJECT) +
                                    r"(?:/rulesets/[A-Za-z0-9_-]+)?:test", route)
        if not ((method == "GET" and allowed_get and body is None) or
                (method == "POST" and allowed_test and body is not None)):
            raise RuntimeError("Llamada bloqueada por la lista de seguridad: " + method + " " + route)
        if body is not None:
            validate_body(body)
        self.calls.append({"method": method, "url": BASE + route})
        req = urllib.request.Request(BASE + route, method=method,
              data=None if body is None else json.dumps(body, allow_nan=False).encode(),
              headers={"Authorization": "Bearer " + self.token,
                       "Content-Type": "application/json", "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")
            raise RuntimeError("API HTTP " + str(exc.code) + ": " + detail) from None
        except urllib.error.URLError as exc:
            raise RuntimeError("No se pudo consultar Firebase Rules: " + str(exc.reason)) from None


def calibration():
    before, after, writes, uid = fixture()
    sale = after[writes[0]["ruta"]]
    product = "productos/" + sale["items"][0]["codigo"]
    account = writes[1]["ruta"]
    source = """rules_version = '2';
service cloud.firestore {
 match /databases/{database}/documents {
  match /__diagnostico__/formato {
   allow create: if request.auth.uid == 'USUARIO_ACTUAL'
    && request.time == timestamp.value(request.resource.data.fecha)
    && request.resource.data.clienteId is int
    && request.resource.data.clienteId == 1792349707857
    && request.resource.data.items[0].precio == 1.3
    && exists(/databases/$(database)/documents/usuarios/USUARIO_ACTUAL)
    && get(/databases/$(database)/documents/usuarios/USUARIO_ACTUAL).data.rol == 'admin'
    && !exists(/databases/$(database)/documents/cuentas/1792349707857)
    && get(/databases/$(database)/documents/productos/7750243052658).data.cantidad is int
    && getAfter(/databases/$(database)/documents/productos/7750243052658).data
       == get(/databases/$(database)/documents/productos/7750243052658).data
    && getAfter(/databases/$(database)/documents/cuentas/1792349707857).data.saldoCent == 130;
  }
 }
}
"""
    # Source inline se prueba, NUNCA se publica ni crea un ruleset persistente.
    return {"source": {"files": [{"name": "calibracion.rules", "content": source}]},
            "testSuite": {"testCases": [case("__diagnostico__/formato", "create", uid,
                                            mocks_for(before, after), sale)]}}


def save(directory, name, value):
    (directory / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def location(position, sources):
    name = position.get("fileName", "")
    line = position.get("line")
    column = position.get("column")
    text = ""
    candidates = [sources[name]] if name in sources else list(sources.values()) if len(sources) == 1 else []
    if candidates and isinstance(line, int) and 0 < line <= len(candidates[0].splitlines()):
        text = candidates[0].splitlines()[line - 1].strip()
    return f"{name or '?'}:{line or '?'}:{column or '?'}" + (" | " + text if text else "")


def report(response, labels, sources):
    if response.get("issues"):
        print("Incidencias de compilación/servicio:", json.dumps(response["issues"], ensure_ascii=False))
    results = response.get("testResults", [])
    successful = len(results) == len(labels) and not response.get("issues")
    for index, result in enumerate(results):
        label = labels[index] if index < len(labels) else "CASO INESPERADO"
        state = result.get("state", "SIN ESTADO")
        print("\n" + label + " => " + ("ALLOW (expectativa satisfecha)" if state == "SUCCESS" else state))
        successful = successful and state == "SUCCESS"
        if result.get("errorPosition"):
            print("  Posición del error:", location(result["errorPosition"], sources))
        for message in result.get("debugMessages", []):
            print("  Mensaje del evaluador:", message)
        for visited in result.get("visitedExpressions", []):
            print("  Permiso evaluado:", json.dumps(visited.get("value"), ensure_ascii=False),
                  location(visited.get("sourcePosition", {}), sources))
        seen = set()
        def walk(nodes):
            for node in nodes:
                for counted in node.get("values", []):
                    value = counted.get("value")
                    if isinstance(value, bool):
                        pos = location(node.get("sourcePosition", {}), sources)
                        key = (pos, value)
                        if key not in seen:
                            seen.add(key)
                            print("  BOOL", "TRUE " if value else "FALSE", pos)
                walk(node.get("children", []))
        walk(result.get("expressionReports", []))
        print("  Invocaciones reportadas:", len(result.get("functionCalls", [])),
              "(no equivalen al contador de cuota de accesos)")
    if len(results) != len(labels):
        print("Respuesta incompleta: se esperaban", len(labels), "resultados y llegaron", len(results))
    print("\nUna subexpresión FALSE puede ser normal en una alternativa OR.")
    print("FAILURE no distingue por sí solo denegación, error de evaluación o mocks inválidos.")
    print("La respuesta JSON completa conserva todos los valores, posiciones y mensajes.")
    return successful


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--autoverificar", action="store_true", help="Valida el archivo sin credenciales ni red")
    args = parser.parse_args()
    labels, body = build()
    check = calibration()
    validate_body(body)
    validate_body(check)
    if args.autoverificar:
        before, after, writes, uid = fixture()
        assert after[writes[0]["ruta"]]["totalCent"] == 130
        assert after[writes[1]["ruta"]]["saldoCent"] == 130
        assert before[writes[1]["ruta"]] is None
        assert len(labels) == 8 and "source" not in body
        assert isinstance(after[writes[0]["ruta"]]["clienteId"], int)
        print("OK: JSON incorporado, 2 creaciones + 6 lecturas, mocks antes/después y contrato REST estructural.")
        print("No se llamó a la API. La compatibilidad del contexto se comprobará en la calibración remota.")
        return 0
    directory = pathlib.Path(tempfile.mkdtemp(prefix="abuelita-rules-test-", dir=pathlib.Path.cwd()))
    print("Resultados locales:", directory)
    print("No se enviará ningún Commit, Write, BatchWrite ni despliegue.")
    print("Tiempo SIMULADO:", DIAGNOSTICO["fechaPreparada"], "(no la hora actual)")
    api = None
    try:
        api = Api()
        release = api.call("GET", f"projects/{PROJECT}/releases/cloud.firestore")
        ruleset = release.get("rulesetName", "")
        if not re.fullmatch(r"projects/" + PROJECT + r"/rulesets/[A-Za-z0-9_-]+", ruleset):
            raise RuntimeError("rulesetName inesperado; no se consultará otra ruta")
        active = api.call("GET", ruleset)
        sources = {f["name"]: f["content"] for f in active.get("source", {}).get("files", [])}
        if not sources:
            raise RuntimeError("El ruleset activo no contiene fuentes consultables")
        save(directory, "reglas-activas.json", active)
        save(directory, "release.json", release)
        for name, content in sources.items():
            digest = hashlib.sha256(content.encode()).hexdigest()
            print("Reglas:", name, "SHA-256", digest)
            if len(sources) == 1 and digest != EXPECTED_HASH:
                print("AVISO: reglas activas diferentes de las verificadas anteriormente. Se probará el ruleset activo obtenido.")
        save(directory, "calibracion-solicitud.json", check)
        calibrated = api.call("POST", f"projects/{PROJECT}:test", check)
        save(directory, "calibracion-respuesta.json", calibrated)
        print("\nCALIBRACIÓN DEL CONTEXTO Y MOCKS (fuente de prueba sin publicar)")
        if not report(calibrated, ["FORMATO"], {"calibracion.rules": check["source"]["files"][0]["content"]}):
            raise RuntimeError("Calibración no satisfactoria. No interpretar esto como rechazo de la venta; revisar el formato o soporte de mocks.")
        save(directory, "solicitud.json", body)
        save(directory, "casos.json", labels)
        response = api.call("POST", ruleset + ":test", body)
        save(directory, "respuesta-completa.json", response)
        print("\nEVALUACIÓN DE LAS REGLAS ACTIVAS", ruleset)
        passed = report(response, labels, sources)
        # Detectar si se cambió la publicación mientras se ejecutaba el diagnóstico.
        final_release = api.call("GET", f"projects/{PROJECT}/releases/cloud.firestore")
        save(directory, "release-final.json", final_release)
        if final_release.get("rulesetName") != ruleset:
            print("AVISO: cambió el ruleset publicado durante la prueba. Este informe corresponde a", ruleset)
        print("\n" + ("SIMULACIÓN SATISFACTORIA." if passed else "SIMULACIÓN NO SATISFACTORIA; revisar expresiones y mensajes."))
        print("Esto NO demuestra que el problema de producción esté resuelto.")
        print("Son permisos por operación con getAfter simulado; :test no reproduce un Commit multiescritura,")
        print("su cuota agregada, versiones/updateTime, autenticación real, App Check ni concurrencia.")
        print("Los documentos conservan los campos relevantes aportados, con nombres/UID anonimizados.")
        print("No se consultaron ni modificaron documentos de Firestore.")
        return 0 if passed else 2
    except (RuntimeError, ValueError, KeyError, AssertionError) as exc:
        print("\nDIAGNÓSTICO DETENIDO:", exc, file=sys.stderr)
        print("No atribuir este resultado a una condición de negocio sin revisar la respuesta.", file=sys.stderr)
        return 1
    finally:
        if api is not None:
            save(directory, "llamadas-sin-credenciales.json", api.calls)
        print("Archivos locales:", directory)


if __name__ == "__main__":
    sys.exit(main())
