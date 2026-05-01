import requests
import config
from typing import Dict, Any

BASE_URL = "https://control.msg91.com/api/v5/otp"

def send_otp(mobile: str) -> Dict[str, Any]:
    """Send OTP to mobile number"""
    if not config.MSG91_AUTHKEY or not config.MSG91_TEMPLATE_ID:
        raise ValueError("MSG91 configuration missing")

    url = f"{BASE_URL}?template_id={config.MSG91_TEMPLATE_ID}&mobile={mobile}&authkey={config.MSG91_AUTHKEY}"
    response = requests.post(url, json={})  # Empty payload as per sample
    return response.json()

def verify_otp(mobile: str, otp: str) -> Dict[str, Any]:
    """Verify OTP"""
    if not config.MSG91_AUTHKEY:
        raise ValueError("MSG91 configuration missing")

    url = f"{BASE_URL}/verify"
    params = {"otp": otp, "mobile": mobile}
    headers = {"authkey": config.MSG91_AUTHKEY}
    response = requests.get(url, params=params, headers=headers)
    return response.json()

def resend_otp(mobile: str, retrytype: str = "text") -> Dict[str, Any]:
    """Resend OTP"""
    if not config.MSG91_AUTHKEY:
        raise ValueError("MSG91 configuration missing")

    url = f"{BASE_URL}/retry"
    params = {"authkey": config.MSG91_AUTHKEY, "retrytype": retrytype, "mobile": mobile}
    response = requests.get(url, params=params)
    return response.json()