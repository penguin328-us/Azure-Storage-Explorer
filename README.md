# Azure Storage Explorer

Azure Storage Explorer is a cloud-enabled, mobile-ready, nodejs powered online azure storage management.

  - View Table Storage
  - View Blob in folder structure view
  - Download/upload Blobs

Feel free to try it by yourself at https://azure-sa-explorer.azurewebsites.net/

### Version
1.0.0

### Installation
* install Node Js from https://nodejs.org/download/
* git clone https://github.com/penguin328-us/Azure-Storage-Explorer.git
* node server.js

### Enable SSL
We do recommend you to enable SSL, your SA account and key will be post to server every time when you try to do operation on storage. your should use SSL for encryption
* if you use pfx base cert(windows), name it to https.pfx and put it in your website root folder
* if you use pem base cert(linux), name it to https-key.pem and https-cert.pem and put them in your website root folder
* SSL will be enabled automatically and all http request will be redirect to https

#### Using self signed cert for test purpose
if you just want to enable SSL for test purpose before going to production environment, you can use self signed certificate for test purpose
* for windows - check this article https://technet.microsoft.com/en-us/library/cc753127%28v=ws.10%29.aspx 
* for linux - use open ssl
```sh
$ openssl req -newkey rsa:2048 -new -x509 -days 365 -nodes -out https-cert.pem -keyout https-key.pem
```
