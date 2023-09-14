const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const dbHandler = require('./db-handler');
const faceHandler = require('./face-handler');
const encryptHandler = require('./encrypt-handler');

const DB_LOCATION = './storage/visage-vault.db'
const MAX_UPLOADS = 10;
const app = express();
const port = 8000; 

let authenticationMode = '';

app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.raw())
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'models')));

let userData = {};
let loggedInUser;

// Define a route
app.get('/', (req, res) => {
    loggedInUser = null;
    return res.redirect('/home');
});

// Define a route
app.get('/auth-mode', (req, res) => {
    return res.status(200).send({ mode: authenticationMode })
});


// Define a route
app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/public/home.html')
});

// Define a route
app.get('/register', (req, res) => {
    authenticationMode = 'register';
    res.sendFile(__dirname + '/public/register.html')
});


// User not found
app.get('/not-found', (req, res) => {
    return res.sendFile(__dirname + '/public/not-found.html');
});


// Receives username and email data
app.post('/register', (req, res) => {
    const { username, email } = req.body;
    userData = { username, email };
    console.log(userData);
    res.redirect('/register/webcam');
});

// Opens webcam page for registration
app.get('/register/webcam', (req, res) => {
    res.sendFile(__dirname + '/public/webcam.html');
});

// Receives facial data and saves it
app.post(
    '/register/webcam', 
    express.raw({ type: 'application/octet-stream' }), 
    async (req, res) => {
        const binaryData = req.body;
        console.log(binaryData);
        userData.faceDescriptor = binaryData;

        let db = new sqlite3.Database(DB_LOCATION);
        let userAdded;
        try {
            userAdded = await dbHandler.addUser(db, userData);
        } catch (err) {
            console.log(err);
        } 
        db.close();
        userData = {};

        // Returns an error if the user is already registered
        if (!userAdded) {
            console.log('Username or email is already in use. Try Again!');
            return res.status(409).send({message: 'username or email already registered', success: false});
        } else {
            console.log('Inserted Data');
            return res.status(200).send({message: 'registered successfully', success: true});
        }
    }
);

// Verified Message page
app.get('/verified', (req, res) => {
    res.sendFile(__dirname + '/public/verified.html');
});

let loginAction;
// Verified Message page
app.get('/login', (req, res) => {
    authenticationMode = 'login';
    loginAction = req.query.loginAction;
    res.sendFile(__dirname + '/public/login.html');
});

// Verifies user data and allows login 
app.post('/login', async (req, res) => {
    const username = req.body.username;
    console.log(username);
    let db = new sqlite3.Database(DB_LOCATION);
    let isRegistered;
    try {
        isRegistered = await dbHandler.isRegistered(db, username);
    } catch (err) {
        console.log(err);
    } 
    db.close();
    if (isRegistered) {
        console.log('User found!');
        loggedInUser = username;
        return res.redirect('/login/webcam');
    }
    // return res.status(401).send({message: 'user not registered', success: false});
    return res.redirect('/not-found');
});


// Verified Message page
app.get('/login/webcam', (req, res) => {
    return res.sendFile(__dirname + '/public/webcam.html');
});


// Receives facial data and saves it
app.post(
    '/login/webcam', 
    express.raw({ type: 'application/octet-stream' }), 
    async (req, res) => {
        const binaryData = req.body;
        console.log(binaryData);

        let db = new sqlite3.Database(DB_LOCATION);
        let match;
        try {
            match = await faceHandler.compareFaces(db, loggedInUser, binaryData);
        } catch (err) {
            console.error(err);
        }
        db.close();

        console.log(match)
        if (!match) {
            return res.status(409).send({message: 'user face did not match!', success: false, redirectURL: '/not-found'});
        }


        if (loginAction === 'upload') {
            return res.status(200).send({message: 'user face matched!', success: true, redirectURL: '/upload'});
            // return res.redirect('/upload');
        } else if (loginAction === 'download') {
            return res.status(200).send({message: 'user face matched!', success: true, redirectURL: '/download'});
        }
    }
);

// Verified Message page
app.get('/upload', (req, res) => {
    return res.sendFile(__dirname + '/public/upload-files.html');
});

// Directory to save uploaded files temporarily
const upload = multer({ dest: __dirname + '/storage/tmp/' });

// Upload File Handler
app.post('/upload', upload.array('uploaded_files', MAX_UPLOADS), async (req, res) => {
    // upload the file
    if (!req.files || req.files.length === 0) {
        // No file was provided in the request
        loggedInUser = null;
        return res.sendFile(__dirname + '/public/files-not-uploaded.html');
        // return res.status(400).send({ message: 'No file uploaded' });
    }

    // generate encryption key 
    const { encryptionKey, iv } = await encryptHandler.getKeyIV(loggedInUser);

    // store file info
    const fileInfos = req.files.map((file) => ({
        owner: loggedInUser, 
        originalName: file.originalname,
        filename: file.filename,
        encryptionKey: encryptionKey,
        iv: iv
    }));

    console.log('iv:', fileInfos[0].iv.toString('hex'));

    const tmpDir = path.join(__dirname, '/storage/tmp');
    const storageDir = path.join(__dirname, '/storage/userdata', loggedInUser);

    // encrypt file and move the encrypted files to user's dir
    fileInfos.forEach((file) => {
        const inputPath = path.join(tmpDir, file.filename);
        const outputPath = path.join(storageDir, file.filename);

        // create dir if it doesnt exist
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        console.log('input path:',inputPath, '\n', 'output path:', outputPath);
        encryptHandler.encryptFile(inputPath, outputPath, encryptionKey, iv);
    });
    console.log('Finished Encrypting with key', encryptionKey.toString('hex'));

    // delete the unencrypted file(s) in the /tmp directory
    fs.readdir(tmpDir, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(tmpDir, file), (err) => {
                if (err) throw err; 
            });
        }
        console.log('cleared tmp directory');
    });

    // create table from loggedInUser's username if it doesnt exist
    // and store uploaded file path, original filename, encryption key
    let db = new sqlite3.Database(DB_LOCATION);
    try {
        await dbHandler.saveUserFileData(db, loggedInUser, fileInfos);
    } catch (err) {
        console.error(err)
    }

    db.close();
    console.log('updated data in db');
    
    loggedInUser = null;
    // return res.status(200).send({ message: 'File uploaded successfully', fileInfos });
    return res.sendFile(__dirname + '/public/files-uploaded.html');
});


// Select files to download
app.get('/download', (req, res) => {
    return res.sendFile(__dirname + '/public/download-files.html');
});


// Decrypt and Download files
app.post('/download', async (req, res) => {
    // client requests download for a file of certain id
    if (!req.body.file) {
        return res.status(400).send({ message: 'No file selected' });
    }

    // query db for the id and retrieve filename, originalName, encryptionKey, iv
    const fileID = req.body.file;
    let db = new sqlite3.Database(DB_LOCATION);
    let fileInfo;
    try {
        fileInfo = await dbHandler.getFileInfo(db, loggedInUser, fileID);
    } catch (err) {
        console.log(err);
        return res.status(404).send({ message: 'Couldnt find file' });
    }
    db.close();

    console.log('Found file:', fileInfo.fileName, fileInfo.originalName);
    // decrypt file into another directory (/storage/downloads)
    const downloadDir = path.join(__dirname, '/storage/downloads');
    const storageDir = path.join(__dirname, '/storage/userdata', loggedInUser);
    const filePath = path.join(downloadDir, fileInfo.originalName);

    try {
        await encryptHandler.decryptFile(
            path.join(storageDir, fileInfo.fileName), 
            path.join(downloadDir, fileInfo.originalName), 
            fileInfo.encryptionKey,
            fileInfo.iv
        );

    } catch (err) {
        console.log(err);
    }

    console.log('Finished decryption')

    // send file to client for download
    res.download(filePath, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send({ message: 'Error in sending file' });
        }
        console.log('Sent file for download')    

        // delete the decrypted file(s) after sending them
        fs.unlink(filePath, (err) => {
            if (err) throw err; 
        });
        console.log('cleared tmp directory');
    });



    // loggedInUser = null;
    // return res.status(200).send({ message: 'File Downloaded' });
});


// Returns the uploaded files of the current user
app.get('/get-files', async (req, res) => {
    console.log('querying files')
    let db = new sqlite3.Database(DB_LOCATION);
    const response = {};
    let status = 200;
    try {
        const fileList = await dbHandler.getUserFileList(db, loggedInUser);
        response.message = 'Found files';
        response.data = fileList;
        status = 200;
    }
    catch (err) {
        console.log(err)
        response.message = 'No files found';
        response.data = [];
        status = 404;
    } 
    db.close();
    return res.status(status).send(response);
});



// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});




