"""
Optional TLS kwargs for PyMongo MongoClient.

Use when Atlas connections fail on Windows with:
  SSL: TLSV1_ALERT_INTERNAL_ERROR

Set env vars only for local debugging; do not use insecure options in production.
"""
import os
from typing import Any, Dict

import certifi


def _truthy(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes"}


def mongo_client_tls_kwargs() -> Dict[str, Any]:
    """
    Build TLS-related kwargs for MongoClient.

    Env:
      MONGO_TLS_INSECURE=1
        Sets tlsAllowInvalidCertificates=True (insecure; use only to see if
        failures are cert-related; if handshake still fails, problem is
        TLS version/ciphers or network/proxy).

      MONGO_TLS_DISABLE_OCSP=1
        Sets tlsDisableOCSPEndpointCheck=True (helps on networks that block OCSP).

      MONGO_TLS_NO_CERTIFI=1
        Omit tlsCAFile (use system/default CA store only). Rarely needed.
    """
    kwargs: Dict[str, Any] = {}

    if not _truthy("MONGO_TLS_NO_CERTIFI"):
        kwargs["tlsCAFile"] = certifi.where()

    if _truthy("MONGO_TLS_INSECURE"):
        kwargs["tlsAllowInvalidCertificates"] = True

    if _truthy("MONGO_TLS_DISABLE_OCSP"):
        kwargs["tlsDisableOCSPEndpointCheck"] = True

    return kwargs
