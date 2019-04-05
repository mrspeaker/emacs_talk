import Phaser from "../lib/phaser.js";
import levelParser from "./levelParser.js";
import Level from "./Level.js";

const config = {
  type: Phaser.AUTO,
  width: 320,
  height: 240,
  pixelArt: true,
  zoom: 4,
  parent: "game",
  scale: {
    mode: Phaser.Scale.STRETCH,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    transparent: true
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1000 }
    }
  }
};

let opacity = 1;
const controls = {};

let $slide;
const $slides = document.querySelector("#slides");

// Phaser's `input { gamepad: true }` support flaky across scenes so rolling my own.
window.addEventListener("gamepadconnected", e => {
  console.log("Gamepad connected");
  controls.pad = e.gamepad;
});

function triggerSlide(cmd, value) {
  if ($slide) {
    const isVisible = $slide.style.visibility === "visible";
    const shouldBeVisible =
      (cmd === "TOGGLE" && !isVisible) || (cmd !== "TOGGLE" && cmd !== "HIDE");
    $slide.style.visibility = shouldBeVisible ? "visible" : "hidden";
  }

  switch (cmd) {
    case "OPACITY_UP":
      opacity = Math.min(1, opacity + 0.1);
      $slides.style.opacity = opacity;
      break;
    case "OPACITY_DOWN":
      opacity = Math.max(0.1, opacity - 0.1);
      $slides.style.opacity = opacity;
      break;
    case "SHOW":
      if ($slide) {
        $slide.style.visibility = "hidden";
      }
      $slide = document.querySelector(value);
      opacity = 0.9;

      setTimeout(() => {
        $slide.style.visibility = "visible";
        $slides.style.opacity = opacity;

        // Check if the slide has a video
        const vid = $slide.querySelector("video");
        if (vid) {
          controls.video = vid;
          triggerSlide("VIDEO_TOGGLE");
        }
      }, 100);
      break;
    case "HIDE":
      break;
    case "VIDEO_TOGGLE":
      if (controls.video) {
        if (controls.video.paused) {
          controls.video.play();
        } else {
          controls.video.pause();
        }
      }
      break;
    case "VIDEO_REWIND":
      if (controls.video) {
        controls.video.pause();
        controls.video.currentTime = 0;
      }
      break;
  }
}

fetch("res/levels.org")
  .then(r => r.text())
  .then(levelParser)
  .then(data => {
    const game = new Phaser.Game(config);
    const loadLevel = level => {
      const scene = new Level(
        "level" + level,
        data[level % (data.length - 1)],
        triggerSlide,
        () => {
          const nextLevel = level + 1;
          triggerSlide("HIDE");
          $slide = null;

          setTimeout(() => {
            loadLevel(nextLevel);
          }, 400);
        },
        controls
      );

      // TODO: shouldn't be handling scenes like this.
      // but Phaser3 docs are hard to understand xD
      if (level > 0) {
        game.scene.remove("level" + (level - 1));
      }
      game.scene.add("level" + level, scene, true);
    };

    loadLevel(0);
  });
