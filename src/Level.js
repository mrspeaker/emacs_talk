import Phaser from "../lib/phaser.js";
import Mario from "./Mario.js";

const Tiles = {
  COIN: 16,
  COIN_SPIN: 17,
  STAR: 33,
  BLANK: 23,
  STONE: 20,
  BRICK: 22
};

const Keyset = {
  TOGGLE: "Q",
  OPACITY_DOWN: "W",
  OPACITY_UP: "E",
  VIDEO_TOGGLE: "A",
  VIDEO_REWIND: "S",
  NEXT_LEVEL: "D"
};

class Level extends Phaser.Scene {
  constructor(name, data, triggerSlide, nextLevel, controls) {
    super(name);
    this.name = name;
    this.level = data;
    this.triggerSlide = triggerSlide;
    this.nextLevel = nextLevel;
    this.controls = controls;
    this.pressed = {};
  }
  preload() {
    const { level, load } = this;

    Object.values(level.params)
      .filter(({ type }) => type === "res")
      .map(({ value }) => load.image(value, `res/${value}`));

    load.image("trap", "res/trap.png");
    load.image("itsatrap", "res/itsatrap.png");
    load.spritesheet("mario", "res/mario.png", {
      frameWidth: 16,
      frameHeight: 16
    });
  }
  create() {
    const { level, triggerSlide, controls, input } = this;

    controls.cursors = input.keyboard.createCursorKeys();

    // Phaser gamepad handling seems flaky across scenes... rolling my own instead.
    // this.input.gamepad.once("connected", pad => {
    //   console.log("connected", pad.id, pad.index);
    //   controls.gamepad = pad;
    // });

    const keys = input.keyboard.addKeys(Keyset);
    Object.keys(Keyset).map(k => {
      input.keyboard.on(`keydown-${Keyset[k]}`, () => {
        if (k === "NEXT_LEVEL") {
          this.nextLevel();
        } else this.triggerSlide(k);
      });
    });

    const tx = 16;
    const ty = 16;
    const plats = this.physics.add.staticGroup();
    const stars = this.physics.add.staticGroup();
    const coins = this.physics.add.staticGroup();

    this.anims.create({
      key: "coin",
      frames: this.anims.generateFrameNumbers("mario", {
        frames: [Tiles.COIN, Tiles.COIN_SPIN]
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: "oneup",
      y: "-= 100",
      repeat: -1
    });

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
            frame = Tiles.STONE;
            break;
          case "O":
            solid = true;
            frame = Tiles.BRICK;
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
            const coin = coins.create(xo, yo, "mario", Tiles.COIN);
            coin.play("coin");

            break;
          default:
            const t = level.params[tile];
            if (t) {
              const type = t.type;
              if (type === "slide") {
                const star = stars.create(xo, yo, "mario", Tiles.STAR);
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
  }

  addTrigger(x, y, func) {
    const { physics, player } = this;

    const trigger = physics.add.staticSprite(x, y, "mario", Tiles.BLANK);

    physics.add.overlap(player, trigger, (a, b) => {
      b.destroy();
      func.call(this);
    });
  }

  update() {
    const { player, controls, pressed } = this;

    // TODO: wrap controls so Mario doesn't need to know
    // details of keys/gamepads
    player.update(controls);

    // Handle slide actions with gamepad
    const { pad } = controls;
    if (!pad) return;
    const { buttons, axes } = pad;

    // TODO: wrap buttons/axes
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

    if (axes[7] < -0.2) {
      if (!pressed.dpadU) {
        this.triggerSlide("VIDEO_TOGGLE");
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
