(function () {
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
          { threshold: 0.01, rootMargin: "80px 0px 80px 0px" }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  var stages = document.querySelectorAll(".art-3d img");
  stages.forEach(function (img) {
    var wrap = img.parentElement;
    wrap.addEventListener("mousemove", function (event) {
      var rect = wrap.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      img.style.transform = "rotateY(" + x * -16 + "deg) rotateX(" + y * 12 + "deg)";
    });
    wrap.addEventListener("mouseleave", function () {
      img.style.transform = "rotateY(-8deg) rotateX(6deg)";
    });
  });
})();
