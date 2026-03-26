import subprocess
from fastapi import HTTPException
import config


def _run(args: list[str]) -> None:
    cmd = (
        ["docker", "exec", config.ROUTER_CONTAINER, "nft"] + args
        if config.ROUTER_CONTAINER
        else ["nft"] + args
    )
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except FileNotFoundError:
        pass  # nft / docker not available — no-op in dev
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=e.stderr.decode())


def allow(mac: str) -> None:
    _run([
        "add", "element", "inet", config.NFT_TABLE, config.NFT_SET,
        f"{{ {mac} timeout {config.SESSION_TTL} }}",
    ])


def revoke(mac: str) -> None:
    _run([
        "delete", "element", "inet", config.NFT_TABLE, config.NFT_SET,
        f"{{ {mac} }}",
    ])
