function autoExpand(element) {
  element.style.height = "inherit";
  const computed = window.getComputedStyle(element);
  const height =
    parseInt(computed.getPropertyValue("border-top-width"), 5) +
    parseInt(computed.getPropertyValue("border-bottom-width"), 5) +
    element.scrollHeight;
  element.style.height = height + "px";
}

textarea.addEventListener("keypress", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submit.click();
  }
});

function unhideUpdateElement() {
  const updateElement = document.getElementById("update-element");
  if (updateElement.hasAttribute("hidden")) {
    updateElement.removeAttribute("hidden");
  } else {
    updateElement.setAttribute("hidden", "true");
  }
}

socket.on("update", (message) => {
  unhideUpdateElement();
});
