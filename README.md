# VisageVault
Encrypted File Storage using Face Lock

Users can register their face and username in the application, and then upload files to the server. The uploaded files are stored in an encrypted format (using AES-256) on the server and are only decrypted when the user's face matches that of the one who uploaded the files.

The face recognition models used are from [vladmandic/face-api](https://github.com/vladmandic/face-api/tree/master/model)

The following models were used:
- ssd_mobilenetv1_model
- face_recognition_model
- face_landmark_68_model
