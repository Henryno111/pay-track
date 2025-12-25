import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const payer = accounts.get("wallet_1")!;
const payee = accounts.get("wallet_2")!;

describe("Recurring Payment Contract Tests", () => {
  beforeEach(() => {
    simnet.setEpoch("3.0");
  });

  it("should create a daily subscription", () => {
    const { result } = simnet.callPublicFn(
      "recurring-payment",
      "create-subscription",
      [
        Cl.principal(payee),
        Cl.uint(100000), // 0.1 STX
        Cl.stringAscii("daily"),
        Cl.stringAscii("Daily service fee"),
      ],
      payer
    );

    expect(result).toBeOk(Cl.uint(1));
  });

  it("should create a monthly subscription", () => {
    const { result } = simnet.callPublicFn(
      "recurring-payment",
      "create-subscription",
      [
        Cl.principal(payee),
        Cl.uint(500000), // 0.5 STX
        Cl.stringAscii("monthly"),
        Cl.stringAscii("Monthly rent"),
      ],
      payer
    );

    expect(result).toBeOk(Cl.uint(1));
  });

  it("should get subscription details", () => {
    // Create subscription
    simnet.callPublicFn(
      "recurring-payment",
      "create-subscription",
      [
        Cl.principal(payee),
        Cl.uint(200000),
        Cl.stringAscii("weekly"),
        Cl.stringAscii("Weekly payment"),
      ],
      payer
    );

    // Get subscription
    const { result } = simnet.callReadOnlyFn(
      "recurring-payment",
      "get-subscription",
      [Cl.uint(1)],
      deployer
    );

    expect(result).toBeSome(
      Cl.tuple({
        payer: Cl.principal(payer),
        payee: Cl.principal(payee),
        amount: Cl.uint(200000),
        "interval-blocks": Cl.uint(1008), // weekly
        "start-block": Cl.uint(simnet.blockHeight),
        "next-payment-block": Cl.uint(simnet.blockHeight),
        "total-payments-made": Cl.uint(0),
        "is-active": Cl.bool(true),
        description: Cl.stringAscii("Weekly payment"),
        "created-at": Cl.uint(simnet.blockHeight),
      })
    );
  });

  it("should execute first payment immediately", () => {
    // Create subscription
    simnet.callPublicFn(
      "recurring-payment",
      "create-subscription",
      [
        Cl.principal(payee),
        Cl.uint(100000),
        Cl.stringAscii("daily"),
        Cl.stringAscii("Service"),
      ],
      payer
    );

    // Execute payment
    const { result } = simnet.callPublicFn(
      "recurring-payment",
      "execute-payment",
      [Cl.uint(1)],
      payer
    );

    expect(result).toBeOk(Cl.uint(1)); // First payment
  });

  it("should fail to execute payment before next due date", () => {
    // Create subscription
    simnet.callPublicFn(
      "recurring-payment",
      "create-subscription",
      [
        Cl.principal(payee),
        Cl.uint(100000),
        Cl.stringAscii("daily"),
        Cl.stringAscii("Service"),
      ],
      payer
    );

    // Execute first payment
    simnet.callPublicFn(
      "recurring-payment",
      "execute-payment",
      [Cl.uint(1)],
      payer
    );

    // Try to execute again immediately (should fail)
    const { result } = simnet.callPublicFn(
      "recurring-payment",
      "execute-payment",
      [Cl.uint(1)],
      payer
    );

    expect(result).toBeErr(Cl.uint(506)); // err-not-due
  });

  it("should cancel subscription", () => {
    // Create subscription
    simnet.callPublicFn(
      "recurring-payment",
      "create-subscription",
      [
        Cl.principal(payee),
        Cl.uint(100000),
        Cl.stringAscii("monthly"),
        Cl.stringAscii("Subscription"),
      ],
      payer
    );

    // Cancel subscription
    const { result } = simnet.callPublicFn(
      "recurring-payment",
      "cancel-subscription",
      [Cl.uint(1)],
      payer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify it's cancelled
    const subscription = simnet.callReadOnlyFn(
      "recurring-payment",
      "get-subscription",
      [Cl.uint(1)],
      deployer
    );

    expect(subscription.result).toBeSome(
      Cl.tuple({
        payer: Cl.principal(payer),
        payee: Cl.principal(payee),
        amount: Cl.uint(100000),
        "interval-blocks": Cl.uint(4320),
        "start-block": Cl.uint(simnet.blockHeight - 1),
        "next-payment-block": Cl.uint(simnet.blockHeight - 1),
        "total-payments-made": Cl.uint(0),
        "is-active": Cl.bool(false),
        description: Cl.stringAscii("Subscription"),
        "created-at": Cl.uint(simnet.blockHeight - 1),
      })
    );
  });

  it("should reactivate subscription", () => {
    // Create and cancel
    simnet.callPublicFn(
      "recurring-payment",
      "create-subscription",
      [
        Cl.principal(payee),
        Cl.uint(100000),
        Cl.stringAscii("monthly"),
        Cl.stringAscii("Subscription"),
      ],
      payer
    );

    simnet.callPublicFn(
      "recurring-payment",
      "cancel-subscription",
      [Cl.uint(1)],
      payer
    );

    // Reactivate
    const { result } = simnet.callPublicFn(
      "recurring-payment",
      "reactivate-subscription",
      [Cl.uint(1)],
      payer
    );

    expect(result).toBeOk(Cl.bool(true));
  });

  it("should check if payment is due", () => {
    // Create subscription
    simnet.callPublicFn(
      "recurring-payment",
      "create-subscription",
      [
        Cl.principal(payee),
        Cl.uint(100000),
        Cl.stringAscii("daily"),
        Cl.stringAscii("Service"),
      ],
      payer
    );

    // Check if payment is due (should be true for first payment)
    const { result } = simnet.callReadOnlyFn(
      "recurring-payment",
      "is-payment-due",
      [Cl.uint(1)],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));
  });

  it("should reject invalid interval type", () => {
    const { result } = simnet.callPublicFn(
      "recurring-payment",
      "create-subscription",
      [
        Cl.principal(payee),
        Cl.uint(100000),
        Cl.stringAscii("invalid"),
        Cl.stringAscii("Bad interval"),
      ],
      payer
    );

    expect(result).toBeErr(Cl.uint(507)); // err-invalid-interval
  });
});
