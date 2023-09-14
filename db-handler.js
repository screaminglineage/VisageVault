const sqlite3 = require('sqlite3').verbose();

// Checks if username or email already exists in db
async function checkExists(db, username, email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT username, email FROM users WHERE username = ? OR email = ?', [username, email], 
      (err, row) => {
        if (row) {
          resolve(true);
        } else {
          resolve(false);
        }
        if (err) {
          throw err;
        }
      }
    );
  });
}

// Adds a user to the database
async function insertUser(db, userData) {
  return new Promise((resolve, reject) => {
    // Inserting data into database
    const stmt = db.prepare(
      'INSERT INTO users (username, email, faceDescriptor) VALUES (?, ?, ?);'
    );

    stmt.run(
      userData.username, 
      userData.email, 
      userData.faceDescriptor, 
      function (err) {
        if (err) {
          throw err;
        } else {
          resolve();
        }
      }
    );
    stmt.finalize();
  });
}

// Checks if user doesnt exist and then adds to db
async function addUser(db, userData) {
  try {
    if (await checkExists(db, userData.username, userData.email)) {
      return false;
    }
    await insertUser(db, userData);
    return true;
  } catch (err) {
    throw err;
  }
}

// Checks if a user is registered
async function isRegistered(db, username) {
  try {
    if (await checkExists(db, username, '')) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    throw err;
  }
}

async function getUserFace(db, username) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT faceDescriptor FROM users WHERE username = ?;", [username],
      (err, row) => {
        if (row) {
          const faceDescriptor = row.faceDescriptor;
          resolve(faceDescriptor);
        } else {
          reject();
        }
        if (err) {
          throw err;
        }
      }
    );    
  });
}

async function saveUserFileData(db, username, fileInfos) {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS ${username} (
          id INTEGER PRIMARY KEY,
          originalName TEXT,
          fileName TEXT,
          encryptionKey BLOB,
          iv BLOB
        )`
      );

      const stmt = db.prepare(`
        INSERT INTO ${username} (
          originalName, filename, encryptionKey, iv
        ) 
        VALUES (?, ?, ?, ?)`
      );
      for (const file of fileInfos) {
        stmt.run(
          file.originalName, 
          file.filename, 
          file.encryptionKey, 
          file.iv, 
          (err) => {
          if (err) throw err;
        });
      }
      stmt.finalize();
    });
}


// function to check if user has uploaded files or not
async function checkUserTable(db, username) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' 
      AND name = ?`,
      [username],
      (err, row) => {
        if (row) {
          resolve(true);
        } else {
          resolve(false);
        }
        if (err) {
          throw err;
        }
      }
    );
  });
}

// returns the list of all files uploaded by the user
async function getUserFileList(db, username) {
  return new Promise((resolve, reject) => {
    checkUserTable(db, username)
      .then((res) => {
        if (!res) {
          reject('No Files Found');
          return;
        }

        db.all(`
          SELECT id, originalName 
          FROM ${username}`,
          (err, rows) => {
            if (rows) {
              resolve(rows);
            }
            if (err) {
              reject(err);
            }
          }
        )
      });
  });
}

// returns the fileinfo saved in the db
async function getFileInfo(db, username, fileID) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT originalName, fileName, encryptionKey, iv
      FROM ${username}
      WHERE id = ?`,
      [fileID],
      (err, row) => {
        if (row) {
          resolve(row);
        }
        if (err) {
          reject(err);
        }
      }
    );
  });
}



module.exports = {
  addUser,
  isRegistered,
  getUserFace,
  saveUserFileData,
  getUserFileList,
  getFileInfo
};
