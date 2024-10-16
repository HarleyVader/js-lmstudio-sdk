const listOfTriggers = [
  "BIMBO DOLL",
  "GOOD GIRL",
  "BAMBI SLEEP",
  "BAMBI FREEZE",
  "ZAP COCK DRAIN OBEY",
  "BAMBI RESET",
  "I Q DROP",
  "I Q LOCK",
  "POSTURE LOCK",
  "UNIFORM LOCK",
  "SAFE & SECURE",
  "PRIMPED",
  "PAMPERED",
  "SNAP & FORGET",
  "GIGGLETIME",
  "BLONDE MOMENT",
  "BAMBI DOES AS SHE IS TOLD",
  "DROP FOR COCK",
  "COCK ZOMBIE NOW",
  "BAMBI TITS LOCK",
  "BAMBI WAIST LOCK",
  "BAMBI BUTT LOCK",
  "BAMBI LIMBS LOCK",
  "BAMBI FACE LOCK",
  "BAMBI LIPS LOCK",
  "BAMBI THROAT LOCK",
  "BAMBI POSTURE LOCK",
];
let currentMessage = '';

function createToggleButtons() {
  const container = document.getElementById("trigger-toggles");

  listOfTriggers.forEach((trigger, index) => {
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = `toggle-${index}`;
    toggle.className = "toggle-input";

    const label = document.createElement("label");
    label.textContent = trigger;
    label.htmlFor = `toggle-${index}`;
    label.className = "toggle-label";

    container.appendChild(toggle);
    container.appendChild(label);
  });
}

function toggleAllToggles() {
  const toggleInputs = document.getElementsByClassName("toggle-input");
  for (let i = 0; i < toggleInputs.length; i++) {
    toggleInputs[i].checked = !toggleInputs[i].checked;
  }
}

window.onload = function () {
  createToggleButtons();
  document
    .getElementById("activate-all")
    .addEventListener("click", toggleAllToggles);
};

function sendTriggers() {
  const enabledToggleButtons = getEnabledToggleButtons();
  if (!Array.isArray(enabledToggleButtons)) {
    console.error("No triggers selected");
    return;
  }

  const triggers = enabledToggleButtons.map(
    (buttonId) => listOfTriggers[parseInt(buttonId.split("-")[1])]
  );
  if (triggers.length === 0) {
    console.error("No valid triggers found");
    return;
  }
  socket.emit("triggers", triggers);
}

function scanTriggers() {
  let enabledToggleButtons = getEnabledToggleButtons();
  if (!Array.isArray(enabledToggleButtons)) {
    enabledToggleButtons = [];
  }

  const triggers = enabledToggleButtons.map(
    (buttonId) => listOfTriggers[parseInt(buttonId.split("-")[1])]
  );
  if (typeof currentMessage === 'undefined') {
    console.error('currentMessage is not defined');
    return;
  }

  triggers.forEach((trigger) => {
    if (currentMessage.includes(trigger)) {
      flashTriggers(trigger);
    }
  });
}

function getEnabledToggleButtons() {
  const enabledToggleButtons = [];
  const toggleInputs = document.getElementsByClassName("toggle-input");
  for (let i = 0; i < toggleInputs.length; i++) {
    if (toggleInputs[i].checked) {
      enabledToggleButtons.push(toggleInputs[i].id);
    }
  }
  return enabledToggleButtons;
}

function flashTriggers(trigger, duration) {
  const container = document.getElementById("eye");
  container.innerHTML = "";
  const span = document.createElement("span");
  span.textContent = trigger;
  span.style.display = "flex";
  span.style.justifyContent = "center";
  span.style.alignItems = "center";
  span.style.fontSize = "48px";
  span.style.fontWeight = "bold";
  span.style.color = "pink";
  span.style.marginRight = "0";
  container.appendChild(span);

  setTimeout(() => {
    container.innerHTML = "";
  }, duration);
}

function toggleTriggers() {
  let cunter = 0;
  setTimeout(() => {
    cunter++;
    scanTriggers();
    if (cunter > 10) {
      return;
    }
  }, 350);
  cunter = 0;
}

setInterval(() => {
  toggleTriggers();
}, 450);
