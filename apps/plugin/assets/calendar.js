function nashirDrag(event) {
  const id = event.currentTarget.getAttribute("data-id");
  event.dataTransfer.setData("text/plain", id || "");
}

function nashirDrop(event) {
  event.preventDefault();
  const id = event.dataTransfer.getData("text/plain");
  const day = event.currentTarget;
  const date = day.getAttribute("data-date");
  if (!id || !date || !window.nashirCalendar) {
    return;
  }
  const body = new FormData();
  body.append("action", "nashir_calendar_move");
  body.append("nonce", window.nashirCalendar.nonce);
  body.append("post_id", id);
  body.append("date", date);
  fetch(window.nashirCalendar.ajax, { method: "POST", body, credentials: "same-origin" }).then(function () {
    window.location.reload();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("nashir-new-post");
  if (!button || !window.nashirCalendar) {
    return;
  }
  button.addEventListener("click", function () {
    const body = new FormData();
    body.append("action", "nashir_calendar_create");
    body.append("nonce", window.nashirCalendar.nonce);
    fetch(window.nashirCalendar.ajax, { method: "POST", body, credentials: "same-origin" })
      .then(function (response) {
        return response.json();
      })
      .then(function (payload) {
        if (payload && payload.success && payload.data && payload.data.edit) {
          window.location.href = payload.data.edit;
        }
      });
  });
});
