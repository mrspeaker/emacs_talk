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
  input: {
    gamepad: true
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

let currentSlide;
let opacity = 1;
let history = [];
const controls = {};

const $slides = document.querySelector("#slides");

window.addEventListener("gamepadconnected", e => {
  console.log(
    "Gamepad connected at index %d: %s. %d buttons, %d axes.",
    e.gamepad.index,
    e.gamepad.id,
    e.gamepad.buttons.length,
    e.gamepad.axes.length
  );
  controls.pad = e.gamepad;
});

function triggerSlide(cmd, value) {
  if (currentSlide) {
    const isVisible = currentSlide.style.visibility === "visible";
    currentSlide.style.visibility = "hidden";
    const shouldBeVisible =
      (cmd === "TOGGLE" && !isVisible) || (cmd !== "TOGGLE" && cmd !== "HIDE");
    if (shouldBeVisible) currentSlide.style.visibility = "visible";
  }

  if (cmd === "OPACITY_UP") {
    opacity = Math.min(1, opacity + 0.1);
    $slides.style.opacity = opacity;
  }
  if (cmd === "OPACITY_DOWN") {
    opacity = Math.max(0.1, opacity - 0.1);
    $slides.style.opacity = opacity;
  }

  if (cmd === "SHOW") {
    if (currentSlide) {
      currentSlide.style.visibility = "hidden";
    }
    currentSlide = document.querySelector(value);
    opacity = 0.8;

    setTimeout(() => {
      currentSlide.style.visibility = "visible";
      $slides.style.opacity = opacity;

      const vid = currentSlide.querySelector("video");
      if (vid) {
        controls.video = vid;
      }
    }, 100);
    history.push(currentSlide);
  }
  if (cmd === "VIDEO_PLAY" && controls.video) {
    if (controls.video.paused) controls.video.play();
    else controls.video.pause();
  }
  if (cmd === "VIDEO_REWIND" && controls.video) {
    controls.video.pause();
    controls.video.currentTime = 0;
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
          currentSlide = null;

          setTimeout(() => {
            loadLevel(nextLevel);
          }, 400);
        },
        controls
      );
      if (level > 0) game.scene.remove("level" + (level - 1));
      game.scene.add("level" + level, scene, true);
    };
    loadLevel(0);
    //    setTimeout(() => {
    //    const canvas = scene.sys.canvas;
    //  const
    //    fullscreen = scene.sys.game.device.fullscreen;
    // https://codepen.io/samme/pen/deKZjx?editors=0110
    //    }, 200);
  });

/*
  const particles = this.add.particles("mario");
  const emitter = particles.createEmitter({
    speed: 100,
    scale: { start: 1, end: 0 },
    blendMode: "ADD"
  });
*/

//  emitter.startFollow(logo);
