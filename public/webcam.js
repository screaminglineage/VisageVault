// import * as faceapi from '/node_modules/@vladmandic/face-api/dist/face-api.esm.js'
import * as faceapi from '/face-api/dist/face-api.esm.js'

const URL = 'http://localhost:8000'
const modelPath = '/models/'
const minScore = 0.2; // minimum score
const similarityThreshold = 0.6; // similarity of two faces
const maxResults = 5; // maximum number of results to return
let optionsSSDMobileNet;



// Setting up the camera
async function setupCamera() {
  return new Promise((resolve, reject) => {
    // Setting up elements and options
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const options = { 
      audio: false, 
      video: {
        facingMode: 'user',
        resizeMode: 'crop-and-scale'
      }
    };

    // Accessing Webcam
    navigator.mediaDevices.getUserMedia({video: true})
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch((err) => {
        console.error("Error in accessing the camera: ");
        reject(err);
      });

    video.onloadeddata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.play();
      resolve();
    }
  });
}

// Sets up the face recognition library
async function setupFaceAPI() {
  await faceapi.nets.ssdMobilenetv1.load('/ssd_mobilenetv1_model');
  await faceapi.nets.faceLandmark68Net.load('/face_landmark_68_model');
  await faceapi.nets.faceRecognitionNet.load('/face_recognition_model');
  optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence: minScore, maxResults });
  console.log(`Models loaded: ${faceapi.tf.engine().state.numTensors} tensors`);
}

// Detects face in video
async function detectFace(video) {
  if (!video || video.paused) return null;
  try {
    const detection = await faceapi
      .detectSingleFace(video)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (detection) {
      return detection;
    }
  } catch(err) {
    console.error('Failed to detect faces: ' + err);
  }
}

function getAuthMode() {
  return fetch('/auth-mode', {
    method: 'GET',
  }) 
  .then(response => response.json())
  .then(responseData => {
    console.log("Response Received:", responseData);
    return responseData.mode;
  })
  .catch(err => console.error("Error:", err));
}

function sendData(url, data, authMode) {
  fetch(url, {
    method: 'POST',
    headers: {
      "Content-Type": "application/octet-stream"
    },
    body: data
  }) 
    .then(response => response.json())
    .then(responseData => {
      console.log("Response Received:", responseData);
      if (!responseData.success) {
        // show an error message if not registered (registration failed or face recognition failed)
        window.location.assign('/register');
      }
      if (authMode === 'register') {
        window.location.assign('/verified')
      } else if (authMode === 'login') {
        window.location.assign(responseData.redirectURL)
      }

    })
  .catch(err => console.error("Error:", err));
}

async function main() {
  await faceapi.tf.setBackend('webgl');
  await faceapi.tf.ready();
  if (faceapi.tf?.env().flagRegistry.CANVAS2D_WILL_READ_FREQUENTLY) faceapi.tf.env().set('CANVAS2D_WILL_READ_FREQUENTLY', true);
  if (faceapi.tf?.env().flagRegistry.WEBGL_EXP_CONV) faceapi.tf.env().set('WEBGL_EXP_CONV', true);
  if (faceapi.tf?.env().flagRegistry.WEBGL_EXP_CONV) faceapi.tf.env().set('WEBGL_EXP_CONV', true);

  console.log("FaceAPI loaded");


  await setupFaceAPI();
  await setupCamera(); 
  console.log('Camera Started');

  const video = document.getElementById('video');

  // const data = new Float32Array([-0.07042966037988663,0.0582292340695858,0.006752233952283859,-0.0968911349773407,-0.08912322670221329,-0.01418702770024538,-0.03768688067793846,-0.06263817846775055,0.07776861637830734,-0.09170801937580109,0.21456606686115265,-0.08549827337265015,-0.19923965632915497,-0.08283955603837967,0.0009381348500028253,0.09430693089962006,-0.12413715571165085,-0.1228289008140564,-0.0582488551735878,-0.05570194870233536,0.005371398758143187,-0.0032158493995666504,-0.01651761494576931,0.039861395955085754,-0.19257895648479462,-0.33373701572418213,-0.10211119800806046,-0.06018602475523949,-0.04032384976744652,-0.09649462252855301,-0.060413531959056854,0.12472378462553024,-0.13517504930496216,0.022962940856814384,0.04869893193244934,0.1403922289609909,-0.01604645512998104,-0.051525287330150604,0.195094496011734,0.06028430163860321,-0.13578467071056366,-0.05466607213020325,0.024188295006752014,0.30194780230522156,0.1901722252368927,0.01878136396408081,-0.0027495711110532284,-0.02847302332520485,0.1209486797451973,-0.19416138529777527,0.08478322625160217,0.15657834708690643,0.0858290046453476,-0.0005266016232781112,0.06786216050386429,-0.08899687975645065,0.03409742936491966,0.09332095086574554,-0.18937250971794128,-0.060210928320884705,0.0038760495372116566,-0.12896282970905304,-0.10155455023050308,-0.09915051609277725,0.26128268241882324,0.15374547243118286,-0.13199664652347565,-0.08408745378255844,0.19629518687725067,-0.10351675003767014,-0.06795769184827805,-0.03804059326648712,-0.1434302031993866,-0.13803218305110931,-0.33169180154800415,0.06487908959388733,0.3365814685821533,0.13350628316402435,-0.20875820517539978,0.08452087640762329,-0.009316530078649521,-0.010902444832026958,0.12150020152330399,0.09866469353437424,-0.15995435416698456,0.06705345213413239,-0.09088537096977234,0.06535962969064713,0.16211916506290436,-0.024028772488236427,-0.05436325445771217,0.12892961502075195,-0.045589644461870193,0.042805273085832596,0.11535581946372986,-0.026805875822901726,-0.0773346871137619,-0.051519975066185,-0.1477949172258377,0.0046066539362072945,0.12177059799432755,-0.11486141383647919,-0.02113870158791542,0.1850929856300354,-0.18456807732582092,0.09002648293972015,0.006053637247532606,-0.0747571587562561,-0.009063552133738995,-0.06180546432733536,-0.12096697092056274,-0.06735429912805557,0.11627968400716782,-0.2684965431690216,0.08004800975322723,0.10497483611106873,0.0035163615830242634,0.15474554896354675,0.13711541891098022,0.044430479407310486,-0.02098122052848339,-0.013762755319476128,-0.17418749630451202,-0.0448605939745903,0.11218512058258057,0.03562353923916817,0.08641740679740906,0.010831684805452824]);
  // const faceMatcher = new faceapi.FaceMatcher(data);

  let detectedFace;
  while (!detectedFace) {
    detectedFace = await detectFace(video);
    console.log(detectedFace);
  }

    // const dataURI = 'data:text/json;charset=utf-8,' + detectedFace.descriptor;
    // const encodedUri = encodeURI(dataURI);
    // window.open(encodedUri);*/
    // 
    // const bestMatch = faceMatcher.findBestMatch(detectedFace.descriptor);
    // console.log(bestMatch.toString())*/;
    //
  
  // const endpoint_url = `${URL}/register/webcam`;
  let endpointURL;
  const authMode = await getAuthMode();
  if (authMode === 'register') {
    console.log('sending face data to register endpoint');
    endpointURL = `${URL}/register/webcam`;

  } else if (authMode === 'login') {
    console.log('sending face data to login endpoint');
    endpointURL = `${URL}/login/webcam`;
  }
  const binaryData = detectedFace.descriptor.buffer;
  console.log(binaryData);
  sendData(endpointURL, binaryData, authMode);

}

window.onload = main;

