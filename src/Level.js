import Phaser from "../lib/phaser.js";
import Mario from "./Mario.js";

const Tiles = {
  BLANK: 23
};

const pressed = {
  b: false
};

class Level extends Phaser.Scene {
  constructor(name, data, triggerSlide, nextLevel, controls) {
    super(name);
    this.name = name;
    this.level = data;
    this.triggerSlide = triggerSlide;
    this.nextLevel = nextLevel;
    this.controls = controls;
  }
  preload() {
    const { level } = this;

    Object.values(level.params)
      .filter(v => v.type === "res")
      .map(v => this.load.image(v.value, `res/${v.value}`));
    this.load.image("castle2", "res/castle2.png");
    this.load.image("trap", "res/trap.png");
    this.load.image("itsatrap", "res/itsatrap.png");
    this.load.spritesheet("mario", "res/mario.png", {
      frameWidth: 16,
      frameHeight: 16
    });
  }
  create() {
    const { level, triggerSlide, controls, input } = this;

    const keyset = {
      TOGGLE: "Q",
      OPACITY_DOWN: "W",
      OPACITY_UP: "E",
      VIDEO_PLAY: "A",
      VIDEO_REWIND: "S"
    };

    controls.cursors = input.keyboard.createCursorKeys();

    // Phaser gamepad handling seems flaky across scenes... rolling my own instead.
    // this.input.gamepad.once("connected", pad => {
    //   console.log("connected", pad.id, pad.index);
    //   controls.gamepad = pad;
    // });

    const keys = input.keyboard.addKeys(keyset);
    Object.keys(keyset).map(k => {
      input.keyboard.on(`keydown-${keyset[k]}`, () => this.triggerSlide(k));
    });

    const tx = 16;
    const ty = 16;
    const plats = this.physics.add.staticGroup();
    const stars = this.physics.add.staticGroup();
    const coins = this.physics.add.staticGroup();

    this.anims.create({
      key: "coin",
      frames: this.anims.generateFrameNumbers("mario", {
        frames: [16, 17]
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: "oneup",
      y: "-= 100",
      repeat: -1
    });
    /*{
      key: "mario",
      frame: 16,
      repeat: 11,
      setXY: { x: 64, y: 13 * 16, stepX: 30 }
    });
    this.add.existing(stars);*/

    const playerStart = { x: 0, y: 0 };
    const levelEnd = { x: 0, y: 0 };
    const triggers = [];
    let frame = 20;
    for (let y = 0; y < level.h; y++) {
      for (let x = 0; x < level.w; x++) {
        const tile = level.lines[y * level.w + x];
        let solid = false;
        const xo = x * tx;
        const yo = y * ty;
        switch (tile) {
          case "#":
            solid = true;
            frame = 20;
            break;
          case "O":
            solid = true;
            frame = 22;
            break;
          case "X":
            solid = true;
            frame = Tiles.BLANK;
            break;
          case "P":
            playerStart.x = xo;
            playerStart.y = yo;
            break;
          case "E":
            levelEnd.x = xo;
            levelEnd.y = yo;
            break;
          case "V":
            triggers.push({ type: "trap", x: xo, y: yo });
            break;
          case "$":
            const coin = coins.create(xo, yo, "mario", 16);
            coin.play("coin");

            break;
          default:
            const t = level.params[tile];
            if (t) {
              const type = t.type;
              if (type === "slide") {
                const star = stars.create(xo, yo, "mario", 33);
                star._slide = t.value;
              }
              if (type === "res") {
                const img = this.add.image(xo, yo, t.value);
                if (t.data) {
                  if (t.data[0] === "sine") {
                    // Add a sine tween
                    this.tweens.add({
                      targets: img,
                      y: "-=" + t.data[1],
                      ease: "Sine.easeInOut",
                      yoyo: true,
                      repeat: -1,
                      duration: t.data[2]
                    });
                  }
                }
              }
            }
        }
        if (solid) {
          plats.create(xo, yo, "mario", frame);
        }
      }
    }

    const end = this.physics.add.staticSprite(
      levelEnd.x,
      levelEnd.y,
      "mario",
      18
    );

    this.player = new Mario(this, playerStart.x, playerStart.y, controls);

    this.physics.add.overlap(
      this.player,
      stars,
      (a, b) => {
        stars.remove(b);
        const slideId = b._slide;
        if (!slideId) return;
        triggerSlide("SHOW", slideId);

        this.add.tween({
          targets: [b],
          duration: 400,
          y: "-=60",
          alpha: 0,
          onComplete: () => b.destroy()
        });
      },
      null,
      this
    );

    this.physics.add.collider(this.player, end, (a, b) => {
      b.destroy();
      this.nextLevel();
    });

    this.physics.add.collider(this.player, plats);

    this.physics.add.overlap(this.player, coins, (a, b) => {
      coins.remove(b);
      this.add.tween({
        targets: [b],
        duration: 400,
        y: "-=60",
        alpha: 0,
        onComplete: () => b.destroy()
      });
    });

    triggers.forEach(({ type, x, y }) => {
      if (type === "trap") {
        this.addTrigger(x, y, () => {
          this.add.image(x - 100, y - 32, "trap");
          this.add.image(x - 100, y - 102, "itsatrap");
          this.add.tween({
            targets: this.player,
            duration: 1200,
            rotation: -360,
            onComplete: () => {}
          });

          setTimeout(() => {
            this.game.scene.start(this.name);
          }, 3000);
        });
      }
    });

    const camera = this.cameras.main;
    camera.startFollow(this.player);
    camera.setDeadzone(100, 100);
    camera.setBounds(-8, -8, level.w * tx, level.h * ty);

    camera.fadeFrom(500, 0, 0, 0, true);
    this.keys = keys;
  }

  addTrigger(x, y, f) {
    const trigger = this.physics.add.staticSprite(x, y, "mario", Tiles.BLANK);

    this.physics.add.overlap(this.player, trigger, (a, b) => {
      b.destroy();
      f.call(this);
    });
  }

  update() {
    const { player, controls } = this;
    const { pad } = controls;
    player.update();
    if (!pad) return;
    const { buttons, axes } = pad;

    if (buttons[1].pressed) {
      if (!pressed.b) {
        this.triggerSlide("TOGGLE");
        pressed.b = true;
      }
    } else pressed.b = false;

    if (buttons[4].pressed) {
      if (!pressed.l1) {
        this.triggerSlide("OPACITY_UP");
        pressed.l1 = true;
      }
    } else pressed.l1 = false;

    if (buttons[5].pressed) {
      if (!pressed.r1) {
        this.triggerSlide("OPACITY_DOWN");
        pressed.r1 = true;
      }
    } else pressed.r1 = false;

    if (axes[6] < -0.2) {
      if (!pressed.dpadL) {
        this.nextLevel();
        pressed.dpadL = true;
      }
    } else pressed.dpadL = false;

    if (axes[6] > 0.2) {
      if (!pressed.dpadR) {
        console.log("pg up");
        pressed.dpadR = true;
      }
    } else pressed.dpadR = false;

    if (axes[7] < -0.2) {
      if (!pressed.dpadU) {
        this.triggerSlide("VIDEO_PLAY");
        pressed.dpadU = true;
      }
    } else pressed.dpadU = false;

    if (axes[7] > 0.2) {
      if (!pressed.dpadD) {
        this.triggerSlide("VIDEO_REWIND");
        pressed.dpadD = true;
      }
    } else pressed.dpadD = false;

    if (buttons[8].pressed) {
      location.reload();
    }
  }
}

export default Level;
