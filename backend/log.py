import logging
import config

_FMT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
_DATE_FMT = "%Y-%m-%d %H:%M:%S"

logging.basicConfig(
    level=logging.DEBUG if config.DEBUG else logging.INFO,
    format=_FMT,
    datefmt=_DATE_FMT,
)

def get(name: str) -> logging.Logger:
    return logging.getLogger(name)
