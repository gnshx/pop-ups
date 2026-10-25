import type { PhysicsState } from '../types/pet';

export class PendulumPhysics {
  public state: PhysicsState;
  private g = 980; // gravity acceleration in px/s^2
  private damping = 1.8; // settling drag
  private mouseHistory: { x: number; y: number; time: number }[] = [];
  private ambientTime = 0;

  constructor(anchorX = 400, anchorY = 0, threadLength = 170) {
    this.state = {
      angle: 0,
      angularVelocity: 0,
      angularAcceleration: 0,
      anchorX,
      anchorY,
      bobX: anchorX,
      bobY: anchorY + threadLength,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      dragVelocityX: 0,
      dragVelocityY: 0,
      tension: 1,
      dampening: 1.8,
      gravity: 980,
      lastShakeTime: 0,
      shakeCount: 0,
    };
  }

  public setAnchor(x: number, y: number) {
    this.state.anchorX = x;
    this.state.anchorY = y;
  }

  public setParameters(gravity?: number, damping?: number) {
    if (gravity !== undefined) {
      this.g = gravity;
      this.state.gravity = gravity;
    }
    if (damping !== undefined) {
      this.damping = damping;
      this.state.dampening = damping;
    }
  }

  public startDrag(mouseX: number, mouseY: number) {
    this.state.isDragging = true;
    this.state.dragOffsetX = mouseX - this.state.bobX;
    this.state.dragOffsetY = mouseY - this.state.bobY;
    this.state.angularVelocity = 0;
    this.mouseHistory = [{ x: mouseX, y: mouseY, time: performance.now() }];
  }

  public updateDrag(mouseX: number, mouseY: number, threadLength: number): { isShaking: boolean } {
    if (!this.state.isDragging) return { isShaking: false };

    const targetX = mouseX - this.state.dragOffsetX;
    const targetY = Math.max(this.state.anchorY + 30, mouseY - this.state.dragOffsetY);

    const dx = targetX - this.state.anchorX;
    const dy = targetY - this.state.anchorY;

    // Direct angle calculation from anchor to drag target
    const targetAngle = Math.atan2(dx, dy);
    this.state.angle = targetAngle;

    // Track mouse velocity for fling momentum
    const now = performance.now();
    this.mouseHistory.push({ x: mouseX, y: mouseY, time: now });
    if (this.mouseHistory.length > 5) {
      this.mouseHistory.shift();
    }

    // Check for vigorous shaking
    let isShaking = false;
    if (this.mouseHistory.length >= 4) {
      const first = this.mouseHistory[0];
      const last = this.mouseHistory[this.mouseHistory.length - 1];
      const dt = (last.time - first.time) / 1000;
      if (dt > 0.05 && dt < 0.4) {
        const dist = Math.hypot(last.x - first.x, last.y - first.y);
        const speed = dist / dt;
        if (speed > 1800) {
          isShaking = true;
          this.state.lastShakeTime = now;
          this.state.shakeCount++;
        }
      }
    }

    // Position of pet
    this.state.bobX = this.state.anchorX + Math.sin(this.state.angle) * threadLength;
    this.state.bobY = this.state.anchorY + Math.cos(this.state.angle) * threadLength;

    return { isShaking };
  }

  public releaseDrag(threadLength: number) {
    if (!this.state.isDragging) return;
    this.state.isDragging = false;

    // Calculate release angular velocity from recent mouse movement
    if (this.mouseHistory.length >= 2) {
      const first = this.mouseHistory[0];
      const last = this.mouseHistory[this.mouseHistory.length - 1];
      const dt = Math.max(0.016, (last.time - first.time) / 1000);
      const vx = (last.x - first.x) / dt;
      const vy = (last.y - first.y) / dt;

      // Angular velocity omega = (v_perpendicular) / L
      // Perpendicular unit vector to pendulum arm is (cos(theta), -sin(theta))
      const vPerp = vx * Math.cos(this.state.angle) - vy * Math.sin(this.state.angle);
      const flingOmega = vPerp / threadLength;

      // Clamp angular velocity to reasonable bounds
      this.state.angularVelocity = Math.max(-12, Math.min(12, flingOmega * 0.8));
    }
  }

  public step(dt: number, threadLength: number, isMusicDancing: boolean, beatIntensity: number) {
    this.ambientTime += dt;

    if (!this.state.isDragging) {
      // Natural ambient micro-draft (breeze) so it gently sways when idle
      const ambientDraft = Math.sin(this.ambientTime * 1.6) * 0.015;

      // Music dance excitation: if music is active, add rhythmic impulse
      let danceImpulse = 0;
      if (isMusicDancing && beatIntensity > 0.15) {
        danceImpulse = Math.sin(this.ambientTime * 6.0) * (beatIntensity * 0.06);
      }

      // Exact Damped Pendulum Physics:
      // d^2(theta)/dt^2 = -(g / L) * sin(theta) - c * d(theta)/dt + forces
      const L_meters = Math.max(0.1, threadLength / 100); // normalize scale
      const g_scaled = this.g / 100;
      const pendulumForce = -(g_scaled / L_meters) * Math.sin(this.state.angle);
      const dampingForce = -this.damping * this.state.angularVelocity;

      this.state.angularAcceleration = pendulumForce + dampingForce + ambientDraft + danceImpulse;

      // Semi-implicit Euler integration (stable for harmonic oscillators)
      this.state.angularVelocity += this.state.angularAcceleration * dt;
      this.state.angle += this.state.angularVelocity * dt;

      // Recalculate bob position in Cartesian coordinates
      this.state.bobX = this.state.anchorX + Math.sin(this.state.angle) * threadLength;
      this.state.bobY = this.state.anchorY + Math.cos(this.state.angle) * threadLength;
    }
  }

  public nudge(impulseRad: number) {
    this.state.angularVelocity += impulseRad;
  }
}
