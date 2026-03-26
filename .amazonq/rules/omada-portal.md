# tplink Omada portal integration

https://support.omadanetworks.com/in/document/13080/


API and Code Sample for External Portal Server (Omada Controller 5.0.15 or above)
Knowledgebase
Configuration Guide
Portal
API
Bookmarks
Copy Link

09-20-2024

42025
Contents

Objective

Requirements

Introduction

Configuration


Objective
This guide provides API and Code Sample for External Portal Server (Omada Controller 5.0.15 or above)

Suitable for Omada Controller 5.0.15 or above.

For Omada Controller 4.1.5 to 4.4.6, please refer to FAQ 2907

For Omada Controller 2.6.0 to 3.2.17, please refer to FAQ 2274


Requirements
Omada Controller(v5.0.15 or above)

Introduction
Compared to Omada SDN Controller v4, the main changes are as follows:

1. Add Controller ID to the URL for hotspot login and client information submission.

2. Add the HTTP header, which carries the CSRF Token.

Note: The keywords in Bold Italics indicate parameters that are automatically filled by EAP or Gateway and should be correctly identified and delivered by your External Portal Server. The meanings of the parameters are stated in the first appearance.

Configuration
This document outlines the requirements to establish an External Portal Server (Portal for short). The picture below depicts the data flow among the network devices, which may help better understand the working mechanism.

The data flow among the network devices.

Steps 1 and 2.

When a client is connected to the wireless or wired network bound with a Portal enabled and attempts to access the Internet, its HTTP request will be intercepted by EAP or Gateway, respectively, and then redirected to the Omada SDN Controller (Controller for short) along with the connection information that is filled automatically by EAP or Gateway in the URL.

Steps 3 and 4.

After that, the client will send HTTP GET request with the connection information to Controller and be redirected to the Portal by Controller’s reply with an HTTP response with status code 302. The HTTP response includes the Portal’s URL in the location field as well as the connection information.

URL for EAP:

http(s)://PORTAL?clientMac=CLIENT_MAC&apMac=AP_MAC&ssidName=SSID_NAME&t=TIME_SINCE_EPOCH&radioId=RADIO_ID&site=SITE_NAME&redirectUrl=LANDING_PAGE.

URL for Gateway:

http(s)://PORTAL?clientMac=CLIENT_MAC&gatewayMac=GATEWAY_MAC&vid=VLAN_ID&t=TIME_SINCE_EPOCH&site=SITE_NAME&redirectUrl=LANDING_PAGE.

PORTAL

The IP address or URL, and Port number (if necessary) of the External Portal Server.

clientMac

CLIENT_MAC

MAC address of the client.

apMac

AP_MAC

MAC address of the EAP to which the client is connected.

gatewayMac

GATEWAY_MAC

MAC address of the Gateway.

vid

VLAN_ID

VLAN ID of the wired network to which the client is connected.

ssidName

SSID_NAME

Name of the SSID to which the client is connected

radioId

RADIO_ID

Radio ID of the band to which the client is connected, where 0 represents 2.4G and 1 represents 5G.

site

SITE_NAME

Site name.

redirectUrl

LANDING_PAGE

URL to visit after successful authentication, which can be set in the Landing Page.

t

TIME_SINCE_EPOCH

Unit here is microsecond.

The Landing Page configuration page.

Steps 5 and 6.

The client will send HTTP GET request to Portal with the URL above. Portal must be able to recognize and keep the connection information in the query string of the HTTP GET request and return the web page for authentication.

Steps 7, 8 and 9.

The client will submit authentication information to Portal, which will be delivered to the authentication server, and be verified. Then the authentication server returns the authentication result to Portal.

You can decide how Portal obtains the client's authentication information and how Portal communicates with the authentication server, according to your own requirements, which is beyond the scope of this article.

NOTE: In the figure above, the Portal and authentication server are separated. You can install them on the same server as you wish. The authentication method is also up to you. Just make sure Portal can know the authentication result from the authentication server.

Steps 10 and 11.

If the authentication request is authorized, Portal should send the client information to the Controller by calling its API.

First, it must log in Controller by sending an HTTP POST request. The request’s URL should be https://CONTROLLER:PORT/CONTROLLER_ID/api/v2/hotspot/login and it should carry the operator account information in JSON format in the HTTP message body: {"name": "OPERATOR_USERNAME","password": "OPERATOR_PASSWORD"}.

Note that the account and password here are the operator added in the hotspot manager interface, rather than the account and password for the controller account.

The Operator creating page.

CONTROLLER

IP address or URL of Omada SDN Controller.

PORT

HTTPS Port for Controller Management of Omada SDN Controller (8043 for software, and 433 for OC by default, go to Settings --- Controller --- Access Config for modification).

CONTROLLER_ID

Identifier of the Omada SDN Controller. When you access the controller, the identifier will be automatically added to the URL, from which you will get the identifier.

For example, if your controller URL is https://localhost:8043/abcdefghijklmnopqrstuvwxyzabcdef/, then the CONTROLLER_ID is abcdefghijklmnopqrstuvwxyzabcdef.

OPERATOR_USERNAME

Username of the hotspot operator.

OPERATOR_PASSWORD

Password of the hotspot operator.

PHP Code Template:

public static function login()

{

$loginInfo = array(

"name" => OPERATOR_USER,

"password" => OPERATOR_PASSWORD

);

$headers = array(

"Content-Type: application/json",

"Accept: application/json"

);

$ch = curl_init();

// post

curl_setopt($ch, CURLOPT_POST, TRUE);

// Set return to a value, not return to page

curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

// Set up cookies. COOKIE_FILE_PATH defines where to save Cookie.

curl_setopt($ch, CURLOPT_COOKIEJAR, COOKIE_FILE_PATH);

curl_setopt($ch, CURLOPT_COOKIEFILE, COOKIE_FILE_PATH);

// Allow Self Signed Certs

curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);

curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);

// API Call

curl_setopt($ch, CURLOPT_URL, "https://" . CONTROLLER . ":" . PORT . "/" . CONTROLLER_ID . "/api/v2/hotspot/extPortal/auth");

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginInfo));

$res = curl_exec($ch);

$resObj = json_decode($res);

//Prevent CSRF. TOKEN_FILE_PATH defines where to save Token.

if ($resObj->errorCode == 0) {

// login successfully

self::setCSRFToken($resObj->result->token);

}

curl_close($ch);

}

private static function setCSRFToken($token)

{

$myfile = fopen(TOKEN_FILE_PATH, "w") or die("Unable to open file!");

fwrite($myfile, $token);

fclose($myfile);

return $token;

}

If the login authentication passes, the Controller will reply with the following JSON in the HTTP body. Note that the token inside result is the CSRF-Token, which should be added to the HTTP Header of the following steps.

{

"errorCode": 0,

"msg": "Hotspot log in successfully.",

"result": {

"token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

}

}

Steps 12 and 13.

After successful login, Portal can send the client authentication result to https://CONTROLLER:PORT/CONTROLLER_ID/api/v2/hotspot/extPortal/auth with HTTP POST method.

The client information should be encapsulated in JSON format in the HTTP message body, and must contain the following parameters.

For EAP: {"clientMac":"CLIENT_MAC","apMac":"AP_MAC","ssidName":"SSID_NAME","radioId":"RADIO_ID","site":"SITE_NAME","time":"EXPIRE_TIME","authType":"4"}

For Gateway:

{"clientMac":"CLIENT_MAC","gatewayMac":"GATEWAY_MAC","vid":"VLAN_ID ","site":"SITE_NAME","time":"EXPIRE_TIME","authType":"4"}

time

EXPIRE_TIME

Authentication Expiration time. Unit here is microsecond.

PHP Code Template for EAP:

public static function authorize($clientMac, $apMac, $ssidName, $radioId, $milliseconds)

{

// Send user to authorize and the time allowed

$authInfo = array(

'clientMac' => $clientMac,

'apMac' => $apMac,

'ssidName' => $ssidName,

'radioId' => $radioId,

'time' => $milliseconds,

'authType' => 4

);

$csrfToken = self::getCSRFToken();

$headers = array(

'Content-Type: application/json',

'Accept: application/json',

'Csrf-Token: ' . $csrfToken

);

$ch = curl_init();

// post

curl_setopt($ch, CURLOPT_POST, TRUE);

// Set return to a value, not return to page

curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

// Set up cookies.

curl_setopt($ch, CURLOPT_COOKIEJAR, COOKIE_FILE_PATH);

curl_setopt($ch, CURLOPT_COOKIEFILE, COOKIE_FILE_PATH);

// Allow Self Signed Certs

curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);

curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);

// API Call

curl_setopt($ch, CURLOPT_URL, "https://" . CONTROLLER . ":" . PORT . "/" . CONTROLLER_ID . "/api/v2/hotspot/login");

curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($authInfo));

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$res = curl_exec($ch);

echo $res;

$resObj = json_decode($res);

if ($resObj->errorCode == 0) {

// authorized successfully

}

curl_close($ch);

}

public static function getCSRFToken()

{

$myfile = fopen(TOKEN_FILE_PATH, "r") or die("Unable to open file!");

$token = fgets($myfile);

fclose($myfile);

return $token;

}

If the authentication request is accepted, the Controller will reply with the following JSON:

{

"errorCode": 0

}

Note: Portal should be able to meet the following two requirements:

1. Allow self-signed certificate. Or you will upload your own HTTPS certificate to Controller.

2. Read and save the “TPEAP_SESSIONID” in Cookie, and send authentication request with the Cookie.

* For Controller v5.11 and above, the Cookie name is “TPOMADA_SESSIONID