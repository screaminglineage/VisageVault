const sqlite3 = require('sqlite3').verbose();
const faceapi = require('@vladmandic/face-api');
const similarityThreshold = 0.6;

async function loadAPI() {
  // const pwd = '/home/aditya/VisageVault/';
  const pwd = 'http://localhost:8000'
  await faceapi.nets.faceRecognitionNet.load(pwd + '/face_recognition_model');
}


// Function which queries the db to get a user's face descriptor
async function getUserFace(db, username) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT faceDescriptor FROM users WHERE username = ?;", [username],
      (err, row) => {
        if (row) {
          const faceDescriptor = row.faceDescriptor;
          const floatArray = new Float32Array(faceDescriptor.length / Float32Array.BYTES_PER_ELEMENT);

          // Copy the binary data from the Buffer to the Float32Array
          for (let i = 0; i < floatArray.length; i++) {
            floatArray[i] = faceDescriptor.readFloatLE(i * Float32Array.BYTES_PER_ELEMENT);
          }
          resolve(floatArray);
        } else {
          console.error('user not found');
          reject();
        }
        if (err) {
          throw err;
        }
      }
    );    
  });
}

// Compares two faces and returns false if they dont match
// and true if they match
async function compareFaces(db, username, faceData) {
  await loadAPI();
  console.log('Loaded face-api')
  const faceDescriptor = await getUserFace(db, username);

  const faceDescriptorNew = new Float32Array(faceData.length / Float32Array.BYTES_PER_ELEMENT);

  // Copy the binary data from the Buffer to the Float32Array
  for (let i = 0; i < faceDescriptorNew.length; i++) {
    faceDescriptorNew[i] = faceData.readFloatLE(i * Float32Array.BYTES_PER_ELEMENT);
  }

  const faceMatcher = new faceapi.FaceMatcher(faceDescriptor);
  const match = faceMatcher.findBestMatch(faceDescriptorNew);
  console.log(match.toString())
  if (match.distance >= similarityThreshold) {
    return false;
  } else {
    return true;
  }
}


module.exports = {
  compareFaces
}



