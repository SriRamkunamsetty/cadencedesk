// tests/ergonomics-engine.test.js
import { describe, it, expect, beforeEach } from 'vitest';
const { ErgonomicsEngine, calculateVariance } = require('../src/core/ergonomics-engine.js');

describe('ErgonomicsEngine', () => {
  let engine;
  const t0 = 1000000;

  beforeEach(() => {
    engine = new ErgonomicsEngine();
    engine.reset(t0);
  });

  it('correctly computes variance of an array of numbers', () => {
    expect(calculateVariance([5, 5, 5, 5])).toBe(0);
    expect(calculateVariance([1, 2, 3, 4, 5])).toBe(2.5);
  });

  it('detects a breath-hold pause after 8 seconds of flatline variance', () => {
    const gatedState = {
      isBreathingReady: true,
      isTalking: false,
      isMultiFace: false,
      isFaceValid: true,
      latestUpperTrace: Array.from({ length: 25 }, () => ({ value: 0.5 })), // flatline
    };

    // Update at t0 -> Starts flatline timer
    const res1 = engine.update(gatedState, t0);
    expect(res1.isBreathHoldActive).toBe(false);

    // Update at t0 + 4s -> Still waiting (<8s)
    const res2 = engine.update(gatedState, t0 + 4000);
    expect(res2.isBreathHoldActive).toBe(false);

    // Update at t0 + 8.1s -> Triggers Breath-Hold Pause!
    const res3 = engine.update(gatedState, t0 + 8100);
    expect(res3.isBreathHoldActive).toBe(true);
    expect(res3.breathHoldCount).toBe(1);

    // Breathing resumes (oscillating amplitude) -> Clears breath-hold
    const dynamicState = {
      ...gatedState,
      latestUpperTrace: [0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6].map(v => ({ value: v })),
    };
    const res4 = engine.update(dynamicState, t0 + 9000);
    expect(res4.isBreathHoldActive).toBe(false);
  });

  it('does NOT trigger breath-hold cue when user is speaking', () => {
    const talkingState = {
      isBreathingReady: false,
      isTalking: true, // speaking
      isMultiFace: false,
      isFaceValid: true,
      latestUpperTrace: Array.from({ length: 25 }, () => ({ value: 0.5 })),
    };

    engine.update(talkingState, t0);
    const res = engine.update(talkingState, t0 + 8500);
    expect(res.isBreathHoldActive).toBe(false);
  });

  it('triggers blink-cadence reminder when no blink occurs for > 12 seconds', () => {
    const stateNoBlink = {
      isFaceValid: true,
      isMultiFace: false,
      isBlinking: false,
      latestUpperTrace: [],
    };

    engine.update(stateNoBlink, t0);
    // At 5s -> No reminder
    const res1 = engine.update(stateNoBlink, t0 + 5000);
    expect(res1.isBlinkReminderActive).toBe(false);

    // At 13s -> Reminder fires!
    const res2 = engine.update(stateNoBlink, t0 + 13000);
    expect(res2.isBlinkReminderActive).toBe(true);
    expect(res2.blinkReminderCount).toBe(1);

    // Blink happens -> Reminder clears!
    const stateBlink = { ...stateNoBlink, isBlinking: true };
    const res3 = engine.update(stateBlink, t0 + 13500);
    expect(res3.isBlinkReminderActive).toBe(false);
  });
});
