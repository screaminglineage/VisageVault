const crypto = require('crypto');
const fs = require('fs');

// Encrypt a file
function encryptFile(inputPath, outputPath, key, iv) {
  const algorithm = 'aes-256-cbc';
  
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);

  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  input.pipe(cipher).pipe(output);
}

// Decrypt a file
async function decryptFile(inputPath, outputPath, key, iv) {
  return new Promise((resolve, reject) => {

    const algorithm = 'aes-256-cbc';

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    let stream = input.pipe(decipher).pipe(output);

    stream.on('finish', () => {
      console.log('finished')
      resolve('File decryption complete');
    });
  });
}

// Retrieves the key of the user from the db
// Add it to the db if it doesnt exist
function getKeyIV(username) {
  // TODO: actually make this function do what it is supposed to do
  return new Promise((resolve, reject) => {
    crypto.generateKey('aes', { length: 256 }, (err, key) => {
      if (err) {
        reject(err);
      }
      
      const keyIV = {
        encryptionKey: key.export(),
        iv: crypto.randomBytes(16)
      }
      resolve(keyIV);
    });
  });
}


module.exports = {
  encryptFile,
  decryptFile,
  getKeyIV
}
