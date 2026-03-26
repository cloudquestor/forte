import subprocess
from fastapi import HTTPException
import config
import log

logger = log.get("firewall")


def _run(args: list[str]) -> None:
    cmd = (
        ["docker", "exec", config.ROUTER_CONTAINER, "nft"] + args
        if config.ROUTER_CONTAINER
        else ["nft"] + args
    )
    logger.debug("_run: %s", " ".join(cmd))
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        logger.debug("_run: success")
    except FileNotFoundError:
        logger.debug("_run: nft/docker not found, no-op")
        pass  # nft / docker not available — no-op in dev
    except subprocess.CalledProcessError as e:
        logger.debug("_run: CalledProcessError stderr=%s", e.stderr.decode())
        raise HTTPException(status_code=500, detail=e.stderr.decode())


def allow(mac: str) -> None:
    logger.debug("allow: mac=%s ttl=%s", mac, config.SESSION_TTL)
    _run([
        "add", "element", "inet", config.NFT_TABLE, config.NFT_SET,
        f"{{ {mac} timeout {config.SESSION_TTL} }}",
    ])


def revoke(mac: str) -> None:
    logger.debug("revoke: mac=%s", mac)
    _run([
        "delete", "element", "inet", config.NFT_TABLE, config.NFT_SET,
        f"{{ {mac} }}",
    ])
