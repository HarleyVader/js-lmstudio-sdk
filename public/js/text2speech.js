let state = true;
let _audioArray = [];
let duration = 0;

function arrayPush(_audioArray, e) {
  document.querySelector("#audio").hidden = true;

  let URL = `/api/tts?text=${encodeURIComponent(e)}`;
  _audioArray.push(URL);

  console.log("audioArray ", _audioArray);
  console.log("length ", _audioArray.length);
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
    return duration;
  };
  audio.onended = function () {
    console.log("audio ended");
    document.querySelector("#message").textContent = "Finished!";
    play();
  };
  audio.onerror = function (e) {
    console.error("Error playing audio:", e);
    document.querySelector("#message").textContent = "Error playing audio.";
    state = true;
  };
};

function play() {
  if (_audioArray.length > 0 || audio.currentTime === 0) {
    do_tts(_audioArray);
  } else if (_audioArray.length === 0) {
    state = true;
    return state;
  }
}