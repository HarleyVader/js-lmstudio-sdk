let state = true;
let _audioArray = [];
let duration = 0;

function arrayPush(_audioArray, e) {

  let URL = "https://bambisleep.chat/api/tts?text=" + encodeURIComponent(e); //+ "&speaker_id=" + encodeURIComponent(speaker_id) + "&style_wav=" + encodeURIComponent(style_wav) + "&language_id=" + encodeURIComponent(language_id);
  //console.log("URL ", URL);
  document.querySelector("#audio").hidden = true;
  _audioArray.push(URL);
  console.log("audioArray ", _audioArray);
  let lenght = _audioArray.length;
  console.log("lenght ", _audioArray.length);
  return _audioArray;
}

function arrayShift(_audioArray) {
  if (_audioArray.length > 0 && audio !== null) {
    let _currentURL = _audioArray.shift();
    console.log("currentURL ", _currentURL);
    return _currentURL;
  }
}

async function do_tts(_audioArray) {
  state = false;
  document.querySelector("#message").textContent = "Synthesizing...";
  let audio = document.querySelector("audio");
  let currentURL = arrayShift(_audioArray);
  audio.src = currentURL;
  console.log("audio.src ", audio.src);
  audio.load();
  audio.onloadedmetadata = function () {
    console.log("audio ", audio);
    console.log("audio.duration ", audio.duration);
    duration = audio.duration * 1000;
    document.querySelector("#message").textContent = "Playing...";
    audio.play();
  };
  audio.onended = function () {
    console.log("audio ended");
    document.querySelector("#message").textContent = "Finished!";
    if (_audioArray.length > 0) {
      delayer();
    }
  };
}


function delayer() {
  setTimeout(() => {
    console.log("Delayer: Delayed message");
    if (_audioArray.length > 0) {
      do_tts(_audioArray);
    }
  }, duration);
  if (!state) state = true;
  console.log("state ", state);
  return state;
}