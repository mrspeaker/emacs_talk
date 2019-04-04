import Phaser from "../lib/phaser.js";

class Mario extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "mario", 6 * 16 + 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }
  update(controls) {
    const { player, body } = this;
    const { cursors, pad } = controls;

    if (body.onFloor()) {
      if (body.velocity.x != 0) {
        const xo = (Date.now() / 150) % 4 | 0;
        this.setFrame(4 * 16 + xo);
      } else {
        this.setFrame(6 * 16);
      }
    }

    const right = cursors.right.isDown || (pad && pad.axes[0] > 0.2);
    const left = cursors.left.isDown || (pad && pad.axes[0] < -0.2);
    if (right) {
      this.setVelocityX(100);
      this.flipX = false;
    } else if (left) {
      this.setVelocityX(-100);
      this.flipX = true;
    } else {
      this.setVelocityX(0);
    }

    const jump =
      cursors.space.isDown ||
      cursors.up.isDown ||
      (pad && pad.buttons[0].pressed);
    if (jump && body.onFloor()) {
      body.setVelocityX(0);
      body.setVelocityY(-365); // jump up
      this.setFrame(5 * 16);
    }
  }
}

export default Mario;
